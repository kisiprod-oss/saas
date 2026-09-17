"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  adminPour, assurerLigneAdmin, exigerAdmin, exigerAdminSansSecondeVerification,
  fermerSessionAdmin, journaliser, lireSecretTotp, ouvrirSessionAdmin,
  revoquerSessionsAdmin, ROLES, type RoleAdmin,
} from "./admin";
import { codeValide, nouveauSecret } from "./totp";
import { chiffrementConfigure, chiffrer, dechiffrer } from "./chiffrement";
import { ecrire, un } from "./db";
import {
  creerDemandeReinitialisation, MINUTES_BLOCAGE, noterTentative,
  reinitialiserTentatives, tropDeTentatives, utilisateurCourant,
} from "./auth";
import { adresseDuSite, envoyerEmail } from "./email";
import {
  ajouterMessage, estPriorite, estStatut, ticketPourEquipe,
} from "./support";
import { signalement as lireSignalement } from "./signalements";

/**
 * Les gestes de l'espace d'administration.
 *
 * TROIS REGLES, SANS EXCEPTION :
 *  1. chaque action commence par `exigerAdmin(permission)` — le controle est
 *     cote serveur, jamais dans l'ecran ;
 *  2. chaque action sensible ecrit au journal, avec son motif quand il y en a ;
 *  3. rien de sensible n'entre dans le journal : ni secret, ni empreinte,
 *     ni cle. On note le geste, pas la matiere.
 */

const txt = (fd: FormData, cle: string) => String(fd.get(cle) ?? "").trim();
const nb = (fd: FormData, cle: string) => Number(fd.get(cle) ?? 0);

function retour(chemin: string, parametres: Record<string, string>): never {
  const p = new URLSearchParams(parametres);
  redirect(`${chemin}?${p.toString()}`);
}

/* ==================================================================
   Seconde verification (TOTP)
   ================================================================== */

/**
 * Le secret est chiffre au repos quand CLE_CHIFFREMENT est posee. Un secret
 * en base32 ne contient jamais de deux-points ; la valeur chiffree en
 * contient toujours. C'est ce qui permet de lire les deux formes sans
 * colonne supplementaire, et de chiffrer plus tard ce qui ne l'etait pas.
 */
function secretEnClair(stocke: string | null): string | null {
  if (!stocke) return null;
  return stocke.includes(":") ? dechiffrer(stocke) : stocke;
}
function secretAStocker(secret: string): string {
  return chiffrementConfigure() ? chiffrer(secret) : secret;
}

/** Prepare un secret pour un administrateur qui n'en a pas encore. */
export async function actionPreparerDoubleFacteur() {
  const { admin, utilisateur } = await exigerAdminSansSecondeVerification();
  assurerLigneAdmin(admin.email, utilisateur.nom);
  const { secret, actif } = lireSecretTotp(admin.email);
  // Un secret deja actif ne se remplace pas d'un clic : il faudrait le
  // desactiver d'abord, ce qui passe par une action distincte et journalisee.
  if (secret && actif) redirect("/admin/securite/verifier");
  if (!secret) {
    ecrire("UPDATE admins SET totp_secret = ? WHERE email = ?",
      secretAStocker(nouveauSecret()), admin.email);
  }
  redirect("/admin/securite/activer");
}

export async function actionActiverDoubleFacteur(fd: FormData) {
  const { admin } = await exigerAdminSansSecondeVerification();
  const cle = `admin2fa:${admin.email}`;
  if (tropDeTentatives(cle)) {
    retour("/admin/securite/activer", { erreur: `Trop d'essais. Réessayez dans ${MINUTES_BLOCAGE} minutes.` });
  }

  const { secret } = lireSecretTotp(admin.email);
  const clair = secretEnClair(secret);
  if (!clair) retour("/admin/securite/activer", { erreur: "Aucun secret à activer. Recommencez." });

  if (!codeValide(clair, txt(fd, "code"))) {
    noterTentative(cle, false);
    retour("/admin/securite/activer", { erreur: "Code incorrect. Vérifiez l'heure de votre téléphone." });
  }

  reinitialiserTentatives(cle);
  ecrire("UPDATE admins SET totp_actif = 1 WHERE email = ?", admin.email);
  journaliser(admin, { action: "securite.double_facteur_active", cible_type: "admin", cible_id: admin.email });
  await ouvrirSessionAdmin(admin.email);
  redirect("/admin");
}

