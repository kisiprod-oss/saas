/**
 * Les clauses du contrat de bail.
 *
 * Le modele repris ici suit la structure d'un bail d'habitation reellement
 * utilise a Dakar : designation des locaux, duree, loyer, etat des lieux,
 * tacite reconduction, resiliation, obligations de chaque partie, clause
 * resolutoire, clauses penales, caution, election de domicile, frais et
 * enregistrement. Le modele precedent n'en comptait que six ; il laissait
 * de cote des clauses qui, au Senegal, decident de l'issue d'un litige —
 * les preavis de resiliation, les quitus SENELEC et SDE a la restitution,
 * l'attribution de competence.
 *
 * DEUX PRINCIPES.
 *
 * 1. Le texte des clauses ne s'invente pas. Il vient d'ici, ou de ce que
 *    l'agence a ecrit elle-meme. Un bail engage un toit et de l'argent : on
 *    ne fait pas rediger ses articles au fil de l'eau par une machine, qui
 *    produirait un contrat different a chaque impression et que personne
 *    n'aurait relu. Ce qui est automatique, c'est le REMPLISSAGE : chaque
 *    bail sort adapte a son locataire, a son bien et a ses montants.
 *
 * 2. L'agence reste maitresse du texte. Chaque article est modifiable, et
 *    seuls les articles qu'elle a reecrits sont enregistres : les autres
 *    suivent le modele du logiciel et beneficient de ses corrections.
 *
 * Les variables s'ecrivent entre accolades — {locataire}, {loyer} — comme
 * dans les modeles de relance (src/lib/relances.ts).
 */

export type Clause = {
  /** Identifiant stable : c'est lui qui est stocke, jamais le numero. */
  cle: string;
  titre: string;
  texte: string;
};

/**
 * Le modele du logiciel. L'ordre de ce tableau est l'ordre du contrat ;
 * les numeros d'articles s'en deduisent, ce qui evite qu'ils se desaccordent
 * du texte quand on en ajoute un.
 */
