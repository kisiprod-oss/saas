import "server-only";
import { db, tous, un } from "./db";
import { aujourdhui, decalerMois, moisCourant } from "./format";
import { DELAI_ENTRE_RELANCES, niveauPour, type Niveau } from "./relances";
import type {
  Bien, ContratDetaille, Demande, FactureDetaillee, Locataire, Paiement,
} from "./types";

/** Bloc SQL commun : calcule le montant paye, le reste du et l'etat d'une facture. */
const SELECT_FACTURE = `
  SELECT f.*,
         COALESCE(p.paye, 0)                        AS montant_paye,
         f.montant_total - COALESCE(p.paye, 0)      AS reste,
         CASE
           WHEN f.statut = 'annulee'                 THEN 'annulee'
           WHEN COALESCE(p.paye, 0) >= f.montant_total THEN 'payee'
           WHEN COALESCE(p.paye, 0) > 0             THEN 'partielle'
           ELSE 'impayee'
         END                                        AS etat,
         CASE
           WHEN f.statut != 'annulee'
            AND COALESCE(p.paye, 0) < f.montant_total
            AND date(f.date_echeance) < date('now')  THEN 1 ELSE 0
         END                                        AS en_retard,
         l.prenom    AS locataire_prenom,
         l.nom       AS locataire_nom,
         l.telephone AS locataire_telephone,
         b.titre     AS bien_titre,
         b.reference AS bien_reference,
         c.reference AS contrat_reference
    FROM factures f
    JOIN contrats   c ON c.id = f.contrat_id
    JOIN locataires l ON l.id = c.locataire_id
    JOIN biens      b ON b.id = c.bien_id
    LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) p
           ON p.facture_id = f.id
`;

// ------------------------------------------------------------------ Biens

export function listerBiens(agenceId: number, filtres: { recherche?: string; statut?: string } = {}) {
  const conditions = ["b.agence_id = ?"];
  const params: unknown[] = [agenceId];

  if (filtres.statut) {
    conditions.push("b.statut = ?");
    params.push(filtres.statut);
  }
  if (filtres.recherche) {
    conditions.push("(b.titre LIKE ? OR b.reference LIKE ? OR b.quartier LIKE ? OR b.ville LIKE ?)");
    const q = `%${filtres.recherche}%`;
    params.push(q, q, q, q);
  }

  return tous<Bien & { locataire: string | null }>(
    `SELECT b.*,
            (SELECT l.prenom || ' ' || l.nom
               FROM contrats c JOIN locataires l ON l.id = c.locataire_id
              WHERE c.bien_id = b.id AND c.statut = 'actif'
              LIMIT 1) AS locataire
       FROM biens b
      WHERE ${conditions.join(" AND ")}
      ORDER BY b.cree_le DESC`,
    ...params,
  );
}

export function lireBien(agenceId: number, id: number) {
  return un<Bien>("SELECT * FROM biens WHERE id = ? AND agence_id = ?", id, agenceId);
}

/** Biens publies et disponibles, tous agences confondues : la vitrine publique. */
export function listerVitrine(filtres: {
  ville?: string; type?: string; chambres?: string; budgetMax?: string; recherche?: string;
} = {}) {
  const conditions = ["b.publie = 1", "b.statut IN ('disponible', 'reserve')"];
  const params: unknown[] = [];

  if (filtres.ville) { conditions.push("b.ville = ?"); params.push(filtres.ville); }
  if (filtres.type) { conditions.push("b.type = ?"); params.push(filtres.type); }
  if (filtres.chambres) { conditions.push("b.chambres >= ?"); params.push(Number(filtres.chambres)); }
  if (filtres.budgetMax) { conditions.push("b.loyer <= ?"); params.push(Number(filtres.budgetMax)); }
  if (filtres.recherche) {
    conditions.push("(b.titre LIKE ? OR b.quartier LIKE ? OR b.ville LIKE ? OR b.description LIKE ?)");
    const q = `%${filtres.recherche}%`;
    params.push(q, q, q, q);
  }

  return tous<Bien & { agence_nom: string; agence_telephone: string | null }>(
    `SELECT b.*, a.nom AS agence_nom, a.telephone AS agence_telephone
       FROM biens b JOIN agences a ON a.id = b.agence_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY b.statut = 'disponible' DESC, b.cree_le DESC`,
    ...params,
  );
}

