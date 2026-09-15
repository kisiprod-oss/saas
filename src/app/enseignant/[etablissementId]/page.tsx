import Link from "next/link";
import { exigerRole } from "@/lib/auth";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnteteEtablissement } from "@/components/entete-etablissement";
import { creerDevoir, creerEvaluation } from "./actions";
import { FormulaireCreerDevoir } from "./formulaire-creer-devoir";
import { FormulaireCreerEvaluation } from "./formulaire-creer-evaluation";

export default async function PageEnseignant({
  params,
}: {
  params: Promise<{ etablissementId: string }>;
}) {
  const { etablissementId } = await params;
  const { user, profil, appartenances } = await exigerRole(
    etablissementId,
    "enseignant"
  );
  const etablissement = appartenances.find(
    (a) => a.etablissement.id === etablissementId
  )!.etablissement;

  const supabase = await creerClientServeur();

  const { data: affectations } = await supabase
    .from("affectations_enseignants")
    .select("classe:classes(id, nom), matiere:matieres(id, nom)")
    .eq("etablissement_id", etablissementId)
    .eq("enseignant_id", user!.id);

  const classesUniques = new Map<string, { id: string; nom: string }>();
  const matieresUniques = new Map<string, { id: string; nom: string }>();
  affectations?.forEach((a) => {
    const c = a.classe as unknown as { id: string; nom: string } | null;
    const m = a.matiere as unknown as { id: string; nom: string } | null;
    if (c) classesUniques.set(c.id, c);
    if (m) matieresUniques.set(m.id, m);
  });

  const { data: anneesScolaires } = await supabase
    .from("annees_scolaires")
    .select("id")
    .eq("etablissement_id", etablissementId)
    .eq("active", true);

  const { data: mesDevoirs } = await supabase
    .from("devoirs")
    .select("id, titre, date_echeance, classe:classes(nom), matiere:matieres(nom)")
    .eq("enseignant_id", user!.id)
    .order("date_publication", { ascending: false })
    .limit(8);

  const { data: mesEvaluations } = await supabase
    .from("evaluations")
    .select("id, titre, periode, publie, classe:classes(nom), matiere:matieres(nom)")
    .eq("cree_par", user!.id)
    .order("date_evaluation", { ascending: false })
    .limit(8);

  return (
    <div className="min-h-screen bg-fond">
      <EnteteEtablissement
        nomEtablissement={etablissement.nom}
        demo={etablissement.demo}
        role="enseignant"
        nomUtilisateur={profil?.nom_complet ?? ""}
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-texte">Mes classes</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...classesUniques.values()].map((c) => (
            <span
              key={c.id}
              className="rounded-full border border-bordure bg-fond-carte px-3 py-1 text-sm text-texte"
            >
              {c.nom}
            </span>
          ))}
          {classesUniques.size === 0 && (
            <p className="text-sm text-texte-attenue">
              Aucune classe ne vous est encore attribuée.
            </p>
          )}
        </div>

        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Publier un devoir
            </h2>
            <FormulaireCreerDevoir
              etablissementId={etablissementId}
              classes={[...classesUniques.values()]}
              matieres={[...matieresUniques.values()]}
              action={creerDevoir}
            />
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Créer une évaluation
            </h2>
            {anneesScolaires && anneesScolaires.length > 0 ? (
              <FormulaireCreerEvaluation
                etablissementId={etablissementId}
                classes={[...classesUniques.values()]}
                matieres={[...matieresUniques.values()]}
                anneeScolaireId={anneesScolaires[0].id}
                action={creerEvaluation}
              />
            ) : (
              <p className="text-sm text-texte-attenue">
                Aucune année scolaire active.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Devoirs publiés
            </h2>
            <div className="flex flex-col gap-2">
              {mesDevoirs?.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-bordure bg-fond-carte px-4 py-3"
                >
                  <p className="font-medium text-texte">{d.titre}</p>
                  <p className="text-sm text-texte-attenue">
                    {(d.classe as unknown as { nom: string } | null)?.nom} ·{" "}
                    {(d.matiere as unknown as { nom: string } | null)?.nom} ·
                    échéance{" "}
                    {new Date(d.date_echeance).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))}
              {mesDevoirs?.length === 0 && (
                <p className="text-sm text-texte-attenue">
                  Aucun devoir publié pour l&apos;instant.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-texte">
              Mes évaluations
            </h2>
            <div className="flex flex-col gap-2">
              {mesEvaluations?.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/enseignant/${etablissementId}/evaluations/${ev.id}`}
                  className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte px-4 py-3 hover:border-bleu"
                >
                  <div>
                    <p className="font-medium text-texte">{ev.titre}</p>
                    <p className="text-sm text-texte-attenue">
                      {(ev.classe as unknown as { nom: string } | null)?.nom}{" "}
                      ·{" "}
                      {(ev.matiere as unknown as { nom: string } | null)?.nom}{" "}
                      · {ev.periode}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      ev.publie
                        ? "bg-green-50 text-vert-fonce"
                        : "bg-amber-50 text-avertissement"
                    }`}
                  >
                    {ev.publie ? "Publiée" : "Non publiée"}
                  </span>
                </Link>
              ))}
              {mesEvaluations?.length === 0 && (
                <p className="text-sm text-texte-attenue">
                  Aucune évaluation créée pour l&apos;instant.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
