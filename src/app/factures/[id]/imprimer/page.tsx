import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireContrat, lireFacture, listerPaiementsFacture } from "@/lib/requetes";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { DocumentQuittance } from "@/components/document-quittance";
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

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="sans-impression mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/dashboard/factures/${facture.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <IconeRetour className="h-4 w-4" /> Retour à la facture
        </Link>
        <BoutonImprimer />
      </div>

      <DocumentQuittance agence={agence} facture={facture} contrat={contrat} paiements={paiements} />
    </div>
  );
}
