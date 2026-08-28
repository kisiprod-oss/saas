import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { ouvrirSession } from "@/lib/auth";
import {
  connecterOuCreerCompteGoogle,
  googleConfigure,
  profilDepuisCode,
  verifierEtatGoogle,
} from "@/lib/google";

/** Renvoie l'agence vers la page de connexion avec un message lisible. */
function echec(message: string): never {
  redirect("/connexion?erreur=" + encodeURIComponent(message));
}

/** Google renvoie l'utilisateur ici avec un code a echanger contre son profil. */
export async function GET(requete: NextRequest) {
  if (!googleConfigure()) echec("La connexion Google n'est pas encore activée sur ce site.");

  const params = requete.nextUrl.searchParams;

  // L'utilisateur a pu refuser l'autorisation : ce n'est pas une erreur.
  if (params.get("error")) echec("Connexion Google annulée.");

  const code = params.get("code");
  const etat = params.get("state") ?? "";
  if (!code) echec("Réponse Google incomplète. Réessayez.");

  // Le jeton d'etat doit etre verifie avant tout echange avec Google.
  if (!(await verifierEtatGoogle(etat))) {
    echec("Session Google expirée. Relancez la connexion.");
  }

  const profil = await profilDepuisCode(code);
  if (!profil) echec("Google n'a pas confirmé votre identité. Réessayez.");

  const resultat = connecterOuCreerCompteGoogle(profil);
  if (!resultat.ok) echec(resultat.erreur);

  await ouvrirSession(resultat.utilisateurId);
  redirect("/dashboard");
}
