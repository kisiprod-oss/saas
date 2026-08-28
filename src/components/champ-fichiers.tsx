"use client";

import { useState } from "react";

/**
 * Bouton de selection de photos en francais.
 *
 * Le champ natif affiche « Choose Files » dans la langue du navigateur,
 * souvent en anglais : on le masque et on habille une etiquette a la place,
 * en indiquant nous-memes le nombre de photos choisies.
 */
export function ChampFichiers({ premiereFois }: { premiereFois: boolean }) {
  const [noms, setNoms] = useState<string[]>([]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="fichiers" className="btn-primaire cursor-pointer">
        📷 {premiereFois ? "Choisir des photos" : "Ajouter des photos"}
      </label>

      <input
        id="fichiers"
        name="fichiers"
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        onChange={(e) => setNoms(Array.from(e.target.files ?? []).map((f) => f.name))}
      />

      <span className="text-sm text-slate-600">
        {noms.length === 0
          ? "Aucune photo sélectionnée"
          : noms.length === 1
            ? `1 photo : ${noms[0]}`
            : `${noms.length} photos sélectionnées`}
      </span>
    </div>
  );
}
