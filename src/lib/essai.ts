import "server-only";

/**
 * Periode d'essai gratuite et lutte contre sa reutilisation.
 *
 * Une agence essaie Sen Gestion pendant six mois, puis prend un abonnement.
 * Deux principes tiennent tout le reste :
 *
 *  1. Un essai expire ne coupe JAMAIS l'acces aux donnees deja saisies.
 *     Une agence doit pouvoir consulter ses baux, retrouver un numero de
 *     locataire et exporter son fichier meme si elle n'a pas encore payé —
 *     ce sont ses donnees, pas les notres. Ce qui s'arrete, c'est la
 *     creation : nouveau bien, nouveau bail, nouvelle facture.
 *
 *  2. L'essai se compte par BOITE AUX LETTRES, pas par chaine de
 *     caracteres. Sans quoi « moi+2@gmail.com » puis « m.o.i@gmail.com »
 *     rouvrent six mois autant de fois qu'on veut, sur la meme boite.
 */

export const DUREE_ESSAI_MOIS = 6;

/**
 * Ramene une adresse a la boite qu'elle designe reellement.
 *
 * Deux regles, et pas une de plus :
 *
 *  • le suffixe « +quelquechose » est ignore. Convention tres repandue
 *    (Gmail, Outlook, Fastmail, Proton…), et son seul usage est justement
 *    de fabriquer des variantes d'une meme adresse.
 *
 *  • les points sont ignores UNIQUEMENT chez Gmail, qui les traite comme
 *    inexistants. Ailleurs, « jean.dupont@ » et « jeandupont@ » peuvent
 *    etre deux personnes differentes : les confondre priverait un inconnu
 *    de son essai. Dans le doute, on ne fusionne pas.
 */
export function normaliserEmail(email: string): string {
  const propre = email.trim().toLowerCase();
  const arobase = propre.lastIndexOf("@");
  if (arobase <= 0) return propre; // adresse invalide : rien a normaliser

  let boite = propre.slice(0, arobase);
  const domaine = propre.slice(arobase + 1);

  const plus = boite.indexOf("+");
  if (plus > 0) boite = boite.slice(0, plus);

  if (domaine === "gmail.com" || domaine === "googlemail.com") {
    boite = boite.replaceAll(".", "");
  }

  return `${boite}@${domaine}`;
}

/** Date de fin d'essai pour une inscription faite maintenant. */
export function finEssai(depuis = new Date()): string {
  const fin = new Date(depuis);
  fin.setMonth(fin.getMonth() + DUREE_ESSAI_MOIS);
  return fin.toISOString().slice(0, 19).replace("T", " ");
}

export type EtatEssai = {
  /** L'agence paie un abonnement : l'essai ne la concerne plus. */
  abonnee: boolean;
  /** Elle est dans sa periode d'essai. */
  enCours: boolean;
  /** L'essai est termine et aucun abonnement n'a pris le relais. */
  expire: boolean;
  /** Jours restants, negatif une fois l'essai passe. */
  joursRestants: number;
  finLe: string | null;
};

type AgenceEssai = { plan: string | null; essai_expire_le: string | null };

/**
 * Ou en est une agence.
 *
 * Une agence sur une formule payante n'est jamais bloquee, quelle que soit
 * la date d'essai laissee en base : c'est l'abonnement qui prime.
 */
export function etatEssai(agence: AgenceEssai): EtatEssai {
  const abonnee = Boolean(agence.plan) && agence.plan !== "decouverte";
  const fin = agence.essai_expire_le;

  if (abonnee || !fin) {
    return { abonnee, enCours: !abonnee, expire: false, joursRestants: 0, finLe: fin };
  }

  const restant = new Date(fin.replace(" ", "T") + "Z").getTime() - Date.now();
  const jours = Math.ceil(restant / 86_400_000);

  return {
    abonnee: false,
    enCours: restant > 0,
    expire: restant <= 0,
    joursRestants: jours,
    finLe: fin,
  };
}

/** Vrai si l'agence peut encore creer des donnees (bien, bail, facture…). */
export function peutEcrire(agence: AgenceEssai): boolean {
  return !etatEssai(agence).expire;
}
