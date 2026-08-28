/**
 * Formules d'abonnement de Sen Gestion.
 *
 * Positionnement : plusieurs concurrents ouest-africains sont gratuits, la
 * formule Decouverte doit donc etre plus genereuse que la leur. Les paliers
 * payants restent sous 2 % de la commission encaissee par l'agence
 * (7 a 9 % du loyer au Senegal), ce qui les rend indolores.
 */

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
    atouts: [
      "3 biens",
      "1 utilisateur",
      "Annonces sur la vitrine publique",
      "Contrats de bail et locataires",
      "Factures et quittances imprimables",
      "Gratuit pour toujours, sans carte bancaire",
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
      "2 utilisateurs",
      "Photos depuis le téléphone",
      "Relances WhatsApp automatiques",
      "Suivi des paiements Orange Money et Wave",
      "Tout ce que contient la formule Découverte",
    ],
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
      "5 utilisateurs",
      "Reversement aux propriétaires",
      "Export comptable",
      "Assistance prioritaire par WhatsApp",
      "Tout ce que contient la formule Bailleur",
    ],
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
      "Utilisateurs illimités",
      "Plusieurs agences sur un même compte",
      "Accompagnement à la mise en route",
      "Sauvegardes et accès aux données",
      "Tout ce que contient la formule Agence",
    ],
  },
];

export const PLAN_PAR_DEFAUT = "decouverte";

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
