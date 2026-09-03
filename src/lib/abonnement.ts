import "server-only";
import { ecrire, tous, un } from "./db";
import { avantImmatriculation } from "./editeur";
import { PLANS, plan, type Plan } from "./tarifs";
import { creerPaiement, verifierPaiement, type ClesAgence } from "./encaissement";
import {
  fcfaEnEuros, ouvrirSessionStripe, relireSessionStripe, stripeConfigure, versCentimesEuro,
} from "./stripe-abonnement";

/**
 * Encaissement des abonnements a Sen Gestion.
 *
 * A NE PAS CONFONDRE avec encaissement.ts, qui fait payer le LOCATAIRE au
 * profit de SON AGENCE, avec les cles de cette agence. Ici, c'est l'AGENCE
 * qui paie l'EDITEUR, avec les cles de l'editeur. Deux flux, deux comptes
 * marchands, deux tables.
 *
 * DEUX FOURNISSEURS, UNE SEULE TABLE. PayDunya (Orange Money, Wave, Free
 * Money, carte locale) et Stripe (carte internationale, pour une entite hors
 * Senegal) sont ADDITIFS : une agence choisit celui qui lui convient, aucun
 * ne remplace l'autre. Stripe facture en euros (le XOF n'existe pas dans ses
 * devises) ; `montant` reste TOUJOURS en FCFA pour que les deux fournisseurs
 * s'additionnent sans conversion approximative - le XOF est arrime a taux
 * FIXE a l'euro. `montant_devise` porte, lui, ce qui a reellement ete
 * factule au payeur, pour son propre relevé.
 *
 * VERROU LEGAL. Tant que la societe editrice n'est pas immatriculee, les CGU
 * publiees promettent noir sur blanc que le service est gratuit et
 * qu'« aucune somme n'est due ». Encaisser malgre cela reviendrait a
 * contredire son propre contrat, et a facturer sans NINEA ni RCCM. Le module
 * reste donc inerte tant que `EDITEUR.statut` n'est pas "societe" : ce n'est
 * pas une precaution decorative, c'est la condition qui rend la suite licite.
 *
 * Regle de securite : la notification d'un fournisseur ne prouve RIEN par
 * elle-meme. Pour PayDunya (sans signature), on redemande systematiquement
 * le statut au fournisseur. Pour Stripe (signe), on verifie la signature ET
 * on redemande la session - la signature prouve l'expediteur, la relecture
 * protege d'un evenement rejoue ou perime.
 */

/** Cles marchandes PayDunya de l'editeur, lues dans l'environnement du serveur. */
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

/** Vrai si PayDunya est utilisable pour les abonnements, ici et maintenant. */
export function paydunyaDisponible(): boolean {
  return !avantImmatriculation() && clesEditeur() !== null;
}

/** Vrai si Stripe est utilisable pour les abonnements, ici et maintenant. */
export function stripeDisponible(): boolean {
  return !avantImmatriculation() && stripeConfigure();
}

/** Vrai si AU MOINS UN moyen de paiement fonctionne. */
export function abonnementConfigure(): boolean {
  return paydunyaDisponible() || stripeDisponible();
}

/**
 * Pourquoi l'encaissement n'est disponible sur aucun fournisseur, en clair.
 * Renvoie null des qu'un seul fonctionne : l'agence n'a besoin que d'un
 * moyen de payer, pas des deux.
 */
export function obstacleAbonnement(): string | null {
  if (avantImmatriculation()) {
    return "La société éditrice n'est pas encore immatriculée. Les CGU en vigueur"
      + " annoncent que le service est gratuit : aucun abonnement ne peut donc"
      + " être encaissé avant l'immatriculation et l'information des agences.";
  }
  if (!clesEditeur() && !stripeConfigure()) {
    return "Aucun moyen de paiement n'est configuré : ni PayDunya"
      + " (ABONNEMENT_CLE_MAITRE, ABONNEMENT_CLE_PRIVEE, ABONNEMENT_JETON),"
      + " ni Stripe (ABONNEMENT_STRIPE_CLE_SECRETE, ABONNEMENT_STRIPE_CLE_WEBHOOK).";
  }
  return null;
}

/** Mode reel ou bac a sable de PayDunya, pour l'afficher sans exposer les cles. */
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

/** Prix d'une formule affiché en euros, pour le bouton de paiement Stripe. */
export function prixEurDe(p: Plan, periodicite: Periodicite): string {
  return fcfaEnEuros(prixDe(p, periodicite));
}

