import "server-only";
import { tous, un } from "./db";
import { decalerMois, moisCourant } from "./format";
import { PLANS, plan } from "./tarifs";

/**
 * Vue d'ensemble de la plateforme — le tableau de bord de l'editeur, pas
 * celui d'une agence.
 *
 * ATTENTION. Les requetes de ce fichier ne sont PAS cloisonnees par agence :
 * elles lisent toute la base. C'est leur raison d'etre, et c'est aussi ce qui
 * les rend dangereuses. Elles ne doivent etre appelees que derriere
 * `exigerAdmin()`. Aucune ne doit jamais etre importee dans /dashboard.
 *
 * CE QUE CE FICHIER NE SAIT PAS : si une agence a REELLEMENT PAYE son
 * abonnement. Rien dans la base ne l'enregistre — la colonne `plan` dit sur
 * quelle formule une agence se trouve, jamais qu'elle a verse l'argent. Le
 * montant calcule ici est donc un abonnement THEORIQUE : ce qui serait
 * encaisse si tout le monde payait. L'ecran le dit mot pour mot, parce
 * qu'un editeur qui prendrait ce chiffre pour son chiffre d'affaires se
 * tromperait exactement comme l'agence qui confond loyers et honoraires.
 */

export type LigneAdherent = {
  id: number;
  nom: string;
  ville: string | null;
  email: string | null;
  telephone: string | null;
  plan: string;
  /** Fin de la periode reglee. NULL = formule posee a la main, sans echeance. */
  plan_expire_le: string | null;
  cree_le: string;
  nb_utilisateurs: number;
  nb_biens: number;
  nb_locataires: number;
  /** Factures emises sur les 30 derniers jours : le signe de vie. */
  factures_recentes: number;
  /** Date de la derniere facture emise, ou null si aucune. */
  derniere_activite: string | null;
};

export type Plateforme = {
  nbAgences: number;
  nbPayantes: number;
  nbGratuites: number;
  nbActives: number;
  nbDormantes: number;
  nouvellesCeMois: number;
  /** Somme des prix mensuels des formules en cours. Theorique : voir en-tete. */
  abonnementTheorique: number;
  parPlan: { code: string; nom: string; prixMois: number; nombre: number; total: number }[];
  /** Inscriptions par mois, douze mois glissants. */
  historique: { periode: string; inscriptions: number }[];
  adherents: LigneAdherent[];
  nbUtilisateurs: number;
  nbArtisans: number;
  nbLocataires: number;
  nbProprietaires: number;
  /**
   * Agences ayant enregistré des clés marchandes chiffrées.
   *
   * Sert à UNE décision précise : faut-il changer CLE_CHIFFREMENT ? Ces clés
   * sont chiffrées avec elle ; en changer rendrait les anciennes illisibles,
   * et l'encaissement en ligne de ces agences s'arrêterait SANS message
   * d'erreur — dechiffrer() renvoie null, et l'application traite alors
   * l'encaissement comme « non configuré ». À zéro, la rotation ne casse
   * rien. Au-dessus, il faut prévenir ces agences et leur faire ressaisir
   * leurs clés.
   */
  nbEncaissementConfigure: number;
  /** Sessions ouvertes, tous espaces confondus. */
  nbSessions: number;

  /** Abonnements REELLEMENT encaisses. Zero tant que rien n'a ete regle. */
  encaisseTotal: number;
  encaisseCeMois: number;
  nbReglements: number;
};

