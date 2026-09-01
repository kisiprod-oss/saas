import "server-only";
import { ecrire, tous, un } from "./db";
import { avantImmatriculation } from "./editeur";
import { PLANS, plan, type Plan } from "./tarifs";
import { creerPaiement, verifierPaiement, type ClesAgence } from "./encaissement";

/**
 * Encaissement des abonnements a Sen Gestion.
 *
 * A NE PAS CONFONDRE avec encaissement.ts, qui fait payer le LOCATAIRE au
 * profit de SON AGENCE, avec les cles de cette agence. Ici, c'est l'AGENCE
 * qui paie l'EDITEUR, avec les cles de l'editeur. Deux flux, deux comptes
 * marchands, deux tables.
 *
 * VERROU LEGAL. Tant que la societe editrice n'est pas immatriculee, les CGU
 * publiees promettent noir sur blanc que le service est gratuit et
 * qu'« aucune somme n'est due ». Encaisser malgre cela reviendrait a
 * contredire son propre contrat, et a facturer sans NINEA ni RCCM. Le module
 * reste donc inerte tant que `EDITEUR.statut` n'est pas "societe" : ce n'est
 * pas une precaution decorative, c'est la condition qui rend la suite licite.
 *
 * Regle de securite, reprise telle quelle de l'encaissement des loyers : la
 * notification du fournisseur ne prouve RIEN. Elle dit seulement « va voir ».
 * Seul le statut obtenu en rappelant nous-memes le fournisseur fait foi.
 */

/** Cles marchandes de l'editeur, lues dans l'environnement du serveur. */
function clesEditeur(): ClesAgence | null {
  const cleMaitre = process.env.ABONNEMENT_CLE_MAITRE?.trim();
  const clePrivee = process.env.ABONNEMENT_CLE_PRIVEE?.trim();
  const jeton = process.env.ABONNEMENT_JETON?.trim();
  if (!cleMaitre || !clePrivee || !jeton) return null;

  return {
    fournisseur: "paydunya",
    mode: process.env.ABONNEMENT_MODE === "reel" ? "reel" : "test",
    cleMaitre, clePrivee, jeton,
  };
}

/** Vrai si le paiement des abonnements peut fonctionner, ici et maintenant. */
export function abonnementConfigure(): boolean {
  return !avantImmatriculation() && clesEditeur() !== null;
}

/**
 * Pourquoi l'encaissement n'est pas disponible, en clair.
 * Renvoie null quand tout est en place.
 */
export function obstacleAbonnement(): string | null {
  if (avantImmatriculation()) {
    return "La société éditrice n'est pas encore immatriculée. Les CGU en vigueur"
      + " annoncent que le service est gratuit : aucun abonnement ne peut donc"
      + " être encaissé avant l'immatriculation et l'information des agences.";
  }
  if (!clesEditeur()) {
    return "Les clés marchandes de l'éditeur ne sont pas renseignées"
      + " (ABONNEMENT_CLE_MAITRE, ABONNEMENT_CLE_PRIVEE, ABONNEMENT_JETON).";
  }
  return null;
}

/** Mode reel ou bac a sable, pour l'afficher sans exposer les cles. */
export function modeAbonnement(): "test" | "reel" | null {
  return clesEditeur()?.mode ?? null;
}

export type Periodicite = "mois" | "an";

/** Formules payantes : la formule gratuite ne se regle pas. */
export function plansPayants(): Plan[] {
  return PLANS.filter((p) => p.prixMois > 0);
}

export function prixDe(p: Plan, periodicite: Periodicite): number {
  return periodicite === "an" ? p.prixAn : p.prixMois;
}

export type LigneAbonnement = {
  id: number;
  agence_id: number;
  plan: string;
  periodicite: string;
  montant: number;
  statut: string;
  jeton: string;
  couvre_du: string | null;
  couvre_au: string | null;
  detail: string | null;
  cree_le: string;
  confirme_le: string | null;
};

export function reglementsAgence(agenceId: number): LigneAbonnement[] {
  return tous<LigneAbonnement>(
    "SELECT * FROM abonnements WHERE agence_id = ? ORDER BY cree_le DESC LIMIT 50",
    agenceId,
  );
}

/** Tous les reglements confirmes, pour la vue d'ensemble de l'editeur. */
export function reglementsConfirmes(): (LigneAbonnement & { agence_nom: string })[] {
  return tous<LigneAbonnement & { agence_nom: string }>(
    `SELECT a.*, ag.nom AS agence_nom
       FROM abonnements a JOIN agences ag ON ag.id = a.agence_id
      WHERE a.statut = 'payee'
      ORDER BY a.confirme_le DESC`,
  );
}

/**
 * Ouvre un paiement d'abonnement et renvoie l'adresse ou l'agence doit payer.
 * Rien n'est accorde a ce stade : la ligne reste « initiee ».
 */