export type LigneAbonnement = {
  id: number;
  agence_id: number;
  plan: string;
  periodicite: string;
  montant: number;
  devise: string;
  montant_devise: number | null;
  statut: string;
  fournisseur: string;
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

/**
 * Ouvre un paiement d'abonnement PAR PAYDUNYA et renvoie l'adresse ou
 * l'agence doit payer. Rien n'est accorde a ce stade : la ligne reste
 * « initiee ».
 */
export async function ouvrirReglement(
  agence: { id: number; nom: string; telephone: string | null },
  codePlan: string,
  periodicite: Periodicite,
  adresseSite: string,
): Promise<{ ok: true; url: string } | { ok: false; erreur: string }> {
  if (!paydunyaDisponible()) return { ok: false, erreur: obstacleAbonnement() ?? "PayDunya n'est pas configuré." };

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
    `INSERT INTO abonnements (agence_id, plan, periodicite, montant, devise, statut, fournisseur, jeton)
     VALUES (?, ?, ?, ?, 'XOF', 'initiee', 'paydunya', ?)`,
    agence.id, formule.code, periodicite, montant, paiement.jeton,
  );

  return { ok: true, url: paiement.url };
}

/**
 * Ouvre un paiement d'abonnement PAR STRIPE (carte internationale, en euros)
 * et renvoie l'adresse de paiement hebergee par Stripe.
 */
export async function ouvrirReglementStripe(
  agence: { id: number },
  codePlan: string,
  periodicite: Periodicite,
  adresseSite: string,
): Promise<{ ok: true; url: string } | { ok: false; erreur: string }> {
  if (!stripeDisponible()) return { ok: false, erreur: obstacleAbonnement() ?? "Stripe n'est pas configuré." };

  const formule = plansPayants().find((p) => p.code === codePlan);
  if (!formule) return { ok: false, erreur: "Formule inconnue." };

  const montantFcfa = prixDe(formule, periodicite);
  if (montantFcfa <= 0) return { ok: false, erreur: "Cette formule est gratuite." };

  const ouverture = await ouvrirSessionStripe({
    montantFcfa,
    description: `Abonnement Sen Gestion — formule ${formule.nom} (${periodicite === "an" ? "1 an" : "1 mois"})`,
    urlRetour: `${adresseSite}/dashboard/abonnement?retour=1`,
    urlAnnulation: `${adresseSite}/dashboard/abonnement?annule=1`,
    reference: { agence: String(agence.id), plan: formule.code, periodicite },
  });

  if (!ouverture.ok) return { ok: false, erreur: ouverture.erreur };

  // Le jeton d'une session Stripe n'est connu qu'apres sa creation : on ne
  // peut pas le lire dans `ouverture.url` (Stripe l'y encode, mais de facon
  // non garantie dans le temps) — creerSessionStripe le renvoie donc a part.
  ecrire(
    `INSERT INTO abonnements
       (agence_id, plan, periodicite, montant, devise, montant_devise, statut, fournisseur, jeton)
     VALUES (?, ?, ?, ?, 'EUR', ?, 'initiee', 'stripe', ?)`,
    agence.id, formule.code, periodicite, montantFcfa,
    versCentimesEuro(montantFcfa), ouverture.jeton,
  );

  return { ok: true, url: ouverture.url };
}

/**
 * Ajoute un mois ou un an, en bornant au dernier jour reel du mois d'arrivee.
 *
 * Sans ce bornage, JavaScript deborde : le 31 janvier + 1 mois donne le
 * 3 mars, parce que « 31 fevrier » se reporte sur mars. Une agence qui
 * reglait un 31 recevait ainsi jusqu'a 31 jours gratuits, et le mois de
 * fevrier faisait deraper toutes les echeances suivantes. On vise donc le
 * 1er du mois cible, puis on repose le jour d'origine sans depasser la fin
 * de ce mois : le 31 janvier + 1 mois donne le 28 fevrier.
 */
function decaler(depuis: Date, periodicite: Periodicite): string {
  const d = new Date(depuis);
  const jour = d.getUTCDate();

  if (periodicite === "an") d.setUTCFullYear(d.getUTCFullYear() + 1, d.getUTCMonth(), 1);
  else d.setUTCMonth(d.getUTCMonth() + 1, 1);

  // Le jour 0 du mois suivant EST le dernier jour du mois vise.
  const dernierJour = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(jour, dernierJour));

  return d.toISOString().slice(0, 10);
}

/**
 * Accorde effectivement la formule, une fois le paiement confirme aupres du
 * fournisseur - commun a PayDunya et Stripe pour ne pas dupliquer le calcul
 * de date, le seul endroit ou une erreur couterait cher.
 *
 * La nouvelle periode prolonge celle en cours si elle n'est pas finie, sinon
 * elle part d'aujourd'hui : une agence qui renouvelle en avance ne perd pas
 * les jours qu'elle a deja payes.
 */
