"use client";

import { useState } from "react";

const LIBELLES = ["", "Très mauvais", "Décevant", "Correct", "Bien", "Excellent"];

/**
 * Selecteur de note en etoiles.
 *
 * Construit sur de vrais boutons radio : la note part donc au serveur meme
 * si le JavaScript ne s'est pas charge, ce qui arrive sur une connexion
 * mobile lente. Le survol et le libelle ne sont qu'une aide visuelle.
 */
export function ChoixEtoiles() {
  const [choisie, setChoisie] = useState(0);
  const [survolee, setSurvolee] = useState(0);
  const affichee = survolee || choisie;

  return (
    <fieldset>
      <legend className="etiquette">Votre note <span className="text-rose-500">*</span></legend>

      <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setSurvolee(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            onMouseEnter={() => setSurvolee(n)}
            className="cursor-pointer p-1"
            title={LIBELLES[n]}
          >
            <input
              type="radio"
              name="note"
              value={n}
              required
              className="sr-only"
              onChange={() => setChoisie(n)}
            />
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={`h-9 w-9 transition-colors ${n <= affichee ? "text-amber-400" : "text-slate-200"}`}
            >
              <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />
            </svg>
            <span className="sr-only">{n} étoile{n > 1 ? "s" : ""} — {LIBELLES[n]}</span>
          </label>
        ))}
      </div>

      <p className="mt-1 h-5 text-sm font-medium text-slate-600">
        {affichee > 0 ? LIBELLES[affichee] : ""}
      </p>
    </fieldset>
  );
}
