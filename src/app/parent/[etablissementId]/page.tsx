import { exigerRole } from "@/lib/auth";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnteteEtablissement } from "@/components/entete-etablissement";
import { VueEleve } from "@/components/vue-eleve";

export default async function PageParent({
  params,
  searchParams,
}: {
  params: Promise<{ etablissementId: string }>;
  searchParams: Promise<{ enfant?: string }>;
}) {
  const { etablissementId } = await params;
  const { enfant } = await searchParams;
  const { user, profil, appartenances } = await exigerRole(
    etablissementId,
    "parent"
  );
  const etablissement = appartenances.find(
    (a) => a.etablissement.id === etablissementId
  )!.etablissement;

  const supabase = await creerClientServeur();

  // Seuls les rattachements vérifiés par la direction sont pris en compte :
  // c'est cette vérification qui protège un enfant d'un accès non autorisé.
  const { data: rattachements } = await supabase
    .from("responsables_eleves")
    .select("eleve:eleves(id, nom, prenom, classe_id, etablissement_id)")
    .eq("utilisateur_id", user!.id)
    .eq("verifie", true);

  const enfants = (rattachements ?? [])
    .map((r) => r.eleve as unknown as {
      id: string;
      nom: string;
      prenom: string;
      classe_id: string | null;
      etablissement_id: string;
    })
    .filter((e) => e && e.etablissement_id === etablissementId);

  if (enfants.length === 0) {
    return (
      <div className="min-h-screen bg-fond">
        <EnteteEtablissement
          nomEtablissement={etablissement.nom}
          demo={etablissement.demo}
          role="parent"
          nomUtilisateur={profil?.nom_complet ?? ""}
        />
        <main className="mx-auto max-w-2xl px-6 py-16 text-center text-texte-attenue">
          Aucun enfant vérifié n&apos;est encore rattaché à votre compte dans
          cet établissement. Contactez la direction.
        </main>
      </div>
    );
  }

  const enfantSelectionne =
    enfants.find((e) => e.id === enfant) ?? enfants[0];

  return (
    <div className="min-h-screen bg-fond">
      <EnteteEtablissement
        nomEtablissement={etablissement.nom}
        demo={etablissement.demo}
        role="parent"
        nomUtilisateur={profil?.nom_complet ?? ""}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {enfants.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {enfants.map((e) => (
              <a
                key={e.id}
                href={`/parent/${etablissementId}?enfant=${e.id}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                  e.id === enfantSelectionne.id
                    ? "border-bleu bg-bleu text-white"
                    : "border-bordure bg-fond-carte text-texte"
                }`}
              >
                {e.prenom} {e.nom}
              </a>
            ))}
          </div>
        )}

        <VueEleve eleveId={enfantSelectionne.id} entete={`${enfantSelectionne.prenom} ${enfantSelectionne.nom}`} />
      </main>
    </div>
  );
}
