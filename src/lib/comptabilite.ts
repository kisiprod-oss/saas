import "server-only";
import { tous, un } from "./db";
import { decalerMois, moisCourant } from "./format";

/**
 * Situation comptable d'une agence.
 *
 * LA DISTINCTION QUI FAIT TOUT : le loyer encaisse n'est PAS le chiffre
 * d'affaires de l'agence.
 *
 * Quand une agence gere le bien d'un proprietaire, l'argent du locataire ne
 * fait que transiter par elle. Sur 500 000 FCFA de loyer encaisse avec 10 %
 * d'honoraires, l'agence gagne 50 000 FCFA ; les 450 000 restants sont une
 * DETTE envers le proprietaire, pas un produit. Une agence qui declarerait
 * 500 000 de chiffre d'affaires se mettrait en difficulte au premier
 * controle fiscal.
 *
 * Ce fichier calcule donc trois montants distincts, et l'ecran les montre
 * separement :
 *
 *   Encaissements       tout l'argent recu       (transite)
 *   - Honoraires        la commission            (le vrai chiffre d'affaires)
 *   = A reverser        ce qui revient aux proprietaires
 *
 * Un bailleur qui gere ses propres biens n'a pas de reversement : ses
 * encaissements lui appartiennent en entier. L'ecran le dit aussi.
 *
 * CE QUE CE N'EST PAS. Ce n'est pas une comptabilite au sens legal : ni plan
 * comptable, ni journal, ni bilan. C'est un etat de gestion — de quoi se
 * controler soi-meme et donner des chiffres nets a son comptable, qui reste
 * seul a engager sa responsabilite.
 */

export type Periode = { code: string; libelle: string; debut: string; fin: string };

/** Dernier jour du mois d'une periode AAAA-MM. */
function finDeMois(periode: string): string {
  const [a, m] = periode.split("-").map(Number);
  return `${periode}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, "0")}`;
}

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function moisLisible(periode: string): string {
  const [a, m] = periode.split("-");
  return `${MOIS_LONGS[Number(m) - 1]} ${a}`;
}

/**
 * Periodes proposees. Volontairement courtes et parlantes : une gerante
 * choisit « ce mois-ci » ou « cette annee », pas un intervalle de dates.
 */
export function periodesDisponibles(): Periode[] {
  const courant = moisCourant();
  const precedent = decalerMois(courant, -1);
  const annee = courant.slice(0, 4);
  const anneePrecedente = String(Number(annee) - 1);
  const moisNum = Number(courant.slice(5, 7));
  const debutTrimestre = `${annee}-${String(Math.floor((moisNum - 1) / 3) * 3 + 1).padStart(2, "0")}`;

  return [
    { code: "mois", libelle: `Ce mois-ci (${moisLisible(courant)})`, debut: `${courant}-01`, fin: finDeMois(courant) },
    { code: "mois-1", libelle: `Le mois dernier (${moisLisible(precedent)})`, debut: `${precedent}-01`, fin: finDeMois(precedent) },
    { code: "trimestre", libelle: "Ce trimestre", debut: `${debutTrimestre}-01`, fin: finDeMois(courant) },
    { code: "annee", libelle: `Cette année (${annee})`, debut: `${annee}-01-01`, fin: `${annee}-12-31` },
    { code: "annee-1", libelle: `L'année dernière (${anneePrecedente})`, debut: `${anneePrecedente}-01-01`, fin: `${anneePrecedente}-12-31` },
  ];
}

export function resoudrePeriode(code: string): Periode {
  const liste = periodesDisponibles();
  return liste.find((p) => p.code === code) ?? liste[0];
}

export type LigneBien = {
  id: number;
  bien: string;
  reference: string;
  proprietaire: string | null;
  facture: number;
  encaisse: number;
  honoraires: number;
  reste: number;
};

export type Bilan = {
  /** Tout l'argent recu sur la periode. Transite : n'appartient pas en entier a l'agence. */
  encaisse: number;
  /** La commission de gestion : le chiffre d'affaires reel de l'agence. */
  honoraires: number;
  /** Ce qui revient aux proprietaires : encaisse moins honoraires. */
  aReverser: number;

  /** Montant facture sur la periode (hors factures annulees). */
  facture: number;
  /** Reste du sur les factures de la periode, a la date du jour. */
  impayes: number;
  /** Part du facture qui a ete encaissee, en pourcentage. */
  tauxRecouvrement: number;

  nbFactures: number;
  nbBaux: number;

  /** Decomposition de l'encaisse, pour savoir sur quoi porte la commission. */
  encaisseLoyer: number;
  encaisseCharges: number;
  encaisseAutres: number;

  historique: { periode: string; facture: number; encaisse: number; honoraires: number }[];
  parBien: LigneBien[];
};

/**
 * Part du reglement qui correspond au LOYER, seule assiette des honoraires.
 *
 * Un reglement partiel ne dit pas ce qu'il paie. On l'affecte donc au
 * prorata de la composition de la facture : sur une facture de 100 000 dont
 * 90 000 de loyer, un versement de 50 000 compte pour 45 000 de loyer. C'est
 * la repartition la plus neutre — elle ne surestime jamais la commission,
 * contrairement a « le loyer d'abord ».
 */
const PART_LOYER = `
  (p.montant * 1.0 * f.montant_loyer / NULLIF(f.montant_total, 0))
`;

const HONORAIRES = `${PART_LOYER} * c.commission_pct / 100.0`;

