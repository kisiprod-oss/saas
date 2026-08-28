import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerBiens } from "@/lib/requetes";
import { couleurStatut, libelle, STATUTS_BIEN, TYPES_BIEN } from "@/lib/constantes";
import { fcfa } from "@/lib/format";
import { Badge, Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { premierePhoto } from "@/components/carte-bien";
import { IconePlus, IconeRecherche } from "@/components/icones";

export const metadata = { title: "Biens" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageBiens({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const recherche = lire(params, "q");
  const statut = lire(params, "statut");
  const biens = listerBiens(agence.id, { recherche, statut });

  return (
    <>
      <EnTetePage titre="Mes biens" sousTitre={`${biens.length} bien(s) enregistré(s)`}>
        <Link href="/dashboard/biens/nouveau" className="btn-primaire">
          <IconePlus className="h-4 w-4" /> Ajouter un bien
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      {/* -------------------------------- Filtres -------------------------------- */}
      <form action="/dashboard/biens" method="get" className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <IconeRecherche className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q" defaultValue={recherche} className="champ pl-9"
            placeholder="Rechercher par titre, référence, quartier…"
          />
        </div>
        <select name="statut" defaultValue={statut} className="champ w-auto">
          <option value="">Tous les statuts</option>
          {STATUTS_BIEN.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
        </select>
        <button type="submit" className="btn-secondaire">Filtrer</button>
        {(recherche || statut) && <Link href="/dashboard/biens" className="btn-secondaire">Réinitialiser</Link>}
      </form>

      {biens.length === 0 ? (
        <EtatVide
          titre="Aucun bien pour le moment"
          description="Ajoutez votre premier appartement, villa ou studio. Il apparaîtra ensuite sur la vitrine publique."
          action={{ href: "/dashboard/biens/nouveau", libelle: "Ajouter mon premier bien" }}
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Bien</th><th>Localisation</th><th>Type</th>
                  <th className="text-right">Loyer</th><th>Statut</th><th>Locataire</th><th></th>
                </tr>
              </thead>
              <tbody>
                {biens.map((b) => {
                  const photo = premierePhoto(b.photos);
                  return (
                    <tr key={b.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-lg opacity-40">🏠</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{b.titre}</p>
                            <p className="text-xs text-slate-400">
                              {b.reference} · {b.chambres} ch. {b.surface ? `· ${b.surface} m²` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {[b.quartier, b.ville].filter(Boolean).join(", ")}
                      </td>
                      <td className="whitespace-nowrap">{libelle(TYPES_BIEN, b.type)}</td>
                      <td className="whitespace-nowrap text-right font-semibold text-slate-900">{fcfa(b.loyer)}</td>
                      <td>
                        <Badge couleur={couleurStatut(STATUTS_BIEN, b.statut)}>
                          {libelle(STATUTS_BIEN, b.statut)}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap text-slate-500">{b.locataire ?? "—"}</td>
                      <td className="whitespace-nowrap text-right">
                        <Link href={`/dashboard/biens/${b.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </>
  );
}
