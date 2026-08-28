import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerLocataires } from "@/lib/requetes";
import { telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { IconePlus, IconeRecherche } from "@/components/icones";

export const metadata = { title: "Locataires" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageLocataires({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const recherche = lire(params, "q");
  const locataires = listerLocataires(agence.id, recherche);

  return (
    <>
      <EnTetePage titre="Locataires" sousTitre={`${locataires.length} locataire(s) au fichier`}>
        <Link href="/dashboard/locataires/nouveau" className="btn-primaire">
          <IconePlus className="h-4 w-4" /> Ajouter un locataire
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      <form action="/dashboard/locataires" method="get" className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <IconeRecherche className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={recherche} className="champ pl-9" placeholder="Nom, téléphone, CNI…" />
        </div>
        <button type="submit" className="btn-secondaire">Rechercher</button>
        {recherche && <Link href="/dashboard/locataires" className="btn-secondaire">Réinitialiser</Link>}
      </form>

      {locataires.length === 0 ? (
        <EtatVide
          titre="Aucun locataire enregistré"
          description="Créez la fiche de vos locataires : identité, CNI, garant et coordonnées."
          action={{ href: "/dashboard/locataires/nouveau", libelle: "Ajouter un locataire" }}
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr><th>Locataire</th><th>Téléphone</th><th>CNI</th><th>Logement occupé</th><th></th></tr>
              </thead>
              <tbody>
                {locataires.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                          {l.prenom[0]}{l.nom[0]}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900">{l.prenom} {l.nom}</p>
                          {l.profession && <p className="text-xs text-slate-400">{l.profession}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{telephoneFr(l.telephone)}</td>
                    <td className="whitespace-nowrap text-slate-500">{l.cni ?? "—"}</td>
                    <td className="max-w-[16rem] truncate">
                      {l.bien_titre
                        ? <span className="text-slate-700">{l.bien_titre}</span>
                        : <span className="text-slate-400">Sans bail actif</span>}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/dashboard/locataires/${l.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
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
