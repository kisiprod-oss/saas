"use client";

import { useCallback, useEffect, useState } from "react";
import { Panier as IconePanier, Plus, Croix, Coche } from "./icones";

/**
 * Le panier.
 *
 * ============================================================================
 *  CE QUE LE PANIER CONTIENT, ET CE QU'IL NE CONTIENT PAS
 * ============================================================================
 *  Il contient : des identifiants de produit, des identifiants de variante,
 *  des quantités. Rien d'autre.
 *
 *  Il ne contient AUCUN prix. Les montants affichés ici sont recalculés à
 *  partir de ce que le serveur a envoyé avec la page, et le total qui fait
 *  foi est celui que le serveur recalcule au moment de la commande
 *  (src/lib/commandes.ts). Modifier le contenu du stockage local ne change
 *  donc pas ce qu'on paie : ça change seulement ce qu'on demande.
 *
 *  Le panier vit dans `localStorage`, séparé par boutique. Un client peut
 *  fermer son navigateur, revenir le lendemain, son panier est là — sans
 *  compte, sans cookie de suivi, sans rien envoyer au serveur tant qu'il n'a
 *  pas commandé.
 * ============================================================================
 */

export type ArticlePanier = {
  produitId: number;
  varianteId: number | null;
  quantite: number;
};

function cle(slug: string) {
  return `nova:panier:${slug}`;
}

function lire(slug: string): ArticlePanier[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = JSON.parse(window.localStorage.getItem(cle(slug)) ?? "[]");
    if (!Array.isArray(brut)) return [];
    return brut
      .map((a) => ({
        produitId: Math.trunc(Number(a?.produitId)),
        varianteId: a?.varianteId ? Math.trunc(Number(a.varianteId)) : null,
        quantite: Math.min(99, Math.max(1, Math.trunc(Number(a?.quantite)) || 1)),
      }))
      .filter((a) => Number.isSafeInteger(a.produitId) && a.produitId > 0)
      .slice(0, 50);
  } catch {
    // Stockage illisible (quota plein, mode privé, contenu corrompu) : un
    // panier vide vaut mieux qu'une page blanche.
    return [];
  }
}

function ecrire(slug: string, articles: ArticlePanier[]) {
  try {
    window.localStorage.setItem(cle(slug), JSON.stringify(articles));
  } catch { /* stockage refusé : le panier ne survivra pas au rechargement */ }
  // Prévient les autres composants de la page (le badge de l'en-tête, la
  // page panier) sans passer par un contexte React partagé.
  window.dispatchEvent(new CustomEvent("nova:panier", { detail: { slug } }));
}

export function usePanier(slug: string) {
  const [articles, setArticles] = useState<ArticlePanier[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    setArticles(lire(slug));
    setCharge(true);

    const rafraichir = () => setArticles(lire(slug));
    window.addEventListener("nova:panier", rafraichir);
    // « storage » couvre le cas de deux onglets ouverts sur la même boutique.
    window.addEventListener("storage", rafraichir);
    return () => {
      window.removeEventListener("nova:panier", rafraichir);
      window.removeEventListener("storage", rafraichir);
    };
  }, [slug]);

  const ajouter = useCallback((article: ArticlePanier) => {
    const actuels = lire(slug);
    const existant = actuels.find(
      (a) => a.produitId === article.produitId && a.varianteId === article.varianteId,
    );
    if (existant) existant.quantite = Math.min(99, existant.quantite + article.quantite);
    else actuels.push(article);
    ecrire(slug, actuels);
  }, [slug]);

  const changerQuantite = useCallback((index: number, quantite: number) => {
    const actuels = lire(slug);
    if (!actuels[index]) return;
    if (quantite <= 0) actuels.splice(index, 1);
    else actuels[index].quantite = Math.min(99, quantite);
    ecrire(slug, actuels);
  }, [slug]);

  const retirer = useCallback((index: number) => {
    const actuels = lire(slug);
    actuels.splice(index, 1);
    ecrire(slug, actuels);
  }, [slug]);

  const vider = useCallback(() => ecrire(slug, []), [slug]);

  const total = articles.reduce((n, a) => n + a.quantite, 0);
  return { articles, total, charge, ajouter, changerQuantite, retirer, vider };
}

/** Le compteur de l'en-tête. */
export function BadgePanier({ slug, couleur }: { slug: string; couleur: string }) {
  const { total, charge } = usePanier(slug);

  return (
    <span className="relative inline-flex">
      <IconePanier className="size-6" />
      {/* `charge` évite que le badge clignote entre le rendu serveur (0) et
          la lecture du stockage local. */}
      {charge && total > 0 ? (
        <span
          className="absolute -right-1.5 -top-1.5 min-w-4.5 rounded-full px-1 text-center text-[10px] font-bold leading-4.5 text-white"
          style={{ backgroundColor: couleur }}
        >
          {total > 9 ? "9+" : total}
        </span>
      ) : null}
      <span className="sr-only">{total} article{total > 1 ? "s" : ""} dans le panier</span>
    </span>
  );
}

/** Le bouton « Ajouter au panier » d'une fiche produit. */
export function BoutonAjouter({
  slug, produitId, varianteId, epuise, couleur, texteCouleur, arrondi,
}: {
  slug: string; produitId: number; varianteId: number | null; epuise: boolean;
  couleur: string; texteCouleur: string; arrondi: string;
}) {
  const { ajouter } = usePanier(slug);
  const [ajoute, setAjoute] = useState(false);

  if (epuise) {
    return (
      <button type="button" disabled
        className={`inline-flex min-h-12 w-full items-center justify-center bg-encre-200 px-6 text-sm font-semibold text-encre-500 ${arrondi}`}>
        Épuisé
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold transition-opacity hover:opacity-90 ${arrondi}`}
      style={{ backgroundColor: couleur, color: texteCouleur }}
      onClick={() => {
        ajouter({ produitId, varianteId, quantite: 1 });
        setAjoute(true);
        setTimeout(() => setAjoute(false), 2000);
      }}
    >
      {ajoute
        ? <><Coche className="size-5" /> Ajouté au panier</>
        : <><Plus className="size-5" /> Ajouter au panier</>}
    </button>
  );
}

/** Les commandes de quantité, dans la page panier. */
export function LignePanier({
  index, slug, quantite, maximum,
}: { index: number; slug: string; quantite: number; maximum: number | null }) {
  const { changerQuantite, retirer } = usePanier(slug);
  const plafond = maximum ?? 99;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-encre-300">
        <button type="button" className="flex size-10 items-center justify-center text-lg"
          aria-label="Diminuer la quantité"
          onClick={() => changerQuantite(index, quantite - 1)}>
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{quantite}</span>
        <button type="button" className="flex size-10 items-center justify-center text-lg disabled:opacity-30"
          aria-label="Augmenter la quantité" disabled={quantite >= plafond}
          onClick={() => changerQuantite(index, quantite + 1)}>
          +
        </button>
      </div>
      <button type="button" className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
        aria-label="Retirer cet article" onClick={() => retirer(index)}>
        <Croix className="size-4" />
      </button>
    </div>
  );
}
