import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireReservation } from "@/lib/requetes";
import {
  actionPaiementReservation, actionStatutReservation, actionSupprimerReservation,
} from "@/lib/actions";
import { dateFr, fcfa, periodeSejour, telephoneBrut, telephoneFr } from "@/lib/format";
import { Carte, MessagesUrl } from "@/components/ui";
import { BoutonConfirmation } from "@/components/bouton-confirmation";
import { IconeRetour, IconeTelephone } from "@/components/icones";
import { BadgeReservation } from "@/components/badge-reservation";

export const metadata = { title: "Réservation" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageReservation({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;

  const r = lireReservation(agence.id, Number(id));
  if (!r) notFound();

  const reste = r.montant_total - r.montant_paye;
  const messageWhatsApp = encodeURIComponent(
    `Bonjour ${r.nom}, votre réservation ${r.reference} pour « ${r.bien_titre} » `
    + `${periodeSejour(r.date_arrivee, r.date_depart)} est confirmée. `
    + `Montant : ${fcfa(r.montant_total)}. À bientôt !`,
  );

  return (
    <>
      <Link href="/dashboard/reservations" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux réservations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{r.nom}</h1>
            <BadgeReservation statut={r.statut} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Réservation {r.reference} · demandée le {dateFr(r.cree_le)}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:+${telephoneBrut(r.telephone)}`} className="btn-secondaire">
            <IconeTelephone className="h-4 w-4" /> Appeler
          </a>
          <a
            href={`https://wa.me/${telephoneBrut(r.telephone)}?text=${messageWhatsApp}`}
            target="_blank" rel="noopener noreferrer" className="btn-sable"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-5 space-y-4"><MessagesUrl params={requete} /></div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Le séjour</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {[
                ["Logement", r.bien_titre],
                ["Période", periodeSejour(r.date_arrivee, r.date_depart)],
                ["Arrivée", dateFr(r.date_arrivee)],
                ["Départ", dateFr(r.date_depart)],
                ["Durée", `${r.nuits} nuit${r.nuits > 1 ? "s" : ""}`],
                ["Voyageurs", `${r.voyageurs} personne${r.voyageurs > 1 ? "s" : ""}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Le voyageur</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {[
                ["Nom", r.nom],
                ["Téléphone", telephoneFr(r.telephone)],
                ...(r.email ? [["E-mail", r.email] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            {r.message && (
              <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {r.message}
              </p>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Suivi du règlement</h2>
            <form action={actionPaiementReservation} className="mt-4 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={r.id} />
              <div className="flex-1">
                <label className="etiquette" htmlFor="montant_paye">Montant déjà reçu (FCFA)</label>
                <input
                  id="montant_paye" name="montant_paye" inputMode="numeric"
                  defaultValue={r.montant_paye} className="champ"
                />
              </div>
              <button type="submit" className="btn-primaire">Enregistrer</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">
              Acompte ou solde encaissé sur ce séjour. Ces montants sont suivis à part
              des loyers mensuels : ils n&apos;apparaissent pas dans vos quittances.
            </p>
          </Carte>
        </div>

        {/* --------------------------- Colonne d'actions --------------------------- */}
        <aside className="space-y-5">
          <Carte className="p-5">
            <p className="text-sm text-slate-500">Montant du séjour</p>
            <p className="mt-1 text-3xl font-extrabold text-brand-700">{fcfa(r.montant_total)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {fcfa(r.prix_nuit)} × {r.nuits} nuit{r.nuits > 1 ? "s" : ""}
            </p>

            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Reçu</dt>
                <dd className="font-semibold text-brand-700">{fcfa(r.montant_paye)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Reste dû</dt>
                <dd className={`font-semibold ${reste > 0 ? "text-rose-600" : "text-slate-900"}`}>
                  {fcfa(reste)}
                </dd>
              </div>
            </dl>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Traiter la demande</h2>
            <div className="mt-4 space-y-2">
              {r.statut !== "confirmee" && (
                <form action={actionStatutReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="statut" value="confirmee" />
                  <input type="hidden" name="note" value={r.note ?? ""} />
                  <button type="submit" className="btn-primaire w-full">Confirmer la réservation</button>
                </form>
              )}
              {r.statut === "confirmee" && (
                <form action={actionStatutReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="statut" value="terminee" />
                  <input type="hidden" name="note" value={r.note ?? ""} />
                  <button type="submit" className="btn-secondaire w-full">Marquer comme terminée</button>
                </form>
              )}
              {r.statut !== "annulee" && (
                <form action={actionStatutReservation}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="statut" value="annulee" />
                  <input type="hidden" name="note" value={r.note ?? ""} />
                  <button type="submit" className="btn-danger w-full">Annuler</button>
                </form>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Une réservation annulée libère immédiatement les dates sur votre vitrine.
            </p>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Note interne</h2>
            <form action={actionStatutReservation} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="statut" value={r.statut} />
              <textarea
                name="note" rows={3} defaultValue={r.note ?? ""}
                placeholder="Heure d'arrivée, caution reçue, remise des clés…"
                className="champ"
              />
              <button type="submit" className="btn-secondaire w-full">Enregistrer la note</button>
            </form>
            <p className="mt-2 text-xs text-slate-500">Visible par votre agence uniquement.</p>
          </Carte>

          <form action={actionSupprimerReservation}>
            <input type="hidden" name="id" value={r.id} />
            <BoutonConfirmation
              message="Supprimer cette réservation ? Cette action est définitive."
              className="btn-danger w-full"
            >
              Supprimer cette réservation
            </BoutonConfirmation>
          </form>
        </aside>
      </div>
    </>
  );
}
