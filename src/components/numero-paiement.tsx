"use client";

import { useState } from "react";

/**
 * Numero de paiement avec bouton « Copier ».
 *
 * Recopier un numero a la main sur un clavier de telephone est la premiere
 * source d'erreur de virement : un chiffre de travers et l'argent part
 * ailleurs. Le bouton supprime ce risque.
 */
export function NumeroPaiement({
  operateur, numero, couleur,
}: { operateur: string; numero: string; couleur: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(numero.replace(/\s/g, ""));
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refuse (navigateur ancien, page non securisee) :
      // le numero reste lisible et recopiable a la main.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${couleur}`}>{operateur}</p>
        <p className="mt-0.5 truncate font-mono text-base font-bold tracking-wide text-slate-900">
          {numero}
        </p>
      </div>
      <button type="button" onClick={copier} className="btn-secondaire shrink-0 px-3 py-2 text-xs">
        {copie ? "✓ Copié" : "Copier"}
      </button>
    </div>
  );
}
