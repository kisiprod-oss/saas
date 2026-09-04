import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { actionEnregistrerClausesBail } from "@/lib/actions";
import { CLAUSES_PAR_DEFAUT, clausesDeLAgence, VARIABLES } from "@/lib/bail-clauses";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Mon modèle de bail" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageModeleBail({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;

  const clauses = clausesDeLAgence(agence.modele_bail_clauses);
  const parDefaut = new Map(CLAUSES_PAR_DEFAUT.map((c) => [c.cle, c.texte]));
  const modifies = clauses.filter((c) => c.texte !== parDefaut.get(c.cle)).length;

  return (
    <>
      <Link href="/dashboard/contrats" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux baux
      </Link>

      <EnTetePage
        titre="Mon modèle de bail"
        sousTitre="Les articles imprimés sur chaque contrat. Modifiez-les pour qu'ils correspondent à votre situation."
      />

      <MessagesUrl params={params} />

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={actionEnregistrerClausesBail} className="space-y-5 lg:col-span-2">
          {clauses.map((c, i) => {
            const original = parDefaut.get(c.cle) ?? "";
            const change = c.texte !== original;
            return (
              <Carte key={c.cle} className="p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-slate-900">
                    Article {i + 1} — {c.titre}
                  </h2>
                  {change && (
                    <span className="badge bg-or-100 text-brand-900 ring-or-400/40">
                      Votre texte
                    </span>
                  )}
                </div>
                <textarea
                  name={`clause_${c.cle}`}
                  defaultValue={c.texte}
                  rows={Math.min(20, c.texte.split("\n").length + 4)}
                  className="champ font-mono text-xs leading-relaxed"
                />
                {change && (
                  <p className="mt-2 text-xs text-slate-500">
                    Pour revenir au texte du logiciel, videz complètement ce cadre
                    puis enregistrez.
                  </p>
                )}
              </Carte>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primaire">Enregistrer mon modèle</button>
            <p className="text-sm text-slate-500">
              {modifies === 0
                ? "Vous utilisez le modèle du logiciel."
                : `${modifies} article(s) réécrit(s) par vous.`}
            </p>
          </div>
        </form>

        <aside className="space-y-5">
          <Carte className="border-brand-200 bg-brand-50/60 p-5">
            <h2 className="font-semibold text-brand-900">Comment ça marche</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-900">
              Ces articles sont le <strong>texte juridique</strong> de vos baux. Ils ne
              changent pas d&apos;un locataire à l&apos;autre.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-900">
              Ce qui change, ce sont les <strong>informations du dossier</strong> : le
              logiciel remplace les mots entre accolades par le nom du locataire, son
              bien, ses montants et ses dates. Chaque bail sort donc rempli, sans
              ressaisie.
            </p>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Mots à utiliser</h2>
            <p className="mt-1 text-xs text-slate-500">
              Recopiez-les tels quels, accolades comprises.
            </p>
            <dl className="mt-3 space-y-2">
              {VARIABLES.map((v) => (
                <div key={v.cle}>
                  <dt className="font-mono text-xs font-semibold text-brand-700">
                    {`{${v.cle}}`}
                  </dt>
                  <dd className="text-xs text-slate-500">{v.description}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Carte className="border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">À lire avant de modifier</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              Ce modèle reprend les usages d&apos;un bail d&apos;habitation au Sénégal.
              Il n&apos;est pas rédigé par un juriste. Un bail engage un toit et de
              l&apos;argent : si votre situation est particulière, faites relire votre
              texte par un professionnel du droit avant de le faire signer.
            </p>
          </Carte>
        </aside>
      </div>
    </>
  );
}
