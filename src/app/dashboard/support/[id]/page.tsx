import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { actionRepondreTicketAgence } from "@/lib/actions";
import {
  libelleCategorie, libellePriorite, libelleStatut, messagesVisibles, ticketDeLAgence,
} from "@/lib/support";
import { dateHeureFr } from "@/lib/format";
import { Badge, Carte, EnTetePage, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

type Params = { [c: string]: string | string[] | undefined };

export default async function PageTicketAgence({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const recherche = await searchParams;

  // ticketDeLAgence exige l'agence_id : impossible de lire le ticket d'une
  // autre agence en changeant le chiffre dans l'adresse.
  const ticket = ticketDeLAgence(Number(id), agence.id);
  if (!ticket) notFound();

  const messages = messagesVisibles(ticket.id);

  return (
    <>
      <EnTetePage
        titre={ticket.sujet}
        sousTitre={`${ticket.numero} · ${libelleCategorie(ticket.categorie)} · priorité ${libellePriorite(ticket.priorite).toLowerCase()}`}
      >
        <Badge couleur="bg-slate-100 text-slate-700 ring-slate-500/20">{libelleStatut(ticket.statut)}</Badge>
      </EnTetePage>

      <MessagesUrl params={recherche} />

      <Carte className="p-0">
        <ul className="divide-y divide-slate-100">
          {messages.map((m) => (
            <li key={m.id} className={`p-4 ${m.auteur_type === "equipe" ? "bg-brand-50/40" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-slate-900">
                  {m.auteur_type === "equipe" ? "Équipe Sen Gestion" : "Vous"}
                </span>
                <span className="text-xs text-slate-500">{dateHeureFr(m.cree_le)}</span>
              </div>
              {/* break-words : un message colle d'un seul tenant — une adresse
                  longue, une reference sans espace — elargirait sinon la page. */}
              <p className="mt-1.5 whitespace-pre-line break-words text-sm text-slate-700">{m.corps}</p>
            </li>
          ))}
        </ul>
      </Carte>

      {ticket.statut !== "resolu" ? (
        <Carte className="mt-4 p-5">
          <form action={actionRepondreTicketAgence}>
            <input type="hidden" name="id" value={ticket.id} />
            <label className="etiquette" htmlFor="corps">Votre réponse</label>
            <textarea id="corps" name="corps" rows={4} required className="champ" />
            <button type="submit" className="btn-primaire mt-3">Envoyer</button>
          </form>
        </Carte>
      ) : (
        <Carte className="mt-4 p-5">
          <p className="text-sm text-slate-500">
            Ce ticket est marqué résolu. Répondez ici si le problème n&apos;est pas réglé : il sera rouvert.
          </p>
          <form action={actionRepondreTicketAgence} className="mt-3">
            <input type="hidden" name="id" value={ticket.id} />
            <textarea name="corps" rows={4} required className="champ" placeholder="Ce n'est toujours pas résolu parce que…" />
            <button type="submit" className="btn-secondaire mt-3">Rouvrir avec un message</button>
          </form>
        </Carte>
      )}
    </>
  );
}
