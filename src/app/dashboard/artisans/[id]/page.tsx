import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireArtisan } from "@/lib/requetes";
import { actionSupprimerArtisan } from "@/lib/actions";
import { telephoneBrut } from "@/lib/format";
import { MessagesUrl } from "@/components/ui";
import { FormulaireArtisan } from "@/components/formulaire-artisan";
import { IconeCorbeille, IconeRetour } from "@/components/icones";

export const metadata = { title: "Modifier un artisan" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageArtisan({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const artisan = lireArtisan(agence.id, Number(id));
  if (!artisan) notFound();

  return (
    <>
      <Link href="/dashboard/artisans" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux artisans
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{artisan.nom}</h1>
        <div className="flex gap-2">
          <a href={`https://wa.me/${telephoneBrut(artisan.telephone)}`} target="_blank" rel="noopener noreferrer" className="btn-sable">
            WhatsApp
          </a>
          <form action={actionSupprimerArtisan}>
            <input type="hidden" name="id" value={artisan.id} />
            <button type="submit" className="btn-danger">
              <IconeCorbeille className="h-4 w-4" /> Supprimer
            </button>
          </form>
        </div>
      </div>

      <MessagesUrl params={requete} />

      <FormulaireArtisan artisan={artisan} />
    </>
  );
}
