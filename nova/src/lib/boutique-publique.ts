import "server-only";
import { un } from "./db";
import { sessionEventuelle, type Boutique } from "./auth";
import { paysDe } from "./pays";
import { produits, categories } from "./requetes";
import { valider, type ContenuBoutique } from "./sections";
import { couleurSure } from "./modeles";
import type { ContexteRendu } from "@/components/sections-rendu";

/**
 * Charge une boutique pour son affichage public.
 *
 * ============================================================================
 *  BROUILLON CONTRE PUBLIÉ — la règle qui protège le commerçant
 * ============================================================================
 *  Un visiteur voit `boutiques.publie`, et RIEN D'AUTRE. Tant que le
 *  commerçant n'a pas cliqué sur « Publier », ses modifications vivent dans
 *  `boutiques.brouillon` et ne sortent pas de son tableau de bord.
 *
 *  Le mode aperçu (`?apercu=1`) est la seule exception, et il est verrouillé :
 *  il n'affiche le brouillon QUE si la session en cours appartient à cette
 *  boutique-là. Un inconnu qui ajoute `?apercu=1` à l'adresse d'une boutique
 *  n'obtient rien de plus que ce qui est publié.
 * ============================================================================
 */

export type BoutiqueChargee = {
  boutique: Boutique;
  contenu: ContenuBoutique;
  contexte: ContexteRendu;
  /** Vrai quand on regarde le brouillon (le propriétaire, en aperçu). */
  enApercu: boolean;
};

export async function chargerBoutique(
  slug: string, options: { apercu?: boolean } = {},
): Promise<BoutiqueChargee | null> {
  const boutique = un<Boutique>(
    "SELECT * FROM boutiques WHERE slug = ? AND suspendue_le IS NULL", slug,
  );
  if (!boutique) return null;

  // Le propriétaire connecté peut regarder son brouillon. Personne d'autre.
  const session = options.apercu ? await sessionEventuelle() : null;
  const estProprietaire = session?.boutique.id === boutique.id;
  const enApercu = Boolean(options.apercu && estProprietaire);

  if (!enApercu && (!boutique.publiee_le || !boutique.publie)) return null;

  const pays = paysDe(boutique.pays);
  const contenu = valider(enApercu ? boutique.brouillon : boutique.publie);
  const couleur = couleurSure(boutique.couleur);

  const contexte: ContexteRendu = {
    boutiqueId: boutique.id,
    slug: boutique.slug,
    nom: boutique.nom,
    couleur,
    modele: boutique.modele,
    devise: pays.devise_libelle,
    decimales: pays.decimales,
    produits: produits(boutique.id, { actifsSeulement: true, limite: 60 }),
    categories: categories(boutique.id),
    telephone: boutique.telephone,
    whatsapp: boutique.whatsapp,
    adresse: boutique.adresse,
    ville: boutique.ville,
  };

  return { boutique, contenu, contexte, enApercu };
}

/**
 * Le message WhatsApp pré-rempli.
 *
 * Il porte la référence, parce que c'est elle qui permet de rapprocher une
 * conversation d'une commande. Ce qu'il ne fait pas : prouver quoi que ce
 * soit. Ouvrir WhatsApp n'envoie pas le message — la personne peut fermer
 * l'application avant. C'est pourquoi les demandes ouvertes sont comptées
 * séparément des commandes (table `demandes_whatsapp`).
 */
export function messageWhatsapp(params: {
  nomBoutique: string;
  reference?: string;
  lignes: { nom: string; quantite: number; variante?: string | null }[];
  total?: string;
  adresse?: string;
}): string {
  const morceaux = [`Bonjour ${params.nomBoutique},`];
  if (params.reference) morceaux.push(`Ma commande : ${params.reference}`);
  morceaux.push("");
  for (const ligne of params.lignes) {
    morceaux.push(`• ${ligne.quantite} × ${ligne.nom}${ligne.variante ? ` (${ligne.variante})` : ""}`);
  }
  if (params.total) morceaux.push("", `Total : ${params.total}`);
  if (params.adresse) morceaux.push("", params.adresse);
  return morceaux.join("\n");
}

export function lienWhatsapp(numero: string | null | undefined, message: string): string | null {
  if (!numero) return null;
  const chiffres = numero.replace(/\D/g, "");
  if (chiffres.length < 8) return null;
  return `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}`;
}