export async function ouvrirReglement(
  agence: { id: number; nom: string; telephone: string | null },
  codePlan: string,
  periodicite: Periodicite,
  adresseSite: string,
): Promise<{ ok: true; url: string } | { ok: false; erreur: string }> {
  const obstacle = obstacleAbonnement();
  if (obstacle) return { ok: false, erreur: obstacle };

  const cles = clesEditeur()!;
  const formule = plansPayants().find((p) => p.code === codePlan);
  if (!formule) return { ok: false, erreur: "Formule inconnue." };

  const montant = prixDe(formule, periodicite);
  if (montant <= 0) return { ok: false, erreur: "Cette formule est gratuite." };

  const paiement = await creerPaiement(cles, {
    montant,
    description: `Abonnement Sen Gestion — formule ${formule.nom} (${periodicite === "an" ? "1 an" : "1 mois"})`,
    nomAgence: "Sen Gestion",
    telephoneAgence: null,
    urlNotification: `${adresseSite}/api/abonnement/paydunya`,
    urlRetour: `${adresseSite}/dashboard/abonnement?retour=1`,
    urlAnnulation: `${adresseSite}/dashboard/abonnement?annule=1`,
    reference: { agence: String(agence.id), plan: formule.code, periodicite },
  });

  if (!paiement.ok) return { ok: false, erreur: paiement.erreur };

  ecrire(
    `INSERT INTO abonnements (agence_id, plan, periodicite, montant, statut, jeton)
     VALUES (?, ?, ?, ?, 'initiee', ?)`,
    agence.id, formule.code, periodicite, montant, paiement.jeton,
  );

  return { ok: true, url: paiement.url };
}

/** Ajoute un mois ou un an a une date ISO, en restant sur une date valide. */
function decaler(depuis: Date, periodicite: Periodicite): string {
  const d = new Date(depuis);
  if (periodicite === "an") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Confirme un reglement d'abonnement a partir de son jeton.
 *
 * Appele par le webhook. Redemande au fournisseur ce qui s'est passe, et
 * n'accorde la formule que si l'argent est reellement arrive ET que le
 * montant correspond a ce qui etait attendu.
 */
export async function confirmerAbonnement(
  jeton: string,
): Promise<{ ok: true; statut: string } | { ok: false; erreur: string }> {
  const ligne = un<LigneAbonnement>(
    "SELECT * FROM abonnements WHERE jeton = ? AND fournisseur = 'paydunya'", jeton,
  );
  if (!ligne) return { ok: false, erreur: "Règlement inconnu." };

  // Deja traite : on ne recredite jamais deux fois la meme periode.
  if (ligne.statut === "payee") return { ok: true, statut: "payee" };

  const cles = clesEditeur();
  if (!cles) return { ok: false, erreur: "Clés de l'éditeur absentes." };

  const verif = await verifierPaiement(cles, jeton);
  if (!verif.ok) return { ok: false, erreur: verif.erreur };

  const { statut, montant, detail } = verif.resultat;

  if (statut !== "payee") {
    ecrire(
      "UPDATE abonnements SET statut = ?, detail = ? WHERE id = ?",
      statut === "en_attente" ? "initiee" : statut, detail, ligne.id,
    );
    return { ok: true, statut };
  }

  // Le fournisseur dit « paye » : on verifie que c'est bien le bon montant.
  if (montant !== null && montant < ligne.montant) {
    ecrire(
      "UPDATE abonnements SET statut = 'echouee', detail = ? WHERE id = ?",
      `Montant reçu (${montant}) inférieur au montant attendu (${ligne.montant}).`, ligne.id,
    );
    return { ok: false, erreur: "Montant insuffisant." };
  }

  // La nouvelle periode prolonge celle en cours si elle n'est pas finie,
  // sinon elle part d'aujourd'hui : une agence qui renouvelle en avance ne
  // perd pas les jours qu'elle a deja payes.
  const agence = un<{ plan_expire_le: string | null }>(
    "SELECT plan_expire_le FROM agences WHERE id = ?", ligne.agence_id,
  );
  const aujourdhui = new Date();
  const finActuelle = agence?.plan_expire_le ? new Date(agence.plan_expire_le) : null;
  const depart = finActuelle && finActuelle > aujourdhui ? finActuelle : aujourdhui;
  const fin = decaler(depart, ligne.periodicite === "an" ? "an" : "mois");

  ecrire(
    `UPDATE abonnements
        SET statut = 'payee', detail = ?, confirme_le = datetime('now'),
            couvre_du = ?, couvre_au = ?
      WHERE id = ?`,
    detail, depart.toISOString().slice(0, 10), fin, ligne.id,
  );
  ecrire(
    "UPDATE agences SET plan = ?, plan_expire_le = ? WHERE id = ?",
    ligne.plan, fin, ligne.agence_id,
  );

  return { ok: true, statut: "payee" };
}

/** Formule et echeance en cours d'une agence. */
export function abonnementAgence(agenceId: number) {
  const a = un<{ plan: string; plan_expire_le: string | null }>(
    "SELECT plan, plan_expire_le FROM agences WHERE id = ?", agenceId,
  );
  const formule = plan(a?.plan);
  const expire = a?.plan_expire_le ?? null;
  return {
    formule,
    expire,
    /** Vrai si la periode payee est terminee : la formule n'est plus honoree. */
    echu: Boolean(expire && new Date(expire) < new Date()),
  };
}