function accorderPeriode(ligne: LigneAbonnement, detail: string): void {
  const agence = un<{ plan: string; plan_expire_le: string | null }>(
    "SELECT plan, plan_expire_le FROM agences WHERE id = ?", ligne.agence_id,
  );
  const aujourdhui = new Date();

  // Le report du temps restant ne vaut que pour un RENOUVELLEMENT de la meme
  // formule. Sur un changement de formule, il partait de l'ancienne echeance :
  // une agence qui avait un an de Bailleur devant elle obtenait cette annee
  // entiere en Pro pour le prix d'un mois. Un changement repart donc
  // d'aujourd'hui, et le temps deja paye sur l'ancienne formule est perdu —
  // c'est la regle habituelle, et l'ecran devra le dire avant de facturer.
  const memeFormule = agence?.plan === ligne.plan;
  const finActuelle = memeFormule && agence?.plan_expire_le
    ? new Date(agence.plan_expire_le)
    : null;
  const depart = finActuelle && finActuelle > aujourdhui ? finActuelle : aujourdhui;
  const fin = decaler(depart, ligne.periodicite === "an" ? "an" : "mois");

  // `statut != 'payee'` dans le WHERE fait office de verrou : deux
  // notifications simultanees pour le meme reglement passent toutes les deux
  // la verification de statut faite plus haut (elle est separee de l'ecriture
  // par un appel reseau), mais une seule modifiera la ligne. La seconde voit
  // zero ligne touchee et n'accorde rien — sans cela, la periode etait
  // creditee deux fois.
  const verrou = ecrire(
    `UPDATE abonnements
        SET statut = 'payee', detail = ?, confirme_le = datetime('now'),
            couvre_du = ?, couvre_au = ?
      WHERE id = ? AND statut != 'payee'`,
    detail, depart.toISOString().slice(0, 10), fin, ligne.id,
  );
  if (verrou.changes === 0) return;

  ecrire(
    "UPDATE agences SET plan = ?, plan_expire_le = ? WHERE id = ?",
    ligne.plan, fin, ligne.agence_id,
  );
}

/**
 * Confirme un reglement PAYDUNYA a partir de son jeton.
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

  // PayDunya n'accompagne pas toujours son statut du montant. Refuser
  // bloquerait un reglement authentique ; on accorde donc la periode — le
  // statut vient de notre propre appel authentifie — mais on ecrit noir sur
  // blanc que le montant n'a pas pu etre recoupe.
  accorderPeriode(
    ligne,
    montant === null ? `${detail} (montant non communiqué par le fournisseur)` : detail,
  );
  return { ok: true, statut: "payee" };
}

/**
 * Confirme un reglement STRIPE a partir de l'identifiant de session.
 *
 * Le webhook a deja verifie la signature avant d'appeler cette fonction :
 * on redemande malgre tout la session directement a Stripe, pour se proteger
 * d'un evenement rejoue ou perime, et pour lire le montant reellement payé.
 */
export async function confirmerAbonnementStripe(
  sessionId: string,
): Promise<{ ok: true; statut: string } | { ok: false; erreur: string }> {
  const ligne = un<LigneAbonnement>(
    "SELECT * FROM abonnements WHERE jeton = ? AND fournisseur = 'stripe'", sessionId,
  );
  if (!ligne) return { ok: false, erreur: "Règlement inconnu." };

  if (ligne.statut === "payee") return { ok: true, statut: "payee" };

  const relecture = await relireSessionStripe(sessionId);
  if (!relecture.ok) return { ok: false, erreur: relecture.erreur };

  const { statutPaiement, montantCentimes } = relecture.session;

  if (statutPaiement !== "paye") {
    ecrire(
      "UPDATE abonnements SET statut = ? WHERE id = ?",
      statutPaiement === "expire" ? "annulee" : "initiee", ligne.id,
    );
    return { ok: true, statut: statutPaiement };
  }

  // On refuse par defaut : un montant attendu absent ou un montant recu que
  // Stripe ne nous donne pas sont des anomalies, pas des feux verts. Accorder
  // la formule « dans le doute » reviendrait a l'offrir.
  const attendu = ligne.montant_devise;
  if (attendu === null || montantCentimes === null || montantCentimes < attendu) {
    ecrire(
      "UPDATE abonnements SET statut = 'echouee', detail = ? WHERE id = ?",
      `Montant reçu (${montantCentimes ?? "inconnu"}) contre ${attendu ?? "inconnu"} attendu, en centimes.`,
      ligne.id,
    );
    return { ok: false, erreur: "Montant non vérifiable ou insuffisant." };
  }

  accorderPeriode(ligne, "Payé par carte via Stripe.");
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
