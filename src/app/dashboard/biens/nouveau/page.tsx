import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireBien } from "@/components/formulaire-bien";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouveau bien" };

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageNouveauBien({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerSession();
  const params = await searchParams;

  return (
    <>
      <Link href="/dashboard/biens" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux biens
      </Link>
      <EnTetePage titre="Ajouter un bien" sousTitre="Renseignez les informations du logement à mettre en location." />
      <MessagesUrl params={params} />
      <FormulaireBien />
    </>
  );
}