export const CLAUSES_PAR_DEFAUT: Clause[] = [
  {
    cle: "designation",
    titre: "Désignation des locaux",
    texte:
`Le bailleur loue au locataire, qui accepte et déclare bien les connaître pour les avoir visités, le bien désigné « {bien} »{adresseBien}{description}.

Les locaux présentement loués sont à usage d'habitation.`,
  },
  {
    cle: "duree",
    titre: "Durée du contrat",
    texte:
`Le présent bail est conclu pour une durée de {duree}, qui commencera à courir le {dateDebut}.{phraseFin}`,
  },
  {
    cle: "loyer",
    titre: "Loyer",
    texte:
`Le présent bail est consenti moyennant un loyer mensuel de {loyer} ({loyerLettres} francs CFA), payable d'avance au plus tard le {jourEcheance} de chaque mois{phrasePaiement}.{phraseCharges}

Le locataire doit payer le loyer au terme convenu. En cas de paiement par chèque ou par virement bancaire, le loyer ne sera considéré comme réglé qu'après encaissement.`,
  },
  {
    cle: "etat_des_lieux",
    titre: "État des lieux",
    texte:
`Un état des lieux est établi contradictoirement à l'entrée dans les lieux et annexé au présent contrat.

Un dernier état des lieux contradictoire sera établi lors de la restitution des clés. À défaut, il sera établi par ministère d'huissier à l'initiative de la partie la plus diligente, les frais étant partagés par moitié entre les parties. Cependant, si le locataire ne s'oppose pas à un état des lieux amiable et que le bailleur le fait néanmoins établir par acte d'huissier, ledit bailleur en supportera l'intégralité des frais.`,
  },
  {
    cle: "renouvellement",
    titre: "Renouvellement — tacite reconduction",
    texte:
`Six (06) mois au moins avant le terme du contrat, le bailleur pourra faire au locataire une proposition de renouvellement par lettre recommandée avec avis de réception ou par acte d'huissier :

— soit à l'effet de conclure un nouveau contrat d'une durée réduite, mais au moins égale à un (01) an, pour des raisons professionnelles ou familiales justifiées ;
— soit à l'effet de réévaluer le loyer pour le cas où ce dernier serait manifestement sous-évalué, le contrat étant alors renouvelé pour une durée au moins égale à trois (03) ans. Dans ce cas, le bailleur pourra proposer au locataire un nouveau loyer fixé par référence aux loyers habituellement constatés dans le voisinage pour des logements comparables.

À défaut de renouvellement ou de congé motivé donné dans les conditions de forme et de délai prévues ci-avant, le contrat parvenu à son terme sera reconduit tacitement aux conditions antérieures, pour une durée égale à trois (03) mois.`,
  },
  {
    cle: "resiliation",
    titre: "Résiliation",
    texte:
`Le présent bail pourra être résilié par lettre recommandée avec avis de réception ou par acte d'huissier :

— par le locataire, à tout moment, en prévenant le bailleur trois (03) mois à l'avance, sauf cas de force majeure, auquel cas ce délai est ramené à un (01) mois ;
— par le bailleur, en prévenant le locataire six (06) mois au moins avant le terme du contrat.

Le congé donné par le bailleur devra être fondé sur un motif légitime et sérieux, notamment l'inexécution par le locataire de l'une de ses obligations principales, et devra indiquer le motif allégué.

En cas de reprise, celle-ci ne peut être exercée qu'au profit du bailleur lui-même ou de son conjoint. En cas de vente, le congé indiquera le prix et les conditions de la vente projetée et vaudra offre de vente au profit du locataire.`,
  },
  {
    cle: "obligations_locataire",
    titre: "Obligations du locataire",
    texte:
`Le locataire s'oblige à exécuter les charges et conditions suivantes :

1) Il entretiendra les lieux en bon état de réparation locative pendant toute la durée du bail. Il en jouira suivant leur destination et ne pourra rien faire ni laisser faire qui puisse les détériorer. Il préviendra immédiatement le bailleur de toute dégradation rendant nécessaires des travaux incombant à ce dernier.

2) Il pourra apporter aux lieux loués, à ses frais, les travaux d'aménagement, d'amélioration, de réparation et d'installation qu'il jugera convenables, après autorisation écrite du bailleur. Ces travaux, une fois faits, resteront la propriété du bailleur en fin de bail.

3) Il acquittera, à compter de son entrée en jouissance, tous impôts, taxes et redevances auxquels sont ou seront ordinairement assujetties les locations dans la circonscription administrative abritant les locaux loués, à l'exception de l'impôt foncier, qui reste de droit à la charge du propriétaire.

4) Il ne pourra céder son droit au bail ni sous-louer les locaux, en totalité ou en partie, sans le consentement exprès et écrit du bailleur, sous peine de nullité de toute cession ou sous-location consentie au mépris de la présente clause.

5) Il contribuera à toute opération sanitaire, notamment la vidange de la fosse septique, au prix coûtant du prestataire de service.`,
  },
  {
    cle: "obligations_bailleur",
    titre: "Obligations du bailleur",
    texte:
`1) Le bailleur doit faire sur la chose louée, pendant la durée du bail, toutes les réparations autres que d'entretien devenues urgentes. Le locataire doit les souffrir, quelque incommodité qu'elles lui causent ; le loyer est alors diminué en proportion du temps et de la partie de la chose dont il aura été privé. Si ces réparations rendent la jouissance impossible, le locataire peut faire résilier le bail.

2) Lorsque le bailleur refuse d'assumer les travaux qui lui incombent, le locataire peut se faire autoriser par le juge des référés à les faire exécuter, conformément aux règles de l'art et pour le compte du bailleur, après sommation restée sans effet dans le délai fixé par le juge. Le locataire se rembourse alors de ses avances par prélèvement sur le loyer.

3) Le bailleur ne peut, de son seul gré, apporter des changements à l'état de la chose louée ni en restreindre l'usage.

4) Le bailleur est responsable envers le locataire du trouble de jouissance survenu de son fait, de celui de ses ayants droit ou de ses préposés. Il doit garantie des troubles de droit.

5) Le bailleur doit garantie pour tous les vices ou défauts de la chose louée qui en empêchent un usage normal, alors même qu'il ne les aurait pas connus lors de la conclusion du bail.`,
  },
  {
    cle: "clause_resolutoire",
    titre: "Clause résolutoire",
    texte:
`Le présent contrat sera résilié immédiatement et de plein droit, sans qu'il soit besoin de faire ordonner cette résolution en justice :

— deux (02) mois après un commandement demeuré infructueux, à défaut de paiement aux termes convenus de tout ou partie du loyer et des charges dûment justifiées, ou en cas de non-versement de la garantie ou de la caution prévue au contrat ;
— en cas de trouble de voisinage constituant le non-respect de la jouissance paisible des lieux loués, constaté par une décision de justice passée en force de chose jugée.

Une fois acquis au bailleur le bénéfice de la clause résolutoire, le locataire devra libérer les lieux. S'il s'y refuse, le bailleur fera préalablement à toute expulsion constater la résiliation du bail par ordonnance du juge des référés, laquelle a pour objet non de prononcer la résiliation — acquise de plein droit — mais d'en assurer l'exécution.`,
  },
  {
    cle: "clauses_penales",
    titre: "Clauses pénales",
    texte:
`Sans qu'il soit dérogé à la clause résolutoire qui précède, le locataire s'engage formellement à respecter les deux clauses pénales suivantes :

— tout retard dans le paiement du loyer ou de ses accessoires entraînera de plein droit une majoration des sommes dues, calculée selon le taux d'intérêt légal, en dédommagement du préjudice subi par le bailleur, sans qu'une mise en demeure soit nécessaire ;
— si le locataire déchu de tout droit d'occupation ne libère pas les lieux, résiste à une ordonnance d'expulsion ou obtient des délais pour son départ, il devra verser, par jour de retard et outre les charges, une indemnité conventionnelle d'occupation égale à deux fois le loyer quotidien, et ce jusqu'à complet déménagement et restitution des clés.`,
  },
  {
    cle: "caution",
    titre: "Caution et dépôt de garantie",
    texte:
`{phraseCaution}

La caution sera remboursée après restitution des lieux en parfait état locatif, constatée par l'état des lieux de sortie, et après remise des clés. Un quitus de la SENELEC et un autre de la SDE, délivrés au nom du locataire, devront également être remis au bailleur.`,
  },
  {
    cle: "domicile",
    titre: "Élection de domicile et attribution de juridiction",
    texte:
`Pour l'exécution des présentes et de leurs suites, les parties font élection de domicile en leurs sièges et demeures respectifs, avec attribution de compétence aux juridictions de {ville} en cas de litige lié à l'exécution du présent contrat.`,
  },
  {
    cle: "frais",
    titre: "Frais et enregistrement",
    texte:
`Tous les frais des présentes et ceux qui en sont la suite seront supportés par le locataire, qui s'y oblige expressément.

Les soussignés donnent tous pouvoirs au porteur d'un exemplaire du présent contrat à l'effet d'accomplir toutes les formalités légales et administratives, notamment d'enregistrement, conformément à la loi.`,
  },
];