export function lireBienPublic(id: number) {
  return un<Bien & { agence_nom: string; agence_telephone: string | null; agence_email: string | null }>(
    `SELECT b.*, a.nom AS agence_nom, a.telephone AS agence_telephone, a.email AS agence_email
       FROM biens b JOIN agences a ON a.id = b.agence_id
      WHERE b.id = ? AND b.publie = 1`,
    id,
  );
}

// ------------------------------------------------------------- Locataires

export function listerLocataires(agenceId: number, recherche?: string) {
  const conditions = ["l.agence_id = ?"];
  const params: unknown[] = [agenceId];
  if (recherche) {
    conditions.push("(l.prenom LIKE ? OR l.nom LIKE ? OR l.telephone LIKE ? OR l.cni LIKE ?)");
    const q = `%${recherche}%`;
    params.push(q, q, q, q);
  }

  return tous<Locataire & { bien_titre: string | null; contrat_id: number | null }>(
    `SELECT l.*,
            (SELECT b.titre FROM contrats c JOIN biens b ON b.id = c.bien_id
              WHERE c.locataire_id = l.id AND c.statut = 'actif' LIMIT 1) AS bien_titre,
            (SELECT c.id FROM contrats c
              WHERE c.locataire_id = l.id AND c.statut = 'actif' LIMIT 1) AS contrat_id
       FROM locataires l
      WHERE ${conditions.join(" AND ")}
      ORDER BY l.nom, l.prenom`,
    ...params,
  );
}

export function lireLocataire(agenceId: number, id: number) {
  return un<Locataire>("SELECT * FROM locataires WHERE id = ? AND agence_id = ?", id, agenceId);
}

// ---------------------------------------------------------------- Contrats

export function listerContrats(agenceId: number, statut?: string) {
  const conditions = ["c.agence_id = ?"];
  const params: unknown[] = [agenceId];
  if (statut) { conditions.push("c.statut = ?"); params.push(statut); }

  return tous<ContratDetaille & { impayes: number }>(
    `SELECT c.*,
            b.titre AS bien_titre, b.reference AS bien_reference,
            b.quartier AS bien_quartier, b.ville AS bien_ville,
            l.prenom AS locataire_prenom, l.nom AS locataire_nom,
            l.telephone AS locataire_telephone,
            COALESCE((
              SELECT SUM(f.montant_total) - COALESCE(SUM(pp.paye), 0)
                FROM factures f
                LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) pp
                       ON pp.facture_id = f.id
               WHERE f.contrat_id = c.id AND f.statut != 'annulee'
            ), 0) AS impayes
       FROM contrats c
       JOIN biens b      ON b.id = c.bien_id
       JOIN locataires l ON l.id = c.locataire_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.statut = 'actif' DESC, c.date_debut DESC`,
    ...params,
  );
}

export function lireContrat(agenceId: number, id: number) {
  return un<ContratDetaille>(
    `SELECT c.*,
            b.titre AS bien_titre, b.reference AS bien_reference,
            b.quartier AS bien_quartier, b.ville AS bien_ville,
            l.prenom AS locataire_prenom, l.nom AS locataire_nom,
            l.telephone AS locataire_telephone
       FROM contrats c
       JOIN biens b      ON b.id = c.bien_id
       JOIN locataires l ON l.id = c.locataire_id
      WHERE c.id = ? AND c.agence_id = ?`,
    id, agenceId,
  );
}

// ---------------------------------------------------------------- Factures

