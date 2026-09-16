"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { un, ecrire } from "./db";
import {
  inscrire, ouvrirSession, fermerSession, verifierMotDePasse,
  demanderReinitialisation, reinitialiser, hacher, motDePasseAcceptable,
  utilisateurCourant,
} from "./auth";
import { limiter, messageAttente } from "./limites";
import { contenuParDefaut } from "./sections";

/**
 * Les actions de compte : inscription, connexion, récupération.
 *
 * Toutes sont limitées en débit AVANT toute lecture de mot de passe. La clé
 * mélange l'adresse IP et l'adresse e-mail visée : limiter par IP seule
 * laisserait attaquer un compte depuis un réseau mobile qui change d'adresse,
 * limiter par e-mail seul permettrait à un tiers de bloquer le compte de
 * quelqu'un d'autre en échouant exprès.
 */

export type Etat = { erreur?: string; message?: string };

async function origine(): Promise<string> {
  const entetes = await headers();
  // Derrière un répartiteur, l'adresse réelle est dans X-Forwarded-For. On
  // prend la PREMIÈRE, seule non falsifiable par le client quand le
  // répartiteur réécrit l'en-tête.
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || entetes.get("x-real-ip") || "inconnue";
}

// ---------------------------------------------------------------------------
//  Inscription
// ---------------------------------------------------------------------------

export async function actionInscription(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const ip = await origine();
  const verdict = limiter(`inscription:${ip}`, 5, 3600);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const nomBoutique = String(donnees.get("nom_boutique") ?? "");
  const nom = String(donnees.get("nom") ?? "");
  const email = String(donnees.get("email") ?? "");
  const telephone = String(donnees.get("telephone") ?? "");
  const motDePasse = String(donnees.get("mot_de_passe") ?? "");

  const resultat = inscrire({ nomBoutique, nom, email, telephone, motDePasse });
  if (!resultat.ok) return { erreur: resultat.erreur };

  // La boutique neuve reçoit un brouillon de départ : sans lui, l'éditeur
  // s'ouvrirait sur une page blanche, et l'aperçu de l'assistant n'aurait
  // rien à montrer.
  ecrire(
    "UPDATE boutiques SET brouillon = ? WHERE id = ?",
    JSON.stringify(contenuParDefaut(nomBoutique.trim())), resultat.boutiqueId,
  );

  await ouvrirSession(resultat.utilisateurId);
  redirect("/creer");
}

// ---------------------------------------------------------------------------
//  Connexion
// ---------------------------------------------------------------------------

