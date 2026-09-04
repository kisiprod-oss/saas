"use client";

import { useState } from "react";

/**
 * Copie un texte (typiquement un lien) dans le presse-papiers, avec
 * confirmation visuelle.
 *
 * Les libelles sont modifiables : sur un telephone, recopier un chemin de
 * serveur a la main est la source d'erreur numero un.
 */
export function BoutonCopier({
  texte,
  className,
  label = "Copier le lien",
  labelCopie = "Lien copié ✓",
}: {
  texte: string;
  className?: string;
  label?: string;
  labelCopie?: string;
}) {
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
          // securise) : rien de casse, le texte reste copiable a la main.
        }
      }}
    >
      {copie ? labelCopie : label}
    </button>
  );
}
