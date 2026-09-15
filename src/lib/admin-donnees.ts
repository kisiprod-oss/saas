import "server-only";
import { tous, un } from "./db";

/**
 * Les lectures de l'espace d'administration.
 *
 * DEUX REGLES DE FOND :
 *
 * 1. FILTRE ET PAGINATION COTE SERVEUR. Aucune de ces fonctions ne renvoie
 *    « toute la base » a charge pour l'ecran de trier. Une plateforme a mille
 *    agences ne doit pas envoyer mille lignes a un telephone.
 *
 * 2. AUCUN CHIFFRE INVENTE. Quand une donnee n'existe pas encore — les
 *    signalements, les tickets — la fonction le DIT (`disponible: false`)
 *    plutot que de renvoyer zero. Zero et « pas construit » ne veulent pas
 *    dire la meme chose, et un tableau de bord qui les confond ment.
 */

export const PAR_PAGE = 25;

/** Toutes les dates de la base sont en temps universel (UTC). */
export const FUSEAU = "UTC";

// ------------------------------------------------------- tableau de bord

export type Indicateur = {
  cle: string;
  libelle: string;
  /** Ce que le nombre compte EXACTEMENT. Affiche sous le chiffre. */
  definition: string;
  valeur: number | null;
  detail?: string;
  /** Faux quand la fonctionnalite n'existe pas encore : on ne montre pas 0. */
  disponible: boolean;
  href?: string;
};

function compte(sql: string, ...p: unknown[]): number {
  return un<{ n: number }>(sql, ...p)?.n ?? 0;
}

/** Vrai si une table existe : sert a ne pas promettre ce qui n'est pas construit. */
function tableExiste(nom: string): boolean {
  return Boolean(un("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", nom));
}

