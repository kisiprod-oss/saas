"use client";

import { useState } from "react";

/** Copie un texte (typiquement un lien) dans le presse-papiers, avec confirmation visuelle. */
export function BoutonCopier({ texte, className }: { texte: string; className?: string }) {
  const [copie, setCopie] = useState(false);

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        } catch {
          // Presse-papiers indisponible (navigateur ancien, contexte non
          // securise) : rien de casse, le lien reste copiable a la main.
        }
      }}
    >
      {copie ? "Lien copié ✓" : "Copier le lien"}
    </button>
  );
}
