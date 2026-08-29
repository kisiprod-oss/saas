import Link from "next/link";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { contratActifLocataire } from "@/lib/requetes";
import {
  actionEnregistrerPhotoLocataire, actionSupprimerPhotoLocataire,
} from "@/lib/actions";
import { telephoneFr } from "@/lib/format";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { ChampPhotoLocataire } from "@/components/photo-locataire";

export const metadata = { title: "Ma photo" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageProfilLocataire({ searchParams }: { searchParams: Promise<Params> }) {
  const locataire = await exigerSessionLocataire();
  const contrat = contratActifLocataire(locataire.id);
  const params = await searchParams;
  const retiree = (Array.isArray(params.retiree) ? params.retiree[0] : params.retiree) === "1";

  return (
    <>
      <Link href="/espace-locataire" className="text-sm font-medium text-brand-700 hover:underline">
        ← Retour à mon espace
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Ma photo</h1>
      <p className="mt-1 text-sm text-slate-500">
        Votre photo aide votre agence à vous reconnaître lors de vos échanges et de la
        remise des clés. Elle n&apos;est visible que par {contrat ? contrat.agence_nom : "votre agence"}.
      </p>

      <div className="mt-5 space-y-4">
        <MessagesUrl params={params} />
        {retiree && <Alerte type="succes">Votre photo a été retirée.</Alerte>}
      </div>

      <Carte className="mt-5 p-6">
        <form action={actionEnregistrerPhotoLocataire}>
          <ChampPhotoLocataire photoActuelle={locataire.photo_url} />
        </form>

        {locataire.photo_url && (
          <form action={actionSupprimerPhotoLocataire} className="mt-5 border-t border-slate-100 pt-4">
            <button type="submit" className="btn-danger px-3 py-2 text-sm">
              Retirer ma photo
            </button>
          </form>
        )}
      </Carte>

      <Carte className="mt-5 p-6">
        <h2 className="font-semibold text-slate-900">Mes informations</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Nom</dt>
            <dd className="text-right font-medium text-slate-900">
              {locataire.prenom} {locataire.nom}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Téléphone</dt>
            <dd className="text-right font-medium text-slate-900">{telephoneFr(locataire.telephone)}</dd>
          </div>
          {contrat && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Logement</dt>
              <dd className="text-right font-medium text-slate-900">{contrat.bien_titre}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          Pour corriger votre nom ou votre numéro, contactez votre agence : ces
          informations figurent sur votre bail.
        </p>
      </Carte>
    </>
  );
}
