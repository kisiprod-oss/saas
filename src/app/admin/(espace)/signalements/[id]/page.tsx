import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin, peut } from "@/lib/admin";
import { actionTraiterSignalement } from "@/lib/actions-admin";
import {
  libelleMotif, libelleStatut, signalement, signalementsDeLaCible,
} from "@/lib/signalements";
import { FUSEAU } from "@/lib/admin-donnees";
import { dateHeureFr } from "@/lib/format";
import { Carte, Etiquette, Message, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Signalement" };
export const dynamic = "force-dynamic";

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageSignalement({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("signalements.lire");
  const { id } = await params;
  const recherche = await searchParams;

  const s = signalement(Number(id));
  if (!s) notFound();

  const autres = signalementsDeLaCible(s.cible_type, s.cible_id, s.id);
  const peutTraiter = peut(admin, "signalements.traiter");
  const enLigne = s.cible_type === "bien" && s.cible_publie === 1 && s.cible_moderation === "publie";

  return (
    <>
      <TitrePage
        titre={s.cible_titre ?? `Contenu supprimé (${s.cible_type} n°${s.cible_id})`}
        sous={`Signalé le ${dateHeureFr(s.cree_le)} · ${libelleMotif(s.motif)} · heures en ${FUSEAU}.`}
        action={<Etiquette ton={s.statut === "nouveau" ? "rouge" : s.statut === "retenu" ? "ambre" : "gris"}>
          {libelleStatut(s.statut)}
        </Etiquette>}
      />
      <Message ok={lire(recherche, "ok")} erreur={lire(recherche, "erreur")} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="space-y-4">
          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">Ce que dit le signalement</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--adm-encre-2)]">Motif</dt>
                <dd className="mt-0.5">{libelleMotif(s.motif)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--adm-encre-2)]">Description</dt>
                <dd className="mt-0.5 whitespace-pre-line break-words">
                  {s.description ?? <span className="text-[var(--adm-encre-2)]">Aucune précision donnée.</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--adm-encre-2)]">Contact laissé</dt>
                <dd className="mt-0.5 break-words">
                  {s.contact ?? <span className="text-[var(--adm-encre-2)]">Aucun : la personne a signalé sans se nommer.</span>}
                </dd>
              </div>
            </dl>
          </Carte>

          {autres.length > 0 && (
            <Carte>
              <div className="border-b border-[var(--adm-bord)] px-5 py-4">
                <h2 className="font-semibold text-[var(--adm-encre)]">
                  {autres.length} autre(s) signalement(s) sur ce même contenu
                </h2>
                <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
                  Un seul avis n&apos;est pas une preuve ; plusieurs, venus séparément, méritent un regard.
                </p>
              </div>
              <ul className="divide-y divide-[var(--adm-bord)]">
                {autres.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <Link href={`/admin/signalements/${a.id}`} className="font-semibold text-[var(--adm-vert)] hover:underline">
                        {libelleMotif(a.motif)}
                      </Link>
                      <span className="text-xs text-[var(--adm-encre-2)]">{dateHeureFr(a.cree_le)}</span>
                      <span className="ml-auto text-xs text-[var(--adm-encre-2)]">{libelleStatut(a.statut)}</span>
                    </div>
                    {a.description && (
                      <p className="mt-1 break-words text-xs text-[var(--adm-encre-2)]">{a.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Carte>
          )}

          {peutTraiter && s.statut === "nouveau" && (
            <Carte className="p-5">
              <h2 className="font-semibold text-[var(--adm-encre)]">Votre décision</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--adm-encre-2)]">
                Trancher le signalement ne retire rien&nbsp;: c&apos;est la modération de
                l&apos;annonce, à droite, qui la fait disparaître de la vitrine. Les deux
                gestes sont séparés pour qu&apos;aucune annonce ne tombe sans motif écrit.
              </p>
              {/* La decision est un CHAMP, pas la valeur du bouton qui
                  soumet : un formulaire d'action de serveur ne transmet pas
                  toujours le bouton declencheur, et la decision arrivait
                  vide. Deux choix nommes, et l'ecran ne peut plus mentir
                  sur ce qui a ete envoye. */}
              <form action={actionTraiterSignalement} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={s.id} />

                <fieldset className="space-y-2 border-0 p-0">
                  <legend className="mb-1 text-xs font-semibold text-[var(--adm-encre-2)]">
                    Votre conclusion
                  </legend>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--adm-bord)] p-3 text-sm hover:bg-black/[.03]">
                    <input type="radio" name="decision" value="retenu" required className="mt-1" />
                    <span>
                      <b className="font-semibold">Retenir le signalement</b>
                      <span className="block text-xs text-[var(--adm-encre-2)]">
                        La personne avait raison. Le contenu reste en ligne tant qu&apos;il n&apos;est pas modéré.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--adm-bord)] p-3 text-sm hover:bg-black/[.03]">
                    <input type="radio" name="decision" value="classe" className="mt-1" />
                    <span>
                      <b className="font-semibold">Classer sans suite</b>
                      <span className="block text-xs text-[var(--adm-encre-2)]">
                        Rien à reprocher au contenu, ou signalement infondé.
                      </span>
                    </span>
                  </label>
                </fieldset>

                <label className="block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="motif">
                  Motif de la décision (dix caractères minimum)
                </label>
                <textarea
                  id="motif" name="motif" rows={3} required minLength={10}
                  placeholder="Ce que vous avez vérifié, et ce que vous en concluez."
                  className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm"
                />
                <button type="submit"
                        className="rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
                  Enregistrer la décision
                </button>
              </form>
            </Carte>
          )}

          {s.statut !== "nouveau" && (
            <Carte className="p-5">
              <h2 className="font-semibold text-[var(--adm-encre)]">Décision prise</h2>
              <p className="mt-2 text-sm">{s.motif_decision}</p>
              <p className="mt-2 text-xs text-[var(--adm-encre-2)]">
                Par {s.traite_par} · {s.traite_le ? dateHeureFr(s.traite_le) : "—"}
              </p>
            </Carte>
          )}
        </div>

        <div className="space-y-4">
          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">Le contenu visé</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--adm-encre-2)]">Type</dt>
                <dd>{s.cible_type === "bien" ? "Annonce" : "Artisan"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--adm-encre-2)]">Référence</dt>
                <dd className="break-words text-right">{s.cible_reference ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--adm-encre-2)]">Agence</dt>
                <dd className="break-words text-right">{s.agence_nom ?? "—"}</dd>
              </div>
              {s.cible_type === "bien" && s.cible_titre && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--adm-encre-2)]">Sur la vitrine</dt>
                  <dd>{enLigne ? "En ligne" : "Hors ligne"}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              {s.cible_type === "bien" && s.cible_titre && (
                <>
                  {peut(admin, "annonces.lire") && (
                    <Link href={`/admin/annonces?q=${encodeURIComponent(s.cible_reference ?? "")}`}
                          className="rounded-lg bg-[var(--adm-vert)] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[var(--adm-vert-nuit)]">
                      Modérer cette annonce
                    </Link>
                  )}
                  <a href={`/biens/${s.cible_id}`} target="_blank" rel="noopener noreferrer"
                     className="rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-center text-sm font-semibold hover:bg-black/5">
                    Voir l&apos;annonce telle que le public la voit ↗
                  </a>
                </>
              )}
              {s.agence_id && peut(admin, "agences.lire") && (
                <Link href={`/admin/agences/${s.agence_id}`}
                      className="rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-center text-sm font-semibold hover:bg-black/5">
                  Fiche de l&apos;agence
                </Link>
              )}
              {!s.cible_titre && (
                <p className="text-xs text-[var(--adm-encre-2)]">
                  Le contenu visé n&apos;existe plus. Le signalement reste consultable&nbsp;:
                  c&apos;est ce qui permet de comprendre une décision après coup.
                </p>
              )}
            </div>
          </Carte>
        </div>
      </div>
    </>
  );
}
