import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireContrat, lireFacture, listerPaiementsFacture } from "@/lib/requetes";
import { dateFr, dateLongue, enLettres, fcfa, periodeLisible, telephoneFr } from "@/lib/format";
import { libelle, MODES_PAIEMENT } from "@/lib/constantes";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Quittance de loyer" };
export const dynamic = "force-dynamic";

export default async function PageImpressionFacture({ params }: { params: Promise<{ id: string }> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const facture = lireFacture(agence.id, Number(id));
  if (!facture) notFound();

  const contrat = lireContrat(agence.id, facture.contrat_id);
  const paiements = listerPaiementsFacture(facture.id);
  const soldee = facture.reste <= 0;
  const estQuittance = soldee && facture.statut !== "annulee";

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {/* -------------------------- Barre d'outils (non imprimée) -------------------------- */}
      <div className="sans-impression mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/dashboard/factures/${facture.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <IconeRetour className="h-4 w-4" /> Retour à la facture
        </Link>
        <BoutonImprimer />
      </div>

      {/* --------------------------------- Document A4 --------------------------------- */}
      <article className="mx-auto max-w-[210mm] bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* En-tête agence */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand-600 pb-6">
          <div>
            {agence.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agence.logo_url} alt={agence.nom} className="mb-3 h-14 object-contain" />
            ) : null}
            <h1 className="text-xl font-bold text-slate-900">{agence.nom}</h1>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
              {agence.adresse && <p>{agence.adresse}</p>}
              {agence.ville && <p>{agence.ville}, Sénégal</p>}
              {agence.telephone && <p>Tél. {telephoneFr(agence.telephone)}</p>}
              {agence.email && <p>{agence.email}</p>}
              {agence.ninea && <p>NINEA : {agence.ninea}</p>}
              {agence.rccm && <p>RCCM : {agence.rccm}</p>}
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-extrabold uppercase tracking-tight text-brand-700">
              {estQuittance ? "Quittance de loyer" : "Facture de loyer"}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">N° {facture.numero}</p>
            <p className="text-xs text-slate-600">Émise le {dateFr(facture.date_emission)}</p>
            <p className="text-xs text-slate-600">Échéance : {dateFr(facture.date_echeance)}</p>
            {facture.statut === "annulee" && (
              <p className="mt-2 inline-block rounded border border-rose-300 px-2 py-0.5 text-xs font-bold uppercase text-rose-600">
                Annulée
              </p>
            )}
          </div>
        </header>

        {/* Locataire et bien */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Locataire</p>
            <p className="mt-1.5 font-semibold text-slate-900">
              {facture.locataire_prenom} {facture.locataire_nom}
            </p>
            <p className="text-sm text-slate-600">{telephoneFr(facture.locataire_telephone)}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Bien loué</p>
            <p className="mt-1.5 font-semibold text-slate-900">{facture.bien_titre}</p>
            <p className="text-sm text-slate-600">
              {contrat ? [contrat.bien_quartier, contrat.bien_ville].filter(Boolean).join(", ") : ""}
            </p>
            <p className="text-sm text-slate-600">Bail n° {facture.contrat_reference}</p>
          </div>
        </section>

        <p className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Période de location : <strong>{periodeLisible(facture.periode)}</strong>
          {contrat && ` — loyer dû le ${contrat.jour_echeance} de chaque mois.`}
        </p>

        {/* Tableau des montants */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 font-semibold text-slate-700">Désignation</th>
              <th className="py-2 text-right font-semibold text-slate-700">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 text-slate-700">Loyer — {periodeLisible(facture.periode)}</td>
              <td className="py-2.5 text-right font-medium text-slate-900">{fcfa(facture.montant_loyer)}</td>
            </tr>
            {facture.montant_charges > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-700">Charges locatives</td>
                <td className="py-2.5 text-right font-medium text-slate-900">{fcfa(facture.montant_charges)}</td>
              </tr>
            )}
            {facture.montant_autres > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-700">{facture.libelle_autres ?? "Autres frais"}</td>
                <td className="py-2.5 text-right font-medium text-slate-900">{fcfa(facture.montant_autres)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td className="py-3 font-bold text-slate-900">TOTAL</td>
              <td className="py-3 text-right text-lg font-bold text-slate-900">{fcfa(facture.montant_total)}</td>
            </tr>
            {facture.montant_paye > 0 && (
              <tr>
                <td className="py-1 text-slate-600">Déjà réglé</td>
                <td className="py-1 text-right font-medium text-brand-700">− {fcfa(facture.montant_paye)}</td>
              </tr>
            )}
            <tr>
              <td className="py-1 font-semibold text-slate-900">Reste à payer</td>
              <td className={`py-1 text-right font-bold ${soldee ? "text-brand-700" : "text-rose-600"}`}>
                {fcfa(Math.max(0, facture.reste))}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-5 text-sm italic text-slate-700">
          Arrêtée la présente {estQuittance ? "quittance" : "facture"} à la somme de{" "}
          <strong className="not-italic">{enLettres(facture.montant_total)} francs CFA</strong>.
        </p>

        {/* Paiements */}
        {paiements.length > 0 && (
          <section className="mt-7">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Règlements reçus</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">{dateFr(p.date_paiement)}</td>
                    <td className="py-2 text-slate-600">{libelle(MODES_PAIEMENT, p.mode)}</td>
                    <td className="py-2 text-slate-500">{p.reference ?? ""}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{fcfa(p.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {estQuittance && (
          <p className="mt-7 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            Le bailleur reconnaît avoir reçu du locataire la somme indiquée ci-dessus au titre du loyer et
            des charges de la période mentionnée, et lui en donne quittance sous réserve de tous ses droits.
          </p>
        )}

        {/* Signature */}
        <footer className="mt-12 flex items-end justify-between gap-8">
          <div className="text-xs text-slate-500">
            <p>Fait à {agence.ville ?? "Dakar"}, le {dateLongue(new Date().toISOString().slice(0, 10))}.</p>
            <p className="mt-4 max-w-xs">
              Document généré par Keur Gestion. Montants exprimés en francs CFA (XOF).
            </p>
          </div>
          <div className="w-56 text-center">
            <p className="text-xs font-semibold text-slate-700">Pour {agence.nom}</p>
            <div className="mt-14 border-t border-slate-400 pt-1.5 text-xs text-slate-500">
              Signature et cachet
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