export async function actionConnexion(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const email = String(donnees.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(donnees.get("mot_de_passe") ?? "");
  const ip = await origine();

  const verdict = limiter(`connexion:${ip}:${email}`, 8, 900);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const utilisateur = un<{ id: number; mot_de_passe_hash: string; boutique_id: number }>(
    "SELECT id, mot_de_passe_hash, boutique_id FROM utilisateurs WHERE email = ? AND actif = 1",
    email,
  );

  // Un seul message pour « adresse inconnue » et « mot de passe faux » : dire
  // laquelle des deux est fausse revient à confirmer qui a un compte ici.
  const refus = { erreur: "Adresse e-mail ou mot de passe incorrect." };
  if (!utilisateur) return refus;
  if (!verifierMotDePasse(motDePasse, utilisateur.mot_de_passe_hash)) return refus;

  const boutique = un<{ suspendue_le: string | null; motif_suspension: string | null; assistant_fini_le: string | null }>(
    "SELECT suspendue_le, motif_suspension, assistant_fini_le FROM boutiques WHERE id = ?",
    utilisateur.boutique_id,
  );
  if (boutique?.suspendue_le) {
    return {
      erreur: boutique.motif_suspension
        ? `Votre boutique est suspendue : ${boutique.motif_suspension}`
        : "Votre boutique est suspendue. Écrivez-nous pour en connaître la raison.",
    };
  }

  await ouvrirSession(utilisateur.id);
  // Un commerçant qui n'a pas fini l'assistant y retourne : c'est là qu'il a
  // laissé son travail.
  redirect(boutique?.assistant_fini_le ? "/tableau-de-bord" : "/creer");
}

export async function actionDeconnexion() {
  await fermerSession();
  redirect("/");
}

// ---------------------------------------------------------------------------
//  Mot de passe oublié
// ---------------------------------------------------------------------------

export async function actionMotDePasseOublie(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const email = String(donnees.get("email") ?? "").trim().toLowerCase();
  const ip = await origine();
  const verdict = limiter(`oubli:${ip}`, 5, 900);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const jeton = demanderReinitialisation(email);

  // Réponse IDENTIQUE que l'adresse existe ou non.
  const message = "Si un compte existe pour cette adresse, un lien de réinitialisation "
    + "vient d'être préparé. Il est valable deux heures.";

  if (!jeton) return { message };

  const lien = `${process.env.NOVA_URL_PUBLIQUE ?? "http://localhost:3100"}/reinitialiser/${jeton}`;

  // Pas de service d'e-mail branché sur cette installation : le lien part
  // dans le journal du serveur, et l'administrateur le transmet. Afficher le
  // lien à l'écran reviendrait à laisser n'importe qui réinitialiser
  // n'importe quel compte en devinant une adresse.
  if (!process.env.NOVA_SMTP_URL) {
    console.warn(
      `[NOVA] Réinitialisation demandée pour ${email}. `
      + `Aucun service d'e-mail configuré (NOVA_SMTP_URL). Lien : ${lien}`,
    );
    return {
      message: message + " L'envoi d'e-mails n'est pas encore branché sur ce serveur : "
        + "contactez l'assistance, le lien est dans le journal du serveur.",
    };
  }

  try {
    await envoyerLien(email, lien);
  } catch (e) {
    ecrire(
      "INSERT INTO journal_erreurs (source, message, details) VALUES ('email', ?, ?)",
      "Envoi du lien de réinitialisation impossible", String((e as Error).message).slice(0, 500),
    );
  }
  return { message };
}

/**
 * Envoi de l'e-mail.
 *
 * Volontairement minimal et sans dépendance : une requête HTTP vers le service
 * d'envoi configuré. La variable NOVA_SMTP_URL attend l'adresse d'une API
 * d'envoi qui accepte { destinataire, sujet, texte }. Voir .env.example.
 */
async function envoyerLien(email: string, lien: string) {
  const reponse = await fetch(process.env.NOVA_SMTP_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.NOVA_SMTP_CLE ? { authorization: `Bearer ${process.env.NOVA_SMTP_CLE}` } : {}),
    },
    body: JSON.stringify({
      destinataire: email,
      sujet: "Réinitialiser votre mot de passe NOVA Boutique",
      texte: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien :\n${lien}\n\n`
        + `Il est valable deux heures. Si vous n'avez rien demandé, ignorez ce message.\n\n`
        + `— NOVA Boutique`,
    }),
  });
  if (!reponse.ok) throw new Error(`Service d'e-mail : ${reponse.status}`);
}

export async function actionReinitialiser(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const jeton = String(donnees.get("jeton") ?? "");
  const motDePasse = String(donnees.get("mot_de_passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");

  if (motDePasse !== confirmation) {
    return { erreur: "Les deux mots de passe ne sont pas identiques." };
  }
  const resultat = reinitialiser(jeton, motDePasse);
  if (!resultat.ok) return { erreur: resultat.erreur };

  redirect("/connexion?message=" + encodeURIComponent(
    "Votre mot de passe est changé. Connectez-vous."));
}

// ---------------------------------------------------------------------------
//  Changement de mot de passe depuis l'espace connecté
// ---------------------------------------------------------------------------

export async function actionChangerMotDePasse(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return { erreur: "Votre session a expiré. Reconnectez-vous." };

  const actuel = String(donnees.get("actuel") ?? "");
  const nouveau = String(donnees.get("nouveau") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");

  const ligne = un<{ mot_de_passe_hash: string }>(
    "SELECT mot_de_passe_hash FROM utilisateurs WHERE id = ?", utilisateur.id,
  );
  if (!ligne || !verifierMotDePasse(actuel, ligne.mot_de_passe_hash)) {
    return { erreur: "Le mot de passe actuel est incorrect." };
  }
  if (nouveau !== confirmation) return { erreur: "Les deux mots de passe ne sont pas identiques." };
  const faible = motDePasseAcceptable(nouveau);
  if (faible) return { erreur: faible };

  ecrire("UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?", hacher(nouveau), utilisateur.id);
  return { message: "Mot de passe changé." };
}
