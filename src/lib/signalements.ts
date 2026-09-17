import "server-only";
import { ecrire, tous, un } from "./db";

/**
 * Les signalements : ce qu'un visiteur trouve anormal sur la vitrine.
 *
 * TROIS PARTIS PRIS.
 *
 * 1. LE DEPOT EST PUBLIC, SANS COMPTE. Une annonce trompeuse est vue par
 *    des gens qui ne sont clients de personne ; leur demander de s'inscrire
 *    reviendrait a ne jamais rien apprendre. Le garde-fou est donc ailleurs :
 *    une limite par machine, posee dans l'action (voir actions.ts).
 *
 * 2. UN SIGNALEMENT NE RETIRE RIEN TOUT SEUL. Il ouvre un dossier, et c'est
 *    un moderateur qui decide. Autrement, dix messages coordonnes suffiraient
 *    a faire tomber l'annonce d'un concurrent.
 *
 * 3. LE SIGNALEMENT ET LA MODERATION RESTENT DEUX CHOSES. Classer un
 *    signalement ne touche pas a l'annonce ; retirer une annonce se fait
 *    depuis la moderation, qui exige son propre motif. L'ecran relie les
 *    deux, le code ne les confond pas.
 */

export const MOTIFS = [
  { valeur: "trompeur", libelle: "Annonce trompeuse", aide: "Photos ou description qui ne correspondent pas au logement." },
  { valeur: "indisponible", libelle: "Bien déjà loué", aide: "Le logement n'est plus disponible mais reste en ligne." },
  { valeur: "arnaque", libelle: "Tentative d'arnaque", aide: "On vous demande de l'argent avant toute visite." },
  { valeur: "coordonnees", libelle: "Coordonnées erronées", aide: "Le numéro ne répond pas, ou n'est pas celui de l'agence." },
  { valeur: "choquant", libelle: "Contenu choquant", aide: "Propos ou images déplacés." },
  { valeur: "autre", libelle: "Autre raison", aide: "Expliquez-nous en quelques mots." },
] as const;

export const STATUTS = [
  { valeur: "nouveau", libelle: "À examiner" },
  { valeur: "retenu", libelle: "Retenu" },
  { valeur: "classe", libelle: "Classé sans suite" },
] as const;

export const estMotif = (v: string) => MOTIFS.some((m) => m.valeur === v);
export const estStatut = (v: string) => STATUTS.some((s) => s.valeur === v);
export const libelleMotif = (v: string) => MOTIFS.find((m) => m.valeur === v)?.libelle ?? v;
export const libelleStatut = (v: string) => STATUTS.find((s) => s.valeur === v)?.libelle ?? v;

/** Les contenus qu'on sait signaler. Ailleurs, le depot est refuse. */
export const CIBLES = ["bien", "artisan"] as const;
export type CibleType = (typeof CIBLES)[number];
export const estCible = (v: string): v is CibleType =>
  (CIBLES as readonly string[]).includes(v);

export type Signalement = {
  id: number; cible_type: string; cible_id: number; motif: string;
  description: string | null; contact: string | null; statut: string;
  motif_decision: string | null; traite_par: string | null; traite_le: string | null;
  cree_le: string;
};

/** Un signalement, avec de quoi nommer la cible a l'ecran. */
export type LigneSignalement = Signalement & {
  cible_titre: string | null;
  cible_reference: string | null;
  agence_nom: string | null;
  agence_id: number | null;
  /** Etat de moderation de l'annonce visee, pour savoir si elle est encore en ligne. */
  cible_moderation: string | null;
  cible_publie: number | null;
  /** Nombre de signalements deja recus sur la meme cible : un seul ou dix, ce n'est pas pareil. */
  nb_sur_la_cible: number;
};

export function enregistrerSignalement(p: {
  cibleType: CibleType; cibleId: number; motif: string;
  description: string | null; contact: string | null;
}): number {
  const r = ecrire(
    `INSERT INTO signalements (cible_type, cible_id, motif, description, contact)
     VALUES (?, ?, ?, ?, ?)`,
    p.cibleType, p.cibleId, p.motif, p.description, p.contact,
  );
  return Number(r.lastInsertRowid);
}

