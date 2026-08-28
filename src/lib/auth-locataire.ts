import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, un, ecrire } from "./db";
import { hacherMotDePasse, verifierMotDePasse } from "./auth";

/**
 * Authentification de l'espace locataire.
 *
 * Volontairement separee de l'authentification de l'agence : cookie
 * different, table de sessions differente. Un locataire ne doit jamais
 * pouvoir se retrouver, meme par accident, avec les droits d'une agence.
 */

const COOKIE = "sen_session_locataire";
const DUREE_JOURS = 30;

export type Locataire2 = {
  id: number;
  agence_id: number;
  prenom: string;
  nom: string;
  telephone: string;
};

/** Ne garde que les chiffres, pour comparer deux numeros ecrits differemment. */
export function normaliserTelephone(tel: string): string {
  const chiffres = tel.replace(/\D/g, "");
  // "221771234567" et "771234567" doivent être reconnus comme le même numéro.
  return chiffres.startsWith("221") ? chiffres.slice(3) : chiffres;
}

/** Cree une session et depose le cookie de connexion du locataire. */
export async function ouvrirSessionLocataire(locataireId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_JOURS * 86400_000);
  ecrire(
    "INSERT INTO sessions_locataires (token, locataire_id, expire_le) VALUES (?, ?, ?)",
    token, locataireId, expire.toISOString(),
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expire,
    path: "/",
  });
}

export async function fermerSessionLocataire() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) ecrire("DELETE FROM sessions_locataires WHERE token = ?", token);
  jar.delete(COOKIE);
}

export async function locataireCourant(): Promise<Locataire2 | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const ligne = un<Locataire2 & { expire_le: string }>(
    `SELECT l.id, l.agence_id, l.prenom, l.nom, l.telephone, s.expire_le
       FROM sessions_locataires s
       JOIN locataires l ON l.id = s.locataire_id
      WHERE s.token = ? AND l.acces_actif = 1`,
    token,
  );
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions_locataires WHERE token = ?", token);
    return null;
  }
  return ligne;
}

export async function exigerSessionLocataire(): Promise<Locataire2> {
  const locataire = await locataireCourant();
  if (!locataire) redirect("/espace-locataire/connexion");
  return locataire;
}

/**
 * Verifie le telephone et le mot de passe.
 * Un meme numero peut, en theorie, correspondre a des locataires de
 * plusieurs agences : le cas est signale plutot que de deviner.
 */
export function verifierIdentifiantsLocataire(
  telephone: string, motDePasse: string,
): { ok: true; id: number } | { ok: false; erreur: string } {
  const cherche = normaliserTelephone(telephone);
  if (cherche.length < 9) return { ok: false, erreur: "Numéro de téléphone incorrect." };

  const candidats = db.prepare(
    `SELECT id, telephone, mot_de_passe_hash FROM locataires
      WHERE acces_actif = 1 AND mot_de_passe_hash IS NOT NULL`,
  ).all() as { id: number; telephone: string; mot_de_passe_hash: string }[];

  const correspondants = candidats.filter((c) => normaliserTelephone(c.telephone) === cherche);

  if (correspondants.length === 0) return { ok: false, erreur: "Numéro ou mot de passe incorrect." };
  if (correspondants.length > 1) {
    return { ok: false, erreur: "Ce numéro correspond à plusieurs comptes : contactez votre agence." };
  }

  const [seul] = correspondants;
  if (!verifierMotDePasse(motDePasse, seul.mot_de_passe_hash)) {
    return { ok: false, erreur: "Numéro ou mot de passe incorrect." };
  }
  return { ok: true, id: seul.id };
}

const CARACTERES_LISIBLES = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans 0/O/1/I/l, pour la dictée orale

/** Mot de passe lisible et facile à communiquer par WhatsApp ou par téléphone. */
export function genererMotDePasseLisible(): string {
  let mot = "";
  for (let i = 0; i < 8; i++) {
    mot += CARACTERES_LISIBLES[crypto.randomInt(CARACTERES_LISIBLES.length)];
  }
  return mot;
}

/** Active (ou réinitialise) l'accès à l'espace locataire. Renvoie le mot de passe en clair, à communiquer une seule fois. */
export function activerAccesLocataire(locataireId: number): string {
  const motDePasse = genererMotDePasseLisible();
  ecrire(
    "UPDATE locataires SET mot_de_passe_hash = ?, acces_actif = 1 WHERE id = ?",
    hacherMotDePasse(motDePasse), locataireId,
  );
  // Un nouveau mot de passe invalide les sessions déjà ouvertes.
  ecrire("DELETE FROM sessions_locataires WHERE locataire_id = ?", locataireId);
  return motDePasse;
}

/** Coupe l'accès au portail sans supprimer le locataire. */
export function desactiverAccesLocataire(locataireId: number) {
  ecrire("UPDATE locataires SET acces_actif = 0 WHERE id = ?", locataireId);
  ecrire("DELETE FROM sessions_locataires WHERE locataire_id = ?", locataireId);
}
