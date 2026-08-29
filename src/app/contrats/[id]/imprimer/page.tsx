import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireContratPourBail } from "@/lib/requetes";
import { adresseDuSite } from "@/lib/email";
import { codeVerification, lienVerification, qrSvg } from "@/lib/verification";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { DocumentBail } from "@/components/document-bail";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Contrat de bail" };
export const dynamic = "force-dynamic";

export default async function PageImpressionBail({ params }: { params: Promise<{ id: string }> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const contrat = lireContratPourBail(agence.id, Number(id));
  if (!contrat) notFound();

  const code = codeVerification("bail", contrat.id);
  const lien = lienVerification(await adresseDuSite(), code);
  const verification = { code, lien, qr: await qrSvg(lien) };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="sans-impression mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/dashboard/contrats/${contrat.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          <IconeRetour className="h-4 w-4" /> Retour au bail
        </Link>
        <BoutonImprimer />
      </div>

      <DocumentBail agence={agence} contrat={contrat} verification={verification} />
    </div>
  );
}
