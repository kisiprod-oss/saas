import { exigerRole } from "@/lib/auth";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnteteEtablissement } from "@/components/entete-etablissement";
import { enregistrerNotes } from "../../actions";
import { FormulaireSaisieNotes } from "./formulaire-saisie-notes";

export default async function PageSaisieNotes({
  params,
}: {
  params: Promise<{ etablissementId: string; evaluationId: string }>;
}) {
  const { etablissementId, evaluationId } = await params;
  const { profil, appartenances } = await exigerRole(
    etablissementId,
    "enseignant"
  );
  const etablissement = appartenances.find(
    (a) => a.etablissement.id === etablissementId
  )!.etablissement;

  const supabase = await creerClientServeur();

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, titre, bareme_max, publie, classe:classes(id, nom)")
    .eq("id", evaluationId)
    .single();

  if (!evaluation) {
    return (
      <div className="p-10 text-texte-attenue">Évaluation introuvable.</div>
    );
  }

  const classe = evaluation.classe as unknown as { id: string; nom: string };

  const [{ data: eleves }, { data: notesExistantes }] = await Promise.all([
    supabase
      .from("eleves")
      .select("id, nom, prenom")
      .eq("classe_id", classe.id)
      .eq("statut", "actif")
      .order("nom"),
    supabase
      .from("notes")
      .select("eleve_id, valeur, statut, appreciation")
      .eq("evaluation_id", evaluationId),
  ]);

  const notesParEleve = new Map(
    (notesExistantes ?? []).map((n) => [n.eleve_id, n])
  );

  return (
    <div className="min-h-screen bg-fond">
      <EnteteEtablissement
        nomEtablissement={etablissement.nom}
        demo={etablissement.demo}
        role="enseignant"
        nomUtilisateur={profil?.nom_complet ?? ""}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-texte">
          {evaluation.titre}
        </h1>
        <p className="text-sm text-texte-attenue">
          {classe.nom} · barème /{evaluation.bareme_max}
          {evaluation.publie && " · déjà publiée à la famille"}
        </p>

        <FormulaireSaisieNotes
          etablissementId={etablissementId}
          evaluationId={evaluationId}
          baremeMax={evaluation.bareme_max}
          eleves={(eleves ?? []).map((e) => ({
            id: e.id,
            nom: e.nom,
            prenom: e.prenom,
            valeur: notesParEleve.get(e.id)?.valeur ?? null,
            statut: notesParEleve.get(e.id)?.statut ?? "non_note",
            appreciation: notesParEleve.get(e.id)?.appreciation ?? "",
          }))}
          action={enregistrerNotes}
        />
      </main>
    </div>
  );
}