export async function actionVerifierDoubleFacteur(fd: FormData) {
  const { admin } = await exigerAdminSansSecondeVerification();
  const cle = `admin2fa:${admin.email}`;
  if (tropDeTentatives(cle)) {
    retour("/admin/securite/verifier", { erreur: `Trop d'essais. Réessayez dans ${MINUTES_BLOCAGE} minutes.` });
  }

  const { secret, actif } = lireSecretTotp(admin.email);
  const clair = secretEnClair(secret);
  if (!clair || !actif) redirect("/admin/securite/activer");

  if (!codeValide(clair, txt(fd, "code"))) {
    noterTentative(cle, false);
    journaliser(admin, { action: "securite.code_refuse", cible_type: "admin", cible_id: admin.email });
    retour("/admin/securite/verifier", { erreur: "Code incorrect." });
  }

  reinitialiserTentatives(cle);
  await ouvrirSessionAdmin(admin.email);
  journaliser(admin, { action: "securite.entree", cible_type: "admin", cible_id: admin.email });
  redirect("/admin");
}

/**
 * Ferme la session d'administration — et elle seule. La session d'agence
 * reste ouverte : on quitte l'administration, on ne se deconnecte pas du
 * logiciel.
 *
 * Pas de `catch` autour du gardien : `redirect()` fonctionne en levant une
 * exception, et l'attraper reviendrait a l'annuler en silence.
 */
export async function actionQuitterAdministration() {
  const admin = adminPour((await utilisateurCourant())?.email);
  if (admin) journaliser(admin, { action: "securite.sortie", cible_type: "admin", cible_id: admin.email });
  await fermerSessionAdmin();
  redirect("/dashboard");
}

/* ==================================================================
   Agences
   ================================================================== */

export async function actionSuspendreAgence(fd: FormData) {
  const { admin, agence: sienne } = await exigerAdmin("agences.suspendre");
  const id = nb(fd, "id");
  const motif = txt(fd, "motif");
  if (!id) redirect("/admin/agences");

  /*
   * On ne suspend pas l'agence a laquelle on appartient soi-meme.
   *
   * Trouve a l'essai, et pas en theorie : une suspension ferme toutes les
   * sessions de l'agence, y compris celle de l'administrateur qui vient de
   * la declencher — lequel se retrouve dehors, sans plus aucun moyen de
   * revenir sur sa decision depuis l'application. Le garde-fou est ici,
   * cote serveur, et pas seulement dans l'ecran.
   */
  if (id === sienne.id) {
    retour(`/admin/agences/${id}`, {
      erreur: "C'est votre propre agence : la suspendre fermerait votre session "
        + "et vous mettrait dehors. Demandez à un autre super administrateur.",
    });
  }
  if (motif.length < 10) {
    retour(`/admin/agences/${id}`, { erreur: "Indiquez un motif d'au moins dix caractères." });
  }
  const agence = un<{ nom: string }>("SELECT nom FROM agences WHERE id = ?", id);
  if (!agence) redirect("/admin/agences");

  ecrire(
    "UPDATE agences SET suspendue_le = datetime('now'), motif_suspension = ? WHERE id = ?",
    motif, id,
  );
  // Une agence suspendue ne doit pas rester connectée : on ferme ses sessions.
  ecrire("DELETE FROM sessions WHERE utilisateur_id IN (SELECT id FROM utilisateurs WHERE agence_id = ?)", id);
  journaliser(admin, {
    action: "agence.suspendue", cible_type: "agence", cible_id: id, motif,
    details: agence.nom,
  });
  revalidatePath("/admin/agences");
  retour(`/admin/agences/${id}`, { ok: "Agence suspendue. Ses sessions ont été fermées." });
}

export async function actionReactiverAgence(fd: FormData) {
  const { admin } = await exigerAdmin("agences.suspendre");
  const id = nb(fd, "id");
  if (!id) redirect("/admin/agences");
  const agence = un<{ nom: string }>("SELECT nom FROM agences WHERE id = ?", id);
  ecrire("UPDATE agences SET suspendue_le = NULL, motif_suspension = NULL WHERE id = ?", id);
  journaliser(admin, {
    action: "agence.reactivee", cible_type: "agence", cible_id: id, details: agence?.nom ?? null,
  });
  revalidatePath("/admin/agences");
  retour(`/admin/agences/${id}`, { ok: "Agence réactivée." });
}