export function listerFactures(
  agenceId: number,
  filtres: { periode?: string; etat?: string; contratId?: number; recherche?: string } = {},
) {
  const conditions = ["f.agence_id = ?"];
  const params: unknown[] = [agenceId];

  if (filtres.periode) { conditions.push("f.periode = ?"); params.push(filtres.periode); }
  if (filtres.contratId) { conditions.push("f.contrat_id = ?"); params.push(filtres.contratId); }
  if (filtres.recherche) {
    conditions.push("(f.numero LIKE ? OR l.nom LIKE ? OR l.prenom LIKE ? OR b.titre LIKE ?)");
    const q = `%${filtres.recherche}%`;
    params.push(q, q, q, q);
  }

  let sql = `${SELECT_FACTURE} WHERE ${conditions.join(" AND ")}`;
  if (filtres.etat === "impayee") sql += " AND etat IN ('impayee', 'partielle')";
  else if (filtres.etat === "retard") sql += " AND en_retard = 1";
  else if (filtres.etat) { sql += " AND etat = ?"; params.push(filtres.etat); }
  sql += " ORDER BY f.periode DESC, f.numero DESC";

  return tous<FactureDetaillee>(sql, ...params);
}

export function lireFacture(agenceId: number, id: number) {
  return un<FactureDetaillee>(`${SELECT_FACTURE} WHERE f.id = ? AND f.agence_id = ?`, id, agenceId);
}

export function listerPaiementsFacture(factureId: number) {
  return tous<Paiement>(
    "SELECT * FROM paiements WHERE facture_id = ? ORDER BY date_paiement DESC, id DESC",
    factureId,
  );
}

export function listerPaiements(agenceId: number, limite = 200) {
  return tous<Paiement & {
    facture_numero: string; periode: string;
    locataire_prenom: string; locataire_nom: string; bien_titre: string;
  }>(
    `SELECT p.*, f.numero AS facture_numero, f.periode,
            l.prenom AS locataire_prenom, l.nom AS locataire_nom, b.titre AS bien_titre
       FROM paiements p
       JOIN factures   f ON f.id = p.facture_id
       JOIN contrats   c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens      b ON b.id = c.bien_id
      WHERE p.agence_id = ?
      ORDER BY p.date_paiement DESC, p.id DESC
      LIMIT ?`,
    agenceId, limite,
  );
}

// ---------------------------------------------------------------- Demandes

export function listerDemandes(agenceId: number, statut?: string) {
  const conditions = ["d.agence_id = ?"];
  const params: unknown[] = [agenceId];
  if (statut) { conditions.push("d.statut = ?"); params.push(statut); }

  return tous<Demande & { bien_titre: string | null; bien_reference: string | null }>(
    `SELECT d.*, b.titre AS bien_titre, b.reference AS bien_reference
       FROM demandes d
       LEFT JOIN biens b ON b.id = d.bien_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY d.cree_le DESC`,
    ...params,
  );
}

export function compterDemandesNouvelles(agenceId: number): number {
  const r = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM demandes WHERE agence_id = ? AND statut = 'nouvelle'",
    agenceId,
  );
  return r?.n ?? 0;
}

// --------------------------------------------------------------- Statistiques

export type Statistiques = {
  biensTotal: number;
  biensLoues: number;
  biensDisponibles: number;
  tauxOccupation: number;
  locatairesActifs: number;
  contratsActifs: number;
  loyersAttendusMois: number;
  encaisseMois: number;
  impayesTotal: number;
  facturesEnRetard: number;
  commissionMois: number;
  historique: { periode: string; attendu: number; encaisse: number }[];
  prochainesEcheances: {
    contrat_id: number; locataire: string; bien: string; montant: number; date_echeance: string;
  }[];
  topImpayes: {
    facture_id: number; numero: string; locataire: string; bien: string;
    reste: number; periode: string; jours_retard: number;
  }[];
};

