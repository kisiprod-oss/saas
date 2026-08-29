import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerArtisans } from "@/lib/requetes";
import { libelle, METIERS } from "@/lib/constantes";
import { telephoneFr } from "@/lib/format";
import { Badge, Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { IconePlus, IconeRecherche } from "@/components/icones";

export const metadata = { title: "Artisans" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageArtisans({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const recherche = lire(params, "q");
  const artisans = listerArtisans(agence.id, recherche);

  return (
    <>
      <EnTetePage
        titre="Mes artisans"
        sousTitre={`${artisans.length} professionnel${artisans.length > 1 ? "s" : ""} recommandé${artisans.length > 1 ? "s" : ""}`}
      >
        <Link href="/dashboard/artisans/nouveau" className="btn-primaire">
          <IconePlus className="h-4 w-4" /> Ajouter un artisan
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      <form action="/dashboard/artisans" method="get" className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <IconeRecherche className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q" defaultValue={recherche} placeholder="Nom, métier, ville…"
            className="champ pl-9"
          />
        </div>
        <button type="submit" className="btn-secondaire">Rechercher</button>
      </form>

      {artisans.length === 0 ? (
        <EtatVide
          titre="Aucun artisan enregistré"
          description="Ajoutez les plombiers, électriciens ou maçons que vous recommandez à vos locataires et propriétaires. Ils apparaîtront sur votre vitrine publique."
        />
      ) : (
        <Carte className="overflow-hidden">
          <table className="tableau">
            <thead>
              <tr><th>Nom</th><th>Métier</th><th>Téléphone</th><th>Ville</th><th></th></tr>
            </thead>
            <tbody>
              {artisans.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-slate-900">{a.nom}</td>
                  <td><Badge couleur="bg-brand-50 text-brand-800 ring-brand-600/20">{libelle(METIERS, a.metier)}</Badge></td>
                  <td className="whitespace-nowrap">{telephoneFr(a.telephone)}</td>
                  <td className="text-slate-500">{a.ville}</td>
                  <td className="text-right">
                    <Link href={`/dashboard/artisans/${a.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      )}
    </>
  );
}
