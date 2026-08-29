"use client";

import { useState } from "react";

/**
 * Selecteur de photo de profil avec apercu immediat.
 *
 * L'apercu compte : sur un telephone, on ne sait jamais quelle image on vient
 * de choisir dans la galerie. Le voir evite d'envoyer la mauvaise photo.
 */
export function ChampPhotoLocataire({ photoActuelle }: { photoActuelle: string | null }) {
  const [apercu, setApercu] = useState<string | null>(null);
  const [choisie, setChoisie] = useState(false);

  const affichee = apercu ?? photoActuelle;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        {affichee ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affichee} alt="Votre photo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor"
                 strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="8.5" r="3.8" />
              <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 text-center sm:text-left">
        <label htmlFor="photo" className="btn-primaire cursor-pointer">
          📷 {photoActuelle ? "Changer ma photo" : "Choisir ma photo"}
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            setChoisie(Boolean(fichier));
            setApercu(fichier ? URL.createObjectURL(fichier) : null);
          }}
        />

        <p className="mt-2 text-xs text-slate-500">
          Depuis un téléphone, vous pouvez la prendre sur le moment. L&apos;image est
          automatiquement recadrée en carré et allégée.
        </p>

        {choisie && (
          <button type="submit" className="btn-primaire mt-3 w-full sm:w-auto">
            Enregistrer cette photo
          </button>
        )}
      </div>
    </div>
  );
}
