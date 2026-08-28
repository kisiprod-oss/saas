/**
 * Identite de l'editeur du service, reprise sur les pages legales.
 *
 * Deux situations sont prevues :
 *
 *  • `statut: "personne_physique"` — la societe n'est pas encore immatriculee.
 *    Le service peut fonctionner et etre teste, mais SANS FACTURER. NINEA et
 *    RCCM sont alors absents, ce qui est normal, et les pages legales
 *    l'indiquent honnetement.
 *
 *  • `statut: "societe"` — une fois l'immatriculation obtenue au guichet
 *    unique. Renseignez alors raisonSociale, formeJuridique, ninea et rccm,
 *    et basculez ce champ.
 *
 * Tant qu'une valeur applicable commence par « À COMPLÉTER », un bandeau
 * d'avertissement s'affiche sur les pages legales.
 */

export const EDITEUR = {
  service: "Sen Gestion",

  /** "personne_physique" avant immatriculation, "societe" apres. */
  statut: "personne_physique" as "personne_physique" | "societe",

  /** Votre nom tant que la societe n'existe pas, sa raison sociale ensuite. */
  raisonSociale: "Isidore Mendy",
  formeJuridique: "Entreprise en cours d'immatriculation",
  responsable: "Isidore Mendy",

  /** Laisses vides tant que le statut est "personne_physique". */
  ninea: "",
  rccm: "",

  adresse: "À COMPLÉTER — adresse",
  ville: "Dakar",
  pays: "Sénégal",
  telephone: "À COMPLÉTER",
  email: "À COMPLÉTER — contact@sengestion.sn",
  hebergeur: "Hostinger International Ltd, 61 Lordou Vironos, 6023 Larnaca, Chypre",

  /** Numero et date de recepisse de declaration aupres de la CDP. */
  declarationCdp: "À COMPLÉTER — numéro et date de récépissé CDP",
};

/** Champs qui doivent etre renseignes, selon le statut de l'editeur. */
function champsApplicables(): string[] {
  const communs = [
    EDITEUR.raisonSociale, EDITEUR.responsable, EDITEUR.adresse,
    EDITEUR.telephone, EDITEUR.email, EDITEUR.hebergeur, EDITEUR.declarationCdp,
  ];
  // NINEA et RCCM n'existent qu'une fois la societe immatriculee.
  return EDITEUR.statut === "societe"
    ? [...communs, EDITEUR.formeJuridique, EDITEUR.ninea, EDITEUR.rccm]
    : communs;
}

/** Vrai si des mentions applicables n'ont pas encore ete renseignees. */
export function mentionsIncompletes(): boolean {
  return champsApplicables().some((v) => !v || v.startsWith("À COMPLÉTER"));
}

/** Vrai tant que la societe n'est pas immatriculee : facturation impossible. */
export function avantImmatriculation(): boolean {
  return EDITEUR.statut !== "societe";
}