export async function actionNoteInterneAgence(fd: FormData) {
  const { admin } = await exigerAdmin("agences.notes");
  const id = nb(fd, "id");
  const note = txt(fd, "notes_internes").slice(0, 4000);
  if (!id) redirect("/admin/agences");
  ecrire("UPDATE agences SET notes_internes = ? WHERE id = ?", note || null, id);
  journaliser(admin, { action: "agence.note_interne", cible_type: "agence", cible_id: id });
  retour(`/admin/agences/${id}`, { ok: "Note enregistrée. Elle reste invisible pour l'agence." });
}

/* ==================================================================
   Utilisateurs
   ================================================================== */

export async function actionBasculerUtilisateur(fd: FormData) {
  const { admin } = await exigerAdmin("utilisateurs.ecrire");
  const id = nb(fd, "id");
  const motif = txt(fd, "motif");
  const u = un<{ email: string; actif: number }>("SELECT email, actif FROM utilisateurs WHERE id = ?", id);
  if (!u) retour("/admin/utilisateurs", { erreur: "Utilisateur introuvable." });

  // Un administrateur ne se coupe pas lui-meme l'acces par inadvertance.
  if (u.email.toLowerCase() === admin.email) {
    retour("/admin/utilisateurs", { erreur: "Vous ne pouvez pas suspendre votre propre compte." });
  }
  if (u.actif && motif.length < 10) {
    retour("/admin/utilisateurs", { erreur: "Indiquez un motif d'au moins dix caractères pour suspendre." });
  }

  const nouveau = u.actif ? 0 : 1;
  ecrire("UPDATE utilisateurs SET actif = ? WHERE id = ?", nouveau, id);
  if (!nouveau) ecrire("DELETE FROM sessions WHERE utilisateur_id = ?", id);
  journaliser(admin, {
    action: nouveau ? "utilisateur.reactive" : "utilisateur.suspendu",
    cible_type: "utilisateur", cible_id: id, motif: nouveau ? null : motif, details: u.email,
  });
  revalidatePath("/admin/utilisateurs");
  retour("/admin/utilisateurs", {
    ok: nouveau ? "Accès rétabli." : "Accès suspendu et sessions fermées.",
  });
}

export async function actionRevoquerSessions(fd: FormData) {
  const { admin } = await exigerAdmin("utilisateurs.ecrire");
  const id = nb(fd, "id");
  const u = un<{ email: string }>("SELECT email FROM utilisateurs WHERE id = ?", id);
  if (!u) retour("/admin/utilisateurs", { erreur: "Utilisateur introuvable." });
  const r = ecrire("DELETE FROM sessions WHERE utilisateur_id = ?", id);
  journaliser(admin, {
    action: "utilisateur.sessions_revoquees", cible_type: "utilisateur", cible_id: id,
    details: `${r.changes} session(s) · ${u.email}`,
  });
  retour("/admin/utilisateurs", { ok: `${r.changes} session(s) fermée(s).` });
}

/**
 * Envoie le parcours normal de recuperation d'acces.
 *
 * L'administrateur ne voit ni ne choisit le mot de passe : il declenche le
 * meme lien que le bouton « mot de passe oublié », qui part a l'adresse de
 * l'utilisateur. Rien ici ne permet d'entrer a sa place.
 */
export async function actionEnvoyerRecuperation(fd: FormData) {
  const { admin } = await exigerAdmin("utilisateurs.ecrire");
  const id = nb(fd, "id");
  const u = un<{ email: string }>("SELECT email FROM utilisateurs WHERE id = ?", id);
  if (!u) retour("/admin/utilisateurs", { erreur: "Utilisateur introuvable." });

  const demande = creerDemandeReinitialisation(u.email);
  if (!demande) retour("/admin/utilisateurs", { erreur: "Ce compte est inactif : réactivez-le d'abord." });

  const lien = `${await adresseDuSite()}/reinitialiser/${demande.token}`;
  const envoi = await envoyerEmail({
    destinataire: u.email,
    sujet: "Réinitialisation de votre mot de passe Sen Gestion",
    texte:
`Bonjour ${demande.nom},

À la demande de l'équipe Sen Gestion, voici un lien pour choisir un nouveau
mot de passe :
${lien}

Ce lien est valable une heure et ne peut servir qu'une seule fois.

L'équipe Sen Gestion`,
  });
  journaliser(admin, {
    action: "utilisateur.recuperation_envoyee", cible_type: "utilisateur", cible_id: id,
    details: u.email,
  });
  retour("/admin/utilisateurs", envoi
    ? { ok: `Lien de récupération envoyé à ${u.email}.` }
    : { erreur: "L'envoi d'e-mail n'est pas configuré : aucun message n'est parti." });
}

