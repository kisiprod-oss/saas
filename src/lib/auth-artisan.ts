import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ecrire, un } from "./db";
import { verifierMotDePasse } from "./auth";

/**
 * Authentification des professionnels (artisans).
 *
 * Troisieme espace du logiciel, apres l'agence et le locataire, avec son
 * propre cookie et sa propre table de sessions. Aucun des trois ne peut
 * emprunter les droits d'un autre, meme par accident.
 */

const COOKIE = "sen_session_artisan";
const DUREE_JOURS = 30;

export type ArtisanConnecte = {
  id: number;
  nom: string;
  metier: string;
  email: string;
  statut_candidature: string;
  quiz_reussi: number;
  quiz_score: number | null;
  quiz_total: number | null;
  quiz_passe_le: string | null;
  plan_devis: string;
};

export async function ouvrirSessionArtisan(artisanId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_JOURS * 86400_000);
  ecrire(
    "INSERT INTO sessions_artisans (token, artisan_id, expire_le) VALUES (?, ?, ?)",
    token, artisanId, expire.toISOString(),
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

export async function fermerSessionArtisan() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) ecrire("DELETE FROM sessions_artisans WHERE token = ?", token);
  jar.delete(COOKIE);
}

export async function artisanCourant(): Promise<ArtisanConnecte | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const ligne = un<ArtisanConnecte & { expire_le: string }>(
    `SELECT a.id, a.nom, a.metier, a.email, a.statut_candidature,
            a.quiz_reussi, a.quiz_score, a.quiz_total, a.quiz_passe_le, a.plan_devis, s.expire_le
       FROM sessions_artisans s
       JOIN artisans a ON a.id = s.artisan_id
      WHERE s.token = ? AND a.origine = 'candidature'`,
    token,
  );
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions_artisans WHERE token = ?", token);
    return null;
  }
  return ligne;
}

export async function exigerSessionArtisan(): Promise<ArtisanConnecte> {
  const artisan = await artisanCourant();
  if (!artisan) redirect("/pro/connexion");
  return artisan;
}

export function verifierIdentifiantsArtisan(
  email: string, motDePasse: string,
): { ok: true; id: number } | { ok: false; erreur: string } {
  const ligne = un<{ id: number; mot_de_passe_hash: string | null }>(
    `SELECT id, mot_de_passe_hash FROM artisans
      WHERE email = ? AND origine = 'candidature'`,
    email.trim().toLowerCase(),
  );

  // Meme message dans les deux cas : ne pas reveler quelles adresses existent.
  if (!ligne?.mot_de_passe_hash || !verifierMotDePasse(motDePasse, ligne.mot_de_passe_hash)) {
    return { ok: false, erreur: "Adresse e-mail ou mot de passe incorrect." };
  }
  return { ok: true, id: ligne.id };
}
