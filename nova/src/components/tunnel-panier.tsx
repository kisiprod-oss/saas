"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePanier, LignePanier } from "./panier";
import { actionChiffrer, type EtatDevis } from "@/lib/actions-boutique";
import { montant } from "@/lib/format";
import { Panier as IconePanier, Alerte } from "./icones";
import type { Devis } from "@/lib/commandes";

/**
 * La page panier.
 *
 * Le panier vit dans le navigateur, mais LES MONTANTS VIENNENT DU SERVEUR.
 * À chaque changement de quantité, on redemande un chiffrage : c'est une
 * lecture, elle ne réserve rien, et elle garantit que le total affiché est
 * celui qui sera facturé.
 *
 * Effet utile de côté : si un produit a été retiré de la vente ou épuisé
 * pendant que le panier dormait, on l'apprend ici, avant la page de commande.
 */
export function TunnelPanier({
  slug, couleur, texteCouleur, arrondi, devise, decimales,
}: {
  slug: string; couleur: string; texteCouleur: string; arrondi: string;
  devise: string; decimales: number;
}) {
  const { articles, charge } = usePanier(slug);
  const [devis, setDevis] = useState<Devis | null>(null);
  const [problemes, setProblemes] = useState<{ code: string; message: string }[]>([]);
  const [enCours, setEnCours] = useState(true);

  useEffect(() => {
    if (!charge) return;
    if (articles.length === 0) {
      setDevis(null); setProblemes([]); setEnCours(false);
      return;
    }
    let annule = false;
    setEnCours(true);
    // Mode « estimation » : on ne demande QUE le sous-total. Les frais de
    // livraison dépendent d'une zone que le client n'a pas encore choisie, et
    // toutes les boutiques ne proposent pas le retrait — chiffrer avec un mode
    // imposé laisserait le panier muet chez celles qui ne le font pas.
    actionChiffrer(slug, articles, { mode: "estimation" })
      .then((resultat: EtatDevis) => {
        if (annule) return;
        if (resultat.ok) { setDevis(resultat.devis); setProblemes([]); }
        else { setDevis(null); setProblemes(resultat.problemes); }
      })
      .catch(() => {
        if (!annule) {
          setProblemes([{ code: "reseau", message: "Connexion perdue. Vérifiez votre réseau." }]);
        }
      })
      .finally(() => { if (!annule) setEnCours(false); });
    return () => { annule = true; };
  }, [slug, articles, charge]);

  if (!charge || enCours) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de votre panier…</span>
        {[0, 1].map((i) => <div key={i} className="squelette h-24" />)}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-encre-300 px-6 py-16 text-center">
        <IconePanier className="mx-auto size-10 text-encre-300" />
        <p className="mt-3 font-medium">Votre panier est vide</p>
        <p className="mt-1.5 text-sm text-encre-600">
          Parcourez le catalogue et ajoutez ce qui vous plaît.
        </p>
        <Link href={`/b/${slug}/catalogue`}
          className={`mt-6 inline-flex min-h-11 items-center px-6 text-sm font-semibold ${arrondi}`}
          style={{ backgroundColor: couleur, color: texteCouleur }}>
          Voir le catalogue
        </Link>
      </div>
    );
  }

  // En mode estimation, aucun problème de livraison ne peut remonter : ce qui
  // reste concerne les articles eux-mêmes (retiré de la vente, épuisé).
  const bloquant = problemes;

  return (
    <div className="space-y-5">
      {bloquant.length > 0 ? (
        <div className="message message-alerte" role="alert">
          <Alerte className="mt-0.5 size-4.5 shrink-0" />
          <div>
            <p className="font-semibold">Votre panier a changé</p>
            <ul className="mt-1 space-y-0.5">
              {bloquant.map((p, i) => <li key={i}>{p.message}</li>)}
            </ul>
            <p className="mt-1.5 text-xs">
              Ajustez les quantités ou retirez l&apos;article concerné.
            </p>
          </div>
        </div>
      ) : null}

      <ul className="divide-y divide-encre-200 border-y border-encre-200">
        {(devis?.articles ?? []).map((article, i) => (
          <li key={`${article.produitId}-${article.varianteId ?? 0}`}
            className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{article.nom}</p>
              {article.varianteTexte ? (
                <p className="mt-0.5 text-sm text-encre-500">{article.varianteTexte}</p>
              ) : null}
              <p className="mt-1 text-sm text-encre-600">
                {montant(article.prixUnitaire, devise, decimales)} l&apos;unité
              </p>
            </div>
            <LignePanier
              index={i} slug={slug} quantite={article.quantite}
              maximum={article.stockDisponible}
            />
            <p className="w-24 text-right font-semibold">
              {montant(article.totalLigne, devise, decimales)}
            </p>
          </li>
        ))}
      </ul>

      {devis ? (
        <>
          <div className="flex items-baseline justify-between text-lg">
            <span className="font-medium">Sous-total</span>
            <span className="font-bold">{montant(devis.sousTotal, devise, decimales)}</span>
          </div>
          <p className="text-sm text-encre-500">
            Les frais de livraison sont calculés à l&apos;étape suivante, selon la
            zone que vous choisirez.
          </p>

          <Link href={`/b/${slug}/commande`}
            className={`inline-flex min-h-12 w-full items-center justify-center px-6 text-sm font-semibold ${arrondi}`}
            style={{ backgroundColor: couleur, color: texteCouleur }}>
            Passer la commande
          </Link>
        </>
      ) : null}

      <Link href={`/b/${slug}/catalogue`}
        className="block text-center text-sm text-encre-600 hover:underline">
        Continuer mes achats
      </Link>
    </div>
  );
}
