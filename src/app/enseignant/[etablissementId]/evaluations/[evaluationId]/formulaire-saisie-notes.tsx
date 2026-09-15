"use client";

import { useState, useTransition } from "react";

type LigneEleve = {
  id: string;
  nom: string;
  prenom: string;
  valeur: number | null;
  statut: "note" | "absent" | "dispense" | "non_note";
  appreciation: string;
};

const optionsStatut: { valeur: LigneEleve["statut"]; libelle: string }[] = [
  { valeur: "note", libelle: "Noté" },
  { valeur: "absent", libelle: "Absent" },
  { valeur: "dispense", libelle: "Dispensé" },
  { valeur: "non_note", libelle: "Pas encore noté" },
];

export function FormulaireSaisieNotes({
  etablissementId,
  evaluationId,
  baremeMax,
  eleves,
  action,
}: {
  etablissementId: string;
  evaluationId: string;
  baremeMax: number;
  eleves: LigneEleve[];
  action: (
    etablissementId: string,
    evaluationId: string,
    formData: FormData
  ) => Promise<{ erreur: string | null }>;
}) {
  const [lignes, setLignes] = useState(eleves);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, demarrer] = useTransition();

  function mettreAJour(id: string, champ: keyof LigneEleve, valeur: string) {
    setLignes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [champ]: valeur } : l))
    );
    setSucces(false);
  }

  return (
    <form
      className="mt-6 flex flex-col gap-3"
      action={(formData: FormData) => {
        demarrer(async () => {
          const resultat = await action(
            etablissementId,
            evaluationId,
            formData
          );
          setErreur(resultat.erreur);
          setSucces(!resultat.erreur);
        });
      }}
    >
      {lignes.map((l) => (
        <div
          key={l.id}
          className="grid grid-cols-1 gap-2 rounded-xl border border-bordure bg-fond-carte p-4 sm:grid-cols-[1fr_auto_auto_1fr]"
        >
          <input type="hidden" name="eleve_id" value={l.id} />
          <p className="self-center font-medium text-texte">
            {l.prenom} {l.nom}
          </p>

          <select
            name={`statut_${l.id}`}
            value={l.statut}
            onChange={(e) => mettreAJour(l.id, "statut", e.target.value)}
            className="h-10 rounded-lg border border-bordure px-2 text-sm"
          >
            {optionsStatut.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>

          <input
            name={`valeur_${l.id}`}
            type="number"
            min={0}
            max={baremeMax}
            step={0.5}
            disabled={l.statut !== "note"}
            value={l.valeur ?? ""}
            onChange={(e) => mettreAJour(l.id, "valeur", e.target.value)}
            placeholder={`/ ${baremeMax}`}
            className="h-10 w-24 rounded-lg border border-bordure px-2 text-sm disabled:bg-fond disabled:text-texte-attenue"
          />

          <input
            name={`appreciation_${l.id}`}
            defaultValue={l.appreciation}
            placeholder="Appréciation"
            className="h-10 rounded-lg border border-bordure px-2 text-sm"
          />
        </div>
      ))}

      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      {succes && (
        <p className="text-sm text-vert-fonce">Notes enregistrées.</p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-2 h-11 w-full rounded-lg bg-bleu text-sm font-semibold text-white hover:bg-bleu-fonce disabled:opacity-60 sm:w-auto sm:self-start sm:px-6"
      >
        {enCours ? "Enregistrement…" : "Enregistrer les notes"}
      </button>
      <p className="text-xs text-texte-attenue">
        L&apos;enregistrement ne publie pas encore le résultat à la famille :
        la direction (ou vous-même en tant qu&apos;auteur) doit publier
        l&apos;évaluation depuis le tableau de bord Direction.
      </p>
    </form>
  );
}
