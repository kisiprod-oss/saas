import "server-only";
import { db, ecrire, tous, un } from "./db";

/**
 * L'assistance : des tickets, deposes par les agences, traites par l'equipe.
 *
 * DEUX SEPARATIONS, ET ELLES SONT DANS LES REQUETES, PAS DANS LES ECRANS.
 *
 * 1. Une agence ne voit que ses tickets. Chaque lecture cote agence prend
 *    `agence_id` en parametre et le met dans le WHERE. Il n'existe aucune
 *    fonction « lire un ticket par son numero » sans agence : c'est ce qui
 *    empeche d'en ouvrir un autre en changeant un chiffre dans l'adresse.
 *
 * 2. Les notes internes ne sortent jamais. `messagesVisibles` impose
 *    `interne = 0`. L'espace agence n'appelle que celle-la ; l'espace
 *    d'administration appelle `messagesTous`. Une note mal rangee ne peut
 *    donc pas fuir par inadvertance : il faudrait appeler l'autre fonction.
 */

export const CATEGORIES = [
  { valeur: "technique", libelle: "Problème technique" },
  { valeur: "facturation", libelle: "Abonnement et facturation" },
  { valeur: "compte", libelle: "Mon compte et mes accès" },
  { valeur: "autre", libelle: "Autre" },
] as const;

export const PRIORITES = [
  { valeur: "basse", libelle: "Basse" },
  { valeur: "normale", libelle: "Normale" },
  { valeur: "haute", libelle: "Haute" },
  { valeur: "urgente", libelle: "Urgente" },
] as const;

export const STATUTS = [
  { valeur: "nouveau", libelle: "Nouveau" },
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "resolu", libelle: "Résolu" },
] as const;

export const estCategorie = (v: string) => CATEGORIES.some((c) => c.valeur === v);
export const estPriorite = (v: string) => PRIORITES.some((p) => p.valeur === v);
export const estStatut = (v: string) => STATUTS.some((s) => s.valeur === v);

export const libelleCategorie = (v: string) => CATEGORIES.find((c) => c.valeur === v)?.libelle ?? v;
export const libellePriorite = (v: string) => PRIORITES.find((p) => p.valeur === v)?.libelle ?? v;
export const libelleStatut = (v: string) => STATUTS.find((s) => s.valeur === v)?.libelle ?? v;

export type Ticket = {
  id: number; numero: string; agence_id: number; utilisateur_id: number | null;
  sujet: string; categorie: string; priorite: string; statut: string;
  responsable: string | null; cree_le: string; maj_le: string; resolu_le: string | null;
};

export type TicketListe = Ticket & {
  agence_nom: string; auteur_nom: string | null;
  nb_messages: number; dernier_le: string | null;
};

export type Message = {
  id: number; ticket_id: number; auteur_type: string; auteur: string;
  corps: string; interne: number; cree_le: string;
};

/** Numero lisible, remis a zero chaque annee : TIC-2026-0001. */
function numeroSuivant(): string {
  const annee = new Date().getFullYear();
  const dernier = un<{ numero: string }>(
    "SELECT numero FROM tickets WHERE numero LIKE ? ORDER BY id DESC LIMIT 1",
    `TIC-${annee}-%`,
  );
  const suite = dernier ? Number(dernier.numero.split("-")[2]) + 1 : 1;
  return `TIC-${annee}-${String(suite).padStart(4, "0")}`;
}

/** Ouvre un ticket et y pose le premier message, en une seule transaction. */
export function ouvrirTicket(p: {
  agenceId: number; utilisateurId: number; auteur: string;
  sujet: string; categorie: string; corps: string;
}): { id: number; numero: string } {
  const creation = db.transaction(() => {
    const numero = numeroSuivant();
    const r = ecrire(
      `INSERT INTO tickets (numero, agence_id, utilisateur_id, sujet, categorie)
       VALUES (?, ?, ?, ?, ?)`,
      numero, p.agenceId, p.utilisateurId, p.sujet, p.categorie,
    );
    const id = Number(r.lastInsertRowid);
    ecrire(
      `INSERT INTO ticket_messages (ticket_id, auteur_type, auteur, corps, interne)
       VALUES (?, 'agence', ?, ?, 0)`,
      id, p.auteur, p.corps,
    );
    return { id, numero };
  });
  return creation();
}

// ---------------------------------------------------------- cote agence

/** Les tickets d'UNE agence. Le filtre est ici, pas dans l'ecran. */
export function ticketsDeLAgence(agenceId: number): TicketListe[] {
  return tous<TicketListe>(
    `SELECT t.*, a.nom AS agence_nom, u.nom AS auteur_nom,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.interne = 0) AS nb_messages,
            (SELECT MAX(cree_le) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.interne = 0) AS dernier_le
       FROM tickets t
       JOIN agences a ON a.id = t.agence_id
       LEFT JOIN utilisateurs u ON u.id = t.utilisateur_id
      WHERE t.agence_id = ?
      ORDER BY t.maj_le DESC`,
    agenceId,
  );
}

