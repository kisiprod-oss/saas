import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { db } from "@/lib/db";
import { actionDeclarerPaiement } from "@/lib/actions";
import { aujourdhui, dateFr, fcfa, periodeLisible } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/constantes";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { IconeImprimer, IconeRetour } from "@/components/icones";
import type { FactureDetaillee } from "@/lib/types";

export const metadata = { title: "Ma facture" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

/** Même agrégat que lireFacture, mais vérifié contre le locataire connecté plutôt qu'une agence. */
function lireFactureLocataire(locataireId: number, factureId: number) {
  return db.prepare(
    `SELECT f.*,
            COALESCE(p.paye, 0) AS montant_paye,
            f.montant_total - COALESCE(p.paye, 0) AS reste,
            CASE
              WHEN f.statut = 'annulee' THEN 'annulee'
              WHEN COALESCE(p.paye, 0) >= f.montant_total THEN 'payee'
              WHEN COALESCE(p.paye, 0) > 0 THEN 'partielle'
              ELSE 'impayee'
            END AS etat,
            CASE WHEN f.statut != 'annulee' AND COALESCE(p.paye, 0) < f.montant_total
                  AND date(f.date_echeance) < date('now') THEN 1 ELSE 0 END AS en_retard,
            l.prenom AS locataire_prenom, l.nom AS locataire_nom, l.telephone AS locataire_telephone,
            b.titre AS bien_titre, b.reference AS bien_reference,
            c.reference AS contrat_reference
       FROM factures f
       JOIN contrats c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens b ON b.id = c.bien_id
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements WHERE confirme = 1 GROUP BY facture_id) p
              ON p.facture_id = f.id
      WHERE f.id = ? AND c.locataire_id = ?`,
  ).get(factureId, locataireId) as FactureDetaillee | undefined;
}

export default async function PageFactureLocataire({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const locataire = await exigerSessionLocataire();
  const { id } = await params;
  const requete = await searchParams;
  const facture = lireFactureLocataire(locataire.id, Number(id));
  if (!facture) notFound();

  const declare = (Array.isArray(requete.declare) ? requete.declare[0] : requete.declare) === "1";
  const soldee = facture.reste <= 0;

  return (
    <>
      <Link href="/espace-locataire" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour à mes quittances
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{periodeLisible(facture.periode)}</h1>
          <p className="text-sm text-slate-500">{facture.numero} · {facture.bien_titre}</p>
        </div>
        <Link href={`/espace-locataire/factures/${facture.id}/imprimer`} target="_blank" className="btn-secondaire">
          <IconeImprimer className="h-4 w-4" /> Voir / imprimer
        </Link>
      </div>

      <MessagesUrl params={requete} />
      {declare && (
        <Alerte type="succes">
          Votre règlement a été signalé à votre agence. Il apparaîtra comme réglé dès sa vérification.
        </Alerte>
      )}

      <Carte className="overflow-hidden">
        <dl className="divide-y divide-slate-100">
          {[
            ["Loyer", fcfa(facture.montant_loyer)],
            ...(facture.montant_charges > 0 ? [["Charges", fcfa(facture.montant_charges)] as const] : []),
            ["Total", fcfa(facture.montant_total)],
            ["Échéance", dateFr(facture.date_echeance)],
            ["Déjà réglé", fcfa(facture.montant_paye)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-5 py-3 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between bg-slate-50 px-5 py-3.5 text-sm">
            <dt className="font-semibold text-slate-900">Reste à payer</dt>
            <dd className={`text-lg font-bold ${soldee ? "text-brand-700" : "text-rose-600"}`}>
              {fcfa(Math.max(0, facture.reste))}
            </dd>
          </div>
        </dl>
      </Carte>

      {!soldee && facture.statut !== "annulee" && (
        <Carte className="mt-5 p-5">
          <h2 className="font-semibold text-slate-900">Signaler un règlement</h2>
          <p className="mt-1 text-sm text-slate-500">
            Après votre paiement Orange Money, Wave ou en espèces, indiquez-le ici.
            Votre agence vérifiera et confirmera la réception.
          </p>

          <form action={actionDeclarerPaiement} className="mt-4 space-y-3">
            <input type="hidden" name="facture_id" value={facture.id} />

            <div>
              <label className="etiquette" htmlFor="montant">Montant réglé (FCFA)</label>
              <input id="montant" name="montant" inputMode="numeric" required className="champ"
                     defaultValue={facture.reste > 0 ? facture.reste : ""} placeholder="450000" />
            </div>
            <div>
              <label className="etiquette" htmlFor="date_paiement">Date du règlement</label>
              <input id="date_paiement" name="date_paiement" type="date" defaultValue={aujourdhui()} className="champ" />
            </div>
            <div>
              <label className="etiquette" htmlFor="mode">Moyen de paiement</label>
              <select id="mode" name="mode" className="champ" defaultValue="orange_money">
                {MODES_PAIEMENT.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="reference">Référence de la transaction</label>
              <input id="reference" name="reference" className="champ" placeholder="Reçu par SMS après le paiement" />
            </div>
            <button type="submit" className="btn-sable w-full">J&apos;ai réglé ce montant</button>
          </form>
        </Carte>
      )}
    </>
  );
}
