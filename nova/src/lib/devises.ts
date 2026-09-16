/**
 * Conversion des prix importés vers la devise du commerçant.
 *
 * ============================================================================
 *  POURQUOI IL N'Y A PAS DE TAUX EN DIRECT
 * ============================================================================
 *  Un prix affiché à un client doit être stable et explicable. Un taux tiré
 *  d'une API à chaque affichage rendrait le prix d'un produit différent d'une
 *  heure à l'autre, sans que le commerçant comprenne pourquoi — et le jour où
 *  l'API tombe, plus de prix du tout.
 *
 *  Deux cas, donc, et rien d'autre :
 *
 *   • L'EURO a une parité FIXE avec le franc CFA. Ce n'est pas un taux de
 *     marché : c'est une parité de droit, 1 EUR = 655,957 XOF (et XAF),
 *     inchangée depuis l'introduction de l'euro. On peut l'écrire ici sans
 *     rien inventer.
 *
 *   • TOUTES LES AUTRES devises flottent. Le commerçant saisit le taux qu'il
 *     applique, dans ses réglages de livraison et d'import. C'est SON taux,
 *     celui auquel il a réellement acheté — pas une moyenne de marché qui ne
 *     correspond à aucune de ses factures.
 *
 *  Sans taux saisi, l'import montre le prix d'origine et demande le prix de
 *  vente. Il n'invente jamais un montant.
 * ============================================================================
 */

/** Parité fixe du franc CFA avec l'euro. Fait juridique, pas estimation. */
export const PARITE_EURO_FRANC_CFA = 655.957;

/** Les devises que les places de marché affichent le plus souvent. */
export const DEVISES_SOURCE = [
  { code: "EUR", nom: "Euro", symbole: "€" },
  { code: "USD", nom: "Dollar américain", symbole: "$" },
  { code: "CNY", nom: "Yuan chinois", symbole: "¥" },
  { code: "GBP", nom: "Livre sterling", symbole: "£" },
  { code: "MAD", nom: "Dirham marocain", symbole: "DH" },
  { code: "AED", nom: "Dirham des Émirats", symbole: "AED" },
  { code: "XOF", nom: "Franc CFA (UEMOA)", symbole: "FCFA" },
  { code: "XAF", nom: "Franc CFA (CEMAC)", symbole: "FCFA" },
] as const;

export function devisePar(code: string | null | undefined) {
  const propre = String(code ?? "").trim().toUpperCase();
  return DEVISES_SOURCE.find((d) => d.code === propre);
}

/** Relit les taux saisis par le commerçant, en écartant tout ce qui est absurde. */
export function lireTaux(json: string | null | undefined): Record<string, number> {
  if (!json) return {};
  try {
    const brut = JSON.parse(json);
    // `typeof [] === "object"` : sans ce refus explicite, un tableau JSON
    // donnerait des taux indexes par « 0 », « 1 », « 2 ».
    if (!brut || typeof brut !== "object" || Array.isArray(brut)) return {};
    const propre: Record<string, number> = {};
    for (const [code, valeur] of Object.entries(brut as Record<string, unknown>)) {
      const taux = Number(valeur);
      // Un taux de 0 ou négatif donnerait un prix nul ou négatif ; au-delà de
      // 100 000 on est manifestement devant une faute de frappe.
      if (Number.isFinite(taux) && taux > 0 && taux < 100_000) {
        propre[code.trim().toUpperCase().slice(0, 4)] = taux;
      }
    }
    return propre;
  } catch {
    return {};
  }
}

export type Conversion =
  | { ok: true; montant: number; explication: string }
  | { ok: false; raison: string; tauxManquant: string };

/**
 * Convertit un montant vers la devise de la boutique.
 *
 * `montantSource` est un nombre décimal (19,99 €), pas une unité mineure : les
 * places de marché affichent des prix à virgule. Le résultat, lui, est un
 * ENTIER dans l'unité de la boutique — le franc CFA n'a pas de centimes.
 */
export function convertir(
  montantSource: number,
  deviseSource: string,
  deviseCible: string,
  taux: Record<string, number>,
): Conversion {
  const source = String(deviseSource ?? "").trim().toUpperCase();
  const cible = String(deviseCible ?? "XOF").trim().toUpperCase();
  const montant = Number(montantSource);

  if (!Number.isFinite(montant) || montant <= 0) {
    return { ok: false, raison: "Aucun prix lisible sur cette page.", tauxManquant: source };
  }

  // Même devise : rien à convertir, on arrondit simplement.
  if (source === cible) {
    return {
      ok: true,
      montant: Math.round(montant),
      explication: `Prix repris tel quel (${source}).`,
    };
  }

  // Les deux francs CFA sont à parité entre eux, tous deux fixés à l'euro.
  const cfa = (code: string) => code === "XOF" || code === "XAF";
  if (cfa(source) && cfa(cible)) {
    return { ok: true, montant: Math.round(montant), explication: "Parité fixe entre XOF et XAF." };
  }

  if (source === "EUR" && cfa(cible)) {
    return {
      ok: true,
      montant: Math.round(montant * PARITE_EURO_FRANC_CFA),
      explication: `Parité fixe : 1 € = ${PARITE_EURO_FRANC_CFA} FCFA.`,
    };
  }

  const tauxSaisi = taux[source];
  if (!tauxSaisi) {
    return {
      ok: false,
      raison: `Vous n'avez pas encore indiqué votre taux pour le ${source}.`,
      tauxManquant: source,
    };
  }

  // Le taux saisi est toujours exprimé VERS la devise de la boutique : « 1 USD
  // = 610 FCFA ». Une seule multiplication suffit donc, quelle que soit la
  // devise cible.
  return {
    ok: true,
    montant: Math.round(montant * tauxSaisi),
    explication: `Votre taux : 1 ${source} = ${tauxSaisi} ${cible}.`,
  };
}

/**
 * Applique la marge de revente du commerçant, puis arrondit à un prix qui se
 * dit à voix haute.
 *
 * Un produit à 7 342 FCFA n'existe pas sur un marché : on annonce 7 500. Le
 * palier suit le montant — arrondir un article de 500 F à la centaine serait
 * absurde, arrondir un article de 200 000 F à la centaine ne sert à rien.
 */
export function prixDeVente(prixRevient: number, margePourcent: number): number {
  const marge = Math.max(0, Math.min(1000, Number(margePourcent) || 0));

  // Calcul en entiers, pas en flottants : `200000 * (1 + 10/100)` vaut
  // 220000,00000000003 en virgule flottante, ce qui faisait franchir un
  // palier entier a l'arrondi du dessous et vendre 1 000 F trop cher.
  const brut = Math.round((prixRevient * (100 + marge)) / 100);

  const palier = brut < 1_000 ? 50
    : brut < 10_000 ? 100
    : brut < 100_000 ? 500
    : 1_000;

  return Math.max(palier, Math.ceil(brut / palier) * palier);
}
