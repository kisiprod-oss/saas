import { exigerRole } from "@/lib/auth";
import { creerClientServeur } from "@/lib/supabase/server";
import { EnteteEtablissement } from "@/components/entete-etablissement";
import { VueEleve } from "@/components/vue-eleve";

export default async function PageEleve({
  params,
}: {
  params: Promise<{ etablissementId: string }>;
}) {
  const { etablissementId } = await params;
  const { user, profil, appartenances } = await exigerRole(
    etablissementId,
    "eleve"
  );
  const etablissement = appartenances.find(
    (a) => a.etablissement.id === etablissementId
  )!.etablissement;

  const supabase = await creerClientServeur();
  const { data: monDossier } = await supabase
    .from("eleves")
    .select("id, nom, prenom")
    .eq("utilisateur_id", user!.id)
    .eq("etablissement_id", etablissementId)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-fond">
      <EnteteEtablissement
        nomEtablissement={etablissement.nom}
        demo={etablissement.demo}
        role="eleve"
        nomUtilisateur={profil?.nom_complet ?? ""}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {monDossier ? (
          <VueEleve
            eleveId={monDossier.id}
            entete={`${monDossier.prenom} ${monDossier.nom}`}
          />
        ) : (
          <p className="text-texte-attenue">
            Aucun dossier élève n&apos;est encore lié à votre compte.
          </p>
        )}
      </main>
    </div>
  );
}
