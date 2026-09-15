import Link from "next/link";
import { exigerAdmin, peut } from "@/lib/admin";
import { listerAnnonces, FUSEAU } from "@/lib/admin-donnees";
import { actionModererAnnonce } from "@/lib/actions-admin";
import { TYPES_BIEN, VILLES } from "@/lib/constantes";
import { dateFr, fcfa } from "@/lib/format";
import {
  Carte, Etiquette, ListeVide, Message, Pagination, TitrePage,
} from "@/components/admin-ui";

export const metadata = { title: "Annonces" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

const MODERATIONS = [
  { valeur: "publie", libelle: "Publiée", ton: "vert" as const },
  { valeur: "en_attente", libelle: "En attente", ton: "ambre" as const },
  { valeur: "refuse", libelle: "Refusée", ton: "rouge" as const },
  { valeur: "archive", libelle: "Archivée", ton: "gris" as const },
];

const ETATS_BIEN: Record<string, string> = {
  disponible: "Disponible", loue: "Loué", reserve: "Réservé", travaux: "En travaux",
};

/**
 * Moderation des annonces.
 *
 * DEUX ETATS DISTINCTS, ET C'EST VOULU :
 *  - `statut` decrit le LOGEMENT : disponible, loué, réservé, en travaux.
 *    Il appartient a l'agence, l'administration n'y touche pas.
 *  - `moderation` decrit l'ANNONCE : a-t-elle le droit de paraitre ?
 *    Il appartient a l'equipe.
 * Une annonce publiee sur un bien loue est parfaitement normale ; les
 * confondre ferait disparaitre des annonces pour de mauvaises raisons.
 */
export default async function PageAnnonces({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("annonces.lire");
  const params = await searchParams;

  const q = lire(params, "q");
  const moderation = lire(params, "moderation");
  const ville = lire(params, "ville");
  const type = lire(params, "type");
  const page = Math.max(1, Number(lire(params, "page")) || 1);

  const { lignes, total, pages } = listerAnnonces({ q, moderation, ville, type, page });
  const moderer = peut(admin, "annonces.moderer");

  const base = new URLSearchParams();
  for (const [k, v] of [["q", q], ["moderation", moderation], ["ville", ville], ["type", type]]) {
    if (v) base.set(k, v);
  }
  const retour = `/admin/annonces${base.toString() ? `?${base.toString()}` : ""}`;

  return (
    <>
      <TitrePage titre="Annonces" sous={`Dates en ${FUSEAU}.`} />
      <Message ok={lire(params, "ok")} erreur={lire(params, "erreur")} />

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link href="/admin/annonces"
              className={`rounded-lg px-3 py-2 text-sm font-medium ${!moderation ? "bg-[var(--adm-vert)] text-white" : "border border-[var(--adm-bord)] bg-white hover:bg-black/5"}`}>
          Toutes
        </Link>
        {MODERATIONS.map((m) => (
          <Link key={m.valeur} href={`/admin/annonces?moderation=${m.valeur}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${moderation === m.valeur ? "bg-[var(--adm-vert)] text-white" : "border border-[var(--adm-bord)] bg-white hover:bg-black/5"}`}>
            {m.libelle}
          </Link>
        ))}
      </div>

      <Carte className="mb-5 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          {moderation ? <input type="hidden" name="moderation" value={moderation} /> : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="q">Rechercher</label>
            <input id="q" name="q" defaultValue={q} placeholder="Titre, référence ou quartier…"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="ville">Ville</label>
            <select id="ville" name="ville" defaultValue={ville}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Toutes</option>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={type}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              {TYPES_BIEN.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit"
                    className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--adm-vert-clair)]">
              Filtrer
            </button>
          </div>
        </form>
      </Carte>

      {lignes.length === 0 ? (
        <Carte>
          <ListeVide titre="Aucune annonce"
                     texte={base.toString() ? "Aucune annonce ne correspond à ces filtres." : "Aucune annonce n'a encore été créée."} />
        </Carte>
      ) : (
        <>
          <ul className="grid gap-4">
            {lignes.map((b) => {
              const photo = (b.photos ?? "").split("\n").map((s) => s.trim()).filter(Boolean)[0];
              const etat = MODERATIONS.find((m) => m.valeur === b.moderation) ?? MODERATIONS[0];
              return (
                <li key={b.id}>
                  <Carte className="overflow-hidden">
                    <div className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr] lg:grid-cols-[10rem_1fr_18rem]">
                      <div className="overflow-hidden rounded-lg bg-black/5">
                        {photo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={photo} alt="" width={320} height={240} loading="lazy"
                               className="aspect-[4/3] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] items-center justify-center text-xs text-[var(--adm-encre-2)]">
                            Sans photo
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Etiquette ton={etat.ton}>{etat.libelle}</Etiquette>
                          <Etiquette ton="gris">{ETATS_BIEN[b.statut] ?? b.statut}</Etiquette>
                          {b.publie === 0 && <Etiquette ton="gris">Dépubliée par l&apos;agence</Etiquette>}
                        </div>
                        <h2 className="mt-2 font-semibold text-[var(--adm-encre)]">{b.titre}</h2>
                        <p className="text-xs text-[var(--adm-encre-2)]">
                          {b.reference} · {b.quartier ? `${b.quartier}, ` : ""}{b.ville} ·{" "}
                          <Link href={`/admin/agences/${b.agence_id}`} className="text-[var(--adm-vert)] hover:underline">
                            {b.agence_nom}
                          </Link>
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--adm-vert)]">
                          {b.courte_duree ? `${fcfa(b.prix_nuit)} / nuit` : `${fcfa(b.loyer)} / mois`}
                        </p>
                        <p className="mt-1 text-xs text-[var(--adm-encre-2)]">Créée le {dateFr(b.cree_le)}</p>
                        {b.moderation_motif && (
                          <p className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs text-[var(--adm-encre-2)]">
                            <strong>Motif :</strong> {b.moderation_motif}
                            {b.moderation_par && ` — ${b.moderation_par}`}
                            {b.moderation_le && `, le ${dateFr(b.moderation_le)}`}
                          </p>
                        )}
                        <p className="mt-2">
                          <Link href={`/biens/${b.id}`} target="_blank"
                                className="text-xs font-semibold text-[var(--adm-vert)] hover:underline">
                            Voir l&apos;annonce publique ↗
                          </Link>
                        </p>
                      </div>

                      {moderer && (
                        <form action={actionModererAnnonce} className="lg:border-l lg:border-[var(--adm-bord)] lg:pl-4">
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="retour" value={retour} />
                          <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor={`mod-${b.id}`}>
                            Décision
                          </label>
                          <select id={`mod-${b.id}`} name="moderation" defaultValue={b.moderation}
                                  className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
                            {MODERATIONS.map((m) => (
                              <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                            ))}
                          </select>
                          <label className="mb-1 mt-3 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor={`motif-${b.id}`}>
                            Motif (obligatoire pour refuser ou archiver)
                          </label>
                          <textarea id={`motif-${b.id}`} name="motif" rows={3}
                                    defaultValue={b.moderation_motif ?? ""}
                                    placeholder="Ce que l'agence doit corriger."
                                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
                          <button type="submit"
                                  className="mt-3 w-full rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
                            Enregistrer la décision
                          </button>
                        </form>
                      )}
                    </div>
                  </Carte>
                </li>
              );
            })}
          </ul>
          <Carte className="mt-4">
            <Pagination page={page} pages={pages} total={total} base={base} />
          </Carte>
        </>
      )}
    </>
  );
}
