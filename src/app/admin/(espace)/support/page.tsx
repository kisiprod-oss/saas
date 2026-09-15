import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import {
  CATEGORIES, libelleCategorie, libellePriorite, libelleStatut, listerTickets, PRIORITES, STATUTS,
} from "@/lib/support";
import { dateHeureFr } from "@/lib/format";
import {
  Carte, Etiquette, ListeVide, Pagination, Tableau, TitrePage,
} from "@/components/admin-ui";

export const metadata = { title: "Support" };
export const dynamic = "force-dynamic";

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

function tonStatut(statut: string): "vert" | "ambre" | "rouge" | "gris" {
  if (statut === "nouveau") return "rouge";
  if (statut === "en_cours") return "ambre";
  if (statut === "en_attente") return "ambre";
  return "vert";
}

export default async function PageSupportAdmin({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin("support.lire");
  const params = await searchParams;
  const q = lire(params, "q");
  const statut = lire(params, "statut");
  const priorite = lire(params, "priorite");
  const categorie = lire(params, "categorie");
  const page = Number(lire(params, "page") || "1");

  const { lignes, total, pages } = listerTickets({ q, statut, priorite, categorie, page });
  const base = new URLSearchParams({ q, statut, priorite, categorie });

  return (
    <>
      <TitrePage
        titre="Support"
        sous="Les demandes d'assistance déposées par les agences, toutes confondues."
      />

      <Carte className="mb-5 p-4">
        <form className="grid gap-3 sm:grid-cols-4">
          <input
            type="search" name="q" defaultValue={q} placeholder="Sujet, numéro, agence…"
            className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm sm:col-span-2"
          />
          <select name="statut" defaultValue={statut} className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
          </select>
          <select name="priorite" defaultValue={priorite} className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
            <option value="">Toutes les priorités</option>
            {PRIORITES.map((p) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}
          </select>
          <select name="categorie" defaultValue={categorie} className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => <option key={c.valeur} value={c.valeur}>{c.libelle}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white sm:col-span-4 sm:w-fit">
            Filtrer
          </button>
        </form>
      </Carte>

      <Carte>
        {lignes.length === 0 ? (
          <ListeVide titre="Aucun ticket" texte="Aucun ticket ne correspond à ces critères." />
        ) : (
          <Tableau entetes={["Ticket", "Agence", "Catégorie", "Priorité", "Statut", "Mis à jour"]}>
            {lignes.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/support/${t.id}`} className="font-semibold text-[var(--adm-vert)] hover:underline">
                    {t.sujet}
                  </Link>
                  <p className="text-xs text-[var(--adm-encre-2)]">{t.numero}</p>
                </td>
                <td className="px-4 py-3 text-[var(--adm-encre-2)]">{t.agence_nom}</td>
                <td className="px-4 py-3 text-[var(--adm-encre-2)]">{libelleCategorie(t.categorie)}</td>
                <td className="px-4 py-3 text-[var(--adm-encre-2)]">{libellePriorite(t.priorite)}</td>
                <td className="px-4 py-3">
                  <Etiquette ton={tonStatut(t.statut)}>{libelleStatut(t.statut)}</Etiquette>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--adm-encre-2)]">{dateHeureFr(t.maj_le)}</td>
              </tr>
            ))}
          </Tableau>
        )}
        <Pagination page={Math.max(1, page)} pages={pages} total={total} base={base} />
      </Carte>
    </>
  );
}
