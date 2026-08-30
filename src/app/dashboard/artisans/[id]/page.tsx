import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireArtisan } from "@/lib/requetes";
import { actionDeclarerIntervention, actionSupprimerArtisan } from "@/lib/actions";
import { aujourdhui, telephoneBrut } from "@/lib/format";
import { Carte, MessagesUrl } from "@/components/ui";
import { BoutonConfirmation } from "@/components/bouton-confirmation";
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
            <BoutonConfirmation
              message={`Supprimer « ${artisan.nom} » de vos artisans ? Cette action est définitive.`}
              className="btn-danger"
            >
              <IconeCorbeille className="h-4 w-4" /> Supprimer
            </BoutonConfirmation>
          </form>
        </div>
      </div>

      <MessagesUrl params={requete} />

      <Carte className="mb-5 p-5">
        <h2 className="font-semibold text-slate-900">Déclarer une intervention</h2>
        <p className="mt-1 text-sm text-slate-500">
          Après un chantier, déclarez-le : vous obtiendrez un lien pour noter cet
          artisan. Un lien par intervention, utilisable une seule fois — c&apos;est
          ce qui rend les avis fiables.
        </p>
        <form action={actionDeclarerIntervention} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="artisan_id" value={artisan.id} />
          <div className="sm:col-span-2">
            <label className="etiquette" htmlFor="description">Nature des travaux</label>
            <input id="description" name="description" className="champ"
                   placeholder="Ex : réparation d'une fuite, salle de bain" />
          </div>
          <div>
            <label className="etiquette" htmlFor="date_intervention">Date</label>
            <input id="date_intervention" name="date_intervention" type="date"
                   defaultValue={aujourdhui()} max={aujourdhui()} className="champ" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primaire">Déclarer et noter</button>
          </div>
        </form>
      </Carte>

      <FormulaireArtisan artisan={artisan} />
    </>
  );
}
