import "server-only";
import { ecrire, tous, un } from "./db";

/**
 * Reglages de la vitrine et prospects de l'editeur.
 *
 * PROSPECTS : a ne pas confondre avec `demandes`. Une « demande » est une
 * visite reclamee a UNE AGENCE pour UN BIEN, et lui appartient. Un
 * « prospect » est quelqu'un qui veut utiliser Sen Gestion : il appartient a
 * l'editeur, n'a donc pas d'agence_id, et ne se lit que dans l'espace
 * d'administration.
 *
 * REGLAGES : de simples couples cle/valeur. Les photos de la page « Courte
 * duree » vivent ici plutot que dans une variable d'environnement, parce
 * qu'elles se changent depuis l'ecran, sans toucher au panneau de
 * l'hebergeur ni redemarrer le site.
 */

const CLE_IMAGES = "courte_duree_images";

export function lireReglage(cle: string): string | null {
  return un<{ valeur: string }>("SELECT valeur FROM reglages WHERE cle = ?", cle)?.valeur ?? null;
}

export function ecrireReglage(cle: string, valeur: string): void {
  ecrire(
    `INSERT INTO reglages (cle, valeur, maj_le) VALUES (?, ?, datetime('now'))
       ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, maj_le = datetime('now')`,
    cle, valeur,
  );
}

/** Photos de la page « Courte duree ». Liste vide = illustrations par defaut. */
export function imagesCourteDuree(): string[] {
  const brut = lireReglage(CLE_IMAGES);
  if (!brut) return [];
  try {
    const liste = JSON.parse(brut) as unknown;
    return Array.isArray(liste) ? liste.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

export function enregistrerImagesCourteDuree(urls: string[]): void {
  ecrireReglage(CLE_IMAGES, JSON.stringify(urls.slice(0, 3)));
}

export type Prospect = {
  id: number;
  nom: string;
  telephone: string;
  email: string | null;
  ville: string | null;
  nb_logements: string | null;
  message: string | null;
  source: string;
  statut: string;
  cree_le: string;
};

export function creerProspect(p: {
  nom: string;
  telephone: string;
  email: string | null;
  ville: string | null;
  nbLogements: string | null;
  message: string | null;
  source: string;
}): void {
  ecrire(
    `INSERT INTO prospects (nom, telephone, email, ville, nb_logements, message, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    p.nom, p.telephone, p.email, p.ville, p.nbLogements, p.message, p.source,
  );
}

export function listerProspects(): Prospect[] {
  return tous<Prospect>("SELECT * FROM prospects ORDER BY cree_le DESC LIMIT 500");
}

export function compterProspectsNouveaux(): number {
  return un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM prospects WHERE statut = 'nouveau'",
  )!.n;
}
