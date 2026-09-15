import Link from "next/link";
import { exigerAdmin, peut } from "@/lib/admin";
import { listerUtilisateurs, FUSEAU } from "@/lib/admin-donnees";
import {
  actionBasculerUtilisateur, actionEnvoyerRecuperation, actionRevoquerSessions,
} from "@/lib/actions-admin";
import { dateFr } from "@/lib/format";
import {
  Carte, Etiquette, ListeVide, Message, Pagination, Tableau, TitrePage,
} from "@/components/admin-ui";

export const metadata = { title: "Utilisateurs" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

/**
 * Comptes d'agence : consultation, suspension, fermeture des sessions et
 * envoi du parcours de recuperation.
 *
 * CE QUI N'EST PAS ICI, ET NE LE SERA PAS : aucun mot de passe, aucune
 * empreinte, aucun code ; et aucune facon de se connecter a la place de
 * quelqu'un. Depanner ne demande pas d'usurper une identite — cela demande
 * de rendre l'acces a son titulaire, ce que fait le bouton de recuperation.
 */
export default async function PageUtilisateurs({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("utilisateurs.lire");
  const params = await searchParams;

  const q = lire(params, "q");
  const role = lire(params, "role");
  const statut = lire(params, "statut");
  const agence = Number(lire(params, "agence")) || undefined;
  const page = Math.max(1, Number(lire(params, "page")) || 1);

  const { lignes, total, pages } = listerUtilisateurs({ q, role, statut, agence, page });
  const ecrire = peut(admin, "utilisateurs.ecrire");

  const base = new URLSearchParams();
  for (const [k, v] of [["q", q], ["role", role], ["statut", statut], ["agence", agence ? String(agence) : ""]]) {
    if (v) base.set(k as string, v as string);
  }

  return (
    <>
      <TitrePage
        titre="Utilisateurs"
        sous={`Comptes de l'espace agence. Les locataires et les artisans ont leurs propres espaces. Dates en ${FUSEAU}.`}
      />
      <Message ok={lire(params, "ok")} erreur={lire(params, "erreur")} />

      <Carte className="mb-5 p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          {agence ? <input type="hidden" name="agence" value={agence} /> : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="q">Rechercher</label>
            <input id="q" name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone…"
                   className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="role">Rôle</label>
            <select id="role" name="role" defaultValue={role}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="proprietaire">Titulaire</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="statut">État</label>
            <select id="statut" name="statut" defaultValue={statut}
                    className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
              <option value="">Tous</option>
              <option value="actif">Actif</option>
              <option value="suspendu">Suspendu</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit"
                    className="rounded-lg bg-[var(--adm-vert)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--adm-vert-clair)]">
              Filtrer
            </button>
            {(q || role || statut || agence) && (
              <Link href="/admin/utilisateurs"
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
            titre="Aucun utilisateur"
            texte={base.toString()
              ? "Aucun compte ne correspond à ces filtres."
              : "Aucun compte d'agence n'existe encore."}
          />
        ) : (
          <>
            <Tableau entetes={["Personne", "Agence", "Rôle", "Sessions", "État", "Actions"]}>
              {lignes.map((u) => (
                <tr key={u.id} className="align-top hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--adm-encre)]">{u.nom}</p>
                    <p className="text-xs text-[var(--adm-encre-2)]">{u.email}</p>
                    {u.telephone && <p className="text-xs text-[var(--adm-encre-2)]">{u.telephone}</p>}
                    <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">Créé le {dateFr(u.cree_le)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/agences/${u.agence_id}`} className="text-[var(--adm-vert)] hover:underline">
                      {u.agence_nom}
                    </Link>
                    {u.agence_suspendue && (
                      <p className="mt-1"><Etiquette ton="rouge">Agence suspendue</Etiquette></p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">
                    {u.role === "proprietaire" ? "Titulaire" : "Agent"}
                  </td>
                  <td className="px-4 py-3 text-[var(--adm-encre-2)]">{u.nb_sessions}</td>
                  <td className="px-4 py-3">
                    {u.actif ? <Etiquette ton="vert">Actif</Etiquette> : <Etiquette ton="rouge">Suspendu</Etiquette>}
                  </td>
                  <td className="px-4 py-3">
                    {!ecrire ? (
                      <span className="text-xs text-[var(--adm-encre-2)]">Lecture seule</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {u.actif ? (
                          <details>
                            <summary className="cursor-pointer list-none text-xs font-semibold text-[#7d1a15] hover:underline">
                              Suspendre l&apos;accès
                            </summary>
                            <form action={actionBasculerUtilisateur} className="mt-2 w-56">
                              <input type="hidden" name="id" value={u.id} />
                              <label className="sr-only" htmlFor={`motif-${u.id}`}>Motif</label>
                              <textarea id={`motif-${u.id}`} name="motif" rows={2} required minLength={10}
                                        placeholder="Motif (10 caractères minimum)"
                                        className="w-full rounded-lg border border-[var(--adm-bord)] px-2 py-1.5 text-xs" />
                              <button type="submit"
                                      className="mt-1.5 w-full rounded-lg border border-[#b3261e]/40 px-3 py-1.5 text-xs font-semibold text-[#7d1a15] hover:bg-[#b3261e]/10">
                                Confirmer la suspension
                              </button>
                            </form>
                          </details>
                        ) : (
                          <form action={actionBasculerUtilisateur}>
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit" className="text-xs font-semibold text-[var(--adm-vert)] hover:underline">
                              Rétablir l&apos;accès
                            </button>
                          </form>
                        )}
                        {u.nb_sessions > 0 && (
                          <form action={actionRevoquerSessions}>
                            <input type="hidden" name="id" value={u.id} />
                            <button type="submit" className="text-left text-xs font-semibold text-[var(--adm-encre-2)] hover:underline">
                              Fermer ses sessions
                            </button>
                          </form>
                        )}
                        <form action={actionEnvoyerRecuperation}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-left text-xs font-semibold text-[var(--adm-encre-2)] hover:underline">
                            Envoyer un lien de récupération
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Tableau>
            <Pagination page={page} pages={pages} total={total} base={base} />
          </>
        )}
      </Carte>

      <p className="mt-4 text-xs leading-relaxed text-[var(--adm-encre-2)]">
        Les mots de passe ne sont jamais affichés, et aucun bouton ne permet de se
        connecter à la place d&apos;un utilisateur. Le lien de récupération part à
        l&apos;adresse du titulaire : lui seul choisit son nouveau mot de passe.
      </p>
    </>
  );
}
