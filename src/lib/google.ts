import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, un, ecrire } from "./db";
import { adresseDuSite } from "./email";

/**
 * Connexion des agences via leur compte Google (OAuth 2.0).
 *
 * Aucune bibliotheque tierce : le protocole tient en deux appels HTTP.
 * Si GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ne sont pas renseignes, le
 * bouton n'apparait simplement pas et le reste de l'application fonctionne.
 */

const AUTORISATION = "https://accounts.google.com/o/oauth2/v2/auth";
const JETON = "https://oauth2.googleapis.com/token";
const PROFIL = "https://www.googleapis.com/oauth2/v3/userinfo";

const COOKIE_ETAT = "sen_google_etat";

export function googleConfigure(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function adresseRetourGoogle(): Promise<string> {
  return `${await adresseDuSite()}/connexion/google/retour`;
}

/**
 * Construit l'adresse vers laquelle envoyer l'utilisateur, et depose un
 * jeton d'etat en cookie. Ce jeton, verifie au retour, empeche qu'un tiers
 * declenche une connexion a la place de l'utilisateur (attaque CSRF).
 */
export async function lienAutorisationGoogle(): Promise<string> {
  const etat = crypto.randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(COOKIE_ETAT, etat, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // dix minutes suffisent largement
    path: "/",
  });

  const parametres = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: await adresseRetourGoogle(),
    response_type: "code",
    scope: "openid email profile",
    state: etat,
    prompt: "select_account",
  });

  return `${AUTORISATION}?${parametres}`;
}

/** Verifie le jeton d'etat renvoye par Google, puis le consomme. */
export async function verifierEtatGoogle(etatRecu: string): Promise<boolean> {
  const jar = await cookies();
  const attendu = jar.get(COOKIE_ETAT)?.value;
  jar.delete(COOKIE_ETAT);
  if (!attendu || !etatRecu) return false;
  // Comparaison a duree constante : ne renseigne pas sur les caracteres justes.
  const a = Buffer.from(attendu);
  const b = Buffer.from(etatRecu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export type ProfilGoogle = {
  sub: string;
  email: string;
  emailVerifie: boolean;
  nom: string;
  avatar: string | null;
};

/** Echange le code recu contre un jeton, puis lit le profil de l'utilisateur. */
export async function profilDepuisCode(code: string): Promise<ProfilGoogle | null> {
  const reponseJeton = await fetch(JETON, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: await adresseRetourGoogle(),
      grant_type: "authorization_code",
    }),
  });
  if (!reponseJeton.ok) return null;

  const { access_token: jetonAcces } = (await reponseJeton.json()) as { access_token?: string };
  if (!jetonAcces) return null;

  const reponseProfil = await fetch(PROFIL, {
    headers: { Authorization: `Bearer ${jetonAcces}` },
  });
  if (!reponseProfil.ok) return null;

  const p = (await reponseProfil.json()) as {
    sub?: string; email?: string; email_verified?: boolean;
    name?: string; picture?: string;
  };
  if (!p.sub || !p.email) return null;

  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    emailVerifie: p.email_verified === true,
    nom: p.name?.trim() || p.email.split("@")[0],
    avatar: p.picture ?? null,
  };
}

/**
 * Retrouve le compte correspondant au profil Google, ou le cree.
 *
 * Trois cas :
 *  1. Un compte porte deja ce google_id : on le reconnait.
 *  2. Un compte porte cette adresse e-mail sans google_id : on rattache les
 *     deux, mais seulement si Google a verifie l'adresse — sinon n'importe
 *     qui pourrait s'emparer d'un compte en creant une adresse homonyme.
 *  3. Aucun compte : on cree l'agence et son premier utilisateur.
 */
export function connecterOuCreerCompteGoogle(
  profil: ProfilGoogle,
): { ok: true; utilisateurId: number; nouveau: boolean } | { ok: false; erreur: string } {
  const parGoogle = un<{ id: number; actif: number }>(
    "SELECT id, actif FROM utilisateurs WHERE google_id = ?", profil.sub,
  );
  if (parGoogle) {
    if (!parGoogle.actif) return { ok: false, erreur: "Ce compte a été désactivé." };
    ecrire(
      "UPDATE utilisateurs SET avatar_url = ? WHERE id = ?",
      profil.avatar, parGoogle.id,
    );
    return { ok: true, utilisateurId: parGoogle.id, nouveau: false };
  }

  const parEmail = un<{ id: number; actif: number }>(
    "SELECT id, actif FROM utilisateurs WHERE email = ?", profil.email,
  );
  if (parEmail) {
    if (!profil.emailVerifie) {
      return {
        ok: false,
        erreur: "Un compte existe déjà avec cette adresse. Connectez-vous avec votre mot de passe.",
      };
    }
    if (!parEmail.actif) return { ok: false, erreur: "Ce compte a été désactivé." };
    ecrire(
      "UPDATE utilisateurs SET google_id = ?, avatar_url = ? WHERE id = ?",
      profil.sub, profil.avatar, parEmail.id,
    );
    return { ok: true, utilisateurId: parEmail.id, nouveau: false };
  }

  if (!profil.emailVerifie) {
    return { ok: false, erreur: "Votre adresse Google n'est pas vérifiée." };
  }

  const base = profil.nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "agence";

  let slug = base;
  let n = 2;
  while (un("SELECT id FROM agences WHERE slug = ?", slug)) slug = `${base}-${n++}`;

  const creation = db.transaction(() => {
    const agence = ecrire(
      "INSERT INTO agences (nom, slug, email) VALUES (?, ?, ?)",
      `Agence de ${profil.nom}`, slug, profil.email,
    );
    const utilisateur = ecrire(
      `INSERT INTO utilisateurs (agence_id, nom, email, google_id, avatar_url, role)
       VALUES (?, ?, ?, ?, ?, 'proprietaire')`,
      agence.lastInsertRowid, profil.nom, profil.email, profil.sub, profil.avatar,
    );
    return Number(utilisateur.lastInsertRowid);
  });

  return { ok: true, utilisateurId: creation(), nouveau: true };
}
