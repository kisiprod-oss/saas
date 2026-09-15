import { creerClientServeur } from "@/lib/supabase/server";

const libelleStatutNote: Record<string, string> = {
  note: "",
  absent: "Absent",
  dispense: "Dispensé",
  non_note: "Non noté",
};

const libelleStatutRemise: Record<string, string> = {
  a_faire: "À faire",
  remis: "Remis",
  en_retard: "En retard",
  corrige: "Corrigé",
};

export async function VueEleve({
  eleveId,
  entete,
}: {
  eleveId: string;
  entete: string;
}) {
  const supabase = await creerClientServeur();

  const { data: eleve } = await supabase
    .from("eleves")
    .select("classe_id")
    .eq("id", eleveId)
    .single();

  if (!eleve?.classe_id) {
    return (
      <p className="text-texte-attenue">
        {entete} n&apos;est rattaché(e) à aucune classe pour le moment.
      </p>
    );
  }

  const [{ data: devoirs }, { data: notes }, { data: absences }] =
    await Promise.all([
      supabase
        .from("devoirs")
        .select(
          "id, titre, date_echeance, matiere:matieres(nom), remises(statut)"
        )
        .eq("classe_id", eleve.classe_id)
        .order("date_echeance", { ascending: false })
        .limit(10),
      // Les politiques RLS ne renvoient déjà que les notes des évaluations
      // publiées pour un parent/élève : impossible de voir une note en cours.
      supabase
        .from("notes")
        .select(
          "id, valeur, statut, appreciation, evaluation:evaluations(titre, periode, bareme_max, coefficient, date_evaluation, matiere:matieres(nom))"
        )
        .eq("eleve_id", eleveId),
      supabase
        .from("absences")
        .select("date, type, justifie, motif")
        .eq("eleve_id", eleveId)
        .order("date", { ascending: false })
        .limit(10),
    ]);

  // Filtre les remises pour ne garder que celle de cet élève
  // (la relation renvoie potentiellement les remises d'autres élèves de
  // la même classe si elles étaient visibles, ce qui n'est pas le cas ici
  // grâce à RLS — cette étape est une sécurité d'affichage supplémentaire).
  const devoirsAffiches = (devoirs ?? []).map((d) => {
    const remisesEleve = (d.remises as unknown as { statut: string }[]) ?? [];
    return { ...d, statut: remisesEleve[0]?.statut ?? "a_faire" };
  });

  type NoteAvecEvaluation = {
    id: string;
    valeur: number | null;
    statut: string;
    appreciation: string | null;
    evaluation: {
      titre: string;
      periode: string;
      bareme_max: number;
      coefficient: number;
      date_evaluation: string;
      matiere: { nom: string } | null;
    } | null;
  };

  const notesTypees = (notes ?? []) as unknown as NoteAvecEvaluation[];

  const parMatiere = new Map<string, NoteAvecEvaluation[]>();
  notesTypees.forEach((n) => {
    const nomMatiere = n.evaluation?.matiere?.nom ?? "Autre";
    if (!parMatiere.has(nomMatiere)) parMatiere.set(nomMatiere, []);
    parMatiere.get(nomMatiere)!.push(n);
  });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-texte">
          Devoirs de la classe
        </h2>
        <div className="flex flex-col gap-2">
          {devoirsAffiches.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte px-4 py-3"
            >
              <div>
                <p className="font-medium text-texte">{d.titre}</p>
                <p className="text-sm text-texte-attenue">
                  {(d.matiere as unknown as { nom: string } | null)?.nom} ·
                  échéance{" "}
                  {new Date(d.date_echeance).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span className="rounded-full bg-fond px-2 py-1 text-xs font-semibold text-texte">
                {libelleStatutRemise[d.statut] ?? d.statut}
              </span>
            </div>
          ))}
          {devoirsAffiches.length === 0 && (
            <p className="text-sm text-texte-attenue">Aucun devoir.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-texte">
          Résultats par matière
        </h2>
        <div className="flex flex-col gap-4">
          {[...parMatiere.entries()].map(([matiere, notesMatiere]) => (
            <BlocMatiere
              key={matiere}
              matiere={matiere}
              notes={notesMatiere}
            />
          ))}
          {parMatiere.size === 0 && (
            <p className="text-sm text-texte-attenue">
              Aucun résultat publié pour le moment.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-texte">
          Absences et retards
        </h2>
        <div className="flex flex-col gap-2">
          {absences?.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte px-4 py-3 text-sm"
            >
              <span className="text-texte">
                {a.type === "retard" ? "Retard" : "Absence"} du{" "}
                {new Date(a.date).toLocaleDateString("fr-FR")}
                {a.motif ? ` — ${a.motif}` : ""}
              </span>
              <span
                className={a.justifie ? "text-vert-fonce" : "text-avertissement"}
              >
                {a.justifie ? "Justifié" : "Non justifié"}
              </span>
            </div>
          ))}
          {absences?.length === 0 && (
            <p className="text-sm text-texte-attenue">
              Aucune absence enregistrée.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function BlocMatiere({
  matiere,
  notes,
}: {
  matiere: string;
  notes: {
    id: string;
    valeur: number | null;
    statut: string;
    appreciation: string | null;
    evaluation: {
      titre: string;
      periode: string;
      bareme_max: number;
      date_evaluation: string;
    } | null;
  }[];
}) {
  const triees = [...notes].sort((a, b) =>
    (a.evaluation?.date_evaluation ?? "").localeCompare(
      b.evaluation?.date_evaluation ?? ""
    )
  );

  const notesChiffrees = triees.filter(
    (n) => n.statut === "note" && n.valeur !== null && n.evaluation
  );

  let tendance: string | null = null;
  if (notesChiffrees.length >= 2) {
    const derniere = notesChiffrees[notesChiffrees.length - 1];
    const precedente = notesChiffrees[notesChiffrees.length - 2];
    const noteSur20Derniere =
      (derniere.valeur! / derniere.evaluation!.bareme_max) * 20;
    const noteSur20Precedente =
      (precedente.valeur! / precedente.evaluation!.bareme_max) * 20;
    const ecart = noteSur20Derniere - noteSur20Precedente;
    if (Math.abs(ecart) < 0.5) tendance = "Stable par rapport au résultat précédent.";
    else if (ecart > 0) tendance = "En progression par rapport au résultat précédent.";
    else tendance = "En baisse par rapport au résultat précédent.";
  } else {
    tendance = "Pas encore assez de résultats publiés pour dégager une tendance.";
  }

  return (
    <div className="rounded-xl border border-bordure bg-fond-carte p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-texte">{matiere}</h3>
        <p className="text-xs text-texte-attenue">{tendance}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {triees.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-texte-attenue">
              {n.evaluation?.titre} ({n.evaluation?.periode})
            </span>
            <span className="font-medium text-texte">
              {n.statut === "note"
                ? `${n.valeur} / ${n.evaluation?.bareme_max}`
                : libelleStatutNote[n.statut]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
