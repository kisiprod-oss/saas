import "server-only";
import { exigerSession, type Agence, type Utilisateur } from "./auth";

/**
 * Administration de la plateforme.
 *
 * L'administrateur est designe par son adresse e-mail, dans la variable
 * ADMIN_EMAILS. Ce choix est deliberement le plus simple possible :
 *
 *  - aucun droit special ne se stocke en base, donc aucun compte ne peut
 *    s'octroyer l'administration en modifiant une ligne ;
 *  - la liste ne se change que depuis le panneau de l'hebergeur, hors de
 *    portee de l'application elle-meme ;
 *  - les adresses e-mail sont deja uniques : personne ne peut creer un
 *    compte avec une adresse deja prise pour usurper le role.
 *
 * L'administrateur se connecte avec son compte d'agence habituel ; un menu
 * « Administration » apparait en plus.
 */

/** Adresses autorisees, en minuscules et sans espaces. */
function adressesAdmin(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Vrai si au moins un administrateur est designe. */
export function administrationConfiguree(): boolean {
  return adressesAdmin().length > 0;
}

/**
 * Liste des administrateurs, pour l'afficher dans l'espace d'administration.
 * Ce ne sont pas des secrets — ce sont des adresses de contact — mais la
 * fonction reste reservee aux pages derriere `exigerAdmin()`.
 */
export function adressesAdminVisibles(): string[] {
  return adressesAdmin();
}

export function estAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adressesAdmin().includes(email.trim().toLowerCase());
}

/**
 * Exige une session dont le titulaire est administrateur.
 * Renvoie vers le tableau de bord si ce n'est pas le cas : une page
 * d'administration ne doit pas seulement etre cachee, elle doit etre fermee.
 */
export async function exigerAdmin(): Promise<{ utilisateur: Utilisateur; agence: Agence }> {
  const session = await exigerSession();
  if (!estAdmin(session.utilisateur.email)) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  return session;
}
