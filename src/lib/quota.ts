import "server-only";
import { FACTURES_GRATUITES_PAR_MOIS } from "./tarifs";

/**
 * Ce que la formule gratuite permet, et ce qu'elle ne permet pas.
 *
 * La formule Decouverte reste gratuite sans limite de duree : une agence qui
 * gere trois biens peut s'en servir aussi longtemps qu'elle veut. Ce qui est
 * compte, c'est l'EMISSION DE FACTURES — le geste repetitif du metier, celui
 * qu'on refait tous les mois. Au-dela du quota, il faut un abonnement.
 *
 * Ce choix plutot qu'un compte a rebours : une agence n'est jamais coupee de
 * ses donnees a une date couperet. Elle continue de consulter ses baux,
 * d'enregistrer ses loyers et d'imprimer les quittances deja emises. Seule
 * l'emission de NOUVELLES factures s'arrete, et seulement pour le mois en
 * cours : le compteur repart au premier du mois suivant.
 */

// La valeur fait foi dans tarifs.ts, qui est lisible cote client pour la
// page des formules. On l'importe plutot que de la recopier.
export { FACTURES_GRATUITES_PAR_MOIS } from "./tarifs";

/**
 * Ramene une adresse a la boite qu'elle designe reellement.
 *
 * Sans cela, il suffit de se reinscrire sous « moi+2@gmail.com » chaque mois
 * pour retrouver un quota neuf. Deux regles, et pas une de plus :
 *
 *  • le suffixe « +quelquechose » est ignore. Convention tres repandue
 *    (Gmail, Outlook, Fastmail, Proton…), et son seul usage est justement
 *    de fabriquer des variantes d'une meme adresse.
 *
 *  • les points sont ignores UNIQUEMENT chez Gmail, qui les traite comme
 *    inexistants. Ailleurs, « jean.dupont@ » et « jeandupont@ » peuvent
 *    etre deux personnes differentes : les confondre priverait un inconnu
 *    de sa formule gratuite. Dans le doute, on ne fusionne pas.
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

type AgenceQuota = {
  plan: string | null;
  /** 1 si la boite avait deja ouvert un compte gratuit ailleurs. */
  compte_gratuit_reutilise: number;
};

export type EtatQuota = {
  /** Formule payante : aucune limite. */
  illimite: boolean;
  /** Factures autorisees ce mois-ci, null si illimite. */
  quota: number | null;
  emisesCeMois: number;
  restantes: number;
  atteint: boolean;
};

/**
 * Nombre de factures autorisees ce mois-ci.
 *
 * Une agence abonnee n'a aucune limite. Un second compte gratuit ouvert
 * depuis une boite qui en avait deja un n'a droit a aucune facture : sinon
 * la limite se contourne en changeant d'alias.
 */
export function quotaFactures(agence: AgenceQuota): number | null {
  const abonnee = Boolean(agence.plan) && agence.plan !== "decouverte";
  if (abonnee) return null;
  return agence.compte_gratuit_reutilise ? 0 : FACTURES_GRATUITES_PAR_MOIS;
}

export function etatQuota(agence: AgenceQuota, emisesCeMois: number): EtatQuota {
  const quota = quotaFactures(agence);
  if (quota === null) {
    return { illimite: true, quota: null, emisesCeMois, restantes: Infinity, atteint: false };
  }
  const restantes = Math.max(0, quota - emisesCeMois);
  return { illimite: false, quota, emisesCeMois, restantes, atteint: restantes === 0 };
}
