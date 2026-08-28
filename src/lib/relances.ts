/**
 * Relances des loyers impayes.
 *
 * Le logiciel decide seul QUI relancer et A QUEL NIVEAU, en fonction du
 * nombre de jours de retard, puis prepare le message personnalise.
 * L'agent n'a plus qu'a l'envoyer d'un clic sur WhatsApp ou par SMS.
 */

export const NIVEAUX = [
  {
    valeur: "rappel",
    libelle: "Rappel amical",
    joursMin: 1,
    couleur: "bg-amber-100 text-amber-800 ring-amber-600/20",
    description: "Le loyer vient de dépasser son échéance.",
  },
  {
    valeur: "relance",
    libelle: "Relance ferme",
    joursMin: 8,
    couleur: "bg-orange-100 text-orange-800 ring-orange-600/20",
    description: "Plus d'une semaine de retard, sans règlement.",
  },
  {
    valeur: "mise_en_demeure",
    libelle: "Mise en demeure",
    joursMin: 30,
    couleur: "bg-rose-100 text-rose-800 ring-rose-600/20",
    description: "Plus d'un mois de retard : dernier avertissement avant procédure.",
  },
] as const;

export type Niveau = (typeof NIVEAUX)[number]["valeur"];

/** Niveau de relance correspondant au nombre de jours de retard. */
export function niveauPour(joursRetard: number): Niveau {
  if (joursRetard >= 30) return "mise_en_demeure";
  if (joursRetard >= 8) return "relance";
  return "rappel";
}

export function infosNiveau(niveau: string) {
  return NIVEAUX.find((n) => n.valeur === niveau) ?? NIVEAUX[0];
}

/** Nombre de jours a attendre avant de relancer une nouvelle fois. */
export const DELAI_ENTRE_RELANCES = 7;

export const CANAUX = [
  { valeur: "whatsapp", libelle: "WhatsApp" },
  { valeur: "sms", libelle: "SMS" },
  { valeur: "appel", libelle: "Appel téléphonique" },
] as const;

/** Modeles utilises tant que l'agence n'a pas ecrit les siens. */
export const MODELES_PAR_DEFAUT: Record<Niveau, string> = {
  rappel:
`Bonjour {prenom},

Nous vous rappelons que le loyer du logement « {bien} » pour la période {periode} est arrivé à échéance le {echeance}.

Montant restant dû : {montant}

Merci de bien vouloir régulariser dès que possible. Si le règlement a déjà été effectué, merci de ne pas tenir compte de ce message.

Cordialement,
{agence} — {telephone}`,

  relance:
`Bonjour {prenom},

Sauf erreur de notre part, le loyer du logement « {bien} » pour la période {periode} demeure impayé depuis {jours} jours.

Montant restant dû : {montant}
Échéance dépassée le : {echeance}

Nous vous remercions de procéder au règlement sous 48 heures, ou de nous contacter pour convenir d'un arrangement.

Cordialement,
{agence} — {telephone}`,

  mise_en_demeure:
`Bonjour {prenom},

Malgré nos précédentes relances, le loyer du logement « {bien} » pour la période {periode} reste impayé depuis {jours} jours.

Montant restant dû : {montant}
Contrat de bail : {bail}
Facture : {facture}

Nous vous mettons en demeure de régler cette somme sous huit (8) jours. À défaut, nous serons contraints d'engager la procédure prévue par votre contrat de bail.

Nous restons disponibles pour trouver une solution amiable.

{agence} — {telephone}`,
};

export type DonneesMessage = {
  prenom: string;
  locataire: string;
  bien: string;
  periode: string;
  montant: string;
  echeance: string;
  jours: number;
  agence: string;
  telephone: string;
  bail: string;
  facture: string;
};

/** Remplace les etiquettes {…} du modele par les valeurs reelles. */
export function construireMessage(modele: string, d: DonneesMessage): string {
  const valeurs: Record<string, string> = {
    prenom: d.prenom,
    locataire: d.locataire,
    bien: d.bien,
    periode: d.periode,
    montant: d.montant,
    echeance: d.echeance,
    jours: String(d.jours),
    agence: d.agence,
    telephone: d.telephone,
    bail: d.bail,
    facture: d.facture,
  };
  return modele.replace(/\{(\w+)\}/g, (entier, cle: string) =>
    cle in valeurs ? valeurs[cle] : entier,
  );
}

/** Liste des etiquettes disponibles, affichee dans les reglages. */
export const ETIQUETTES = [
  ["{prenom}", "Prénom du locataire"],
  ["{locataire}", "Prénom et nom"],
  ["{bien}", "Nom du bien loué"],
  ["{periode}", "Mois concerné (ex. Août 2026)"],
  ["{montant}", "Montant restant dû"],
  ["{echeance}", "Date d'échéance dépassée"],
  ["{jours}", "Nombre de jours de retard"],
  ["{agence}", "Nom de votre agence"],
  ["{telephone}", "Téléphone de votre agence"],
  ["{bail}", "Référence du bail"],
  ["{facture}", "Numéro de la facture"],
] as const;
