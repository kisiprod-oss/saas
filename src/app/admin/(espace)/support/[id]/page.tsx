import { notFound } from "next/navigation";
import { equipeAdmin, exigerAdmin, peut } from "@/lib/admin";
import {
  actionGererTicket, actionNoteInterneTicket, actionRepondreTicket,
} from "@/lib/actions-admin";
import {
  libelleCategorie, libellePriorite, libelleStatut, messagesTous, PRIORITES, STATUTS,
  ticketPourEquipe,
} from "@/lib/support";
import { dateHeureFr } from "@/lib/format";
import { Carte, Etiquette, Message, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageTicketAdmin({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("support.lire");
  const { id } = await params;
  const recherche = await searchParams;

  const ticket = ticketPourEquipe(Number(id));
  if (!ticket) notFound();

  const messages = messagesTous(ticket.id);
  const peutRepondre = peut(admin, "support.repondre");
  const equipe = equipeAdmin().filter((m) => m.actif);

  return (
    <>
      <TitrePage
        titre={ticket.sujet}
        sous={`${ticket.numero} · ${ticket.agence_nom} · ${libelleCategorie(ticket.categorie)} · ouvert par ${ticket.auteur_nom ?? "—"}`}
      />
      <Message ok={lire(recherche, "ok")} erreur={lire(recherche, "erreur")} />

      {/* [&>*]:min-w-0 : un enfant de grille refuse par defaut de descendre
          sous la largeur de son contenu. Sans cela, le fil de discussion
          elargit sa colonne, donc la page entiere, sur un telephone. */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <div className="space-y-4">
          {/* -------------------------------- Fil -------------------------------- */}
          <Carte className="p-0">
            <ul className="divide-y divide-[var(--adm-bord)]">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`p-4 ${
                    m.interne ? "bg-[#eec477]/12" : m.auteur_type === "equipe" ? "bg-[#0f5546]/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0 break-words text-sm font-semibold text-[var(--adm-encre)]">
                      {m.auteur_type === "equipe" ? m.auteur : ticket.auteur_nom ?? "Agence"}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {Boolean(m.interne) && <Etiquette ton="ambre">Note interne</Etiquette>}
                      <span className="text-xs text-[var(--adm-encre-2)]">{dateHeureFr(m.cree_le)}</span>
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line break-words text-sm text-[var(--adm-encre)]">{m.corps}</p>
                </li>
              ))}
            </ul>
          </Carte>

          {peutRepondre && (
            <>
              <Carte className="p-5">
                <h2 className="font-semibold text-[var(--adm-encre)]">Répondre à l&apos;agence</h2>
                <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">Visible par l&apos;agence.</p>
                <form action={actionRepondreTicket} className="mt-3">
                  <input type="hidden" name="id" value={ticket.id} />
                  <textarea name="corps" rows={4} required
                            className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm" />
                  <button type="submit"
                          className="mt-3 rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
                    Envoyer la réponse
                  </button>
                </form>
              </Carte>

              <Carte className="p-5">
                <h2 className="font-semibold text-[var(--adm-encre)]">Note interne</h2>
                <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
                  Jamais visible par l&apos;agence : pour l&apos;équipe uniquement.
                </p>
                <form action={actionNoteInterneTicket} className="mt-3">
                  <input type="hidden" name="id" value={ticket.id} />
                  <textarea name="corps" rows={3} required
                            className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm" />
                  <button type="submit"
                          className="mt-3 rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-black/5">
                    Ajouter la note
                  </button>
                </form>
              </Carte>
            </>
          )}
        </div>

        <div className="space-y-4">
          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">État du ticket</h2>
            {peutRepondre ? (
              <form action={actionGererTicket} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={ticket.id} />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="statut">Statut</label>
                  <select id="statut" name="statut" defaultValue={ticket.statut}
                          className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
                    {STATUTS.map((s) => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="priorite">Priorité</label>
                  <select id="priorite" name="priorite" defaultValue={ticket.priorite}
                          className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
                    {PRIORITES.map((p) => <option key={p.valeur} value={p.valeur}>{p.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="responsable">Responsable</label>
                  <select id="responsable" name="responsable" defaultValue={ticket.responsable ?? ""}
                          className="w-full rounded-lg border border-[var(--adm-bord)] px-3 py-2 text-sm">
                    <option value="">Non attribué</option>
                    {equipe.map((m) => <option key={m.email} value={m.email}>{m.nom ?? m.email}</option>)}
                  </select>
                </div>
                <button type="submit" className="w-full rounded-lg bg-[var(--adm-vert)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--adm-vert-nuit)]">
                  Mettre à jour
                </button>
              </form>
            ) : (
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Statut</dt><dd>{libelleStatut(ticket.statut)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Priorité</dt><dd>{libellePriorite(ticket.priorite)}</dd></div>
                <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Responsable</dt><dd>{ticket.responsable ?? "Non attribué"}</dd></div>
              </dl>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-[var(--adm-encre)]">Repères</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Ouvert le</dt><dd>{dateHeureFr(ticket.cree_le)}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Dernière activité</dt><dd>{dateHeureFr(ticket.maj_le)}</dd></div>
              {ticket.resolu_le && (
                <div className="flex justify-between"><dt className="text-[var(--adm-encre-2)]">Résolu le</dt><dd>{dateHeureFr(ticket.resolu_le)}</dd></div>
              )}
            </dl>
          </Carte>
        </div>
      </div>
    </>
  );
}
