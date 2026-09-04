import Link from "next/link";
import { notFound } from "next/navigation";
import { artisanPourDevis } from "@/lib/requetes";
import { actionDemanderDevis } from "@/lib/actions";
import { libelle, METIERS, VILLES } from "@/lib/constantes";
import { Alerte, Carte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";
import { IconeOutils, IconeRetour } from "@/components/icones";
import { ChampTelephone } from "@/components/champ-telephone";

export const metadata = { title: "Demander un devis" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageDemanderDevis({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { id } = await params;
  const requete = await searchParams;
  const lire = (c: string) => {
    const v = requete[c];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const erreur = lire("erreur");

  const artisan = artisanPourDevis(Number(id));
  if (!artisan) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></Link>
        </div>

        <Carte className="p-7">
          <Link href="/professionnels" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <IconeRetour className="h-4 w-4" /> Retour aux professionnels
          </Link>

          <div className="mt-4 flex items-center gap-3">
            {artisan.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artisan.photo_url} alt={artisan.nom} className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-slate-200">
                <IconeOutils className="h-5 w-5" />
              </span>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900">Demander un devis à {artisan.nom}</h1>
              <p className="text-sm text-slate-500">{libelle(METIERS, artisan.metier)} — {artisan.ville}</p>
            </div>
          </div>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          <form action={actionDemanderDevis} className="mt-6 space-y-4">
            <input type="hidden" name="artisan_id" value={artisan.id} />

            <div>
              <label className="etiquette" htmlFor="nom_client">Votre nom</label>
              <input id="nom_client" name="nom_client" required className="champ" placeholder="Fatou Diop" />
            </div>
            <div>
              <ChampTelephone nom="telephone_client" label="Votre téléphone" obligatoire
                              aide="C'est le numéro sur lequel l'artisan vous rappellera." />
            </div>
            <div>
              <label className="etiquette" htmlFor="ville">Ville (facultatif)</label>
              <select id="ville" name="ville" defaultValue={artisan.ville} className="champ">
                <option value="">Non précisée</option>
                {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="description">Décrivez votre projet</label>
              <textarea
                id="description" name="description" rows={4} required className="champ"
                placeholder="Ex : refaire l'installation électrique d'un appartement 3 pièces à Sacré-Cœur…"
              />
            </div>

            <button type="submit" className="btn-primaire w-full py-3">Envoyer ma demande de devis</button>

            <p className="text-center text-xs leading-relaxed text-slate-500">
              {artisan.nom} vous répondra avec un prix. Sen Gestion facilite la mise en
              relation et le devis, mais n&apos;intervient à aucun moment dans le paiement
              ni dans la réalisation du projet.
            </p>
          </form>
        </Carte>
      </div>
    </div>
  );
}
