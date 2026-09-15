import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";

const libelleRole: Record<string, string> = {
  direction: "Direction",
  enseignant: "Enseignant",
  parent: "Parent",
  eleve: "Élève",
};

export default async function PageTableauDeBord() {
  const { appartenances } = await exigerUtilisateur();

  if (appartenances.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-texte">
          Aucun établissement rattaché
        </h1>
        <p className="mt-3 text-texte-attenue">
          Votre compte est bien connecté, mais n&apos;est encore associé à
          aucun établissement sur SamaÉcole. Contactez la direction de votre
          établissement pour être invité.
        </p>
      </div>
    );
  }

  if (appartenances.length === 1) {
    const seule = appartenances[0];
    redirect(`/${seule.role}/${seule.etablissement.id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-xl font-semibold text-texte">
        Choisissez un espace
      </h1>
      <p className="mt-2 text-sm text-texte-attenue">
        Vous êtes rattaché à plusieurs établissements ou rôles. Sélectionnez
        celui que vous souhaitez ouvrir.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {appartenances.map((a) => (
          <Link
            key={`${a.etablissement.id}-${a.role}`}
            href={`/${a.role}/${a.etablissement.id}`}
            className="flex items-center justify-between rounded-xl border border-bordure bg-fond-carte p-4 hover:border-bleu"
          >
            <div>
              <p className="font-medium text-texte">{a.etablissement.nom}</p>
              <p className="text-sm text-texte-attenue">
                {libelleRole[a.role] ?? a.role}
              </p>
            </div>
            {a.etablissement.demo && <span className="badge-demo">Démo</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