export function statistiques(agenceId: number): Statistiques {
  const periode = moisCourant();

  const biens = un<{ total: number; loues: number; dispos: number }>(
    `SELECT COUNT(*) AS total,
            SUM(statut = 'loue')       AS loues,
            SUM(statut = 'disponible') AS dispos
       FROM biens WHERE agence_id = ?`,
    agenceId,
  );

  const contrats = un<{ n: number; loyers: number; commission: number }>(
    `SELECT COUNT(*) AS n,
            COALESCE(SUM(loyer + charges), 0) AS loyers,
            COALESCE(SUM(loyer * commission_pct / 100.0), 0) AS commission
       FROM contrats WHERE agence_id = ? AND statut = 'actif'`,
    agenceId,
  );

  const attendu = un<{ total: number }>(
    `SELECT COALESCE(SUM(montant_total), 0) AS total
       FROM factures WHERE agence_id = ? AND periode = ? AND statut != 'annulee'`,
    agenceId, periode,
  );

  const encaisse = un<{ total: number }>(
    `SELECT COALESCE(SUM(montant), 0) AS total
       FROM paiements WHERE agence_id = ? AND strftime('%Y-%m', date_paiement) = ?`,
    agenceId, periode,
  );

  const impayes = un<{ total: number; nb: number }>(
    `SELECT COALESCE(SUM(f.montant_total - COALESCE(p.paye, 0)), 0) AS total,
            COUNT(*) AS nb
       FROM factures f
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) p
              ON p.facture_id = f.id
      WHERE f.agence_id = ? AND f.statut != 'annulee'
        AND f.montant_total > COALESCE(p.paye, 0)
        AND date(f.date_echeance) < date('now')`,
    agenceId,
  );

  const locataires = un<{ n: number }>(
    `SELECT COUNT(DISTINCT locataire_id) AS n
       FROM contrats WHERE agence_id = ? AND statut = 'actif'`,
    agenceId,
  );

  // Six derniers mois : attendu (factures) vs encaisse (paiements)
  const historique: Statistiques["historique"] = [];
  for (let i = 5; i >= 0; i--) {
    const p = decalerMois(periode, -i);
    const a = un<{ t: number }>(
      `SELECT COALESCE(SUM(montant_total), 0) AS t FROM factures
        WHERE agence_id = ? AND periode = ? AND statut != 'annulee'`,
      agenceId, p,
    );
    const e = un<{ t: number }>(
      `SELECT COALESCE(SUM(montant), 0) AS t FROM paiements
        WHERE agence_id = ? AND strftime('%Y-%m', date_paiement) = ?`,
      agenceId, p,
    );
    historique.push({ periode: p, attendu: a?.t ?? 0, encaisse: e?.t ?? 0 });
  }

  const prochainesEcheances = tous<Statistiques["prochainesEcheances"][number]>(
    `SELECT c.id AS contrat_id,
            l.prenom || ' ' || l.nom AS locataire,
            b.titre AS bien,
            c.loyer + c.charges AS montant,
            printf('%s-%02d', ?, c.jour_echeance) AS date_echeance
       FROM contrats c
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens b      ON b.id = c.bien_id
      WHERE c.agence_id = ? AND c.statut = 'actif'
      ORDER BY c.jour_echeance
      LIMIT 6`,
    periode, agenceId,
  );

  const topImpayes = tous<Statistiques["topImpayes"][number]>(
    `SELECT f.id AS facture_id, f.numero, f.periode,
            l.prenom || ' ' || l.nom AS locataire,
            b.titre AS bien,
            f.montant_total - COALESCE(p.paye, 0) AS reste,
            CAST(julianday('now') - julianday(f.date_echeance) AS INTEGER) AS jours_retard
       FROM factures f
       JOIN contrats   c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens      b ON b.id = c.bien_id
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) p
              ON p.facture_id = f.id
      WHERE f.agence_id = ? AND f.statut != 'annulee'
        AND f.montant_total > COALESCE(p.paye, 0)
        AND date(f.date_echeance) < date('now')
      ORDER BY jours_retard DESC
      LIMIT 6`,
    agenceId,
  );

  const total = biens?.total ?? 0;
  const loues = biens?.loues ?? 0;

  return {
    biensTotal: total,
    biensLoues: loues,
    biensDisponibles: biens?.dispos ?? 0,
    tauxOccupation: total > 0 ? Math.round((loues / total) * 100) : 0,
    locatairesActifs: locataires?.n ?? 0,
    contratsActifs: contrats?.n ?? 0,
    loyersAttendusMois: attendu?.total ?? 0,
    encaisseMois: encaisse?.total ?? 0,
    impayesTotal: impayes?.total ?? 0,
    facturesEnRetard: impayes?.nb ?? 0,
    commissionMois: Math.round(contrats?.commission ?? 0),
    historique,
    prochainesEcheances,
    topImpayes,
  };
}

