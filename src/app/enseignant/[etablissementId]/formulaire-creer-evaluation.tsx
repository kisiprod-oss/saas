"use client";

import { useState, useTransition } from "react";

type Option = { id: string; nom: string };

export function FormulaireCreerEvaluation({
  etablissementId,
  classes,
  matieres,
  anneeScolaireId,
  action,
}: {
  etablissementId: string;
  classes: Option[];
  matieres: Option[];
  anneeScolaireId: string;
  action: (
    etablissementId: string,
    formData: FormData
  ) => Promise<{ erreur: string | null }>;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-bordure bg-fond-carte p-4"
      action={(formData: FormData) => {
        demarrer(async () => {
          const resultat = await action(etablissementId, formData);
          setErreur(resultat.erreur);
        });
      }}
    >
      <input type="hidden" name="annee_scolaire_id" value={anneeScolaireId} />
      <input
        name="titre"
        required
        placeholder="Titre de l'évaluation"
        className="h-10 rounded-lg border border-bordure px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          name="classe_id"
          required
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        >
          <option value="">Classe</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
        <select
          name="matiere_id"
          required
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        >
          <option value="">Matière</option>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          name="periode"
          required
          placeholder="Trimestre 1"
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        />
        <input
          name="bareme_max"
          type="number"
          defaultValue={20}
          min={1}
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        />
        <input
          name="coefficient"
          type="number"
          defaultValue={1}
          min={0.5}
          step={0.5}
          className="h-10 rounded-lg border border-bordure px-3 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-10 rounded-lg bg-bleu text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Création…" : "Créer l'évaluation"}
      </button>
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </form>
  );
}
