import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerProprietaires } from "@/lib/requetes";
import { pourAffichage } from "@/lib/telephone";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { IconePlus, IconeRecherche } from "@/components/icones";

export const metadata = { title: "Propriétaires" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageProprietaires({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const recherche = lire(params, "q");
  const proprietaires = listerProprietaires(agence.id, recherche);

  return (
    <>
      <EnTetePage titre="Propriétaires" sousTitre={`${proprietaires.length} propriétaire(s) au fichier`}>
        <Link href="/dashboard/proprietaires/nouveau" className="btn-primaire">
          <IconePlus className="h-4 w-4" /> Ajouter un propriétaire
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      <form action="/dashboard/proprietaires" method="get" className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <IconeRecherche className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={recherche} className="champ pl-9" placeholder="Nom, téléphone…" />
        </div>
        <button type="submit" className="btn-secondaire">Rechercher</button>
        {recherche && <Link href="/dashboard/proprietaires" className="btn-secondaire">Réinitialiser</Link>}
      </form>

      {proprietaires.length === 0 ? (
        <EtatVide
          titre="Aucun propriétaire enregistré"
          description="Créez une fiche par propriétaire pour regrouper tous ses biens au même endroit."
          action={{ href: "/dashboard/proprietaires/nouveau", libelle: "Ajouter un propriétaire" }}
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr><th>Propriétaire</th><th>Téléphone</th><th>E-mail</th><th className="text-right">Biens</th><th></th></tr>
              </thead>
              <tbody>
                {proprietaires.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-slate-900">{p.nom}</td>
                    <td className="whitespace-nowrap">{pourAffichage(p.telephone)}</td>
                    <td className="text-slate-500">{p.email ?? "—"}</td>
                    <td className="text-right text-slate-600">{p.nb_biens}</td>
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/dashboard/proprietaires/${p.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Voir la fiche
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </>
  );
}
