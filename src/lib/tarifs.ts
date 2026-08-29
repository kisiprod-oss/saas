/**
 * Formules d'abonnement de Sen Gestion.
 *
 * Positionnement : plusieurs concurrents ouest-africains sont gratuits, la
 * formule Decouverte doit donc etre plus genereuse que la leur. Les paliers
 * payants restent sous 2 % de la commission encaissee par l'agence
 * (7 a 9 % du loyer au Senegal), ce qui les rend indolores.
 */

/**
 * Factures mensuelles offertes par la formule gratuite.
 *
 * Declaree ici et non dans quota.ts parce que la page tarifs, cote client,
 * doit l'afficher : quota.ts est « server-only ». C'est donc ce fichier qui
 * fait foi, et quota.ts l'importe — la valeur n'existe qu'une fois.
 */
export const FACTURES_GRATUITES_PAR_MOIS = 5;

export type Plan = {
  code: string;
  nom: string;
  /** Prix mensuel en FCFA. */
  prixMois: number;
  /** Prix annuel en FCFA : dix mois payes, douze utilises. */
  prixAn: number;
  pour: string;
  /** null = illimite */
  maxBiens: number | null;
  maxUtilisateurs: number | null;
  atouts: string[];
  /** Annonce honnete : promis, mais pas encore construit. */
  bientot?: string[];
  /** Factures emises par mois. null = sans limite. */
  maxFacturesMois?: number | null;
  populaire?: boolean;
};

export const PLANS: Plan[] = [
  {
    code: "decouverte",
    nom: "Découverte",
    prixMois: 0,
    prixAn: 0,
    pour: "Pour essayer sans risque",
    maxBiens: 3,
    maxUtilisateurs: 1,
    maxFacturesMois: FACTURES_GRATUITES_PAR_MOIS,
    atouts: [
      "3 biens",
      "Annonces sur la vitrine publique",
      "Locataires et contrats de bail",
      "Factures et quittances imprimables",
      "Demandes de visite reçues en ligne",
      `${FACTURES_GRATUITES_PAR_MOIS} factures par mois`,
      "Gratuit, sans carte bancaire et sans limite de durée",
    ],
  },
  {
    code: "bailleur",
    nom: "Bailleur",
    prixMois: 5_000,
    prixAn: 50_000,
    pour: "Propriétaires particuliers et diaspora",
    maxBiens: 10,
    maxUtilisateurs: 2,
    atouts: [
      "10 biens",
      "Photos prises depuis le téléphone",
      "Relances WhatsApp des impayés",
      "Espace locataire : quittances et déclaration des paiements",
      "Suivi des paiements Orange Money et Wave",
      "Téléchargement de vos données à tout moment",
      "Tout ce que contient la formule Découverte",
    ],
    bientot: ["Plusieurs utilisateurs"],
  },
  {
    code: "agence",
    nom: "Agence",
    prixMois: 20_000,
    prixAn: 200_000,
    pour: "Le cœur de métier d'une agence",
    maxBiens: 50,
    maxUtilisateurs: 5,
    populaire: true,
    atouts: [
      "50 biens",
      "Messages de relance à votre nom",
      "Tableau de bord des impayés et du recouvrement",
      "Assistance prioritaire par WhatsApp",
      "Tout ce que contient la formule Bailleur",
    ],
    bientot: ["Export comptable", "Reversement aux propriétaires"],
  },
  {
    code: "pro",
    nom: "Agence Pro",
    prixMois: 45_000,
    prixAn: 450_000,
    pour: "Réseaux, syndics et gros portefeuilles",
    maxBiens: null,
    maxUtilisateurs: null,
    atouts: [
      "Biens illimités",
      "Accompagnement à la mise en route",
      "Sauvegarde quotidienne de vos données",
      "Tout ce que contient la formule Agence",
    ],
    bientot: ["Plusieurs agences sur un même compte", "Accès aux données par programme"],
  },
];

export const PLAN_PAR_DEFAUT = "decouverte";

/**
 * Prix affiche d'une formule, en tenant compte de l'essai.
 * Rendu separement du nombre pour que la page tarifs et le tableau de bord
 * disent exactement la meme chose.
 */


export function plan(code: string | null | undefined): Plan {
  return PLANS.find((p) => p.code === code) ?? PLANS[0];
}

/** Vrai si l'agence peut encore ajouter un bien. */
export function peutAjouterBien(codePlan: string | null, biensActuels: number): boolean {
  const max = plan(codePlan).maxBiens;
  return max === null || biensActuels < max;
}

/** Formule immédiatement supérieure, proposée quand la limite est atteinte. */
export function planSuivant(codePlan: string | null): Plan | null {
  const i = PLANS.findIndex((p) => p.code === plan(codePlan).code);
  return i >= 0 && i < PLANS.length - 1 ? PLANS[i + 1] : null;
}

/** Économie réalisée en payant à l'année. */
export function economieAnnuelle(p: Plan): number {
  return p.prixMois * 12 - p.prixAn;
}
