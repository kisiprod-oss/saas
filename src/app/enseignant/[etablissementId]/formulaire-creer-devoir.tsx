"use client";

import { useState, useTransition } from "react";

type Option = { id: string; nom: string };

export function FormulaireCreerDevoir({
  etablissementId,
  classes,
  matieres,
  action,
}: {
  etablissementId: string;
  classes: Option[];
  matieres: Option[];
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
          if (!resultat.erreur) {
            (document.getElementById("form-devoir") as HTMLFormElement)?.reset();
          }
        });
      }}
      id="form-devoir"
    >
      <input
        name="titre"
        required
        placeholder="Titre du devoir"
        className="h-10 rounded-lg border border-bordure px-3 text-sm"
      />
      <textarea
        name="consignes"
        placeholder="Consignes"
        rows={2}
        className="rounded-lg border border-bordure px-3 py-2 text-sm"
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
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-texte-attenue">
          Échéance
          <input
            name="date_echeance"
            type="date"
            required
            className="h-10 rounded-lg border border-bordure px-3 text-sm text-texte"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-texte-attenue">
          Mode de remise
          <select
            name="mode_remise"
            className="h-10 rounded-lg border border-bordure px-3 text-sm text-texte"
          >
            <option value="en_ligne">En ligne</option>
            <option value="en_classe">En classe</option>
          </select>
        </label>
      </div>
      <button
        type="submit"
        disabled={enCours}
        className="h-10 rounded-lg bg-bleu text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60"
      >
        {enCours ? "Publication…" : "Publier le devoir"}
      </button>
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
    </form>
  );
}
