import Link from "next/link";
import { exigerAdmin, lireJournal } from "@/lib/admin";
import { FUSEAU, PAR_PAGE } from "@/lib/admin-donnees";
import { dateHeureFr } from "@/lib/format";
import { Carte, ListeVide, Pagination, Tableau, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Journal" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

/**
 * Le journal d'audit.
 *
 * LECTURE SEULE, sans exception : cette page n'offre ni modification ni
 * suppression, et aucune action du code n'en propose. Un journal qu'on peut
 * corriger ne prouve rien.
 */
export default async function PageJournal({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin("journal.lire");
  const params = await searchParams;

  const acteur = lire(params, "acteur");
  const action = lire(params, "action");
  const page = Math.max(1, Number(lire(params, "page")) || 1);

  const { lignes, total } = lireJournal({
    acteur: acteur || undefined, action: action || undefined,
    limite: PAR_PAGE, depuis: (page - 1) * PAR_PAGE,
  });
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const base = new URLSearchParams();
  if (acteur) base.set("acteur", acteur);
  if (action) base.set("action", action);

  return (
    <>
      <TitrePage
        titre="Journal"
        sous={`Toutes les actions sensibles de l'équipe. Lecture seule. Heures en ${FUSEAU}.`}
      />

      <Carte className="mb-5 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="acteur">Auteur</label>
            <input id="acteur" name="acteur" defaultValue={acteur} placeholder="adresse e-mail exacte"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="action">Action</label>
            <input id="action" name="action" defaultValue={action} placeholder="agence, utilisateur, annonce…"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit"
                    className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--adm-vert-clair)]">
              Filtrer
            </button>
            {(acteur || action) && (
              <Link href="/admin/journal"
                    className="rounded-lg border border-[var(--adm-bord)] px-4 py-2 text-sm font-semibold hover:bg-black/5">
                Effacer
              </Link>
            )}
          </div>
        </form>
      </Carte>

      <Carte>
        {lignes.length === 0 ? (
          <ListeVide titre="Journal vide"
                     texte={base.toString()
                       ? "Aucune entrée ne correspond à ces filtres."
                       : "Aucune action d'administration n'a encore été enregistrée."} />
        ) : (
          <>
            <Tableau entetes={["Date", "Auteur", "Action", "Élément", "Motif"]}>
              {lignes.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--adm-encre-2)]">
                    {dateHeureFr(l.cree_le)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[var(--adm-encre)]">{l.acteur}</p>
                    {l.role && <p className="text-xs text-[var(--adm-encre-2)]">{l.role}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--adm-encre)]">{l.action}</td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">
                    {l.cible_type ? `${l.cible_type} ${l.cible_id ?? ""}` : "—"}
                    {l.details && <p className="text-xs">{l.details}</p>}
                  </td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">{l.motif ?? "—"}</td>
                </tr>
              ))}
            </Tableau>
            <Pagination page={page} pages={pages} total={total} base={base} />
          </>
        )}
      </Carte>
    </>
  );
}
