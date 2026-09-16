"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { un, ecrire, transaction } from "./db";
import { connecterAdmin, deconnecterAdmin, exigerAdmin, journaliser } from "./admin";
import { limiter, messageAttente } from "./limites";

/**
 * Les actions de l'administration.
 *
 * Toutes commencent par `exigerAdmin()`. Trois d'entre elles touchent
 * directement a la vie d'un commercant — suspension, changement d'offre,
 * activation d'abonnement — et exigent donc un MOTIF, enregistre au journal.
 * Un acces coupe sans explication est le plus sur moyen de perdre un client
 * et de ne pas savoir pourquoi six mois plus tard.
 */

export type Etat = { erreur?: string; message?: string };

function texte(valeur: FormDataEntryValue | null, max: number): string {
  return String(valeur ?? "").trim().slice(0, max);
}

function entier(valeur: FormDataEntryValue | null): number {
  const n = Math.trunc(Number(String(valeur ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function actionConnexionAdmin(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const entetes = await headers();
  const ip = entetes.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";

  // Plus severe que pour les commercants : cinq essais par quart d'heure.
  const verdict = limiter(`admin:${ip}`, 5, 900);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const resultat = await connecterAdmin(
    texte(donnees.get("email"), 160), String(donnees.get("mot_de_passe") ?? ""),
  );
  if (!resultat.ok) return { erreur: resultat.erreur };
  redirect("/administration");
}

export async function actionDeconnexionAdmin() {
  await deconnecterAdmin();
  redirect("/administration/connexion");
}

// ---------------------------------------------------------------------------
//  Boutiques
// ---------------------------------------------------------------------------

export async function actionSuspendre(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const motif = texte(donnees.get("motif"), 500);

  if (motif.length < 10) {
    return {
      erreur: "Indiquez un motif d'au moins dix caractères : il est montré au "
        + "commerçant et conservé au journal.",
    };
  }
  const boutique = un<{ nom: string }>("SELECT nom FROM boutiques WHERE id = ?", id);
  if (!boutique) return { erreur: "Cette boutique n'existe pas." };

  transaction(() => {
    ecrire(
      "UPDATE boutiques SET suspendue_le = datetime('now'), motif_suspension = ? WHERE id = ?",
      motif, id,
    );
    // Les sessions ouvertes tombent : sans cela, le commercant garderait
    // l'acces jusqu'a l'expiration de son cookie.
    ecrire(
      `DELETE FROM sessions WHERE utilisateur_id IN
         (SELECT id FROM utilisateurs WHERE boutique_id = ?)`,
      id,
    );
    journaliser(admin.id, "suspension", `boutique:${id}`, motif, boutique.nom);
  });

  revalidatePath("/administration/boutiques");
  revalidatePath(`/administration/boutiques/${id}`);
  return { message: `${boutique.nom} est suspendue. Sa boutique publique renvoie une page introuvable.` };
}

export async function actionRetablir(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const motif = texte(donnees.get("motif"), 500);

  const boutique = un<{ nom: string }>("SELECT nom FROM boutiques WHERE id = ?", id);
  if (!boutique) return { erreur: "Cette boutique n'existe pas." };

  ecrire(
    "UPDATE boutiques SET suspendue_le = NULL, motif_suspension = NULL WHERE id = ?", id,
  );
  journaliser(admin.id, "retablissement", `boutique:${id}`, motif || null, boutique.nom);

  revalidatePath("/administration/boutiques");
  revalidatePath(`/administration/boutiques/${id}`);
  return { message: `${boutique.nom} est rétablie.` };
}

export async function actionChangerOffre(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const code = texte(donnees.get("offre"), 40);
  const mois = Math.min(24, Math.max(0, Number(donnees.get("mois")) || 0));
  const motif = texte(donnees.get("motif"), 500);

  const offre = un<{ code: string; nom: string }>("SELECT code, nom FROM offres WHERE code = ?", code);
  if (!offre) return { erreur: "Cette formule n'existe pas." };
  if (!un("SELECT id FROM boutiques WHERE id = ?", id)) {
    return { erreur: "Cette boutique n'existe pas." };
  }

  ecrire(
    `UPDATE boutiques SET offre = ?,
            offre_expire_le = CASE WHEN ? > 0 THEN datetime('now', ?) ELSE NULL END
      WHERE id = ?`,
    offre.code, mois, `+${mois} months`, id,
  );
  journaliser(admin.id, "changement_offre", `boutique:${id}`, motif || null,
    `${offre.nom}${mois > 0 ? ` pour ${mois} mois` : " sans échéance"}`);

  revalidatePath(`/administration/boutiques/${id}`);
  return { message: `Formule ${offre.nom} appliquée.` };
}

export async function actionNoteInterne(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const notes = texte(donnees.get("notes"), 4000);

  ecrire("UPDATE boutiques SET notes_internes = ? WHERE id = ?", notes || null, id);
  journaliser(admin.id, "note_interne", `boutique:${id}`, null);
  revalidatePath(`/administration/boutiques/${id}`);
  return { message: "Note enregistrée. Elle n'est jamais visible par le commerçant." };
}

// ---------------------------------------------------------------------------
//  Offres
// ---------------------------------------------------------------------------

/**
 * Modifie une offre. Les tarifs du cahier des charges sont des hypotheses de
 * depart : ils se reglent ici, sans redeployer.
 */
export async function actionEnregistrerOffre(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const code = texte(donnees.get("code"), 40);
  if (!un("SELECT code FROM offres WHERE code = ?", code)) {
    return { erreur: "Cette formule n'existe pas." };
  }

  const nom = texte(donnees.get("nom"), 60);
  if (nom.length < 2) return { erreur: "Donnez un nom à cette formule." };

  ecrire(
    `UPDATE offres SET nom = ?, prix_mensuel = ?, max_produits = ?, quota_ia = ?,
            max_membres = ?, domaine_personnalise = ?, publication = ?, accroche = ?, actif = ?
      WHERE code = ?`,
    nom,
    Math.max(0, Number(donnees.get("prix_mensuel")) || 0),
    Math.max(0, Number(donnees.get("max_produits")) || 0),
    Math.max(0, Number(donnees.get("quota_ia")) || 0),
    Math.max(1, Number(donnees.get("max_membres")) || 1),
    donnees.get("domaine_personnalise") === "1" ? 1 : 0,
    donnees.get("publication") === "1" ? 1 : 0,
    texte(donnees.get("accroche"), 200) || null,
    donnees.get("actif") === "1" ? 1 : 0,
    code,
  );
  journaliser(admin.id, "modification_offre", `offre:${code}`, null, nom);

  revalidatePath("/administration/offres");
  revalidatePath("/tarifs");
  revalidatePath("/");
  return { message: `Formule ${nom} enregistrée. Les tarifs affichés suivent immédiatement.` };
}

// ---------------------------------------------------------------------------
//  Abonnements
// ---------------------------------------------------------------------------

export async function actionActiverAbonnement(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const mois = Math.min(24, Math.max(1, Number(donnees.get("mois")) || 1));
  const motif = texte(donnees.get("motif"), 500);

  const abonnement = un<{ boutique_id: number; offre: string; montant: number }>(
    "SELECT boutique_id, offre, montant FROM abonnements WHERE id = ? AND statut = 'en_attente'", id,
  );
  if (!abonnement) return { erreur: "Cette demande n'existe plus ou est déjà traitée." };

  transaction(() => {
    ecrire(
      `UPDATE abonnements SET statut = 'regle', periode_debut = datetime('now'),
              periode_fin = datetime('now', ?) WHERE id = ?`,
      `+${mois} months`, id,
    );
    ecrire(
      "UPDATE boutiques SET offre = ?, offre_expire_le = datetime('now', ?) WHERE id = ?",
      abonnement.offre, `+${mois} months`, abonnement.boutique_id,
    );
    journaliser(admin.id, "activation_abonnement", `boutique:${abonnement.boutique_id}`,
      motif || null, `${abonnement.offre}, ${mois} mois, ${abonnement.montant}`);
  });

  revalidatePath("/administration/abonnements");
  return { message: `Formule ${abonnement.offre} activée pour ${mois} mois.` };
}

export async function actionRefuserAbonnement(donnees: FormData) {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  ecrire("UPDATE abonnements SET statut = 'echoue' WHERE id = ? AND statut = 'en_attente'", id);
  journaliser(admin.id, "refus_abonnement", `abonnement:${id}`, null);
  revalidatePath("/administration/abonnements");
}

// ---------------------------------------------------------------------------
//  Assistance
// ---------------------------------------------------------------------------

export async function actionRepondreAssistance(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  const reponse = texte(donnees.get("reponse"), 4000);
  if (reponse.length < 5) return { erreur: "Écrivez une réponse." };

  ecrire(
    `UPDATE demandes_assistance SET reponse = ?, statut = 'repondue', repondu_le = datetime('now')
      WHERE id = ?`,
    reponse, id,
  );
  journaliser(admin.id, "reponse_assistance", `demande:${id}`, null);
  revalidatePath("/administration/assistance");
  return { message: "Réponse enregistrée. Le commerçant la voit dans ses paramètres." };
}

export async function actionCloreAssistance(donnees: FormData) {
  const admin = await exigerAdmin();
  const id = entier(donnees.get("id"));
  ecrire("UPDATE demandes_assistance SET statut = 'close' WHERE id = ?", id);
  journaliser(admin.id, "cloture_assistance", `demande:${id}`, null);
  revalidatePath("/administration/assistance");
}