// --------------------------------------------------------------- Relances

export type LigneRelance = {
  facture_id: number;
  numero: string;
  periode: string;
  date_echeance: string;
  reste: number;
  jours_retard: number;
  contrat_reference: string;
  locataire_id: number;
  locataire_prenom: string;
  locataire_nom: string;
  locataire_telephone: string;
  bien_titre: string;
  derniere_relance_niveau: string | null;
  derniere_relance_canal: string | null;
  derniere_relance_le: string | null;
  jours_depuis_relance: number | null;
  nb_relances: number;
  /** Niveau de relance conseille, calcule d'apres le retard. */
  niveau: Niveau;
  /** Vrai si le locataire doit etre relance aujourd'hui. */
  a_relancer: boolean;
};

/**
 * Toutes les factures echues et non soldees, avec l'historique des relances
 * et le niveau conseille. Les plus anciennes d'abord.
 */
export function listerRelances(agenceId: number): LigneRelance[] {
  const lignes = tous<Omit<LigneRelance, "niveau" | "a_relancer">>(
    `SELECT f.id AS facture_id, f.numero, f.periode, f.date_echeance,
            f.montant_total - COALESCE(p.paye, 0) AS reste,
            CAST(julianday('now') - julianday(f.date_echeance) AS INTEGER) AS jours_retard,
            c.reference AS contrat_reference,
            l.id        AS locataire_id,
            l.prenom    AS locataire_prenom,
            l.nom       AS locataire_nom,
            l.telephone AS locataire_telephone,
            b.titre     AS bien_titre,
            r.niveau    AS derniere_relance_niveau,
            r.canal     AS derniere_relance_canal,
            r.envoye_le AS derniere_relance_le,
            CASE WHEN r.envoye_le IS NULL THEN NULL
                 ELSE CAST(julianday('now') - julianday(r.envoye_le) AS INTEGER) END
                        AS jours_depuis_relance,
            COALESCE(nb.total, 0) AS nb_relances
       FROM factures f
       JOIN contrats   c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens      b ON b.id = c.bien_id
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) p
              ON p.facture_id = f.id
       LEFT JOIN (SELECT facture_id, COUNT(*) AS total FROM relances GROUP BY facture_id) nb
              ON nb.facture_id = f.id
       LEFT JOIN relances r
              ON r.id = (SELECT id FROM relances WHERE facture_id = f.id
                          ORDER BY envoye_le DESC, id DESC LIMIT 1)
      WHERE f.agence_id = ? AND f.statut != 'annulee'
        AND f.montant_total > COALESCE(p.paye, 0)
        AND date(f.date_echeance) < date('now')
      ORDER BY jours_retard DESC`,
    agenceId,
  );

  return lignes.map((ligne) => {
    const niveau = niveauPour(ligne.jours_retard);

    // On relance si le locataire n'a jamais ete contacte a ce niveau,
    // ou si la derniere relance date de plus d'une semaine.
    const a_relancer =
      ligne.derniere_relance_niveau !== niveau ||
      (ligne.jours_depuis_relance ?? 999) >= DELAI_ENTRE_RELANCES;

    return { ...ligne, niveau, a_relancer };
  });
}