/* ==================================================================
   Moderation des annonces
   ================================================================== */

const MODERATIONS = ["publie", "en_attente", "refuse", "archive"] as const;

export async function actionModererAnnonce(fd: FormData) {
  const { admin } = await exigerAdmin("annonces.moderer");
  const id = nb(fd, "id");
  const statut = txt(fd, "moderation");
  const motif = txt(fd, "motif");
  const retourA = txt(fd, "retour") || "/admin/annonces";

  if (!MODERATIONS.includes(statut as (typeof MODERATIONS)[number])) {
    retour(retourA, { erreur: "Statut de modération inconnu." });
  }
  // Un refus sans motif laisse l'agence sans rien a corriger.
  if ((statut === "refuse" || statut === "archive") && motif.length < 10) {
    retour(retourA, { erreur: "Indiquez un motif d'au moins dix caractères." });
  }
  const bien = un<{ titre: string; agence_id: number }>(
    "SELECT titre, agence_id FROM biens WHERE id = ?", id);
  if (!bien) retour(retourA, { erreur: "Annonce introuvable." });

  ecrire(
    `UPDATE biens SET moderation = ?, moderation_motif = ?,
            moderation_le = datetime('now'), moderation_par = ? WHERE id = ?`,
    statut, motif || null, admin.email, id,
  );
  journaliser(admin, {
    action: `annonce.${statut}`, cible_type: "bien", cible_id: id,
    motif: motif || null, details: bien.titre,
  });
  revalidatePath("/admin/annonces");
  revalidatePath("/");
  retour(retourA, { ok: "Modération enregistrée." });
}

/* ==================================================================
   Artisans
   ================================================================== */

export async function actionSuspendreArtisan(fd: FormData) {
  const { admin } = await exigerAdmin("artisans.moderer");
  const id = nb(fd, "id");
  const motif = txt(fd, "motif");
  const a = un<{ nom: string; suspendu_le: string | null }>(
    "SELECT nom, suspendu_le FROM artisans WHERE id = ?", id);
  if (!a) retour("/admin/artisans", { erreur: "Artisan introuvable." });

  if (a.suspendu_le) {
    ecrire("UPDATE artisans SET suspendu_le = NULL, motif_suspension = NULL, publie = 1 WHERE id = ?", id);
    journaliser(admin, { action: "artisan.reactive", cible_type: "artisan", cible_id: id, details: a.nom });
    retour("/admin/artisans", { ok: "Artisan réactivé et de nouveau visible." });
  }
  if (motif.length < 10) {
    retour("/admin/artisans", { erreur: "Indiquez un motif d'au moins dix caractères." });
  }
  ecrire(
    "UPDATE artisans SET suspendu_le = datetime('now'), motif_suspension = ?, publie = 0 WHERE id = ?",
    motif, id,
  );
  ecrire("DELETE FROM sessions_artisans WHERE artisan_id = ?", id);
  journaliser(admin, {
    action: "artisan.suspendu", cible_type: "artisan", cible_id: id, motif, details: a.nom,
  });
  retour("/admin/artisans", { ok: "Artisan suspendu et retiré de l'annuaire." });
}

/**
 * Le badge « Vérifié ».
 *
 * Il ne s'attribue JAMAIS tout seul. Trois conditions, verifiees ici et non
 * seulement a l'ecran : la candidature est validee, le quiz metier est
 * reussi, et un administrateur pose le badge en connaissance de cause. La
 * date et le nom de qui l'a pose restent en base.
 */
export async function actionVerifierArtisan(fd: FormData) {
  const { admin } = await exigerAdmin("artisans.moderer");
  const id = nb(fd, "id");
  const a = un<{ nom: string; statut_candidature: string; quiz_reussi: number; verifie_le: string | null }>(
    "SELECT nom, statut_candidature, quiz_reussi, verifie_le FROM artisans WHERE id = ?", id);
  if (!a) retour("/admin/artisans", { erreur: "Artisan introuvable." });

  if (a.verifie_le) {
    ecrire("UPDATE artisans SET verifie_le = NULL, verifie_par = NULL WHERE id = ?", id);
    journaliser(admin, { action: "artisan.badge_retire", cible_type: "artisan", cible_id: id, details: a.nom });
    retour("/admin/artisans", { ok: "Badge retiré." });
  }
  if (a.statut_candidature !== "valide") {
    retour("/admin/artisans", { erreur: "Candidature non validée : le badge ne peut pas être attribué." });
  }
  if (!a.quiz_reussi) {
    retour("/admin/artisans", { erreur: "Questionnaire métier non réussi : le badge ne peut pas être attribué." });
  }
  ecrire("UPDATE artisans SET verifie_le = datetime('now'), verifie_par = ? WHERE id = ?", admin.email, id);
  journaliser(admin, { action: "artisan.badge_attribue", cible_type: "artisan", cible_id: id, details: a.nom });
  retour("/admin/artisans", { ok: "Badge « Vérifié » attribué." });
}

