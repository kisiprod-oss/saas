import type { Modele } from "./sections";

/**
 * Les trois modèles de boutique.
 *
 * Un modèle n'est PAS un thème CSS séparé : c'est un jeu de classes utilitaires
 * choisi ici et appliqué par le rendu. Conséquence : il n'existe qu'un seul
 * code de rendu, testé une fois, et les trois modèles ne peuvent pas diverger
 * au point que l'un casse sur mobile pendant que les autres tiennent.
 *
 * La couleur du commerçant est injectée à part, en variable CSS (`--couleur`),
 * parce que sa valeur n'est connue qu'à l'exécution.
 *
 *   Épuré   — beaucoup de blanc, angles nets, la photo porte tout.
 *   Élégant — titres imposants, fond sombre en tête, sérif pour les titres.
 *   Coloré  — la couleur envahit les fonds, cartes très arrondies.
 */
export type Apparence = {
  nom: string;
  /** Le fond général de la boutique. */
  page: string;
  /** Une carte produit. */
  carte: string;
  /** L'arrondi commun aux images et aux boutons. */
  arrondi: string;
  /** Les titres de section. */
  titre: string;
  /** Le grand titre de la bannière. */
  banniere: string;
  /** Le fond de la bannière : `marque` = la couleur du commerçant. */
  bannierefond: "marque" | "clair" | "sombre";
  /** L'en-tête de la boutique. */
  entete: string;
  bouton: string;
};

export const APPARENCES: Record<Modele, Apparence> = {
  epure: {
    nom: "Épuré",
    page: "bg-white text-encre-900",
    carte: "border border-encre-200 bg-white",
    arrondi: "rounded-lg",
    titre: "text-xl font-semibold tracking-tight sm:text-2xl",
    banniere: "text-3xl font-semibold tracking-tight sm:text-5xl",
    bannierefond: "clair",
    entete: "border-b border-encre-200 bg-white",
    bouton: "rounded-lg",
  },
  elegant: {
    nom: "Élégant",
    page: "bg-craie text-encre-900",
    carte: "border border-encre-200 bg-white",
    arrondi: "rounded-none",
    titre: "text-2xl font-bold tracking-tight sm:text-3xl",
    banniere: "text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl",
    bannierefond: "sombre",
    entete: "border-b border-encre-800 bg-encre-900 text-white",
    bouton: "rounded-none",
  },
  colore: {
    nom: "Coloré",
    page: "bg-craie text-encre-900",
    carte: "border border-transparent bg-white shadow-sm",
    arrondi: "rounded-2xl",
    titre: "text-xl font-bold sm:text-2xl",
    banniere: "text-3xl font-bold leading-tight sm:text-5xl",
    bannierefond: "marque",
    entete: "bg-white",
    bouton: "rounded-full",
  },
};

export function apparenceDe(modele: string | null | undefined): Apparence {
  return APPARENCES[(modele as Modele) ?? "epure"] ?? APPARENCES.epure;
}

/**
 * Le texte posé sur la couleur du commerçant doit rester lisible.
 *
 * On calcule la luminance relative (formule WCAG) et on renvoie blanc ou
 * anthracite selon laquelle des deux donne le meilleur contraste. Sans ça, un
 * commerçant qui choisit un jaune vif obtient un bouton illisible — et il ne
 * s'en rendra compte qu'en perdant des ventes.
 */
export function texteSur(couleur: string): "#ffffff" | "#1f2421" {
  const hex = couleur.replace("#", "");
  if (hex.length !== 6) return "#ffffff";

  const canaux = [0, 2, 4].map((i) => {
    const valeur = parseInt(hex.slice(i, i + 2), 16) / 255;
    return valeur <= 0.03928 ? valeur / 12.92 : ((valeur + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];

  // Contraste avec le blanc contre contraste avec l'anthracite (#1f2421,
  // luminance ≈ 0.0166).
  const contrasteBlanc = 1.05 / (luminance + 0.05);
  const contrasteEncre = (luminance + 0.05) / 0.0666;
  return contrasteBlanc >= contrasteEncre ? "#ffffff" : "#1f2421";
}

/** Une couleur valide, ou le vert par défaut. Jamais une valeur arbitraire. */
export function couleurSure(couleur: string | null | undefined): string {
  return couleur && /^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur : "#0e5c3f";
}