/** Nombre de locataires a relancer aujourd'hui (pastille du menu). */
export function compterARelancer(agenceId: number): number {
  return listerRelances(agenceId).filter((l) => l.a_relancer).length;
}

/** Historique complet des relances envoyees. */
export function historiqueRelances(agenceId: number, limite = 100) {
  return tous<{
    id: number; niveau: string; canal: string; envoye_le: string; message: string | null;
    numero: string; periode: string; locataire_prenom: string; locataire_nom: string;
  }>(
    `SELECT r.id, r.niveau, r.canal, r.envoye_le, r.message,
            f.numero, f.periode, l.prenom AS locataire_prenom, l.nom AS locataire_nom
       FROM relances r
       JOIN factures   f ON f.id = r.facture_id
       JOIN contrats   c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
      WHERE r.agence_id = ?
      ORDER BY r.envoye_le DESC, r.id DESC
      LIMIT ?`,
    agenceId, limite,
  );
}

// ------------------------------------------- Generation des factures du mois

/**
 * Cree les factures d'une periode (AAAA-MM) pour tous les contrats actifs
 * qui n'en ont pas encore. Renvoie le nombre de factures creees.
 */
export function genererFacturesDuMois(agenceId: number, periode: string): number {
  const contrats = tous<{ id: number; loyer: number; charges: number; jour_echeance: number }>(
    `SELECT c.id, c.loyer, c.charges, c.jour_echeance
       FROM contrats c
      WHERE c.agence_id = ? AND c.statut = 'actif'
        AND strftime('%Y-%m', c.date_debut) <= ?
        AND (c.date_fin IS NULL OR c.date_fin = '' OR strftime('%Y-%m', c.date_fin) >= ?)
        AND NOT EXISTS (SELECT 1 FROM factures f WHERE f.contrat_id = c.id AND f.periode = ?)`,
    agenceId, periode, periode, periode,
  );
  if (contrats.length === 0) return 0;

  const [annee, mois] = periode.split("-").map(Number);
  const dernierJour = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  const emission = `${periode}-01`;

  const inserer = db.prepare(
    `INSERT INTO factures
       (agence_id, contrat_id, numero, periode, date_emission, date_echeance,
        montant_loyer, montant_charges, montant_autres, montant_total, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'emise')`,
  );

  const lot = db.transaction(() => {
    let n = 0;
    for (const c of contrats) {
      const jour = Math.min(Math.max(c.jour_echeance || 5, 1), dernierJour);
      const echeance = `${periode}-${String(jour).padStart(2, "0")}`;
      inserer.run(
        agenceId, c.id, numeroFactureSuivant(agenceId), periode, emission, echeance,
        c.loyer, c.charges, c.loyer + c.charges,
      );
      n++;
    }
    return n;
  });

  return lot();
}

/** Genere un numero de facture sequentiel du type FAC-2026-0042. */
export function numeroFactureSuivant(agenceId: number): string {
  const annee = aujourdhui().slice(0, 4);
  const r = un<{ max: number | null }>(
    `SELECT MAX(CAST(substr(numero, 10) AS INTEGER)) AS max
       FROM factures WHERE agence_id = ? AND numero LIKE ?`,
    agenceId, `FAC-${annee}-%`,
  );
  return `FAC-${annee}-${String((r?.max ?? 0) + 1).padStart(4, "0")}`;
}

/** Genere une reference unique (BIEN-0001, LOC-0001, BAIL-0001...). */
export function referenceSuivante(agenceId: number, table: "biens" | "contrats", prefixe: string): string {
  const r = un<{ max: number | null }>(
    `SELECT MAX(CAST(substr(reference, ?) AS INTEGER)) AS max
       FROM ${table} WHERE agence_id = ? AND reference LIKE ?`,
    prefixe.length + 2, agenceId, `${prefixe}-%`,
  );
  return `${prefixe}-${String((r?.max ?? 0) + 1).padStart(4, "0")}`;
}
