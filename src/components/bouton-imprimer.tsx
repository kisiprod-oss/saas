"use client";

import { IconeImprimer } from "./icones";

export function BoutonImprimer() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primaire">
      <IconeImprimer className="h-4 w-4" /> Imprimer / Enregistrer en PDF
    </button>
  );
}
