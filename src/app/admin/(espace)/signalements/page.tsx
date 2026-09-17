import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import {
  libelleMotif, libelleStatut, listerSignalements, MOTIFS, STATUTS,
} from "@/lib/signalements";
import { FUSEAU } from "@/lib/admin-donnees";
import { dateHeureFr } from "@/lib/format";
import {
  Carte, Etiquette, ListeVide, Pagination, Tableau, TitrePage,
} from "@/components/admin-ui";

export const metadata = { title: "Signalements" };
export const dynamic = "force-dynamic";

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

function ton(statut: string): "vert" | "ambre" | "rouge" | "gris" {
  if (statut === "nouveau") return "rouge";
  if (statut === "retenu") return "ambre";
  return "gris";
}

export default async function PageSignalements({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin("signalements.lire");
  const params = await searchParams;
  const q = lire(params, "q");
  const statut = lire(params, "statut");
  const motif = lire(params, "motif");
  const page = Number(lire(params, "page") || "1");

  const { lignes, total, pages } = listerSignalements({ q, statut, motif, page });
  const base = new URLSearchParams({ q, statut, motif });

  return (
    <>
      <TitrePage
        titre="Signalements"
        sous={`Contenus signalés par les visiteurs de la vitrine. Heures en ${FUSEAU}.`}
      />

      <Carte className="mb-5 p-4">
        <form className="grid gap-3 sm:grid-cols-4">
          <input
            type="search" name="q" defaultValue={q} placeholder="Annonce, référence, description…"
            className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm sm:col-span-2"
          />
          <select name="statut" defaultValue={statut} className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
            <option value="">Tous les états</option>
            {STATUTS.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
          </select>
          <select name="motif" defaultValue={motif} className="rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
            <option value="">Tous les motifs</option>
            {MOTIFS.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white sm:col-span-4 sm:w-fit">
            Filtrer
          </button>
        </form>
      </Carte>

      <Carte>
        {lignes.length === 0 ? (
          <ListeVide
            titre="Aucun signalement"
            texte="Aucun signalement ne correspond à ces critères. C'est plutôt bon signe."
          />
        ) : (
          <Tableau entetes={["Contenu signalé", "Motif", "Agence", "État", "Reçu le"]}>
            {lignes.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/signalements/${s.id}`} className="font-semibold text-[var(--adm-vert)] hover:underline">
                    {s.cible_titre ?? `Contenu supprimé (${s.cible_type} n°${s.cible_id})`}
                  </Link>
                  <p className="text-xs text-[var(--adm-encre-2)]">
                    {s.cible_reference ?? "—"}
                    {s.nb_sur_la_cible > 1 && ` · ${s.nb_sur_la_cible} signalements sur ce contenu`}
                  </p>
                </td>
                <td className="px-4 py-3 text-[var(--adm-encre-2)]">{libelleMotif(s.motif)}</td>
                <td className="px-4 py-3 text-[var(--adm-encre-2)]">{s.agence_nom ?? "—"}</td>
                <td className="px-4 py-3"><Etiquette ton={ton(s.statut)}>{libelleStatut(s.statut)}</Etiquette></td>
                <td className="whitespace-nowrap px-4 py-3 text-[var(--adm-encre-2)]">{dateHeureFr(s.cree_le)}</td>
              </tr>
            ))}
          </Tableau>
        )}
        <Pagination page={Math.max(1, page)} pages={pages} total={total} base={base} />
      </Carte>
    </>
  );
}