/**
 * Un ticket, A CONDITION qu'il appartienne a cette agence.
 * Il n'existe pas de version sans `agenceId` : c'est voulu.
 */
export function ticketDeLAgence(id: number, agenceId: number): Ticket | undefined {
  return un<Ticket>("SELECT * FROM tickets WHERE id = ? AND agence_id = ?", id, agenceId);
}

/** Les messages qu'une agence a le droit de lire. Jamais les notes internes. */
export function messagesVisibles(ticketId: number): Message[] {
  return tous<Message>(
    "SELECT * FROM ticket_messages WHERE ticket_id = ? AND interne = 0 ORDER BY cree_le, id",
    ticketId,
  );
}

// ------------------------------------------------------------ cote equipe

export function listerTickets(f: {
  q?: string; statut?: string; priorite?: string; categorie?: string;
  responsable?: string; page?: number; parPage?: number;
}): { lignes: TicketListe[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (f.q) {
    conditions.push("(t.sujet LIKE ? OR t.numero LIKE ? OR a.nom LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m);
  }
  if (f.statut) { conditions.push("t.statut = ?"); params.push(f.statut); }
  if (f.priorite) { conditions.push("t.priorite = ?"); params.push(f.priorite); }
  if (f.categorie) { conditions.push("t.categorie = ?"); params.push(f.categorie); }
  if (f.responsable) { conditions.push("t.responsable = ?"); params.push(f.responsable); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tickets t JOIN agences a ON a.id = t.agence_id ${ou}`, ...params,
  )?.n ?? 0;
  const parPage = f.parPage ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / parPage));

  const lignes = tous<TicketListe>(
    `SELECT t.*, a.nom AS agence_nom, u.nom AS auteur_nom,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS nb_messages,
            (SELECT MAX(cree_le) FROM ticket_messages m WHERE m.ticket_id = t.id) AS dernier_le
       FROM tickets t
       JOIN agences a ON a.id = t.agence_id
       LEFT JOIN utilisateurs u ON u.id = t.utilisateur_id
       ${ou}
      ORDER BY
        CASE t.statut WHEN 'nouveau' THEN 0 WHEN 'en_cours' THEN 1 WHEN 'en_attente' THEN 2 ELSE 3 END,
        CASE t.priorite WHEN 'urgente' THEN 0 WHEN 'haute' THEN 1 WHEN 'normale' THEN 2 ELSE 3 END,
        t.maj_le DESC
      LIMIT ? OFFSET ?`,
    ...params, parPage, (page - 1) * parPage,
  );
  return { lignes, total, page, pages };
}

/** Un ticket vu par l'equipe : toutes agences confondues. */
export function ticketPourEquipe(id: number): TicketListe | undefined {
  return un<TicketListe>(
    `SELECT t.*, a.nom AS agence_nom, u.nom AS auteur_nom,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS nb_messages,
            (SELECT MAX(cree_le) FROM ticket_messages m WHERE m.ticket_id = t.id) AS dernier_le
       FROM tickets t
       JOIN agences a ON a.id = t.agence_id
       LEFT JOIN utilisateurs u ON u.id = t.utilisateur_id
      WHERE t.id = ?`, id,
  );
}

/** Tous les messages, notes internes comprises. Reserve a l'espace equipe. */
export function messagesTous(ticketId: number): Message[] {
  return tous<Message>(
    "SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY cree_le, id", ticketId,
  );
}

export function ajouterMessage(p: {
  ticketId: number; auteurType: "agence" | "equipe"; auteur: string;
  corps: string; interne: boolean;
}): void {
  const ecriture = db.transaction(() => {
    ecrire(
      `INSERT INTO ticket_messages (ticket_id, auteur_type, auteur, corps, interne)
       VALUES (?, ?, ?, ?, ?)`,
      p.ticketId, p.auteurType, p.auteur, p.corps, p.interne ? 1 : 0,
    );
    // Une note interne ne reveille pas le ticket : elle ne change rien pour
    // l'agence, et remonter le ticket en tete pour une note brouillerait
    // l'ordre de traitement.
    if (!p.interne) ecrire("UPDATE tickets SET maj_le = datetime('now') WHERE id = ?", p.ticketId);
    // Une agence qui repond a un ticket qu'on croyait resolu le rouvre : le
    // probleme n'etait visiblement pas termine. La date de resolution part
    // avec le statut — la laisser afficherait « Résolu le ... » sur un ticket
    // ouvert, et l'ecran mentirait.
    if (p.auteurType === "agence") {
      ecrire(
        "UPDATE tickets SET statut = 'en_attente', resolu_le = NULL WHERE id = ? AND statut = 'resolu'",
        p.ticketId,
      );
    }
  });
  ecriture();
}

/** Les tickets ouverts d'UNE agence, pour le badge de son propre menu. */
export function compterTicketsOuvertsAgence(agenceId: number): number {
  return un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM tickets WHERE agence_id = ? AND statut != 'resolu'",
    agenceId,
  )?.n ?? 0;
}

export function compterTicketsOuverts(): number {
  return un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM tickets WHERE statut != 'resolu'")?.n ?? 0;
}