/* ==================================================================
   Signalements
   ================================================================== */

/**
 * Le moderateur tranche un signalement : retenu, ou classe sans suite.
 *
 * CE GESTE NE TOUCHE PAS AU CONTENU SIGNALE. Retenir un signalement dit
 * « la personne avait raison » ; retirer l'annonce est une autre decision,
 * qui se prend en moderation et exige son propre motif. Les confondre
 * ferait disparaitre une annonce sans qu'aucun ecran ne dise pourquoi.
 */
export async function actionTraiterSignalement(fd: FormData) {
  const { admin } = await exigerAdmin("signalements.traiter");
  const id = nb(fd, "id");
  const decision = txt(fd, "decision");
  const motif = txt(fd, "motif");

  const s = lireSignalement(id);
  if (!s) redirect("/admin/signalements");
  if (decision !== "retenu" && decision !== "classe") {
    retour(`/admin/signalements/${id}`, { erreur: "Décision inconnue." });
  }
  // Un classement sans explication laisse le suivant devant la meme question.
  if (motif.length < 10) {
    retour(`/admin/signalements/${id}`, { erreur: "Expliquez votre décision en dix caractères au minimum." });
  }

  ecrire(
    `UPDATE signalements SET statut = ?, motif_decision = ?,
            traite_par = ?, traite_le = datetime('now') WHERE id = ?`,
    decision, motif, admin.email, id,
  );
  journaliser(admin, {
    action: decision === "retenu" ? "signalement.retenu" : "signalement.classe",
    cible_type: "signalement", cible_id: id, motif,
    details: `${s.cible_type} n°${s.cible_id}${s.cible_titre ? ` · ${s.cible_titre}` : ""}`,
  });
  revalidatePath("/admin/signalements");
  retour(`/admin/signalements/${id}`, {
    ok: decision === "retenu"
      ? "Signalement retenu. Le contenu reste en ligne tant qu'il n'est pas modéré."
      : "Signalement classé sans suite.",
  });
}

/* ==================================================================
   Support (tickets)
   ================================================================== */

export async function actionRepondreTicket(fd: FormData) {
  const { admin } = await exigerAdmin("support.repondre");
  const id = nb(fd, "id");
  const corps = txt(fd, "corps");
  const ticket = ticketPourEquipe(id);
  if (!ticket) redirect("/admin/support");
  if (corps.length < 2) retour(`/admin/support/${id}`, { erreur: "Écrivez une réponse." });

  ajouterMessage({ ticketId: id, auteurType: "equipe", auteur: admin.email, corps, interne: false });
  // Une reponse a un ticket nouveau le fait avancer : personne n'a besoin
  // de changer le statut a la main pour dire qu'on s'en occupe.
  if (ticket.statut === "nouveau") {
    ecrire("UPDATE tickets SET statut = 'en_cours' WHERE id = ?", id);
  }
  journaliser(admin, { action: "ticket.reponse", cible_type: "ticket", cible_id: ticket.numero });
  revalidatePath("/admin/support");
  retour(`/admin/support/${id}`, { ok: "Réponse envoyée à l'agence." });
}

export async function actionNoteInterneTicket(fd: FormData) {
  const { admin } = await exigerAdmin("support.repondre");
  const id = nb(fd, "id");
  const corps = txt(fd, "corps");
  const ticket = ticketPourEquipe(id);
  if (!ticket) redirect("/admin/support");
  if (corps.length < 2) retour(`/admin/support/${id}`, { erreur: "Écrivez une note." });

  ajouterMessage({ ticketId: id, auteurType: "equipe", auteur: admin.email, corps, interne: true });
  journaliser(admin, { action: "ticket.note_interne", cible_type: "ticket", cible_id: ticket.numero });
  retour(`/admin/support/${id}`, { ok: "Note interne ajoutée. L'agence ne la voit pas." });
}

