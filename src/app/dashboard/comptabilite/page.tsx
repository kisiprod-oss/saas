import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { bilan, periodesDisponibles, resoudrePeriode } from "@/lib/comptabilite";
import { fcfa, moisCourt } from "@/lib/format";
import { Carte, EnTetePage } from "@/components/ui";
import {
  COULEUR_ENCAISSE, COULEUR_FACTURE, COULEUR_HONORAIRES, GraphiqueBarres,
} from "@/components/graphique-barres";
import { IconeImprimer } from "@/components/icones";

export const metadata = { title: "Comptabilité" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageComptabilite({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const codePeriode = (Array.isArray(params.p) ? params.p[0] : params.p) ?? "mois";
  const periode = resoudrePeriode(codePeriode);
  const b = bilan(agence.id, periode);

  const etiquettes = b.historique.map((h) => moisCourt(h.periode));

  return (
    <>
      <EnTetePage
        titre="Comptabilité"
        sousTitre={`Situation de gestion — ${periode.libelle.toLowerCase()}`}
      >
        <form method="get" className="flex items-center gap-2">
          <label className="sr-only" htmlFor="p">Période</label>
          <select id="p" name="p" defaultValue={periode.code} className="champ w-auto py-2">
            {periodesDisponibles().map((p) => (
              <option key={p.code} value={p.code}>{p.libelle}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondaire">Afficher</button>
        </form>
        <Link href={`/comptabilite/imprimer?p=${periode.code}`} target="_blank" className="btn-primaire">
          <IconeImprimer className="h-4 w-4" /> Imprimer
        </Link>
      </EnTetePage>

      {/* --------------------- La cascade : le cœur du sujet --------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Encaissements</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fcfa(b.encaisse)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Tout l&apos;argent reçu. Il ne vous appartient pas en entier.
          </p>
        </Carte>

        <Carte className="border-succes-300 bg-succes-50/50 p-5">
          <p className="text-sm font-medium text-succes-800">Vos honoraires</p>
          <p className="mt-1 text-2xl font-bold text-succes-900">{fcfa(b.honoraires)}</p>
          <p className="mt-1 text-xs text-succes-800">
            C&apos;est votre chiffre d&apos;affaires.
          </p>
        </Carte>

        <Carte className="p-5">
          <p className="text-sm text-slate-500">À reverser aux propriétaires</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fcfa(b.aReverser)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Une dette, pas un produit.
          </p>
        </Carte>
      </div>

      <Carte className="mt-4 border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong>Pourquoi trois chiffres et pas un seul.</strong> Quand vous gérez le
          bien d&apos;un propriétaire, le loyer ne fait que transiter par votre agence :
          seuls vos honoraires sont un revenu. Déclarer les encaissements comme chiffre
          d&apos;affaires vous exposerait au premier contrôle.{" "}
          Si vous êtes propriétaire de vos propres biens, les encaissements vous
          reviennent en entier et la troisième colonne ne vous concerne pas.
        </p>
      </Carte>

      {/* ------------------------------ Chiffres de contrôle ------------------------------ */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { libelle: "Facturé sur la période", valeur: fcfa(b.facture) },
          { libelle: "Reste dû", valeur: fcfa(b.impayes) },
          { libelle: "Taux de recouvrement", valeur: `${b.tauxRecouvrement} %` },
          { libelle: "Factures émises", valeur: String(b.nbFactures) },
        ].map((c) => (
          <Carte key={c.libelle} className="p-4">
            <p className="text-xs text-slate-500">{c.libelle}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{c.valeur}</p>
          </Carte>
        ))}
      </div>

      {/* ---------------------------------- Graphiques ---------------------------------- */}
      <Carte className="mt-6 p-5">
        <GraphiqueBarres
          titre="Facturé et encaissé, mois par mois"
          sousTitre="Douze derniers mois. L'écart entre les deux barres, ce sont vos impayés."
          etiquettes={etiquettes}
          series={[
            { nom: "Facturé", couleur: COULEUR_FACTURE, valeurs: b.historique.map((h) => h.facture) },
            { nom: "Encaissé", couleur: COULEUR_ENCAISSE, valeurs: b.historique.map((h) => h.encaisse) },
          ]}
        />
      </Carte>

      <Carte className="mt-4 p-5">
        <GraphiqueBarres
          titre="Vos honoraires, mois par mois"
          sousTitre="Sur son propre axe : les honoraires ne représentent qu'une fraction des loyers, ils seraient invisibles sur le graphique du dessus."
          etiquettes={etiquettes}
          series={[
            { nom: "Honoraires", couleur: COULEUR_HONORAIRES, valeurs: b.historique.map((h) => h.honoraires) },
          ]}
        />
      </Carte>

      {/* ------------------------------- Détail par bien ------------------------------- */}
      <Carte className="mt-6 p-5">
        <h2 className="font-semibold text-slate-900">Détail par bien</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ce que chaque bien a rapporté sur la période.
        </p>

        {b.parBien.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Aucune facture émise sur cette période.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Bien</th>
                  <th className="pb-2 pr-3 font-medium">Propriétaire</th>
                  <th className="pb-2 pr-3 text-right font-medium">Facturé</th>
                  <th className="pb-2 pr-3 text-right font-medium">Encaissé</th>
                  <th className="pb-2 pr-3 text-right font-medium">Honoraires</th>
                  <th className="pb-2 text-right font-medium">Reste dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {b.parBien.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-slate-900">{l.bien}</span>
                      <span className="block text-xs text-slate-400">{l.reference}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600">{l.proprietaire ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">{fcfa(l.facture)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-900">{fcfa(l.encaisse)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-succes-700">{fcfa(l.honoraires)}</td>
                    <td className={`py-2.5 text-right tabular-nums ${l.reste > 0 ? "font-semibold text-rose-700" : "text-slate-400"}`}>
                      {l.reste > 0 ? fcfa(l.reste) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                  <td className="pt-3 pr-3" colSpan={2}>Total</td>
                  <td className="pt-3 pr-3 text-right tabular-nums">{fcfa(b.facture)}</td>
                  <td className="pt-3 pr-3 text-right tabular-nums">{fcfa(b.encaisse)}</td>
                  <td className="pt-3 pr-3 text-right tabular-nums text-succes-700">{fcfa(b.honoraires)}</td>
                  <td className="pt-3 text-right tabular-nums">{fcfa(b.impayes)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Carte>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        <strong>Ce document est un état de gestion, pas une comptabilité légale.</strong>{" "}
        Il n&apos;a ni plan comptable, ni journal, ni bilan, et ne remplace pas un
        expert-comptable — seul ce dernier engage sa responsabilité. Il sert à vous
        contrôler vous-même et à lui remettre des chiffres nets. Les honoraires sont
        calculés sur la part <em>loyer</em> réellement encaissée, au taux inscrit sur
        chaque bail ; les charges et les autres montants n&apos;en font pas partie.
      </p>
    </>
  );
}
