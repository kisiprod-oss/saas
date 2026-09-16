"use client";

import { useState } from "react";
import { Photo } from "./ui";

/**
 * La galerie d'une fiche produit.
 *
 * La grande image charge en priorite (`fetchPriority` via un rendu direct) ;
 * les vignettes restent en chargement differe. Sur une connexion mobile
 * limitee, on telecharge une image de 1400 px et trois de 400 px, pas quatre
 * fois 1400 px.
 */
export function GalerieProduit({
  photos, alt, arrondi,
}: {
  photos: { grande: string; petite: string }[];
  alt: string;
  arrondi: string;
}) {
  const [active, setActive] = useState(0);

  if (photos.length === 0) {
    return (
      <div className={`overflow-hidden border border-encre-200 ${arrondi}`}>
        <Photo src={null} alt={alt} />
      </div>
    );
  }

  return (
    <div>
      <div className={`overflow-hidden border border-encre-200 ${arrondi}`}>
        <Photo src={photos[active].grande} alt={alt} />
      </div>

      {photos.length > 1 ? (
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Autres photos">
          {photos.map((photo, i) => (
            <button
              key={photo.petite}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`w-20 shrink-0 overflow-hidden border-2 ${arrondi}
                ${i === active ? "border-encre-900" : "border-transparent opacity-70"}`}
            >
              <Photo src={photo.petite} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
