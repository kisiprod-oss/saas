import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { db, un } from "@/lib/db";
import { lireContrat } from "@/lib/requetes";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { DocumentQuittance } from "@/components/document-quittance";
import { IconeRetour } from "@/components/icones";
import type { Agence } from "@/lib/auth";
import type { FactureDetaillee, Paiement } from "@/lib/types";

export const metadata = { title: "Quittance de loyer" };
export const dynamic = "force-dynamic";

export default async function PageImpressionFactureLocataire({ params }: { params: Promise<{ id: string }> }) {
  const locataire = await exigerSessionLocataire();
  const { id } = await params;

  const facture = db.prepare(
    `SELECT f.*,
            COALESCE(p.paye, 0) AS montant_paye,
            f.montant_total - COALESCE(p.paye, 0) AS reste,
            CASE
              WHEN f.statut = 'annulee' THEN 'annulee'
              WHEN COALESCE(p.paye, 0) >= f.montant_total THEN 'payee'
              WHEN COALESCE(p.paye, 0) > 0 THEN 'partielle'
              ELSE 'impayee'
            END AS etat,
            0 AS en_retard,
            l.prenom AS locataire_prenom, l.nom AS locataire_nom, l.telephone AS locataire_telephone,
            b.titre AS bien_titre, b.reference AS bien_reference,
            c.reference AS contrat_reference, c.agence_id
       FROM factures f
       JOIN contrats c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens b ON b.id = c.bien_id
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements WHERE confirme = 1 GROUP BY facture_id) p
              ON p.facture_id = f.id
      WHERE f.id = ? AND c.locataire_id = ?`,
  ).get(Number(id), locataire.id) as (FactureDetaillee & { agence_id: number }) | undefined;
  if (!facture) notFound();

  const agence = un<Agence>("SELECT * FROM agences WHERE id = ?", facture.agence_id);
  if (!agence) notFound();

  const contrat = lireContrat(agence.id, facture.contrat_id);
  const paiements = db.prepare(
    "SELECT * FROM paiements WHERE facture_id = ? AND confirme = 1 ORDER BY date_paiement DESC, id DESC",
  ).all(facture.id) as Paiement[];

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="sans-impression mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/espace-locataire/factures/${facture.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <IconeRetour className="h-4 w-4" /> Retour
        </Link>
        <BoutonImprimer />
      </div>

      <DocumentQuittance agence={agence} facture={facture} contrat={contrat} paiements={paiements} />
    </div>
  );
}
