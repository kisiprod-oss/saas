import path from "node:path";

/**
 * Ou vivent les photos, et sous quelle adresse elles sont servies.
 *
 * Ce module ne depend de RIEN — surtout pas de db.ts. C'est la raison meme de
 * son existence : `photos.ts` a besoin du dossier de donnees, qu'il obtient de
 * `db.ts` ; et `db.ts` a besoin de ces chemins pour deplacer les photos deja
 * en place. Les faire s'importer l'un l'autre planterait au demarrage, la
 * constante du premier n'etant pas encore evaluee quand le second la lit.
 *
 * En sortant les quatre valeurs ici, les deux fichiers lisent la meme source
 * sans se connaitre. Renommer un dossier reste donc une modification a un
 * seul endroit — c'est ce qui empeche la migration de viser demain un dossier
 * qui n'existe plus, sans que rien ne le signale.
 */

const SOUS_DOSSIER = "televersements";
const SOUS_DOSSIER_PRIVE = "prive";

/** Adresse publique : photos d'annonces, logos, portraits de l'annuaire. */
export const PREFIXE_PUBLIC = "/api/photos/";

/** Adresse fermee : visages des locataires et des proprietaires. */
export const PREFIXE_PRIVE = "/api/photo-privee/";

/** Nom de fichier sur : 32 caracteres hexadecimaux suivis de .webp */
export const NOM_PHOTO_VALIDE = /^[a-f0-9]{32}\.webp$/;

export function dossiersPhotos(dossierData: string): { public: string; prive: string } {
  const publique = path.join(dossierData, SOUS_DOSSIER);
  return { public: publique, prive: path.join(publique, SOUS_DOSSIER_PRIVE) };
}