export function indicateurs(jours: number): Indicateur[] {
  const depuis = `-${jours} days`;

  const liste: Indicateur[] = [
    {
      cle: "agences", libelle: "Agences inscrites",
      definition: "Comptes d'agence créés, suspensions comprises.",
      valeur: compte("SELECT COUNT(*) AS n FROM agences"),
      detail: `${compte("SELECT COUNT(*) AS n FROM agences WHERE cree_le > datetime('now', ?)", depuis)} sur la période`,
      disponible: true, href: "/admin/agences",
    },
    {
      cle: "agences_actives", libelle: "Agences actives",
      definition: "Agences ayant émis au moins une facture sur la période.",
      valeur: compte(
        `SELECT COUNT(DISTINCT agence_id) AS n FROM factures WHERE cree_le > datetime('now', ?)`,
        depuis),
      disponible: true,
    },
    {
      cle: "agences_suspendues", libelle: "Agences suspendues",
      definition: "Agences dont l'accès est fermé par l'équipe.",
      valeur: compte("SELECT COUNT(*) AS n FROM agences WHERE suspendue_le IS NOT NULL"),
      disponible: true, href: "/admin/agences?statut=suspendue",
    },
    {
      cle: "utilisateurs", libelle: "Comptes d'agence",
      definition: "Personnes qui se connectent à l'espace agence.",
      valeur: compte("SELECT COUNT(*) AS n FROM utilisateurs WHERE actif = 1"),
      detail: `${compte("SELECT COUNT(*) AS n FROM utilisateurs WHERE actif = 0")} suspendu(s)`,
      disponible: true, href: "/admin/utilisateurs",
    },
    {
      cle: "locataires", libelle: "Locataires",
      definition: "Locataires enregistrés par les agences.",
      valeur: compte("SELECT COUNT(*) AS n FROM locataires"),
      detail: `${compte("SELECT COUNT(*) AS n FROM locataires WHERE acces_actif = 1")} avec un accès en ligne`,
      disponible: true,
    },
    {
      cle: "proprietaires", libelle: "Propriétaires",
      definition: "Propriétaires dont les agences gèrent les biens.",
      valeur: compte("SELECT COUNT(*) AS n FROM proprietaires"),
      disponible: true,
    },
    {
      cle: "annonces", libelle: "Annonces publiées",
      definition: "Biens visibles sur la vitrine : publiés par l'agence et acceptés en modération.",
      valeur: compte("SELECT COUNT(*) AS n FROM biens WHERE publie = 1 AND moderation = 'publie'"),
      disponible: true, href: "/admin/annonces",
    },
    {
      cle: "annonces_attente", libelle: "Annonces à modérer",
      definition: "Annonces mises en attente par l'équipe, en attente de décision.",
      valeur: compte("SELECT COUNT(*) AS n FROM biens WHERE moderation = 'en_attente'"),
      disponible: true, href: "/admin/annonces?moderation=en_attente",
    },
    {
      cle: "artisans", libelle: "Artisans inscrits",
      definition: "Fiches d'artisans, candidatures libres et fiches créées par les agences.",
      valeur: compte("SELECT COUNT(*) AS n FROM artisans"),
      detail: `${compte("SELECT COUNT(*) AS n FROM artisans WHERE statut_candidature = 'en_attente'")} candidature(s) en attente`,
      disponible: true, href: "/admin/artisans",
    },
  ];

  // --- Abonnements : le revenu de Sen Gestion, et lui seul ---
  const abonnements = un<{ n: number; total: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(montant), 0) AS total
       FROM abonnements WHERE statut = 'payee' AND confirme_le > datetime('now', ?)`, depuis);
  liste.push({
    cle: "abonnements", libelle: "Abonnements réglés",
    definition: "Règlements d'abonnement confirmés sur la période. C'est le revenu de Sen Gestion, "
      + "à ne pas confondre avec les loyers, qui appartiennent aux agences.",
    valeur: abonnements?.n ?? 0,
    detail: `${(abonnements?.total ?? 0).toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA encaissés`,
    disponible: true, href: "/admin/facturation",
  });

  // --- Ce qui n'existe pas encore : on le dit, on n'affiche pas zero ---
  liste.push({
    cle: "signalements", libelle: "Signalements",
    definition: "Contenus signalés par les visiteurs.",
    valeur: null, disponible: tableExiste("signalements"),
  });
  liste.push({
    cle: "tickets", libelle: "Tickets support",
    definition: "Demandes d'assistance déposées par les agences.",
    valeur: null, disponible: tableExiste("tickets"),
  });

  return liste;
}

/** Inscriptions d'agences par mois, sur les douze derniers mois. */
export function inscriptionsParMois(): { mois: string; nombre: number }[] {
  return tous<{ mois: string; nombre: number }>(
    `SELECT strftime('%Y-%m', cree_le) AS mois, COUNT(*) AS nombre
       FROM agences
      WHERE cree_le > datetime('now', '-12 months')
      GROUP BY mois ORDER BY mois`,
  );
}

/** Repartition des comptes, par nature. */
export function repartitionComptes(): { libelle: string; nombre: number }[] {
  return [
    { libelle: "Comptes d'agence", nombre: compte("SELECT COUNT(*) AS n FROM utilisateurs") },
    { libelle: "Locataires", nombre: compte("SELECT COUNT(*) AS n FROM locataires") },
    { libelle: "Propriétaires", nombre: compte("SELECT COUNT(*) AS n FROM proprietaires") },
    { libelle: "Artisans", nombre: compte("SELECT COUNT(*) AS n FROM artisans") },
  ].filter((l) => l.nombre > 0);
}

// ------------------------------------------------------------- les agences

export type LigneAgence = {
  id: number; nom: string; slug: string; ville: string | null; email: string | null;
  telephone: string | null; plan: string; plan_expire_le: string | null;
  cree_le: string; suspendue_le: string | null;
  nb_biens: number; nb_utilisateurs: number; nb_locataires: number;
};

export function listerAgences(f: {
  q?: string; statut?: string; plan?: string; page?: number;
}): { lignes: LigneAgence[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    conditions.push("(a.nom LIKE ? OR a.email LIKE ? OR a.telephone LIKE ? OR a.ville LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m, m);
  }
  if (f.statut === "suspendue") conditions.push("a.suspendue_le IS NOT NULL");
  if (f.statut === "active") conditions.push("a.suspendue_le IS NULL");
  if (f.plan) { conditions.push("a.plan = ?"); params.push(f.plan); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(`SELECT COUNT(*) AS n FROM agences a ${ou}`, ...params)?.n ?? 0;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lignes = tous<LigneAgence>(
    `SELECT a.id, a.nom, a.slug, a.ville, a.email, a.telephone, a.plan,
            a.plan_expire_le, a.cree_le, a.suspendue_le,
            (SELECT COUNT(*) FROM biens       b WHERE b.agence_id = a.id) AS nb_biens,
            (SELECT COUNT(*) FROM utilisateurs u WHERE u.agence_id = a.id) AS nb_utilisateurs,
            (SELECT COUNT(*) FROM locataires  l WHERE l.agence_id = a.id) AS nb_locataires
       FROM agences a ${ou}
      ORDER BY a.cree_le DESC
      LIMIT ? OFFSET ?`,
    ...params, PAR_PAGE, (page - 1) * PAR_PAGE,
  );
  return { lignes, total, page, pages };
}

export type FicheAgence = LigneAgence & {
  ninea: string | null; rccm: string | null; adresse: string | null;
  logo_url: string | null; commission_pct: number; notes_internes: string | null;
  motif_suspension: string | null; guide_telecharge_le: string | null;
  nb_annonces: number; nb_factures: number;
};

export function ficheAgence(id: number): FicheAgence | undefined {
  return un<FicheAgence>(
    `SELECT a.*, 
            (SELECT COUNT(*) FROM biens b WHERE b.agence_id = a.id) AS nb_biens,
            (SELECT COUNT(*) FROM biens b WHERE b.agence_id = a.id AND b.publie = 1 AND b.moderation = 'publie') AS nb_annonces,
            (SELECT COUNT(*) FROM utilisateurs u WHERE u.agence_id = a.id) AS nb_utilisateurs,
            (SELECT COUNT(*) FROM locataires  l WHERE l.agence_id = a.id) AS nb_locataires,
            (SELECT COUNT(*) FROM factures    f WHERE f.agence_id = a.id) AS nb_factures
       FROM agences a WHERE a.id = ?`, id,
  );
}

export type MembreAgence = {
  id: number; nom: string; email: string; telephone: string | null;
  role: string; actif: number; cree_le: string;
};

export function membresAgence(agenceId: number): MembreAgence[] {
  return tous<MembreAgence>(
    `SELECT id, nom, email, telephone, role, actif, cree_le
       FROM utilisateurs WHERE agence_id = ? ORDER BY role, nom`, agenceId,
  );
}

// -------------------------------------------------------- les utilisateurs

export type LigneUtilisateur = {
  id: number; nom: string; email: string; telephone: string | null;
  role: string; actif: number; cree_le: string;
  agence_id: number; agence_nom: string; agence_suspendue: string | null;
  nb_sessions: number;
};

export function listerUtilisateurs(f: {
  q?: string; role?: string; statut?: string; agence?: number; page?: number;
}): { lignes: LigneUtilisateur[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    conditions.push("(u.nom LIKE ? OR u.email LIKE ? OR u.telephone LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m);
  }
  if (f.role) { conditions.push("u.role = ?"); params.push(f.role); }
  if (f.statut === "actif") conditions.push("u.actif = 1");
  if (f.statut === "suspendu") conditions.push("u.actif = 0");
  if (f.agence) { conditions.push("u.agence_id = ?"); params.push(f.agence); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(`SELECT COUNT(*) AS n FROM utilisateurs u ${ou}`, ...params)?.n ?? 0;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lignes = tous<LigneUtilisateur>(
    `SELECT u.id, u.nom, u.email, u.telephone, u.role, u.actif, u.cree_le,
            u.agence_id, a.nom AS agence_nom, a.suspendue_le AS agence_suspendue,
            (SELECT COUNT(*) FROM sessions s WHERE s.utilisateur_id = u.id
               AND s.expire_le > datetime('now')) AS nb_sessions
       FROM utilisateurs u JOIN agences a ON a.id = u.agence_id ${ou}
      ORDER BY u.cree_le DESC LIMIT ? OFFSET ?`,
    ...params, PAR_PAGE, (page - 1) * PAR_PAGE,
  );
  return { lignes, total, page, pages };
}

// ------------------------------------------------------------ les annonces

export type LigneAnnonce = {
  id: number; titre: string; reference: string; type: string; ville: string;
  quartier: string | null; loyer: number; prix_nuit: number; courte_duree: number;
  statut: string; publie: number; moderation: string; moderation_motif: string | null;
  moderation_le: string | null; moderation_par: string | null;
  photos: string | null; cree_le: string;
  agence_id: number; agence_nom: string;
};

export function listerAnnonces(f: {
  q?: string; moderation?: string; ville?: string; type?: string; agence?: number; page?: number;
}): { lignes: LigneAnnonce[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    conditions.push("(b.titre LIKE ? OR b.reference LIKE ? OR b.quartier LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m);
  }
  if (f.moderation) { conditions.push("b.moderation = ?"); params.push(f.moderation); }
  if (f.ville) { conditions.push("b.ville = ?"); params.push(f.ville); }
  if (f.type) { conditions.push("b.type = ?"); params.push(f.type); }
  if (f.agence) { conditions.push("b.agence_id = ?"); params.push(f.agence); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(`SELECT COUNT(*) AS n FROM biens b ${ou}`, ...params)?.n ?? 0;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lignes = tous<LigneAnnonce>(
    `SELECT b.id, b.titre, b.reference, b.type, b.ville, b.quartier, b.loyer,
            b.prix_nuit, b.courte_duree, b.statut, b.publie, b.moderation,
            b.moderation_motif, b.moderation_le, b.moderation_par, b.photos, b.cree_le,
            b.agence_id, a.nom AS agence_nom
       FROM biens b JOIN agences a ON a.id = b.agence_id ${ou}
      ORDER BY b.cree_le DESC LIMIT ? OFFSET ?`,
    ...params, PAR_PAGE, (page - 1) * PAR_PAGE,
  );
  return { lignes, total, page, pages };
}

// ------------------------------------------------------------- les artisans

export type LigneArtisan = {
  id: number; nom: string; metier: string; ville: string; quartier: string | null;
  telephone: string; email: string | null; origine: string; publie: number;
  statut_candidature: string; quiz_reussi: number; quiz_score: number | null;
  quiz_total: number | null; verifie_le: string | null; verifie_par: string | null;
  suspendu_le: string | null; motif_suspension: string | null;
  cv_url: string | null; documents: string | null; cree_le: string;
  agence_nom: string | null; nb_avis: number; note_moyenne: number | null;
};

export function listerArtisans(f: {
  q?: string; statut?: string; metier?: string; page?: number;
}): { lignes: LigneArtisan[]; total: number; page: number; pages: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    conditions.push("(a.nom LIKE ? OR a.telephone LIKE ? OR a.email LIKE ? OR a.ville LIKE ?)");
    const m = `%${f.q}%`;
    params.push(m, m, m, m);
  }
  if (f.statut === "suspendu") conditions.push("a.suspendu_le IS NOT NULL");
  if (f.statut === "verifie") conditions.push("a.verifie_le IS NOT NULL");
  if (f.statut === "en_attente") conditions.push("a.statut_candidature = 'en_attente'");
  if (f.metier) { conditions.push("a.metier = ?"); params.push(f.metier); }

  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(`SELECT COUNT(*) AS n FROM artisans a ${ou}`, ...params)?.n ?? 0;
  const page = Math.max(1, f.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lignes = tous<LigneArtisan>(
    `SELECT a.*, ag.nom AS agence_nom,
            (SELECT COUNT(*) FROM avis v WHERE v.artisan_id = a.id AND v.publie = 1) AS nb_avis,
            (SELECT ROUND(AVG(note), 1) FROM avis v WHERE v.artisan_id = a.id AND v.publie = 1) AS note_moyenne
       FROM artisans a LEFT JOIN agences ag ON ag.id = a.agence_id ${ou}
      ORDER BY a.cree_le DESC LIMIT ? OFFSET ?`,
    ...params, PAR_PAGE, (page - 1) * PAR_PAGE,
  );
  return { lignes, total, page, pages };
}

// -------------------------------------------------------- les integrations

export type Integration = {
  nom: string;
  role: string;
  configuree: boolean;
  /** Ce qu'il manque, en clair. JAMAIS la valeur d'un secret. */
  detail: string;
};

/**
 * L'etat des raccordements, lu dans les variables d'environnement.
 *
 * On ne montre QUE « posée » ou « absente ». Jamais la valeur, jamais un
 * extrait, jamais les derniers caracteres : une cle partiellement affichee
 * reste une cle partiellement divulguee, et elle finirait dans une capture
 * d'ecran envoyee au support.
 */
export function etatIntegrations(): Integration[] {
  const pose = (v?: string) => Boolean(v && v.trim());
  return [
    {
      nom: "Envoi d'e-mails (SMTP)",
      role: "Récupération de mot de passe, documents envoyés aux locataires.",
      configuree: pose(process.env.SMTP_HOST) && pose(process.env.SMTP_USER) && pose(process.env.SMTP_PASS),
      detail: "Variables SMTP_HOST, SMTP_USER, SMTP_PASS.",
    },
    {
      nom: "Adresse publique du site",
      role: "Liens dans les e-mails et les aperçus de partage.",
      configuree: pose(process.env.ADRESSE_SITE),
      detail: "Variable ADRESSE_SITE.",
    },
    {
      nom: "Abonnements — PayDunya",
      role: "Règlement des abonnements en FCFA (Orange Money, Wave, carte).",
      configuree: pose(process.env.ABONNEMENT_CLE_MAITRE)
        && pose(process.env.ABONNEMENT_CLE_PRIVEE) && pose(process.env.ABONNEMENT_JETON),
      detail: `Variables ABONNEMENT_CLE_MAITRE, ABONNEMENT_CLE_PRIVEE, ABONNEMENT_JETON. `
        + `Mode : ${process.env.ABONNEMENT_MODE === "reel" ? "réel" : "test"}.`,
    },
    {
      nom: "Abonnements — Stripe",
      role: "Règlement par carte internationale, pour la diaspora.",
      configuree: pose(process.env.ABONNEMENT_STRIPE_CLE_SECRETE),
      detail: "Variables ABONNEMENT_STRIPE_CLE_SECRETE, ABONNEMENT_STRIPE_CLE_WEBHOOK.",
    },
    {
      nom: "Chiffrement des secrets",
      role: "Protège au repos les clés marchandes des agences et les secrets de double vérification.",
      configuree: (process.env.CLE_CHIFFREMENT ?? "").length >= 16,
      detail: "Variable CLE_CHIFFREMENT, seize caractères au minimum.",
    },
    {
      nom: "Administrateurs racine",
      role: "Désigne les super administrateurs, hors de portée de l'application.",
      configuree: pose(process.env.ADMIN_EMAILS),
      detail: "Variable ADMIN_EMAILS.",
    },
  ];
}
