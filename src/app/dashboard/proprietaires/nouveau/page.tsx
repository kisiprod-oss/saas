import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireProprietaire } from "@/components/formulaire-proprietaire";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouveau propriétaire" };

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageNouveauProprietaire({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerSession();
  const params = await searchParams;

  return (
    <>
      <Link href="/dashboard/proprietaires" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux propriétaires
      </Link>
      <EnTetePage titre="Ajouter un propriétaire" sousTitre="Cette fiche regroupera tous les biens qui lui appartiennent." />
      <MessagesUrl params={params} />
      <FormulaireProprietaire />
    </>
  );
}
