import Link from "next/link";
import { exigerAdmin, peut } from "@/lib/admin";
import { listerArtisans, FUSEAU } from "@/lib/admin-donnees";
import { actionSuspendreArtisan, actionVerifierArtisan } from "@/lib/actions-admin";
import { METIERS } from "@/lib/constantes";
import { dateFr } from "@/lib/format";
import { Carte, Etiquette, ListeVide, Message, Pagination, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Artisans" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageArtisans({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("artisans.lire");
  const params = await searchParams;

  const q = lire(params, "q");
  const statut = lire(params, "statut");
  const metier = lire(params, "metier");
  const page = Math.max(1, Number(lire(params, "page")) || 1);
  const { lignes, total, pages } = listerArtisans({ q, statut, metier, page });
  const moderer = peut(admin, "artisans.moderer");

  const base = new URLSearchParams();
  for (const [k, v] of [["q", q], ["statut", statut], ["metier", metier]]) if (v) base.set(k, v);

  return (
    <>
      <TitrePage
        titre="Artisans"
        sous={`Fiches de l'annuaire public. Les candidatures se valident depuis Candidatures. Dates en ${FUSEAU}.`}
        action={
          <Link href="/admin/candidatures"
                className="rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-black/5">
            Candidatures en attente
          </Link>
        }
      />
      <Message ok={lire(params, "ok")} erreur={lire(params, "erreur")} />

      <Carte className="mb-5 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="q">Rechercher</label>
            <input id="q" name="q" defaultValue={q} placeholder="Nom, téléphone, e-mail, ville…"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="metier">Métier</label>
            <select id="metier" name="metier" defaultValue={metier}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              {METIERS.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="statut">État</label>
            <select id="statut" name="statut" defaultValue={statut}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="verifie">Vérifiés</option>
              <option value="en_attente">Candidature en attente</option>
              <option value="suspendu">Suspendus</option>
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

      <Carte>
        {lignes.length === 0 ? (
          <ListeVide titre="Aucun artisan"
                     texte={base.toString() ? "Aucune fiche ne correspond à ces filtres." : "Aucun artisan n'est encore inscrit."} />
        ) : (
          <>
            <ul className="divide-y divide-[var(--adm-bord)]">
              {lignes.map((a) => (
                <li key={a.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_20rem]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--adm-encre)]">{a.nom}</h2>
                      {a.verifie_le && <Etiquette ton="vert">Vérifié</Etiquette>}
                      {a.suspendu_le && <Etiquette ton="rouge">Suspendu</Etiquette>}
                      {a.statut_candidature === "en_attente" && <Etiquette ton="ambre">Candidature en attente</Etiquette>}
                      {a.publie === 0 && !a.suspendu_le && <Etiquette ton="gris">Non publié</Etiquette>}
                    </div>
                    <p className="mt-1 text-sm text-[var(--adm-encre-2)]">
                      {METIERS.find((m) => m.valeur === a.metier)?.libelle ?? a.metier}
                      {" · "}{a.quartier ? `${a.quartier}, ` : ""}{a.ville}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
                      {a.telephone}{a.email ? ` · ${a.email}` : ""}
                      {a.agence_nom ? ` · recommandé par ${a.agence_nom}` : " · candidature libre"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--adm-encre-2)]">
                      Inscrit le {dateFr(a.cree_le)} ·{" "}
                      {a.quiz_total
                        ? `questionnaire ${a.quiz_score}/${a.quiz_total} ${a.quiz_reussi ? "(réussi)" : "(échoué)"}`
                        : "questionnaire non passé"}
                      {a.nb_avis > 0 ? ` · ${a.nb_avis} avis, note ${a.note_moyenne}` : " · aucun avis"}
                    </p>
                    {a.verifie_le && (
                      <p className="mt-1 text-xs text-[var(--adm-encre-2)]">
                        Badge posé le {dateFr(a.verifie_le)} par {a.verifie_par}.
                      </p>
                    )}
                    {a.motif_suspension && (
                      <p className="mt-2 rounded-lg bg-[#b3261e]/5 px-3 py-2 text-xs text-[#7d1a15]">
                        <strong>Motif de suspension :</strong> {a.motif_suspension}
                      </p>
                    )}
                    {(a.cv_url || a.documents) && (
                      <p className="mt-2 text-xs text-[var(--adm-encre-2)]">
                        Pièces justificatives fournies. Elles ne sont servies qu&apos;aux
                        personnes habilitées, jamais publiquement.
                      </p>
                    )}
                    <p className="mt-2">
                      <Link href={`/professionnels/${a.id}`} target="_blank"
                            className="text-xs font-semibold text-[var(--adm-vert)] hover:underline">
                        Voir la fiche publique ↗
                      </Link>
                    </p>
                  </div>

                  {moderer && (
                    <div className="space-y-3 lg:border-l lg:border-[var(--adm-bord)] lg:pl-4">
                      <form action={actionVerifierArtisan}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit"
                                className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2 text-sm font-semibold hover:bg-black/5">
                          {a.verifie_le ? "Retirer le badge « Vérifié »" : "Attribuer le badge « Vérifié »"}
                        </button>
                      </form>
                      {!a.verifie_le && (
                        <p className="text-xs leading-relaxed text-[var(--adm-encre-2)]">
                          Le badge exige une candidature validée ET un questionnaire
                          métier réussi. La date et votre nom restent enregistrés.
                        </p>
                      )}
                      {a.suspendu_le ? (
                        <form action={actionSuspendreArtisan}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit"
                                  className="w-full rounded-lg bg-[var(--adm-dore)] px-4 py-2 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
                            Réactiver
                          </button>
                        </form>
                      ) : (
                        <details>
                          <summary className="cursor-pointer list-none text-xs font-semibold text-[#7d1a15] hover:underline">
                            Suspendre cette fiche
                          </summary>
                          <form action={actionSuspendreArtisan} className="mt-2">
                            <input type="hidden" name="id" value={a.id} />
                            <label className="sr-only" htmlFor={`m-${a.id}`}>Motif</label>
                            <textarea id={`m-${a.id}`} name="motif" rows={2} required minLength={10}
                                      placeholder="Motif (10 caractères minimum)"
                                      className="w-full rounded-lg border border-[var(--adm-bord)] px-2 py-1.5 text-xs" />
                            <button type="submit"
                                    className="mt-1.5 w-full rounded-lg border border-[#b3261e]/40 px-3 py-1.5 text-xs font-semibold text-[#7d1a15] hover:bg-[#b3261e]/10">
                              Confirmer — retire la fiche de l&apos;annuaire
                            </button>
                          </form>
                        </details>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={page} pages={pages} total={total} base={base} />
          </>
        )}
      </Carte>
    </>
  );
}
