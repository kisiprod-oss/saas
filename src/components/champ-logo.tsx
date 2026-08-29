"use client";

import { useState } from "react";

/**
 * Selecteur du logo de l'agence.
 *
 * Distinct du selecteur de photo de profil : un logo garde ses proportions
 * et se voit sur fond blanc, comme sur les quittances. L'apercu reproduit
 * donc ce cadre-la, pour que l'agence voie exactement le rendu final.
 */
export function ChampLogo({ logoActuel }: { logoActuel: string | null }) {
  const [apercu, setApercu] = useState<string | null>(null);
  const affiche = apercu ?? logoActuel;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
        {affiche ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affiche} alt="Logo de votre agence" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-center text-xs text-slate-400">
            Aucun logo
          </span>
        )}
      </div>

      <div className="flex-1">
        <label htmlFor="logo" className="btn-secondaire cursor-pointer">
          🖼️ {logoActuel ? "Changer le logo" : "Choisir un logo"}
        </label>
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            setApercu(fichier ? URL.createObjectURL(fichier) : null);
          }}
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Il apparaît en haut de toutes vos quittances de loyer. Un fichier PNG
          à fond transparent donne le meilleur résultat. Vos proportions sont
          conservées.
        </p>
      </div>
    </div>
  );
}
