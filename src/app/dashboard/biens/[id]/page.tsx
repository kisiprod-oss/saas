import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireBien } from "@/lib/requetes";
import { actionSupprimerBien } from "@/lib/actions";
import { EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireBien } from "@/components/formulaire-bien";
import { IconeCorbeille, IconeRetour } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageBien({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const bien = lireBien(agence.id, Number(id));
  if (!bien) notFound();

  return (
    <>
      <Link href="/dashboard/biens" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux biens
      </Link>

      <EnTetePage titre={bien.titre} sousTitre={`Référence ${bien.reference}`}>
        <Link href={`/biens/${bien.id}`} target="_blank" className="btn-secondaire">
          Voir l&apos;annonce ↗
        </Link>
        <form action={actionSupprimerBien}>
          <input type="hidden" name="id" value={bien.id} />
          <button type="submit" className="btn-danger">
            <IconeCorbeille className="h-4 w-4" /> Supprimer
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={requete} />
      <FormulaireBien bien={bien} />
    </>
  );
}