export function plateforme(): Plateforme {
  const adherents = tous<LigneAdherent>(
    `SELECT a.id, a.nom, a.ville, a.email, a.telephone, a.plan, a.plan_expire_le, a.cree_le,
            (SELECT COUNT(*) FROM utilisateurs u WHERE u.agence_id = a.id)          AS nb_utilisateurs,
            (SELECT COUNT(*) FROM biens b WHERE b.agence_id = a.id)                 AS nb_biens,
            (SELECT COUNT(*) FROM locataires l WHERE l.agence_id = a.id)            AS nb_locataires,
            (SELECT COUNT(*) FROM factures f
              WHERE f.agence_id = a.id AND f.statut != 'annulee'
                AND date(f.date_emission) >= date('now', '-30 days'))               AS factures_recentes,
            (SELECT MAX(date(f.date_emission)) FROM factures f
              WHERE f.agence_id = a.id AND f.statut != 'annulee')                   AS derniere_activite
       FROM agences a
      ORDER BY a.cree_le DESC`,
  );

  const parPlan = PLANS.map((p) => {
    const nombre = adherents.filter((a) => plan(a.plan).code === p.code).length;
    return { code: p.code, nom: p.nom, prixMois: p.prixMois, nombre, total: nombre * p.prixMois };
  });

  const courant = moisCourant();
  const historique = Array.from({ length: 12 }, (_, i) => decalerMois(courant, i - 11)).map((m) => {
    const r = un<{ n: number }>(
      "SELECT COUNT(*) AS n FROM agences WHERE strftime('%Y-%m', cree_le) = ?", m,
    )!;
    return { periode: m, inscriptions: r.n };
  });

  const compte = (sql: string) => un<{ n: number }>(sql)!.n;

  // Ce qui est reellement arrive sur le compte de l'editeur, par opposition
  // au montant theorique des formules en cours.
  const encaisse = un<{ total: number; nb: number }>(
    "SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*) AS nb FROM abonnements WHERE statut = 'payee'",
  )!;
  const encaisseMois = un<{ total: number }>(
    `SELECT COALESCE(SUM(montant), 0) AS total FROM abonnements
      WHERE statut = 'payee' AND strftime('%Y-%m', confirme_le) = ?`,
    courant,
  )!;

  return {
    nbAgences: adherents.length,
    nbPayantes: adherents.filter((a) => plan(a.plan).prixMois > 0).length,
    nbGratuites: adherents.filter((a) => plan(a.plan).prixMois === 0).length,
    nbActives: adherents.filter((a) => a.factures_recentes > 0).length,
    nbDormantes: adherents.filter((a) => a.factures_recentes === 0).length,
    nouvellesCeMois: adherents.filter((a) => a.cree_le.slice(0, 7) === courant).length,
    abonnementTheorique: parPlan.reduce((s, p) => s + p.total, 0),
    parPlan,
    historique,
    adherents,
    nbUtilisateurs: compte("SELECT COUNT(*) AS n FROM utilisateurs"),
    nbArtisans: compte("SELECT COUNT(*) AS n FROM artisans"),
    nbLocataires: compte("SELECT COUNT(*) AS n FROM locataires"),
    nbProprietaires: compte("SELECT COUNT(*) AS n FROM proprietaires"),
    nbEncaissementConfigure: compte(
      `SELECT COUNT(*) AS n FROM agences
        WHERE encaissement_cle_maitre IS NOT NULL AND encaissement_cle_maitre != ''`,
    ),
    nbSessions: compte(
      `SELECT (SELECT COUNT(*) FROM sessions)
            + (SELECT COUNT(*) FROM sessions_locataires)
            + (SELECT COUNT(*) FROM sessions_artisans) AS n`,
    ),
    encaisseTotal: encaisse.total,
    encaisseCeMois: encaisseMois.total,
    nbReglements: encaisse.nb,
  };
}

/**
 * Nombre d'agences payantes dont l'abonnement demande une action : déjà
 * expiré, ou à echeance dans les 30 jours. Sert au badge du menu — le même
 * calcul que la page /admin/agences, pour ne jamais afficher deux chiffres
 * différents pour la même chose.
 */
export function compterAbonnementsARelancer(): number {
  const seuil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  const r = un<{ n: number }>(
    `SELECT COUNT(*) AS n FROM agences
      WHERE plan != 'decouverte' AND plan_expire_le IS NOT NULL AND plan_expire_le <= ?`,
    seuil,
  )!;
  return r.n;
}

