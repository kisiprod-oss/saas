import "server-only";
import { un, tous } from "./db";
import type { Boutique } from "./auth";

/**
 * Offres et limites.
 *
 * Deux principes :
 *  1. Les tarifs et les quotas sont des DONNEES (table `offres`), modifiables
 *     depuis l'administration. Rien n'est ecrit en dur ici.
 *  2. Toute limite est verifiee COTE SERVEUR, au moment de l'action. Cacher
 *     un bouton ne protege rien : la verification est dans la fonction qui
 *     enregistre, pas dans la page qui l'affiche.
 */
export type Offre = {
  code: string;
  nom: string;
  prix_mensuel: number;
  devise: string;
  max_produits: number;
  quota_ia: number;
  max_membres: number;
  domaine_personnalise: number;
  publication: number;
  accroche: string | null;
  ordre: number;
  actif: number;
};

export function offresPubliques(): Offre[] {
  return tous<Offre>("SELECT * FROM offres WHERE actif = 1 ORDER BY ordre");
}

export function toutesLesOffres(): Offre[] {
  return tous<Offre>("SELECT * FROM offres ORDER BY ordre");
}

const REPLI: Offre = {
  code: "decouverte", nom: "Découverte", prix_mensuel: 0, devise: "XOF",
  max_produits: 5, quota_ia: 10, max_membres: 1, domaine_personnalise: 0,
  publication: 0, accroche: null, ordre: 1, actif: 1,
};

/**
 * L'offre REELLEMENT en vigueur.
 *
 * Une formule payante dont l'echeance est passee ne donne plus ses droits :
 * on retombe sur Decouverte. Sans cette regle, un abonnement expire
 * continuerait d'ouvrir 300 produits indefiniment.
 *
 * Ce que l'echeance ne fait PAS : depublier la boutique ou effacer des
 * produits. Le commercant garde ses donnees et sa boutique en ligne ; ce sont
 * les AJOUTS qui s'arretent.
 */
export function offreEnVigueur(boutique: Pick<Boutique, "offre" | "offre_expire_le">): Offre {
  const echue = boutique.offre_expire_le
    && new Date(boutique.offre_expire_le).getTime() < Date.now();
  const code = echue ? "decouverte" : boutique.offre;
  return un<Offre>("SELECT * FROM offres WHERE code = ?", code)
    ?? un<Offre>("SELECT * FROM offres WHERE code = 'decouverte'")
    ?? REPLI;
}

export type Limite = { ok: true } | { ok: false; raison: string; offreRequise?: string };

/** Y a-t-il encore de la place pour un produit de plus ? */
export function peutAjouterProduit(boutique: Boutique): Limite {
  const offre = offreEnVigueur(boutique);
  const actuel = un<{ n: number }>(
    "SELECT COUNT(*) n FROM produits WHERE boutique_id = ?", boutique.id,
  )?.n ?? 0;
  if (actuel < offre.max_produits) return { ok: true };

  const superieure = un<Offre>(
    `SELECT * FROM offres WHERE actif = 1 AND max_produits > ? ORDER BY ordre LIMIT 1`,
    offre.max_produits,
  );
  return {
    ok: false,
    raison: `La formule ${offre.nom} permet ${offre.max_produits} produits. `
      + `Vous en avez ${actuel}.`,
    offreRequise: superieure?.code,
  };
}

/** La publication demande une formule qui l'autorise. */
export function peutPublier(boutique: Boutique): Limite {
  const offre = offreEnVigueur(boutique);
  if (!offre.publication) {
    const premiere = un<Offre>(
      "SELECT * FROM offres WHERE actif = 1 AND publication = 1 ORDER BY ordre LIMIT 1",
    );
    return {
      ok: false,
      raison: `La formule ${offre.nom} permet de tout préparer, mais pas de mettre `
        + `la boutique en ligne.`,
      offreRequise: premiere?.code,
    };
  }
  return { ok: true };
}

export function peutDomainePersonnalise(boutique: Boutique): Limite {
  const offre = offreEnVigueur(boutique);
  if (offre.domaine_personnalise) return { ok: true };
  const premiere = un<Offre>(
    "SELECT * FROM offres WHERE actif = 1 AND domaine_personnalise = 1 ORDER BY ordre LIMIT 1",
  );
  return {
    ok: false,
    raison: `Connecter votre propre nom de domaine demande une formule supérieure.`,
    offreRequise: premiere?.code,
  };
}

export function peutInviterEquipier(boutique: Boutique): Limite {
  const offre = offreEnVigueur(boutique);
  const actuel = un<{ n: number }>(
    "SELECT COUNT(*) n FROM utilisateurs WHERE boutique_id = ? AND actif = 1", boutique.id,
  )?.n ?? 1;
  if (actuel < offre.max_membres) return { ok: true };
  const superieure = un<Offre>(
    "SELECT * FROM offres WHERE actif = 1 AND max_membres > ? ORDER BY ordre LIMIT 1",
    offre.max_membres,
  );
  return {
    ok: false,
    raison: offre.max_membres <= 1
      ? `La formule ${offre.nom} est prévue pour une seule personne.`
      : `La formule ${offre.nom} permet ${offre.max_membres} personnes.`,
    offreRequise: superieure?.code,
  };
}

/** Periode de comptage des operations IA : le mois calendaire en cours. */
export function moisCourant(): string {
  return new Date().toISOString().slice(0, 7);
}

export type EtatQuotaIa = {
  utilise: number;
  maximum: number;
  restant: number;
  mois: string;
};

/**
 * Consommation IA du mois.
 *
 * SEULES les operations `reussie` comptent. Une generation qui echoue est
 * enregistree (pour le journal et l'administration) mais ne retire rien au
 * commercant : il n'a pas a payer une panne de notre cote.
 */
export function quotaIa(boutique: Boutique): EtatQuotaIa {
  const offre = offreEnVigueur(boutique);
  const mois = moisCourant();
  const utilise = un<{ n: number }>(
    `SELECT COUNT(*) n FROM operations_ia
      WHERE boutique_id = ? AND statut = 'reussie' AND substr(cree_le, 1, 7) = ?`,
    boutique.id, mois,
  )?.n ?? 0;
  return { utilise, maximum: offre.quota_ia, restant: Math.max(0, offre.quota_ia - utilise), mois };
}

export function peutUtiliserIa(boutique: Boutique): Limite {
  const etat = quotaIa(boutique);
  if (etat.restant > 0) return { ok: true };
  const offre = offreEnVigueur(boutique);
  const superieure = un<Offre>(
    "SELECT * FROM offres WHERE actif = 1 AND quota_ia > ? ORDER BY ordre LIMIT 1",
    offre.quota_ia,
  );
  return {
    ok: false,
    raison: `Vous avez utilisé vos ${etat.maximum} générations du mois. `
      + `Le compteur repart le 1er.`,
    offreRequise: superieure?.code,
  };
}
