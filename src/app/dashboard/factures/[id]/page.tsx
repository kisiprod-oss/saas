import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireFacture, listerPaiementsFacture } from "@/lib/requetes";
import {
  actionAnnulerFacture, actionConfirmerPaiement, actionEnregistrerPaiement, actionRejeterPaiement,
  actionSupprimerFacture, actionSupprimerPaiement,
} from "@/lib/actions";
import { aujourdhui, dateFr, fcfa, periodeLisible, telephoneFr } from "@/lib/format";
import { libelle, MODES_PAIEMENT } from "@/lib/constantes";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { IconeCorbeille, IconeImprimer, IconeRetour } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageFacture({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const facture = lireFacture(agence.id, Number(id));
  if (!facture) notFound();

  const paiements = listerPaiementsFacture(facture.id);
  const soldee = facture.reste <= 0;

  return (
    <>
      <Link href="/dashboard/factures" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux factures
      </Link>

      <EnTetePage
        titre={`Facture ${facture.numero}`}
        sousTitre={`${periodeLisible(facture.periode)} · ${facture.locataire_prenom} ${facture.locataire_nom}`}
      >
        <Link href={`/factures/${facture.id}/imprimer`} target="_blank" className="btn-primaire">
          <IconeImprimer className="h-4 w-4" /> Imprimer / PDF
        </Link>
        {facture.statut !== "annulee" && (
          <form action={actionAnnulerFacture}>
            <input type="hidden" name="id" value={facture.id} />
            <button type="submit" className="btn-secondaire">Annuler la facture</button>
          </form>
        )}
        <form action={actionSupprimerFacture}>
          <input type="hidden" name="id" value={facture.id} />
          <button type="submit" className="btn-danger">
            <IconeCorbeille className="h-4 w-4" /> Supprimer
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={requete} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ------------------------------ Detail facture ------------------------------ */}
        <div className="space-y-6 lg:col-span-2">
          <Carte className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Détail de la facture</h2>
            </div>

            <dl className="divide-y divide-slate-100">
              {[
                ["Bien loué", facture.bien_titre],
                ["Contrat", facture.contrat_reference],
                ["Locataire", `${facture.locataire_prenom} ${facture.locataire_nom} · ${telephoneFr(facture.locataire_telephone)}`],
                ["Période", periodeLisible(facture.periode)],
                ["Date d'émission", dateFr(facture.date_emission)],
                ["Date d'échéance", dateFr(facture.date_echeance)],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Loyer</span>
                  <span className="font-medium text-slate-900">{fcfa(facture.montant_loyer)}</span>
                </div>
                {facture.montant_charges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Charges</span>
                    <span className="font-medium text-slate-900">{fcfa(facture.montant_charges)}</span>
                  </div>
                )}
                {facture.montant_autres > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">{facture.libelle_autres ?? "Autre"}</span>
                    <span className="font-medium text-slate-900">{fcfa(facture.montant_autres)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                  <span className="font-semibold text-slate-900">Total à payer</span>
                  <span className="font-bold text-slate-900">{fcfa(facture.montant_total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Déjà réglé</span>
                  <span className="font-medium text-brand-700">− {fcfa(facture.montant_paye)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                  <span className="font-semibold text-slate-900">Reste à payer</span>
                  <span className={`font-bold ${soldee ? "text-brand-700" : "text-rose-600"}`}>
                    {fcfa(Math.max(0, facture.reste))}
                  </span>
                </div>
              </div>
            </div>
          </Carte>

          {/* ------------------------------- Paiements ------------------------------- */}
          <Carte className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Paiements enregistrés</h2>
            </div>

            {paiements.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                Aucun paiement enregistré pour cette facture.
              </p>
            ) : (
              <table className="tableau">
                <thead>
                  <tr><th>Date</th><th>Mode</th><th>Référence</th><th>Origine</th><th className="text-right">Montant</th><th></th></tr>
                </thead>
                <tbody>
                  {paiements.map((p) => (
                    <tr key={p.id} className={p.confirme === 0 ? "bg-amber-50/60" : ""}>
                      <td className="whitespace-nowrap">{dateFr(p.date_paiement)}</td>
                      <td className="whitespace-nowrap">{libelle(MODES_PAIEMENT, p.mode)}</td>
                      <td className="text-slate-500">{p.reference ?? "—"}</td>
                      <td className="whitespace-nowrap">
                        {p.declare_par_locataire === 1 ? (
                          p.confirme === 1
                            ? <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Confirmé</span>
                            : <span className="badge bg-amber-100 text-amber-800 ring-amber-600/20">Déclaré par le locataire</span>
                        ) : (
                          <span className="text-xs text-slate-400">Saisi par l&apos;agence</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right font-semibold text-brand-700">{fcfa(p.montant)}</td>
                      <td className="whitespace-nowrap text-right">
                        {p.confirme === 0 ? (
                          <div className="flex justify-end gap-2">
                            <form action={actionConfirmerPaiement}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="facture_id" value={facture.id} />
                              <button type="submit" className="text-xs font-semibold text-brand-700 hover:underline">
                                Confirmer
                              </button>
                            </form>
                            <form action={actionRejeterPaiement}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="facture_id" value={facture.id} />
                              <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                                Rejeter
                              </button>
                            </form>
                          </div>
                        ) : (
                          <form action={actionSupprimerPaiement}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="facture_id" value={facture.id} />
                            <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                              Supprimer
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Carte>
        </div>

        {/* --------------------------- Enregistrer un paiement --------------------------- */}
        <aside>
          <Carte className="sticky top-6 p-5">
            <h2 className="font-semibold text-slate-900">Enregistrer un paiement</h2>
            <p className="mt-1 text-sm text-slate-500">
              {soldee
                ? "Cette facture est intégralement réglée."
                : `Reste à percevoir : ${fcfa(facture.reste)}`}
            </p>

            <form action={actionEnregistrerPaiement} className="mt-4 space-y-3">
              <input type="hidden" name="facture_id" value={facture.id} />

              <div>
                <label className="etiquette" htmlFor="montant">Montant reçu (FCFA)</label>
                <input
                  id="montant" name="montant" inputMode="numeric" required className="champ"
                  defaultValue={facture.reste > 0 ? facture.reste : ""}
                  placeholder="450000"
                />
              </div>

              <div>
                <label className="etiquette" htmlFor="date_paiement">Date du paiement</label>
                <input id="date_paiement" name="date_paiement" type="date" defaultValue={aujourdhui()} className="champ" />
              </div>

              <div>
                <label className="etiquette" htmlFor="mode">Mode de paiement</label>
                <select id="mode" name="mode" className="champ" defaultValue="orange_money">
                  {MODES_PAIEMENT.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
                </select>
              </div>

              <div>
                <label className="etiquette" htmlFor="reference">Référence de la transaction</label>
                <input id="reference" name="reference" className="champ"
                       placeholder="N° Orange Money / Wave, n° de chèque…" />
              </div>

              <div>
                <label className="etiquette" htmlFor="note">Note</label>
                <input id="note" name="note" className="champ" placeholder="Facultatif" />
              </div>

              <button type="submit" className="btn-primaire w-full">Enregistrer le paiement</button>
            </form>
          </Carte>
        </aside>
      </div>
    </>
  );
}
