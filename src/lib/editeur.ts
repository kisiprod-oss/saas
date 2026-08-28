/**
 * Identite de l'editeur du service, reprise sur les pages legales.
 *
 * ⚠️ À COMPLETER avant la mise en ligne : tant qu'une valeur commence par
 * « À COMPLÉTER », un bandeau d'avertissement s'affiche sur les pages
 * legales pour que l'oubli ne passe pas inapercu.
 */

export const EDITEUR = {
  service: "Sen Gestion",
  raisonSociale: "À COMPLÉTER — raison sociale",
  formeJuridique: "À COMPLÉTER — SARL, SUARL, entreprise individuelle…",
  responsable: "Isidore Mendy",
  ninea: "À COMPLÉTER",
  rccm: "À COMPLÉTER",
  adresse: "À COMPLÉTER — adresse du siège",
  ville: "Dakar",
  pays: "Sénégal",
  telephone: "À COMPLÉTER",
  email: "À COMPLÉTER — contact@sengestion.sn",
  hebergeur: "À COMPLÉTER — nom, adresse et pays de l'hébergeur",
  /** Date de la déclaration du traitement auprès de la CDP. */
  declarationCdp: "À COMPLÉTER — numéro et date de récépissé CDP",
};

/** Vrai si des mentions n'ont pas encore ete renseignees. */
export function mentionsIncompletes(): boolean {
  return Object.values(EDITEUR).some((v) => v.startsWith("À COMPLÉTER"));
}
