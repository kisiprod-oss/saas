import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { bilan, periodesDisponibles, resoudrePeriode } from "@/lib/comptabilite";
import { dateFr, fcfa, moisCourt } from "@/lib/format";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { EnTeteAgence } from "@/components/papier-agence";
import { IconeRetour } from "@/components/icones";
import {
  COULEUR_ENCAISSE, COULEUR_FACTURE, COULEUR_HONORAIRES, GraphiqueBarres,
} from "@/components/graphique-barres";

/** `absolute` evite le gabarit « … · Sen Gestion » dans le nom du PDF enregistre. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const code = (Array.isArray(params.p) ? params.p[0] : params.p) ?? "mois";
  const periode = resoudrePeriode(code);
  return { title: { absolute: `Comptabilité — ${periode.libelle}` } };
}
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageImpressionComptabilite({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const codePeriode = (Array.isArray(params.p) ? params.p[0] : params.p) ?? "mois";
  const periode = resoudrePeriode(codePeriode);
  const b = bilan(agence.id, periode);
  const etiquettes = b.historique.map((h) => moisCourt(h.periode));

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="sans-impression mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/dashboard/comptabilite?p=${periode.code}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <IconeRetour className="h-4 w-4" /> Retour à la comptabilité
        </Link>
        <BoutonImprimer />
      </div>

      <article className="mx-auto max-w-[210mm] bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand-600 pb-6">
          <EnTeteAgence agence={agence} />
          <div className="text-right">
            <p className="text-2xl font-extrabold uppercase tracking-tight text-brand-700">
              Situation comptable
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{periode.libelle}</p>
            <p className="text-xs text-slate-600">Édité le {dateFr(new Date().toISOString().slice(0, 10))}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Encaissements</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{fcfa(b.encaisse)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Tout l&apos;argent reçu. Ne vous appartient pas en entier.</p>
          </div>
          <div className="rounded-lg border border-succes-300 bg-succes-50/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-succes-800">Vos honoraires</p>
            <p className="mt-1 text-xl font-bold text-succes-900">{fcfa(b.honoraires)}</p>
            <p className="mt-1 text-[11px] text-succes-800">C&apos;est votre chiffre d&apos;affaires.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">À reverser aux propriétaires</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{fcfa(b.aReverser)}</p>
            <p className="mt-1 text-[11px] text-slate-500">Une dette, pas un produit.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { libelle: "Facturé sur la période", valeur: fcfa(b.facture) },
            { libelle: "Reste dû", valeur: fcfa(b.impayes) },
            { libelle: "Taux de recouvrement", valeur: `${b.tauxRecouvrement} %` },
            { libelle: "Factures émises", valeur: String(b.nbFactures) },
          ].map((c) => (
            <div key={c.libelle} className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{c.libelle}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{c.valeur}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 break-inside-avoid">
          <GraphiqueBarres
            titre="Facturé et encaissé, mois par mois"
            sousTitre="Douze derniers mois. L'écart entre les deux barres, ce sont les impayés."
            etiquettes={etiquettes}
            series={[
              { nom: "Facturé", couleur: COULEUR_FACTURE, valeurs: b.historique.map((h) => h.facture) },
              { nom: "Encaissé", couleur: COULEUR_ENCAISSE, valeurs: b.historique.map((h) => h.encaisse) },
            ]}
          />
        </div>

        <div className="mt-6 break-inside-avoid">
          <GraphiqueBarres
            titre="Vos honoraires, mois par mois"
            sousTitre="Sur son propre axe : invisible sur le graphique du dessus."
            etiquettes={etiquettes}
            series={[
              { nom: "Honoraires", couleur: COULEUR_HONORAIRES, valeurs: b.historique.map((h) => h.honoraires) },
            ]}
          />
        </div>

        <div className="mt-8 break-inside-avoid">
          <h2 className="font-semibold text-slate-900">Détail par bien</h2>
          {b.parBien.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Aucune facture émise sur cette période.</p>
          ) : (
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-left uppercase tracking-wide text-slate-500">
                  <th className="py-1.5 pr-3 font-medium">Bien</th>
                  <th className="py-1.5 pr-3 font-medium">Propriétaire</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Facturé</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Encaissé</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Honoraires</th>
                  <th className="py-1.5 text-right font-medium">Reste dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {b.parBien.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1.5 pr-3">
                      <span className="font-medium text-slate-900">{l.bien}</span>
                      <span className="block text-[10px] text-slate-400">{l.reference}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-slate-600">{l.proprietaire ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fcfa(l.facture)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fcfa(l.encaisse)}</td>
                    <td className="py-1.5 pr-3 text-right font-semibold tabular-nums text-succes-700">{fcfa(l.honoraires)}</td>
                    <td className={`py-1.5 text-right tabular-nums ${l.reste > 0 ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                      {l.reste > 0 ? fcfa(l.reste) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                  <td className="pt-2 pr-3" colSpan={2}>Total</td>
                  <td className="pt-2 pr-3 text-right tabular-nums">{fcfa(b.facture)}</td>
                  <td className="pt-2 pr-3 text-right tabular-nums">{fcfa(b.encaisse)}</td>
                  <td className="pt-2 pr-3 text-right tabular-nums text-succes-700">{fcfa(b.honoraires)}</td>
                  <td className="pt-2 text-right tabular-nums">{fcfa(b.impayes)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <p className="mt-8 border-t border-slate-200 pt-4 text-[10px] leading-relaxed text-slate-500">
          <strong>Ce document est un état de gestion, pas une comptabilité légale.</strong>{" "}
          Il n&apos;a ni plan comptable, ni journal, ni bilan, et ne remplace pas un
          expert-comptable — seul ce dernier engage sa responsabilité. Les honoraires
          sont calculés sur la part <em>loyer</em> réellement encaissée, au taux inscrit
          sur chaque bail.
        </p>
      </article>
    </div>
  );
}
