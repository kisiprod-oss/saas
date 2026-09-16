"use client";

import { useState } from "react";
import Link from "next/link";
import { BoutonAjouter } from "./panier";
import { montant } from "@/lib/format";
import type { Variante } from "@/lib/requetes";

/**
 * Le bloc d'achat d'une fiche produit : choix de l'option, puis ajout.
 *
 * Tant qu'aucune option n'est choisie, le bouton reste inactif. Ce n'est pas
 * du confort : le serveur refuse une commande sans variante pour un produit
 * qui en a (voir `calculer()` dans src/lib/commandes.ts). Autant l'empêcher
 * ici plutôt que de faire échouer la commande trois écrans plus loin.
 *
 * Le prix affiché suit l'option choisie, supplément compris. Il reste
 * indicatif : le montant qui compte est celui que le serveur recalcule.
 */
export function AchatProduit({
  slug, produitId, prixBase, variantes, libelleVariante, suiviStock, stock,
  devise, decimales, couleur, texteCouleur, arrondi, lienPanier,
}: {
  slug: string;
  produitId: number;
  prixBase: number;
  variantes: Variante[];
  libelleVariante: string | null;
  suiviStock: boolean;
  stock: number;
  devise: string;
  decimales: number;
  couleur: string;
  texteCouleur: string;
  arrondi: string;
  lienPanier: string;
}) {
  const [choisie, setChoisie] = useState<Variante | null>(
    // Une seule option : elle est choisie d'office, personne n'a envie de
    // cliquer sur l'unique bouton d'une liste à un élément.
    variantes.length === 1 ? variantes[0] : null,
  );

  const prix = prixBase + (choisie?.supplement ?? 0);
  const stockEffectif = choisie ? choisie.stock : stock;
  const epuise = suiviStock && stockEffectif <= 0;
  const doitChoisir = variantes.length > 0 && !choisie;

  return (
    <div className="space-y-5">
      <p className="text-2xl font-bold" style={{ color: couleur }}>
        {montant(prix, devise, decimales)}
      </p>

      {variantes.length > 0 ? (
        <fieldset>
          <legend className="etiquette">{libelleVariante ?? "Option"}</legend>
          <div className="flex flex-wrap gap-2">
            {variantes.map((variante) => {
              const indisponible = suiviStock && variante.stock <= 0;
              const active = choisie?.id === variante.id;
              return (
                <button
                  key={variante.id}
                  type="button"
                  disabled={indisponible}
                  aria-pressed={active}
                  onClick={() => setChoisie(variante)}
                  className={`inline-flex min-h-11 items-center border px-4 text-sm font-medium ${arrondi}
                    ${indisponible ? "cursor-not-allowed border-encre-200 text-encre-300 line-through" : ""}
                    ${active ? "text-white" : "border-encre-300"}`}
                  style={active ? { backgroundColor: couleur, borderColor: couleur } : undefined}
                >
                  {variante.valeur}
                  {variante.supplement > 0 ? (
                    <span className="ml-1.5 text-xs opacity-80">
                      +{montant(variante.supplement, devise, decimales)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {doitChoisir ? (
            <p className="aide">Choisissez une option pour continuer.</p>
          ) : null}
        </fieldset>
      ) : null}

      {suiviStock ? (
        <p className="text-sm text-encre-600">
          {epuise
            ? "Ce produit est épuisé."
            : stockEffectif <= 5
              ? `Plus que ${stockEffectif} en stock.`
              : "En stock."}
        </p>
      ) : null}

      {doitChoisir ? (
        <button type="button" disabled
          className={`inline-flex min-h-12 w-full items-center justify-center bg-encre-200 px-6 text-sm font-semibold text-encre-500 ${arrondi}`}>
          Choisissez {libelleVariante ? `une ${libelleVariante.toLowerCase()}` : "une option"}
        </button>
      ) : (
        <BoutonAjouter
          slug={slug}
          produitId={produitId}
          varianteId={choisie?.id ?? null}
          epuise={epuise}
          couleur={couleur}
          texteCouleur={texteCouleur}
          arrondi={arrondi}
        />
      )}

      <Link href={lienPanier}
        className={`inline-flex min-h-11 w-full items-center justify-center border border-encre-300 px-6 text-sm font-semibold ${arrondi}`}>
        Voir mon panier
      </Link>
    </div>
  );
}
