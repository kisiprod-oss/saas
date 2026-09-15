"use client";

import { useActionState } from "react";
import { connecterAvecMotDePasse } from "./actions";

const etatInitial = { erreur: null as string | null };

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(
    connecterAvecMotDePasse,
    etatInitial
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-texte">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@ecole.sn"
          className="h-12 rounded-lg border border-bordure bg-fond-carte px-4 text-base outline-none focus:border-bleu focus:ring-2 focus:ring-bleu/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="mot_de_passe"
          className="text-sm font-medium text-texte"
        >
          Mot de passe
        </label>
        <input
          id="mot_de_passe"
          name="mot_de_passe"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 rounded-lg border border-bordure bg-fond-carte px-4 text-base outline-none focus:border-bleu focus:ring-2 focus:ring-bleu/20"
        />
      </div>

      {etat.erreur && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-alerte"
        >
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 h-12 rounded-lg bg-bleu text-base font-semibold text-white transition-colors hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
