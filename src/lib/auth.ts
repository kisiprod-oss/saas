import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, un, ecrire } from "./db";

const COOKIE = "sen_session";
const DUREE_JOURS = 30;

export type Utilisateur = {
  id: number;
  agence_id: number;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
};

export type Agence = {
  id: number;
  nom: string;
  slug: string;
  ninea: string | null;
  rccm: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  logo_url: string | null;
  commission_pct: number;
  plan: string;
  modele_rappel: string | null;
  modele_relance: string | null;
  modele_mise_en_demeure: string | null;
  paiement_orange_money: string | null;
  paiement_wave: string | null;
  paiement_free_money: string | null;
  paiement_consignes: string | null;
};

/** Hache un mot de passe avec scrypt et un sel aleatoire. */
export function hacherMotDePasse(motDePasse: string): string {
  const sel = crypto.randomBytes(16).toString("hex");
  const cle = crypto.scryptSync(motDePasse, sel, 64).toString("hex");
  return `${sel}:${cle}`;
}

/** Verifie un mot de passe contre son empreinte stockee. */
export function verifierMotDePasse(motDePasse: string, empreinte: string): boolean {
  const [sel, cle] = empreinte.split(":");
  if (!sel || !cle) return false;
  const attendu = Buffer.from(cle, "hex");
  const calcule = crypto.scryptSync(motDePasse, sel, 64);
  return attendu.length === calcule.length && crypto.timingSafeEqual(attendu, calcule);
}

/** Cree une session et depose le cookie de connexion. */
export async function ouvrirSession(utilisateurId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_JOURS * 86400_000);
  ecrire(
    "INSERT INTO sessions (token, utilisateur_id, expire_le) VALUES (?, ?, ?)",
    token,
    utilisateurId,
    expire.toISOString(),
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

/** Supprime la session courante et le cookie. */
export async function fermerSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) ecrire("DELETE FROM sessions WHERE token = ?", token);
  jar.delete(COOKIE);
}

/** Renvoie l'utilisateur connecte, ou null. */
export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const ligne = un<Utilisateur & { expire_le: string }>(
    `SELECT u.id, u.agence_id, u.nom, u.email, u.telephone, u.role, s.expire_le
       FROM sessions s
       JOIN utilisateurs u ON u.id = s.utilisateur_id
      WHERE s.token = ? AND u.actif = 1`,
    token,
  );
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }
  return ligne;
}

/** Contexte complet (utilisateur + agence). Redirige vers la connexion si absent. */
export async function exigerSession(): Promise<{ utilisateur: Utilisateur; agence: Agence }> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect("/connexion");
  const agence = un<Agence>("SELECT * FROM agences WHERE id = ?", utilisateur.agence_id);
  if (!agence) redirect("/connexion");
  return { utilisateur, agence };
}

/** Cree une agence et son premier utilisateur (inscription). */
export function inscrireAgence(params: {
  nomAgence: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
}): { ok: true; utilisateurId: number } | { ok: false; erreur: string } {
  const email = params.email.trim().toLowerCase();
  if (un("SELECT id FROM utilisateurs WHERE email = ?", email)) {
    return { ok: false, erreur: "Cette adresse e-mail est déjà utilisée." };
  }

  const base = params.nomAgence
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "agence";

  let slug = base;
  let n = 2;
  while (un("SELECT id FROM agences WHERE slug = ?", slug)) slug = `${base}-${n++}`;

  const creation = db.transaction(() => {
    const agence = ecrire(
      "INSERT INTO agences (nom, slug, telephone, email) VALUES (?, ?, ?, ?)",
      params.nomAgence.trim(),
      slug,
      params.telephone.trim(),
      email,
    );
    const utilisateur = ecrire(
      `INSERT INTO utilisateurs (agence_id, nom, email, telephone, mot_de_passe_hash, role)
       VALUES (?, ?, ?, ?, ?, 'proprietaire')`,
      agence.lastInsertRowid,
      params.nom.trim(),
      email,
      params.telephone.trim(),
      hacherMotDePasse(params.motDePasse),
    );
    return Number(utilisateur.lastInsertRowid);
  });

  return { ok: true, utilisateurId: creation() };
}

/* ==================================================================
   Protection contre les essais de mots de passe en rafale
   ================================================================== */

