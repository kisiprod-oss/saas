import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import { imagesCourteDuree, listerProspects } from "@/lib/vitrine";
import { actionImagesCourteDuree, actionStatutProspect } from "@/lib/actions";
import { dateFr, telephoneBrut, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Page courte durée" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

const ETATS = [
  { valeur: "nouveau", libelle: "Nouveau", couleur: "bg-rose-100 text-rose-800 ring-rose-600/20" },
  { valeur: "rappele", libelle: "Rappelé", couleur: "bg-amber-100 text-amber-800 ring-amber-600/20" },
  { valeur: "client", libelle: "Devenu client", couleur: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" },
  { valeur: "perdu", libelle: "Perdu", couleur: "bg-slate-100 text-slate-600 ring-slate-500/20" },
];

export default async function PageAdminCourteDuree({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin();
  const requete = await searchParams;
  const images = imagesCourteDuree();
  const prospects = listerProspects();
  const nouveaux = prospects.filter((p) => p.statut === "nouveau").length;

  return (
    <>
      <EnTetePage
        titre="Page courte durée"
        sousTitre="Les photos de la page publique, et les personnes qui demandent à être rappelées."
      >
        <Link href="/courte-duree" target="_blank" className="btn-secondaire">
          Voir la page ↗
        </Link>
      </EnTetePage>

      <MessagesUrl params={requete} />

      {/* ---------------------------------- Photos ---------------------------------- */}
      <Carte className="p-5">
        <h2 className="font-semibold text-slate-900">Vos photos</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trois photos au maximum : la première s&apos;affiche en grand. Tant que
          vous n&apos;en mettez aucune, des illustrations neutres les remplacent —
          rien de faux n&apos;est jamais montré à votre place.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {images[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[i]} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-xs text-slate-400">
                  Illustration
                </div>
              )}
            </div>
          ))}
        </div>

        <form action={actionImagesCourteDuree} className="mt-4 space-y-3">
          <div>
            <label className="etiquette" htmlFor="images">
              Remplacer par vos photos (jusqu&apos;à 3)
            </label>
            <input
              id="images" name="images" type="file" accept="image/*" multiple
              required className="champ"
            />
            <p className="mt-1 text-xs text-slate-500">
              Prises depuis votre téléphone ou votre ordinateur. Elles sont
              recompressées automatiquement. Les précédentes sont supprimées.
            </p>
          </div>
          <button type="submit" className="btn-primaire">Envoyer ces photos</button>
        </form>
      </Carte>

      {/* -------------------------------- Prospects -------------------------------- */}
      <Carte className="mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Demandes de rappel</h2>
          <span className="text-sm text-slate-500">
            {prospects.length} au total{nouveaux > 0 && ` · ${nouveaux} à rappeler`}
          </span>
        </div>

        {prospects.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Personne n&apos;a encore demandé à être rappelé depuis cette page.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>Logements</th>
                  <th>Reçu le</th>
                  <th>Message</th>
                  <th>Suivi</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => {
                  const etat = ETATS.find((e) => e.valeur === p.statut) ?? ETATS[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="font-medium text-slate-900">{p.nom}</span>
                        <span className="block text-xs text-slate-500">
                          {telephoneFr(p.telephone)}
                          {p.ville && ` · ${p.ville}`}
                        </span>
                        {p.email && <span className="block text-xs text-slate-400">{p.email}</span>}
                        <a
                          href={`https://wa.me/${telephoneBrut(p.telephone)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                        >
                          WhatsApp ↗
                        </a>
                      </td>
                      <td className="whitespace-nowrap text-slate-600">{p.nb_logements ?? "—"}</td>
                      <td className="whitespace-nowrap text-slate-600">{dateFr(p.cree_le)}</td>
                      <td className="max-w-xs text-slate-600">{p.message ?? "—"}</td>
                      <td>
                        <span className={`badge ${etat.couleur}`}>{etat.libelle}</span>
                        <form action={actionStatutProspect} className="mt-1.5 flex gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <select name="statut" defaultValue={p.statut} className="champ w-auto py-1 text-xs">
                            {ETATS.map((e) => (
                              <option key={e.valeur} value={e.valeur}>{e.libelle}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn-secondaire px-2 py-1 text-xs">OK</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
    </>
  );
}
