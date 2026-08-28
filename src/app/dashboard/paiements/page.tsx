import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerPaiements, listerPaiementsEnAttente } from "@/lib/requetes";
import { dateFr, fcfa, moisCourant, periodeLisible } from "@/lib/format";
import { libelle, MODES_PAIEMENT } from "@/lib/constantes";
import { Alerte, Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { actionConfirmerPaiement, actionRejeterPaiement } from "@/lib/actions";

export const metadata = { title: "Paiements" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

const COULEURS_MODE: Record<string, string> = {
  orange_money: "bg-orange-100 text-orange-800 ring-orange-600/20",
  wave:         "bg-sky-100 text-sky-800 ring-sky-600/20",
  free_money:   "bg-rose-100 text-rose-800 ring-rose-600/20",
  especes:      "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  virement:     "bg-indigo-100 text-indigo-800 ring-indigo-600/20",
  cheque:       "bg-slate-200 text-slate-700 ring-slate-600/20",
};

export default async function PagePaiements({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const paiements = listerPaiements(agence.id);
  const enAttente = listerPaiementsEnAttente(agence.id);

  const mois = moisCourant();
  const duMois = paiements.filter((p) => p.date_paiement.slice(0, 7) === mois);
  const totalMois = duMois.reduce((s, p) => s + p.montant, 0);
  const total = paiements.reduce((s, p) => s + p.montant, 0);

  // Repartition par mode de paiement, sur le mois en cours
  const parMode = MODES_PAIEMENT.map((m) => ({
    ...m,
    total: duMois.filter((p) => p.mode === m.valeur).reduce((s, p) => s + p.montant, 0),
  })).filter((m) => m.total > 0);

  return (
    <>
      <EnTetePage
        titre="Paiements"
        sousTitre="Historique des règlements reçus, tous baux confondus."
      />

      <MessagesUrl params={params} />

      {enAttente.length > 0 && (
        <div className="mb-6">
          <Alerte type="info">
            {enAttente.length} règlement(s) déclaré(s) par des locataires attendent votre vérification.
          </Alerte>
          <Carte className="mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Date déclarée</th><th>Locataire</th><th>Bien</th><th>Facture</th>
                    <th>Mode</th><th className="text-right">Montant</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {enAttente.map((p) => (
                    <tr key={p.id} className="bg-amber-50/60">
                      <td className="whitespace-nowrap">{dateFr(p.date_paiement)}</td>
                      <td className="whitespace-nowrap font-medium text-slate-900">
                        {p.locataire_prenom} {p.locataire_nom}
                      </td>
                      <td className="max-w-[12rem] truncate">{p.bien_titre}</td>
                      <td className="whitespace-nowrap">
                        <Link href={`/dashboard/factures/${p.facture_id}`} className="font-medium text-brand-700 hover:underline">
                          {p.facture_numero}
                        </Link>
                        <span className="ml-1 text-xs text-slate-400">{periodeLisible(p.periode)}</span>
                      </td>
                      <td className="whitespace-nowrap">{libelle(MODES_PAIEMENT, p.mode)}</td>
                      <td className="whitespace-nowrap text-right font-semibold text-slate-900">{fcfa(p.montant)}</td>
                      <td className="whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <form action={actionConfirmerPaiement}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="facture_id" value={p.facture_id} />
                            <button type="submit" className="text-xs font-semibold text-brand-700 hover:underline">
                              Confirmer
                            </button>
                          </form>
                          <form action={actionRejeterPaiement}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="facture_id" value={p.facture_id} />
                            <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                              Rejeter
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Carte>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Encaissé en {periodeLisible(mois)}</p>
          <p className="mt-1.5 text-2xl font-bold text-brand-700">{fcfa(totalMois)}</p>
          <p className="mt-1 text-xs text-slate-400">{duMois.length} règlement(s)</p>
        </Carte>
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Total historique</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{fcfa(total)}</p>
          <p className="mt-1 text-xs text-slate-400">{paiements.length} règlement(s)</p>
        </Carte>
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Modes utilisés ce mois</p>
          {parMode.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Aucun paiement ce mois-ci.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {parMode.map((m) => (
                <li key={m.valeur} className="flex justify-between">
                  <span className="text-slate-600">{m.libelle}</span>
                  <span className="font-semibold text-slate-900">{fcfa(m.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      {paiements.length === 0 ? (
        <EtatVide
          titre="Aucun paiement enregistré"
          description="Ouvrez une facture puis enregistrez le règlement du locataire (Orange Money, Wave, espèces…)."
          action={{ href: "/dashboard/factures", libelle: "Voir les factures" }}
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Date</th><th>Locataire</th><th>Bien</th><th>Facture</th>
                  <th>Mode</th><th>Référence</th><th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{dateFr(p.date_paiement)}</td>
                    <td className="whitespace-nowrap font-medium text-slate-900">
                      {p.locataire_prenom} {p.locataire_nom}
                    </td>
                    <td className="max-w-[14rem] truncate">{p.bien_titre}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/dashboard/factures/${p.facture_id}`} className="font-medium text-brand-700 hover:underline">
                        {p.facture_numero}
                      </Link>
                      <span className="ml-1 text-xs text-slate-400">{periodeLisible(p.periode)}</span>
                    </td>
                    <td>
                      <span className={`badge ${COULEURS_MODE[p.mode] ?? "bg-slate-100 text-slate-700 ring-slate-600/20"}`}>
                        {libelle(MODES_PAIEMENT, p.mode)}
                      </span>
                    </td>
                    <td className="text-slate-500">{p.reference ?? "—"}</td>
                    <td className="whitespace-nowrap text-right font-semibold text-brand-700">{fcfa(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </>
  );
}
