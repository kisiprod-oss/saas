import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import { listerAgences, FUSEAU } from "@/lib/admin-donnees";
import { plan, PLANS } from "@/lib/tarifs";
import { dateFr } from "@/lib/format";
import {
  Carte, Etiquette, ListeVide, Message, Pagination, Tableau, TitrePage,
} from "@/components/admin-ui";

export const metadata = { title: "Agences" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageAgences({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin("agences.lire");
  const params = await searchParams;

  const q = lire(params, "q");
  const statut = lire(params, "statut");
  const formule = lire(params, "plan");
  const page = Math.max(1, Number(lire(params, "page")) || 1);

  const { lignes, total, pages } = listerAgences({ q, statut, plan: formule, page });

  // Les filtres repartent dans les liens de pagination : changer de page ne
  // doit pas faire perdre la recherche en cours.
  const base = new URLSearchParams();
  if (q) base.set("q", q);
  if (statut) base.set("statut", statut);
  if (formule) base.set("plan", formule);

  return (
    <>
      <TitrePage titre="Agences" sous={`Dates en ${FUSEAU}.`} />
      <Message ok={lire(params, "ok")} erreur={lire(params, "erreur")} />

      <Carte className="mb-5 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="q">
              Rechercher
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Nom, e-mail, téléphone, ville…"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="statut">État</label>
            <select id="statut" name="statut" defaultValue={statut}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="active">En service</option>
              <option value="suspendue">Suspendue</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="plan">Formule</label>
            <select id="plan" name="plan" defaultValue={formule}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Toutes</option>
              {PLANS.map((p) => <option key={p.code} value={p.code}>{p.nom}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit"
                    className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--adm-vert-clair)]">
              Filtrer
            </button>
            {(q || statut || formule) && (
              <Link href="/admin/agences"
                    className="rounded-lg border border-[var(--adm-bord)] px-4 py-2 text-sm font-semibold hover:bg-black/5">
                Effacer
              </Link>
            )}
          </div>
        </form>
      </Carte>

      <Carte>
        {lignes.length === 0 ? (
          <ListeVide
            titre="Aucune agence"
            texte={q || statut || formule
              ? "Aucune agence ne correspond à ces filtres. Élargissez la recherche."
              : "Aucune agence ne s'est encore inscrite sur la plateforme."}
          />
        ) : (
          <>
            <Tableau entetes={["Agence", "Formule", "Portefeuille", "Inscrite le", "État", ""]}>
              {lignes.map((a) => (
                <tr key={a.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--adm-encre)]">{a.nom}</p>
                    <p className="text-xs text-[var(--adm-encre-2)]">
                      {a.ville || "—"}{a.email ? ` · ${a.email}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">{plan(a.plan).nom}</td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">
                    {a.nb_biens} bien(s) · {a.nb_locataires} locataire(s) · {a.nb_utilisateurs} compte(s)
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--adm-encre-2)]">{dateFr(a.cree_le)}</td>
                  <td className="px-4 py-3">
                    {a.suspendue_le
                      ? <Etiquette ton="rouge">Suspendue</Etiquette>
                      : <Etiquette ton="vert">En service</Etiquette>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/agences/${a.id}`}
                          className="font-semibold text-[var(--adm-vert)] hover:underline">
                      Ouvrir
                    </Link>
                  </td>
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