/**
 * Les clauses effectivement appliquees : le modele du logiciel, complete
 * des articles que l'agence a reecrits.
 *
 * On ne stocke que les differences. Une agence qui n'a touche qu'a la
 * caution continue de profiter des corrections apportees aux douze autres
 * articles, au lieu de figer une copie du modele le jour de sa premiere
 * modification.
 */
export function clausesDeLAgence(personnalisees: string | null | undefined): Clause[] {
  if (!personnalisees) return CLAUSES_PAR_DEFAUT;

  let surcharges: Record<string, string>;
  try {
    const lu = JSON.parse(personnalisees);
    // Une valeur illisible ne doit jamais empecher d'imprimer un bail :
    // on repart du modele plutot que de faire echouer la page.
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return CLAUSES_PAR_DEFAUT;
    surcharges = lu as Record<string, string>;
  } catch {
    return CLAUSES_PAR_DEFAUT;
  }

  return CLAUSES_PAR_DEFAUT.map((c) => {
    const perso = surcharges[c.cle];
    return typeof perso === "string" && perso.trim() !== ""
      ? { ...c, texte: perso }
      : c;
  });
}

/**
 * Prepare ce qui sera enregistre : uniquement les articles qui different
 * reellement du modele. Un article qu'on rouvre et qu'on referme sans
 * rien changer ne doit pas se figer.
 */
export function surchargesAEnregistrer(saisies: Record<string, string>): string | null {
  const differences: Record<string, string> = {};

  for (const c of CLAUSES_PAR_DEFAUT) {
    const saisie = normaliserLignes(saisies[c.cle] ?? "");
    if (saisie !== "" && saisie !== normaliserLignes(c.texte)) differences[c.cle] = saisie;
  }

  return Object.keys(differences).length === 0 ? null : JSON.stringify(differences);
}

/**
 * Ramene les fins de ligne a « \n » avant toute comparaison.
 *
 * Un navigateur renvoie le contenu d'un `textarea` avec des fins de ligne
 * CRLF, comme l'impose la norme HTML. Sans cette normalisation, un article
 * qu'on se contente d'ouvrir et d'enregistrer differe du modele par des
 * caracteres invisibles : il serait fige en « texte de l'agence » et cesserait
 * de beneficier des corrections apportees au modele du logiciel.
 */
function normaliserLignes(texte: string): string {
  return texte.replace(/\r\n/g, "\n").trim();
}

/** Remplace les variables {ainsi} par leur valeur. */
export function remplir(texte: string, valeurs: Record<string, string>): string {
  return texte.replace(/\{(\w+)\}/g, (entier, cle: string) =>
    Object.prototype.hasOwnProperty.call(valeurs, cle) ? valeurs[cle] : entier,
  );
}

/**
 * Les variables disponibles, pour les afficher a cote de l'editeur.
 * Sans cette liste, personne ne peut deviner ce qu'il est permis d'ecrire.
 */
export const VARIABLES: { cle: string; description: string }[] = [
  { cle: "bailleur", description: "Nom de votre agence" },
  { cle: "locataire", description: "Prénom et nom du locataire" },
  { cle: "bien", description: "Titre du bien loué" },
  { cle: "adresseBien", description: "Adresse du bien, précédée de « , situé à »" },
  { cle: "description", description: "Composition du bien (chambres, surface…)" },
  { cle: "duree", description: "Durée du bail, en toutes lettres" },
  { cle: "dateDebut", description: "Date de prise d'effet" },
  { cle: "phraseFin", description: "Phrase de fin de bail, ou de tacite reconduction" },
  { cle: "loyer", description: "Loyer mensuel en chiffres" },
  { cle: "loyerLettres", description: "Loyer mensuel en toutes lettres" },
  { cle: "jourEcheance", description: "Jour de paiement du loyer" },
  { cle: "phrasePaiement", description: "Moyens de paiement (Orange Money, Wave…)" },
  { cle: "phraseCharges", description: "Phrase sur les charges, si le bail en prévoit" },
  { cle: "phraseCaution", description: "Phrase sur la caution et son montant" },
  { cle: "ville", description: "Ville de votre agence" },
];