export function bilan(agenceId: number, periode: Periode): Bilan {
  const { debut, fin } = periode;

  // --- Encaissements de la periode, et leur decomposition ---
  const enc = un<{
    total: number; loyer: number; charges: number; autres: number; honoraires: number;
  }>(
    `SELECT COALESCE(SUM(p.montant), 0) AS total,
            COALESCE(SUM(${PART_LOYER}), 0) AS loyer,
            COALESCE(SUM(p.montant * 1.0 * f.montant_charges / NULLIF(f.montant_total, 0)), 0) AS charges,
            COALESCE(SUM(p.montant * 1.0 * f.montant_autres  / NULLIF(f.montant_total, 0)), 0) AS autres,
            COALESCE(SUM(${HONORAIRES}), 0) AS honoraires
       FROM paiements p
       JOIN factures f ON f.id = p.facture_id
       JOIN contrats c ON c.id = f.contrat_id
      WHERE p.agence_id = ? AND p.confirme = 1
        AND date(p.date_paiement) BETWEEN date(?) AND date(?)`,
    agenceId, debut, fin,
  )!;

  // --- Facturation de la periode ---
  const fac = un<{ total: number; nb: number }>(
    `SELECT COALESCE(SUM(montant_total), 0) AS total, COUNT(*) AS nb
       FROM factures
      WHERE agence_id = ? AND statut != 'annulee'
        AND date(date_emission) BETWEEN date(?) AND date(?)`,
    agenceId, debut, fin,
  )!;

  // --- Reste du sur ces memes factures ---
  const imp = un<{ total: number }>(
    `SELECT COALESCE(SUM(f.montant_total - COALESCE(v.paye, 0)), 0) AS total
       FROM factures f
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye
                    FROM paiements WHERE confirme = 1 GROUP BY facture_id) v
              ON v.facture_id = f.id
      WHERE f.agence_id = ? AND f.statut != 'annulee'
        AND date(f.date_emission) BETWEEN date(?) AND date(?)
        AND f.montant_total > COALESCE(v.paye, 0)`,
    agenceId, debut, fin,
  )!;

  const baux = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM contrats WHERE agence_id = ? AND statut = 'actif'",
    agenceId,
  )!;

  // --- Douze mois glissants, pour les graphiques ---
  const dernierMois = fin.slice(0, 7);
  const historique = Array.from({ length: 12 }, (_, i) => decalerMois(dernierMois, i - 11)).map((m) => {
    const f = un<{ total: number }>(
      `SELECT COALESCE(SUM(montant_total), 0) AS total FROM factures
        WHERE agence_id = ? AND statut != 'annulee' AND strftime('%Y-%m', date_emission) = ?`,
      agenceId, m,
    )!;
    const e = un<{ total: number; honoraires: number }>(
      `SELECT COALESCE(SUM(p.montant), 0) AS total,
              COALESCE(SUM(${HONORAIRES}), 0) AS honoraires
         FROM paiements p
         JOIN factures f ON f.id = p.facture_id
         JOIN contrats c ON c.id = f.contrat_id
        WHERE p.agence_id = ? AND p.confirme = 1
          AND strftime('%Y-%m', p.date_paiement) = ?`,
      agenceId, m,
    )!;
    return {
      periode: m,
      facture: Math.round(f.total),
      encaisse: Math.round(e.total),
      honoraires: Math.round(e.honoraires),
    };
  });

  // --- Detail par bien ---
  const parBien = tous<LigneBien>(
    `SELECT b.id, b.titre AS bien, b.reference, b.proprietaire_nom AS proprietaire,
            COALESCE(SUM(f.montant_total), 0) AS facture,
            0 AS encaisse, 0 AS honoraires, 0 AS reste
       FROM biens b
       JOIN contrats c ON c.bien_id = b.id
       JOIN factures f ON f.contrat_id = c.id
      WHERE b.agence_id = ? AND f.statut != 'annulee'
        AND date(f.date_emission) BETWEEN date(?) AND date(?)
      GROUP BY b.id
      ORDER BY facture DESC`,
    agenceId, debut, fin,
  );

  // L'encaisse et les honoraires par bien se calculent a part : les joindre
  // a la requete ci-dessus multiplierait les lignes de factures par celles
  // des paiements, et gonflerait les montants factures.
  for (const ligne of parBien) {
    const e = un<{ encaisse: number; honoraires: number }>(
      `SELECT COALESCE(SUM(p.montant), 0) AS encaisse,
              COALESCE(SUM(${HONORAIRES}), 0) AS honoraires
         FROM paiements p
         JOIN factures f ON f.id = p.facture_id
         JOIN contrats c ON c.id = f.contrat_id
        WHERE c.bien_id = ? AND p.agence_id = ? AND p.confirme = 1
          AND date(p.date_paiement) BETWEEN date(?) AND date(?)`,
      ligne.id, agenceId, debut, fin,
    )!;
    ligne.encaisse = Math.round(e.encaisse);
    ligne.honoraires = Math.round(e.honoraires);
    ligne.reste = Math.max(0, ligne.facture - ligne.encaisse);
  }

  const encaisse = Math.round(enc.total);
  const honoraires = Math.round(enc.honoraires);

  return {
    encaisse,
    honoraires,
    aReverser: Math.max(0, encaisse - honoraires),
    facture: Math.round(fac.total),
    impayes: Math.round(imp.total),
    tauxRecouvrement: fac.total > 0 ? Math.round((enc.total / fac.total) * 100) : 0,
    nbFactures: fac.nb,
    nbBaux: baux.n,
    encaisseLoyer: Math.round(enc.loyer),
    encaisseCharges: Math.round(enc.charges),
    encaisseAutres: Math.round(enc.autres),
    historique,
    parBien,
  };
}
