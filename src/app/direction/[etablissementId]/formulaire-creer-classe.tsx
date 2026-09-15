"use client";

import { useState, useTransition } from "react";

type Niveau = { id: string; nom: string };

export function FormulaireCreerClasse({
  etablissementId,
  niveaux,
  anneeScolaireId,
  creerClasseAction,
}: {
  etablissementId: string;
  niveaux: Niveau[];
  anneeScolaireId: string;
  creerClasseAction: (
    etablissementId: string,
    formData: FormData
  ) => Promise<{ erreur: string | null }>;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-bordure p-3"
      action={(formData: FormData) => {
        demarrer(async () => {
          const resultat = await creerClasseAction(etablissementId, formData);
          setErreur(resultat.erreur);
        });
      }}
    >
      <input type="hidden" name="annee_scolaire_id" value={anneeScolaireId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-texte-attenue">
          Nom de la classe
        </label>
        <input
          name="nom"
          required
          placeholder="ex. CM1 B"
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-texte-attenue">
          Niveau
        </label>
        <select
          name="niveau_id"
          required
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        >
          {niveaux.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-10 rounded-lg bg-bleu px-4 text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Création…" : "Créer la classe"}
      </button>
      {erreur && <p className="w-full text-sm text-alerte">{erreur}</p>}
    </form>
  );
}