/**
 * La requete de lecture, commune a la liste et a la fiche.
 *
 * Les jointures sont conditionnelles au type de cible : SQLite n'ayant pas
 * d'heritage, on rattache a gauche les deux tables possibles et on choisit
 * la colonne avec un CASE. Une cible supprimee laisse simplement des NULL —
 * le signalement reste lisible, ce qui est le but d'un journal.
 */
const LECTURE = `
  SELECT s.*,
         CASE s.cible_type WHEN 'bien' THEN b.titre     WHEN 'artisan' THEN a.nom     END AS cible_titre,
         CASE s.cible_type WHEN 'bien' THEN b.reference WHEN 'artisan' THEN a.metier  END AS cible_reference,
         CASE s.cible_type WHEN 'bien' THEN ag.nom      WHEN 'artisan' THEN aga.nom   END AS agence_nom,
         CASE s.cible_type WHEN 'bien' THEN b.agence_id WHEN 'artisan' THEN a.agence_id END AS agence_id,
         CASE s.cible_type WHEN 'bien' THEN b.moderation END AS cible_moderation,
         CASE s.cible_type WHEN 'bien' THEN b.publie     END AS cible_publie,
         (SELECT COUNT(*) FROM signalements s2
           WHERE s2.cible_type = s.cible_type AND s2.cible_id = s.cible_id) AS nb_sur_la_cible
    FROM signalements s
    LEFT JOIN biens    b  ON s.cible_type = 'bien'    AND b.id = s.cible_id
    LEFT JOIN agences  ag ON ag.id = b.agence_id
    LEFT JOIN artisans a  ON s.cible_type = 'artisan' AND a.id = s.cible_id
    LEFT JOIN agences  aga ON aga.id = a.agence_id
`;

export function listerSignalements(f: {
  q?: string; statut?: string; motif?: string; cible?: string;
  page?: number; parPage?: number;
}): { lignes: LigneSignalement[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    conditions.push("(s.description LIKE ? OR b.titre LIKE ? OR b.reference LIKE ? OR a.nom LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m, m);
  }
  if (f.statut) { conditions.push("s.statut = ?"); params.push(f.statut); }
  if (f.motif) { conditions.push("s.motif = ?"); params.push(f.motif); }
  if (f.cible) { conditions.push("s.cible_type = ?"); params.push(f.cible); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(
    `SELECT COUNT(*) AS n FROM signalements s
       LEFT JOIN biens b ON s.cible_type = 'bien' AND b.id = s.cible_id
       LEFT JOIN artisans a ON s.cible_type = 'artisan' AND a.id = s.cible_id
     ${ou}`, ...params,
  )?.n ?? 0;

  const parPage = f.parPage ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / parPage));

  const lignes = tous<LigneSignalement>(
    `${LECTURE} ${ou}
      ORDER BY CASE s.statut WHEN 'nouveau' THEN 0 WHEN 'retenu' THEN 1 ELSE 2 END,
               s.cree_le DESC
      LIMIT ? OFFSET ?`,
    ...params, parPage, (page - 1) * parPage,
  );
  return { lignes, total, page, pages };
}

export function signalement(id: number): LigneSignalement | undefined {
  return un<LigneSignalement>(`${LECTURE} WHERE s.id = ?`, id);
}

/** Les autres signalements visant la meme chose : le contexte d'une decision. */
export function signalementsDeLaCible(cibleType: string, cibleId: number, sauf: number): Signalement[] {
  return tous<Signalement>(
    `SELECT * FROM signalements
      WHERE cible_type = ? AND cible_id = ? AND id != ?
      ORDER BY cree_le DESC LIMIT 20`,
    cibleType, cibleId, sauf,
  );
}

export function compterSignalementsNouveaux(): number {
  return un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM signalements WHERE statut = 'nouveau'")?.n ?? 0;
}