export type Collaborateur = {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  actif: number;
  cree_le: string;
  agence_id: number;
  agence_nom: string;
};

/** Tous les comptes ouverts sur la plateforme, le plus recent d'abord. */
export function collaborateurs(): Collaborateur[] {
  return tous<Collaborateur>(
    `SELECT u.id, u.nom, u.email, u.telephone, u.role, u.actif, u.cree_le,
            u.agence_id, a.nom AS agence_nom
       FROM utilisateurs u
       JOIN agences a ON a.id = u.agence_id
      ORDER BY u.cree_le DESC`,
  );
}

/* ==========================================================================
   La fiche d'une agence
   ========================================================================== */

export type FicheAgence = {
  id: number;
  nom: string;
  slug: string;
  ville: string | null;
  email: string | null;
  telephone: string | null;
  ninea: string | null;
  rccm: string | null;
  plan: string;
  plan_expire_le: string | null;
  commission_pct: number;
  encaissement_actif: number;
  encaissement_mode: string;
  compte_gratuit_reutilise: number;
  cree_le: string;
  nb_utilisateurs: number;
  nb_biens: number;
  nb_locataires: number;
  nb_contrats_actifs: number;
  nb_factures: number;
  derniere_activite: string | null;
  /** Abonnements reellement encaisses par cette agence-ci. */
  regle_total: number;
  nb_reglements: number;
};

export type MembreAgence = {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  actif: number;
  cree_le: string;
};

/**
 * Tout ce qu'il faut savoir sur une agence avant d'agir sur son compte.
 *
 * Les colonnes sont enumerees une par une, jamais `SELECT *` : la table porte
 * les cles marchandes chiffrees de l'agence, et elles n'ont rien a faire dans
 * une page, meme reservee a l'administrateur. Ce qui n'est pas selectionne ne
 * peut pas fuir par distraction.
 */
export function ficheAgence(id: number): FicheAgence | null {
  return un<FicheAgence>(
    `SELECT a.id, a.nom, a.slug, a.ville, a.email, a.telephone, a.ninea, a.rccm,
            a.plan, a.plan_expire_le, a.commission_pct,
            a.encaissement_actif, a.encaissement_mode, a.compte_gratuit_reutilise,
            a.cree_le,
            (SELECT COUNT(*) FROM utilisateurs u WHERE u.agence_id = a.id)   AS nb_utilisateurs,
            (SELECT COUNT(*) FROM biens b WHERE b.agence_id = a.id)          AS nb_biens,
            (SELECT COUNT(*) FROM locataires l WHERE l.agence_id = a.id)     AS nb_locataires,
            (SELECT COUNT(*) FROM contrats c
              WHERE c.agence_id = a.id AND c.statut = 'actif')               AS nb_contrats_actifs,
            (SELECT COUNT(*) FROM factures f
              WHERE f.agence_id = a.id AND f.statut != 'annulee')            AS nb_factures,
            (SELECT MAX(date(f.date_emission)) FROM factures f
              WHERE f.agence_id = a.id AND f.statut != 'annulee')            AS derniere_activite,
            (SELECT COALESCE(SUM(ab.montant), 0) FROM abonnements ab
              WHERE ab.agence_id = a.id AND ab.statut = 'payee')             AS regle_total,
            (SELECT COUNT(*) FROM abonnements ab
              WHERE ab.agence_id = a.id AND ab.statut = 'payee')             AS nb_reglements
       FROM agences a
      WHERE a.id = ?`,
    id,
  ) ?? null;
}

/** Les personnes qui se connectent pour cette agence. */
export function membresAgence(agenceId: number): MembreAgence[] {
  return tous<MembreAgence>(
    `SELECT id, nom, email, telephone, role, actif, cree_le
       FROM utilisateurs WHERE agence_id = ? ORDER BY id`,
    agenceId,
  );
}