const MAX_TENTATIVES = 8;
const FENETRE_MINUTES = 15;

/** Note une tentative de connexion, reussie ou non. */
export function noterTentative(cle: string, reussie: boolean) {
  ecrire(
    "INSERT INTO tentatives_connexion (cle, reussie) VALUES (?, ?)",
    cle.toLowerCase(), reussie ? 1 : 0,
  );
  // Purge des traces anciennes, pour que la table ne gonfle pas.
  ecrire("DELETE FROM tentatives_connexion WHERE le < datetime('now', '-1 day')");
}

/** Vrai si trop d'echecs recents : la connexion doit etre refusee. */
export function tropDeTentatives(cle: string): boolean {
  const r = un<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tentatives_connexion
      WHERE cle = ? AND reussie = 0 AND le > datetime('now', ?)`,
    cle.toLowerCase(), `-${FENETRE_MINUTES} minutes`,
  );
  return (r?.n ?? 0) >= MAX_TENTATIVES;
}

/** Efface les echecs apres une connexion reussie. */
export function reinitialiserTentatives(cle: string) {
  ecrire("DELETE FROM tentatives_connexion WHERE cle = ?", cle.toLowerCase());
}

export const MINUTES_BLOCAGE = FENETRE_MINUTES;

/* ==================================================================
   Reinitialisation du mot de passe
   ================================================================== */

const DUREE_LIEN_MINUTES = 60;

/**
 * Cree un lien de reinitialisation pour cette adresse.
 * Renvoie null si l'adresse est inconnue : l'appelant doit tout de meme
 * afficher le meme message, pour ne pas reveler qui possede un compte.
 */
export function creerDemandeReinitialisation(email: string): { token: string; nom: string } | null {
  const utilisateur = un<{ id: number; nom: string }>(
    "SELECT id, nom FROM utilisateurs WHERE email = ? AND actif = 1",
    email.trim().toLowerCase(),
  );
  if (!utilisateur) return null;

  // Une seule demande valable a la fois.
  ecrire(
    "DELETE FROM reinitialisations WHERE utilisateur_id = ? AND utilise_le IS NULL",
    utilisateur.id,
  );

  const token = crypto.randomBytes(32).toString("hex");
  ecrire(
    "INSERT INTO reinitialisations (token, utilisateur_id, expire_le) VALUES (?, ?, ?)",
    token, utilisateur.id, new Date(Date.now() + DUREE_LIEN_MINUTES * 60_000).toISOString(),
  );

  return { token, nom: utilisateur.nom };
}

export type DemandeReinitialisation = { token: string; utilisateur_id: number; email: string; nom: string };

/** Renvoie la demande si le lien est encore valable, sinon null. */
export function lireDemandeReinitialisation(token: string): DemandeReinitialisation | null {
  const ligne = un<DemandeReinitialisation & { expire_le: string; utilise_le: string | null }>(
    `SELECT r.token, r.utilisateur_id, r.expire_le, r.utilise_le, u.email, u.nom
       FROM reinitialisations r
       JOIN utilisateurs u ON u.id = r.utilisateur_id
      WHERE r.token = ? AND u.actif = 1`,
    token,
  );

  if (!ligne) return null;
  if (ligne.utilise_le) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) return null;

  return { token: ligne.token, utilisateur_id: ligne.utilisateur_id, email: ligne.email, nom: ligne.nom };
}

/**
 * Applique le nouveau mot de passe, consomme le lien et ferme toutes les
 * sessions ouvertes : si quelqu'un s'etait introduit dans le compte,
 * il en est ejecte.
 */
export function appliquerNouveauMotDePasse(token: string, motDePasse: string): boolean {
  const demande = lireDemandeReinitialisation(token);
  if (!demande) return false;

  db.transaction(() => {
    ecrire(
      "UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?",
      hacherMotDePasse(motDePasse), demande.utilisateur_id,
    );
    ecrire("UPDATE reinitialisations SET utilise_le = datetime('now') WHERE token = ?", token);
    ecrire("DELETE FROM sessions WHERE utilisateur_id = ?", demande.utilisateur_id);
    ecrire("DELETE FROM tentatives_connexion WHERE cle = ?", demande.email.toLowerCase());
  })();

  return true;
}
