/**
 * Les exigences d'un mot de passe, en un seul endroit.
 *
 * Ce fichier n'est PAS « server-only » a dessein : la meme liste sert au
 * serveur, qui refuse, et au formulaire, qui coche les regles au fur et a
 * mesure de la saisie. Deux copies finiraient par diverger, et l'utilisateur
 * verrait un formulaire tout vert se faire refuser.
 *
 * Le serveur reste seul juge : le navigateur peut mentir, la verification
 * cote serveur n'est jamais facultative.
 */

export type RegleMotDePasse = {
  cle: string;
  /** Formule courte, affichee telle quelle sous le champ. */
  texte: string;
  respectee: (mot: string) => boolean;
};

export const REGLES: RegleMotDePasse[] = [
  {
    cle: "longueur",
    texte: "8 caractères au minimum",
    respectee: (m) => m.length >= 8,
  },
  {
    cle: "majuscule",
    texte: "une lettre majuscule",
    // \p{Lu} plutot que A-Z : « É » est une majuscule, et un utilisateur
    // senegalais en tape naturellement.
    respectee: (m) => /\p{Lu}/u.test(m),
  },
  {
    cle: "chiffre",
    texte: "un chiffre",
    respectee: (m) => /\p{Nd}/u.test(m),
  },
  {
    cle: "special",
    texte: "un caractère spécial (! ? @ # …)",
    // Ni lettre, ni chiffre, ni espace. L'espace est exclu volontairement :
    // il satisferait la regle de facon invisible, et l'utilisateur ne
    // saurait pas le reproduire a la connexion suivante.
    respectee: (m) => /[^\p{L}\p{N}\s]/u.test(m),
  },
];

/** Les règles que ce mot de passe ne respecte pas encore. */
export function reglesManquantes(mot: string): RegleMotDePasse[] {
  return REGLES.filter((r) => !r.respectee(mot));
}

/**
 * Message de refus, ou null si le mot de passe convient.
 *
 * Enumere ce qui manque plutot que de dire « mot de passe invalide » : on ne
 * fait pas deviner a quelqu'un ce qu'on attend de lui.
 */
export function refusMotDePasse(mot: string): string | null {
  const manquantes = reglesManquantes(mot);
  if (manquantes.length === 0) return null;

  const liste = manquantes.map((r) => r.texte);
  const enumeration = liste.length === 1
    ? liste[0]
    : `${liste.slice(0, -1).join(", ")} et ${liste[liste.length - 1]}`;
  return `Il manque à votre mot de passe : ${enumeration}.`;
}
