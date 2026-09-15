import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin, lireJournal, peut } from "@/lib/admin";
import { ficheAgence, membresAgence, FUSEAU } from "@/lib/admin-donnees";
import {
  actionNoteInterneAgence, actionReactiverAgence, actionSuspendreAgence,
} from "@/lib/actions-admin";
import { plan } from "@/lib/tarifs";
import { dateFr, dateHeureFr } from "@/lib/format";
import { Carte, Etiquette, ListeVide, Message, Tableau, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Fiche agence" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageFicheAgence({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("agences.lire");
  const { id } = await params;
  const recherche = await searchParams;

  const agence = ficheAgence(Number(id));
  if (!agence) notFound();

  const membres = membresAgence(agence.id);
  const historique = peut(admin, "journal.lire")
    ? lireJournal({ cible_type: "agence", cible_id: String(agence.id), limite: 20 }).lignes
    : [];

  return (
    <>
      <TitrePage
        titre={agence.nom}
        sous={`Inscrite le ${dateFr(agence.cree_le)} · formule ${plan(agence.plan).nom} · dates en ${FUSEAU}.`}
        action={
          agence.suspendue_le
            ? <Etiquette ton="rouge">Suspendue le {dateFr(agence.suspendue_le)}</Etiquette>
            : <Etiquette ton="vert">En service</Etiquette>
        }
      />
      <Message ok={lire(recherche, "ok")} erreur={lire(recherche, "erreur")} />

      {agence.suspendue_le && agence.motif_suspension && (
        <Carte className="mb-5 border-[#b3261e]/30 bg-[#b3261e]/5 p-5">
          <p className="text-sm font-semibold text-[#7d1a15]">Motif de la suspension</p>
          <p className="mt-1 text-sm text-[#7d1a15]">{agence.motif_suspension}</p>
        </Carte>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* ------------------------- Coordonnées ------------------------- */}
          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">Coordonnées professionnelles</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ["Responsable", membres.find((m) => m.role === "proprietaire")?.nom ?? "—"],
                ["E-mail", agence.email ?? "—"],
                ["Téléphone", agence.telephone ?? "—"],
                ["Ville", agence.ville ?? "—"],
                ["Adresse", agence.adresse ?? "—"],
                ["NINEA", agence.ninea ?? "—"],
                ["RCCM", agence.rccm ?? "—"],
                ["Commission", `${agence.commission_pct} %`],
                ["Guide téléchargé", agence.guide_telecharge_le ? dateHeureFr(agence.guide_telecharge_le) : "Pas encore"],
                ["Échéance de formule", agence.plan_expire_le ? dateFr(agence.plan_expire_le) : "Aucune"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--adm-encre-2)]">{k}</dt>
                  <dd className="mt-0.5 text-sm text-[var(--adm-encre)]">{v}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          {/* --------------------------- Équipe --------------------------- */}
          <Carte>
            <div className="border-b border-[var(--adm-bord)] px-5 py-4">
              <h2 className="font-semibold text-[var(--adm-encre)]">Équipe de l&apos;agence</h2>
            </div>
            {membres.length === 0 ? (
              <ListeVide titre="Aucun compte" texte="Cette agence n'a aucun compte utilisateur." />
            ) : (
              <Tableau entetes={["Personne", "Rôle", "Créé le", "État"]}>
                {membres.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--adm-encre)]">{m.nom}</p>
                      <p className="text-xs text-[var(--adm-encre-2)]">{m.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--adm-encre-2)]">
                      {m.role === "proprietaire" ? "Titulaire" : "Agent"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--adm-encre-2)]">{dateFr(m.cree_le)}</td>
                    <td className="px-4 py-3">
                      {m.actif ? <Etiquette ton="vert">Actif</Etiquette> : <Etiquette ton="rouge">Suspendu</Etiquette>}
                    </td>
                  </tr>
                ))}
              </Tableau>
            )}
            <p className="border-t border-[var(--adm-bord)] px-5 py-3 text-xs text-[var(--adm-encre-2)]">
              Les suspensions de comptes se font depuis{" "}
              <Link href={`/admin/utilisateurs?agence=${agence.id}`} className="font-semibold text-[var(--adm-vert)] hover:underline">
                la page Utilisateurs
              </Link>.
            </p>
          </Carte>

          {/* ------------------------- Historique ------------------------- */}
          <Carte>
            <div className="border-b border-[var(--adm-bord)] px-5 py-4">
              <h2 className="font-semibold text-[var(--adm-encre)]">Historique des actions</h2>
              <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
                Ce que l&apos;équipe a fait sur cette agence. Heures en {FUSEAU}.
              </p>
            </div>
            {historique.length === 0 ? (
              <ListeVide titre="Rien à afficher" texte="Aucune action d'administration n'a encore visé cette agence." />
            ) : (
              <ul className="divide-y divide-[var(--adm-bord)]">
                {historique.map((l) => (
                  <li key={l.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-xs text-[var(--adm-encre-2)]">{dateHeureFr(l.cree_le)}</span>
                      <span className="font-semibold">{l.action}</span>
                      <span className="ml-auto text-xs text-[var(--adm-encre-2)]">{l.acteur}</span>
                    </div>
                    {l.motif && <p className="mt-1 text-xs text-[var(--adm-encre-2)]">Motif : {l.motif}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>

        <div className="space-y-6">
          {/* --------------------------- Chiffres --------------------------- */}
          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">Portefeuille</h2>
            <dl className="mt-4 space-y-3">
              {[
                ["Biens enregistrés", agence.nb_biens],
                ["Annonces en ligne", agence.nb_annonces],
                ["Locataires", agence.nb_locataires],
                ["Comptes d'agence", agence.nb_utilisateurs],
                ["Factures émises", agence.nb_factures],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-baseline justify-between gap-3">
                  <dt className="text-sm text-[var(--adm-encre-2)]">{k}</dt>
                  <dd className="text-lg font-bold text-[var(--adm-vert)]">{v}</dd>
                </div>
              ))}
            </dl>
          </Carte>

          {/* ------------------------ Notes internes ------------------------ */}
          {peut(admin, "agences.notes") && (
            <Carte className="p-5">
              <h2 className="font-semibold text-[var(--adm-encre)]">Notes internes</h2>
              <p className="mt-1 text-xs text-[var(--adm-encre-2)]">
                Visibles par l&apos;équipe Sen Gestion uniquement. Aucune page de
                l&apos;espace agence ne lit ce champ.
              </p>
              <form action={actionNoteInterneAgence} className="mt-4">
                <input type="hidden" name="id" value={agence.id} />
                <label className="sr-only" htmlFor="notes">Notes internes</label>
                <textarea
                  id="notes" name="notes_internes" rows={6} maxLength={4000}
                  defaultValue={agence.notes_internes ?? ""}
                  placeholder="Contexte, échanges, points de vigilance…"
                  className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm"
                />
                <button type="submit"
                        className="mt-3 w-full rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-black/5">
                  Enregistrer la note
                </button>
              </form>
            </Carte>
          )}

          {/* -------------------------- Suspension -------------------------- */}
          {peut(admin, "agences.suspendre") && (
            <Carte className="p-5">
              <h2 className="font-semibold text-[var(--adm-encre)]">
                {agence.suspendue_le ? "Réactiver l'agence" : "Suspendre l'agence"}
              </h2>
              {agence.suspendue_le ? (
                <>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--adm-encre-2)]">
                    L&apos;agence retrouvera l&apos;accès à son espace. Ses annonces
                    ne sont pas republiées automatiquement : vérifiez-les.
                  </p>
                  <form action={actionReactiverAgence} className="mt-4">
                    <input type="hidden" name="id" value={agence.id} />
                    <button type="submit"
                            className="w-full rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
                      Réactiver
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mt-3 rounded-lg border border-[#b3261e]/25 bg-[#b3261e]/5 p-3">
                    <p className="text-xs font-semibold text-[#7d1a15]">Ce que la suspension entraîne</p>
                    <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-[#7d1a15]">
                      <li>· Les {agence.nb_utilisateurs} compte(s) de l&apos;agence ne peuvent plus se connecter.</li>
                      <li>· Leurs sessions ouvertes sont fermées immédiatement.</li>
                      <li>· Aucune donnée n&apos;est supprimée : la suspension est réversible.</li>
                      <li>· Les locataires gardent leur accès à leurs quittances.</li>
                    </ul>
                  </div>
                  <form action={actionSuspendreAgence} className="mt-4">
                    <input type="hidden" name="id" value={agence.id} />
                    <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="motif">
                      Motif (obligatoire, dix caractères minimum)
                    </label>
                    <textarea id="motif" name="motif" rows={3} required minLength={10}
                              placeholder="Pourquoi cette agence est-elle suspendue ?"
                              className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
                    <button type="submit"
                            className="mt-3 w-full rounded-lg border border-[#b3261e]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#7d1a15] hover:bg-[#b3261e]/10">
                      Suspendre cette agence
                    </button>
                  </form>
                </>
              )}
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}
