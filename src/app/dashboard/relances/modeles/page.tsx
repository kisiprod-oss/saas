import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { actionEnregistrerModeles } from "@/lib/actions";
import { ETIQUETTES, MODELES_PAR_DEFAUT, NIVEAUX } from "@/lib/relances";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Messages de relance" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageModeles({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;

  const valeurs: Record<string, string> = {
    modele_rappel: agence.modele_rappel ?? MODELES_PAR_DEFAUT.rappel,
    modele_relance: agence.modele_relance ?? MODELES_PAR_DEFAUT.relance,
    modele_mise_en_demeure: agence.modele_mise_en_demeure ?? MODELES_PAR_DEFAUT.mise_en_demeure,
  };

  return (
    <>
      <Link href="/dashboard/relances" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux relances
      </Link>

      <EnTetePage
        titre="Mes messages de relance"
        sousTitre="Trois messages, du plus courtois au plus ferme, adaptés automatiquement à chaque locataire."
      />

      <MessagesUrl params={params} />

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={actionEnregistrerModeles} className="space-y-5 lg:col-span-2">
          {NIVEAUX.map((n) => (
            <Carte key={n.valeur} className="p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{n.libelle}</h2>
                  <p className="text-sm text-slate-500">{n.description}</p>
                </div>
                <span className={`badge ${n.couleur}`}>
                  {n.valeur === "mise_en_demeure"
                    ? "à partir de 30 jours"
                    : n.valeur === "relance"
                      ? "de 8 à 29 jours"
                      : "de 1 à 7 jours"}
                </span>
              </div>
              <textarea
                name={`modele_${n.valeur}`}
                defaultValue={valeurs[`modele_${n.valeur}`]}
                rows={14}
                className="champ font-mono text-xs leading-relaxed"
              />
            </Carte>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primaire">Enregistrer mes messages</button>
            <Link href="/dashboard/relances" className="btn-secondaire">Annuler</Link>
          </div>
        </form>

        <aside className="space-y-5">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Étiquettes disponibles</h2>
            <p className="mt-1 text-sm text-slate-500">
              Écrivez-les entre accolades : elles sont remplacées automatiquement
              par les informations de chaque locataire.
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              {ETIQUETTES.map(([cle, description]) => (
                <div key={cle}>
                  <dt className="font-mono text-xs font-semibold text-brand-700">{cle}</dt>
                  <dd className="text-xs text-slate-500">{description}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Comment ça marche</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li>📅 Le niveau est choisi tout seul selon le nombre de jours de retard.</li>
              <li>🔁 Un même locataire n&apos;est pas relancé deux fois en moins de 7 jours.</li>
              <li>✅ Chaque envoi est noté dans l&apos;historique, avec sa date et son canal.</li>
              <li>✍️ Vous pouvez toujours retoucher le message avant de l&apos;envoyer.</li>
            </ul>
          </Carte>
        </aside>
      </div>
    </>
  );
}
