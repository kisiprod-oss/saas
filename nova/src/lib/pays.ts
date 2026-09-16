import "server-only";
import { tous, un } from "./db";

/**
 * Ce qui change d'un pays a l'autre : la devise, les villes, les moyens de
 * paiement, le format des numeros. Tout vient de la table `pays` — ajouter
 * un marche, c'est activer une ligne, pas modifier du code.
 */
export type Pays = {
  code: string;
  nom: string;
  devise: string;
  devise_libelle: string;
  decimales: number;
  indicatif: string;
  longueur_nationale: number;
  villes: string[];
  moyens_paiement: string[];
  actif: number;
  ordre: number;
};

type LignePays = Omit<Pays, "villes" | "moyens_paiement"> & {
  villes: string; moyens_paiement: string;
};

function relire(ligne: LignePays): Pays {
  return {
    ...ligne,
    villes: lireListe(ligne.villes),
    moyens_paiement: lireListe(ligne.moyens_paiement),
  };
}

function lireListe(json: string): string[] {
  try {
    const valeur = JSON.parse(json);
    return Array.isArray(valeur) ? valeur.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Les pays ouverts a l'inscription. */
export function paysServis(): Pays[] {
  return tous<LignePays>("SELECT * FROM pays WHERE actif = 1 ORDER BY ordre, nom").map(relire);
}

/** Tous les pays, y compris ceux qui ne sont pas encore ouverts (administration). */
export function tousLesPays(): Pays[] {
  return tous<LignePays>("SELECT * FROM pays ORDER BY actif DESC, ordre, nom").map(relire);
}

/**
 * Le pays d'une boutique. Le repli sur le Senegal n'est pas un hasard : c'est
 * le marche de lancement, et une boutique sans pays valide doit continuer
 * d'afficher des prix plutot que de tomber en panne.
 */
export function paysDe(code: string | null | undefined): Pays {
  const ligne = un<LignePays>("SELECT * FROM pays WHERE code = ?", code ?? "SN")
    ?? un<LignePays>("SELECT * FROM pays WHERE code = 'SN'");
  if (!ligne) {
    return {
      code: "SN", nom: "Sénégal", devise: "XOF", devise_libelle: "FCFA", decimales: 0,
      indicatif: "+221", longueur_nationale: 9, villes: [], moyens_paiement: [],
      actif: 1, ordre: 1,
    };
  }
  return relire(ligne);
}
