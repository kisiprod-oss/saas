import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireLocataire } from "@/components/formulaire-locataire";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouveau locataire" };

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageNouveauLocataire({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerSession();
  const params = await searchParams;

  return (
    <>
      <Link href="/dashboard/locataires" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux locataires
      </Link>
      <EnTetePage titre="Ajouter un locataire" sousTitre="Ces informations seront reprises sur les baux et les quittances." />
      <MessagesUrl params={params} />
      <FormulaireLocataire />
    </>
  );
}
