import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { codeLisible, compterRegistre, listerRegistre } from "@/lib/verification";
import type { TypeDocument } from "@/lib/verification";
import { dateHeureFr } from "@/lib/format";
import { Carte, EnTetePage, EtatVide } from "@/components/ui";

export const metadata = { title: "Documents émis" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageDocuments({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const brut = Array.isArray(params.type) ? params.type[0] : params.type;
  const type = brut === "quittance" || brut === "bail" ? (brut as TypeDocument) : undefined;

  const lignes = listerRegistre(agence.id, type);
  const compte = compterRegistre(agence.id);

  const onglets: { cle: string; libelle: string; href: string }[] = [
    { cle: "", libelle: `Tout (${compte.quittances + compte.baux})`, href: "/dashboard/documents" },
    { cle: "quittance", libelle: `Quittances (${compte.quittances})`, href: "/dashboard/documents?type=quittance" },
    { cle: "bail", libelle: `Baux (${compte.baux})`, href: "/dashboard/documents?type=bail" },
  ];

  return (
    <>
      <EnTetePage
        titre="Documents émis"
        sousTitre="Chaque quittance et chaque bail que vous avez édité, avec son code de vérification."
      />

      <nav className="mt-5 flex flex-wrap gap-2">
        {onglets.map((o) => (
          <Link
            key={o.cle}
            href={o.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              (type ?? "") === o.cle
                ? "bg-brand-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o.libelle}
          </Link>
        ))}
      </nav>

      {lignes.length === 0 ? (
        <div className="mt-5">
          <EtatVide
            titre="Aucun document édité"
            description="Dès que vous imprimez une quittance ou un bail, il apparaît ici avec son code de vérification."
          />
        </div>
      ) : (
        <Carte className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Document</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Destinataire</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Code</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-700">Dernière édition</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Éditions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lignes.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={l.type === "quittance"
                          ? `/factures/${l.document_id}/imprimer`
                          : `/contrats/${l.document_id}/imprimer`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {l.numero}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {l.type === "quittance" ? "Quittance" : "Bail"}
                        {l.auteur && ` · par ${l.auteur}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {l.destinataire ?? <span className="text-slate-400">Document supprimé</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/verifier/${l.code_verification}`}
                        className="font-mono text-xs text-slate-600 hover:text-brand-700 hover:underline"
                      >
                        {codeLisible(l.code_verification)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {dateHeureFr(l.derniere_edition)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{l.nombre_editions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Ce registre note qu&apos;un document a été édité, et quand. Il ne conserve pas de copie
        du fichier : la quittance et le bail se réimpriment à l&apos;identique depuis leur
        fiche, à partir des données enregistrées.
      </p>
    </>
  );
}
