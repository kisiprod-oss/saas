/**
 * Referencement : ce que Google doit trouver, et ce qu'il ne doit pas.
 *
 * DEUX PUBLICS, DEUX INTENTIONS DE RECHERCHE. Sen Gestion est lu par des
 * agences qui cherchent un logiciel (« logiciel gestion locative Senegal »)
 * et par des particuliers qui cherchent un logement (« appartement a louer
 * Almadies »). Ce sont deux mondes de mots-cles differents : la page
 * d'accueil et la page tarifs visent le premier, les annonces visent le
 * second. Melanger les deux dans une meme description ne classerait sur
 * aucun des deux.
 *
 * CE QUI NE DOIT JAMAIS ETRE INDEXE. Le tableau de bord, l'espace locataire,
 * l'espace artisan, l'administration et les documents accessibles par jeton
 * contiennent des donnees privees — noms, telephones, montants de loyer,
 * quittances. Ils sont fermes par mot de passe, mais une page qui n'a rien
 * a faire dans un moteur de recherche doit le dire deux fois : dans
 * robots.txt, et dans l'en-tete de la page elle-meme (voir NON_INDEXABLE).
 */

/**
 * Adresse publique du site.
 *
 * ADRESSE_SITE fait autorite. Le repli sur le domaine connu evite qu'une
 * variable oubliee produise des adresses canoniques cassees, ce qui coute
 * bien plus cher en referencement qu'un domaine ecrit en dur.
 */
export const SITE = (process.env.ADRESSE_SITE?.trim() || "https://sengestion.net")
  .replace(/\/$/, "");

/** Nom affiche partout : titres, partages, donnees structurees. */
export const NOM_SITE = "Sen Gestion";

/**
 * Mots-cles du produit. Ils ne pesent plus directement dans le classement,
 * mais les tenir ecrits noir sur blanc oblige a verifier que les titres et
 * les textes des pages les emploient reellement — c'est cela qui compte.
 */
export const MOTS_CLES = [
  "gestion locative Sénégal",
  "logiciel gestion locative Dakar",
  "logiciel immobilier Sénégal",
  "quittance de loyer Sénégal",
  "contrat de bail Sénégal",
  "gestion immobilière Dakar",
  "agence immobilière Dakar",
  "suivi des loyers FCFA",
  "location meublée Dakar",
  "location courte durée Sénégal",
];

/**
 * Chemins que les moteurs ne doivent pas parcourir.
 *
 * Deux familles : les espaces prives (donnees des agences et de leurs
 * locataires) et les adresses a jeton, qui ouvrent un document precis a une
 * personne precise. Indexer une seule de ces adresses la rendrait publique
 * pour toujours.
 */
export const CHEMINS_PRIVES = [
  "/dashboard",
  "/admin",
  "/espace-locataire",
  "/pro/devis",
  "/pro/photo",
  "/pro/quiz",
  "/api",
  "/document",
  "/devis",
  "/avis",
  "/reinitialiser",
  "/comptabilite",
  "/factures",
  "/contrats",
];

/**
 * En-tete a poser sur toute page privee, en plus de robots.txt.
 *
 * robots.txt est une consigne que les moteurs honnetes respectent ; cet
 * en-tete, lui, interdit l'indexation meme si l'adresse a ete decouverte
 * autrement — par un lien partage, par exemple.
 */
export const NON_INDEXABLE = {
  robots: { index: false, follow: false, nocache: true },
} as const;

/** Adresse absolue d'un chemin, pour les liens canoniques et les partages. */
export function url(chemin = "/"): string {
  return `${SITE}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
}

/**
 * Coupe proprement une description a la longueur qu'affiche Google.
 * Au-dela d'environ 160 caracteres, la fin est remplacee par des points de
 * suspension : autant choisir nous-memes ou la phrase s'arrete.
 */
export function description(texte: string, max = 158): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  return `${coupe.slice(0, coupe.lastIndexOf(" "))}…`;
}

/**
 * Fiche d'identite de l'editeur, en donnees structurees.
 *
 * C'est ce qui permet a Google d'afficher le nom, le logo et le domaine
 * d'activite dans son panneau lateral, plutot qu'un simple lien bleu.
 */
export function ficheOrganisation() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: NOM_SITE,
    url: SITE,
    logo: url("/logo-sen-gestion.webp"),
    image: url("/logo-sen-gestion.webp"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fr",
    description:
      "Logiciel de gestion locative pour les agences immobilières et les "
      + "propriétaires au Sénégal : biens, locataires, baux, quittances de "
      + "loyer et suivi des paiements en francs CFA.",
    areaServed: { "@type": "Country", name: "Sénégal" },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "XOF",
      description: "Gratuit jusqu'à 3 biens et 5 factures par mois.",
    },
  };
}
