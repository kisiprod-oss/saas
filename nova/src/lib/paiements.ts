/**
 * Les prestataires de paiement.
 *
 * ============================================================================
 *  ÉTAT DÉCLARÉ, ET RIEN D'AUTRE
 * ============================================================================
 *  Chaque prestataire annonce ici son état RÉEL dans ce dépôt :
 *
 *    disponible  — l'intégration est écrite et testée de bout en bout.
 *    a_brancher  — l'ossature existe (webhook, signature, idempotence) mais
 *                  la documentation officielle n'a pas été vérifiée et aucune
 *                  transaction réelle n'a été faite. Le mode test fonctionne ;
 *                  le mode réel est refusé côté serveur.
 *    etudie      — rien n'est écrit. Le prestataire figure dans la liste
 *                  parce que son marché le rend incontournable.
 *
 *  Une interface n'affiche JAMAIS « opérationnel » pour un prestataire qui ne
 *  l'est pas. Ce fichier est la source unique de cette information, et
 *  `actions-reglages.ts` refuse le passage en mode réel pour tout ce qui n'est
 *  pas `disponible`.
 *
 *  AVANT DE FAIRE PASSER UN PRESTATAIRE À « disponible » :
 *    1. lire sa documentation officielle en vigueur (les API Mobile Money
 *       d'Afrique de l'Ouest changent souvent et sans préavis) ;
 *    2. vérifier qu'il expose bien une signature de notification vérifiable ;
 *    3. faire une transaction réelle de bout en bout en environnement bac
 *       à sable, puis une en production ;
 *    4. vérifier qu'un même événement rejoué ne crée pas de doublon.
 * ============================================================================
 */

export type EtatFournisseur = "disponible" | "a_brancher" | "etudie";

export type Fournisseur = {
  code: string;
  nom: string;
  /** Codes pays où le prestataire opère. */
  pays: string[];
  etat: EtatFournisseur;
  /** Ce que le commerçant doit fournir. Affiché tel quel dans l'interface. */
  identifiants: { cle: string; libelle: string; aide: string }[];
  /** Où le commerçant trouve ces informations. */
  ou: string;
  note: string;
};

export const FOURNISSEURS: Fournisseur[] = [
  {
    code: "test",
    nom: "Mode test NOVA",
    pays: ["SN", "CI", "ML", "BF", "BJ", "TG", "CM", "GN"],
    etat: "disponible",
    identifiants: [],
    ou: "Rien à fournir.",
    note: "Simule un paiement pour essayer le parcours complet. Aucun argent ne "
      + "change de main, et chaque commande payée en test est marquée comme telle.",
  },
  {
    code: "paydunya",
    nom: "PayDunya",
    pays: ["SN", "CI", "ML", "BF", "BJ", "TG"],
    etat: "a_brancher",
    identifiants: [
      { cle: "cle_publique", libelle: "Clé publique (public key)", aide: "Commence par « live_public_ » ou « test_public_ »." },
      { cle: "cle_privee", libelle: "Clé privée (private key)", aide: "Ne la partagez avec personne d'autre." },
      { cle: "secret_webhook", libelle: "Master key / secret de notification", aide: "Sert à vérifier que les notifications viennent bien de PayDunya." },
    ],
    ou: "Tableau de bord PayDunya → Intégration → Clés d'API.",
    note: "Agrège Orange Money, Wave, Free Money et les cartes. L'ossature est "
      + "écrite ; la documentation officielle doit être revérifiée et une "
      + "transaction réelle effectuée avant d'annoncer ce moyen de paiement.",
  },
  {
    code: "wave",
    nom: "Wave",
    pays: ["SN", "CI"],
    etat: "etudie",
    identifiants: [
      { cle: "cle_privee", libelle: "Clé d'API", aide: "Fournie par Wave Business." },
      { cle: "secret_webhook", libelle: "Secret de webhook", aide: "Sert à vérifier la signature des notifications." },
    ],
    ou: "Compte Wave Business (accès sur demande auprès de Wave).",
    note: "Très répandu au Sénégal. L'accès à l'API demande un compte marchand "
      + "validé par Wave ; aucune intégration n'est écrite à ce jour.",
  },
  {
    code: "orange_money",
    nom: "Orange Money",
    pays: ["SN", "ML", "BF", "CI", "GN", "CM"],
    etat: "etudie",
    identifiants: [
      { cle: "cle_publique", libelle: "Merchant key", aide: "Identifiant marchand Orange." },
      { cle: "cle_privee", libelle: "Client secret", aide: "Délivré avec l'accès à l'API." },
    ],
    ou: "Portail développeur Orange (developer.orange.com), après validation du compte marchand.",
    note: "L'API Web Payment diffère d'un pays à l'autre. À traiter pays par "
      + "pays plutôt qu'en une seule intégration.",
  },
];

export function fournisseurPar(code: string | null | undefined): Fournisseur | undefined {
  return FOURNISSEURS.find((f) => f.code === code);
}

export function fournisseursPour(pays: string): Fournisseur[] {
  return FOURNISSEURS.filter((f) => f.pays.includes(pays));
}

export const ETATS_LIBELLES: Record<EtatFournisseur, { texte: string; ton: string }> = {
  disponible: { texte: "Utilisable", ton: "puce-vert" },
  a_brancher: { texte: "Mode test seulement", ton: "puce-terre" },
  etudie: { texte: "Pas encore intégré", ton: "puce-neutre" },
};