export async function actionGererTicket(fd: FormData) {
  const { admin } = await exigerAdmin("support.repondre");
  const id = nb(fd, "id");
  const statut = txt(fd, "statut");
  const priorite = txt(fd, "priorite");
  const responsable = txt(fd, "responsable");
  const ticket = ticketPourEquipe(id);
  if (!ticket) redirect("/admin/support");

  if (!estStatut(statut)) retour(`/admin/support/${id}`, { erreur: "Statut inconnu." });
  if (!estPriorite(priorite)) retour(`/admin/support/${id}`, { erreur: "Priorité inconnue." });

  ecrire(
    `UPDATE tickets SET statut = ?, priorite = ?, responsable = ?,
            resolu_le = CASE WHEN ? = 'resolu' THEN datetime('now') ELSE NULL END
      WHERE id = ?`,
    statut, priorite, responsable || null, statut, id,
  );
  journaliser(admin, {
    action: "ticket.mis_a_jour", cible_type: "ticket", cible_id: ticket.numero,
    details: `statut=${statut} · priorité=${priorite}${responsable ? ` · ${responsable}` : ""}`,
  });
  revalidatePath("/admin/support");
  retour(`/admin/support/${id}`, { ok: "Ticket mis à jour." });
}

/* ==================================================================
   L'equipe d'administration
   ================================================================== */

export async function actionEnregistrerMembre(fd: FormData) {
  const { admin } = await exigerAdmin("admins.gerer");
  const email = txt(fd, "email").toLowerCase();
  const nom = txt(fd, "nom");
  const role = txt(fd, "role") as RoleAdmin;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    retour("/admin/equipe", { erreur: "Adresse e-mail invalide." });
  }
  if (!(role in ROLES)) retour("/admin/equipe", { erreur: "Rôle inconnu." });
  // Le super administrateur ne se distribue pas depuis l'ecran : il vient de
  // ADMIN_EMAILS, chez l'hebergeur. C'est ce qui empeche une prise de
  // controle complete depuis l'application seule.
  if (role === "super_admin") {
    retour("/admin/equipe", {
      erreur: "Le rôle super administrateur s'accorde dans ADMIN_EMAILS, chez l'hébergeur.",
    });
  }

  const existe = un<{ id: number }>("SELECT id FROM admins WHERE email = ?", email);
  if (existe) {
    ecrire("UPDATE admins SET nom = ?, role = ?, actif = 1 WHERE email = ?", nom || null, role, email);
    journaliser(admin, { action: "equipe.role_modifie", cible_type: "admin", cible_id: email, details: role });
  } else {
    ecrire(
      "INSERT INTO admins (email, nom, role, actif, cree_par) VALUES (?, ?, ?, 1, ?)",
      email, nom || null, role, admin.email,
    );
    journaliser(admin, { action: "equipe.membre_ajoute", cible_type: "admin", cible_id: email, details: role });
  }
  retour("/admin/equipe", { ok: `Accès enregistré pour ${email}.` });
}

export async function actionDesactiverMembre(fd: FormData) {
  const { admin } = await exigerAdmin("admins.gerer");
  const email = txt(fd, "email").toLowerCase();
  if (email === admin.email) {
    retour("/admin/equipe", { erreur: "Vous ne pouvez pas retirer votre propre accès." });
  }
  const cible = adminPour(email);
  if (cible?.source === "variable") {
    retour("/admin/equipe", {
      erreur: "Cette adresse est dans ADMIN_EMAILS : retirez-la chez l'hébergeur.",
    });
  }
  ecrire("UPDATE admins SET actif = 0 WHERE email = ?", email);
  revoquerSessionsAdmin(email);
  journaliser(admin, { action: "equipe.acces_retire", cible_type: "admin", cible_id: email });
  retour("/admin/equipe", { ok: `Accès retiré à ${email}, sessions fermées.` });
}

/** Retire la seconde verification d'un membre : il devra la reposer a l'entree. */
export async function actionReinitialiserDoubleFacteur(fd: FormData) {
  const { admin } = await exigerAdmin("admins.gerer");
  const email = txt(fd, "email").toLowerCase();
  ecrire("UPDATE admins SET totp_secret = NULL, totp_actif = 0 WHERE email = ?", email);
  revoquerSessionsAdmin(email);
  journaliser(admin, { action: "equipe.double_facteur_reinitialise", cible_type: "admin", cible_id: email });
  retour("/admin/equipe", { ok: `${email} devra réactiver sa seconde vérification.` });
}
