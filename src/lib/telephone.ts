/**
 * Numeros de telephone, senegalais ET etrangers.
 *
 * Sen Gestion s'adresse aussi a la diaspora : un proprietaire qui vit a
 * Paris, Milan ou New York et qui fait gerer son bien a Dakar, un voyageur
 * qui reserve un sejour de courte duree depuis l'etranger. Ces gens
 * s'inscrivent avec LEUR numero, pas avec un numero senegalais.
 *
 * Le piege qu'on repare ici : coller « 221 » devant n'importe quel numero.
 * Un numero francais « +33 6 12 34 56 78 » devenait « 22133612345678 »,
 * et le lien WhatsApp ne menait nulle part — sans que personne ne s'en
 * apercoive, puisque le lien s'ouvrait bien, sur un vide.
 *
 * Regle de lecture, de la plus sure a la plus faible. L'ordre compte : un
 * numero espagnol fait neuf chiffres comme un senegalais, et un numero
 * italien commence par « 33 » comme l'indicatif francais. Aucune longueur,
 * aucun prefixe ne permet donc de deviner a coup sur — seul ce qu'un humain
 * a explicitement indique fait foi.
 *
 *   1. la saisie annonce elle-meme son pays (« + » ou « 00 ») : on la croit ;
 *   2. un pays a ete choisi dans le formulaire : on l'applique, sans chercher
 *      a etre plus malin que la personne qui vient de le designer ;
 *   3. rien des deux (on relit un numero deja enregistre) : neuf chiffres
 *      valent senegalais — le seul format national du pays — puis un
 *      indicatif connu de longueur plausible est conserve tel quel.
 */

/** Indicatif applique quand rien d'autre ne permet de trancher. */
export const INDICATIF_DEFAUT = "221";

/** Longueur d'un numero national senegalais, sans indicatif. */
const LONGUEUR_SENEGAL = 9;

/**
 * Les pays ou vit la diaspora senegalaise, et les voisins immediats.
 * Le Senegal en tete : c'est le cas courant, il doit etre a portee de pouce.
 * La liste n'a pas vocation a couvrir la planete — un numero d'ailleurs
 * reste saisissable au format international (+xxx), qui est toujours accepte.
 */
export const INDICATIFS = [
  { code: "221", pays: "Sénégal", drapeau: "🇸🇳" },
  { code: "33", pays: "France", drapeau: "🇫🇷" },
  { code: "39", pays: "Italie", drapeau: "🇮🇹" },
  { code: "34", pays: "Espagne", drapeau: "🇪🇸" },
  { code: "1", pays: "États-Unis / Canada", drapeau: "🇺🇸" },
  { code: "32", pays: "Belgique", drapeau: "🇧🇪" },
  { code: "49", pays: "Allemagne", drapeau: "🇩🇪" },
  { code: "44", pays: "Royaume-Uni", drapeau: "🇬🇧" },
  { code: "41", pays: "Suisse", drapeau: "🇨🇭" },
  { code: "351", pays: "Portugal", drapeau: "🇵🇹" },
  { code: "31", pays: "Pays-Bas", drapeau: "🇳🇱" },
  { code: "212", pays: "Maroc", drapeau: "🇲🇦" },
  { code: "222", pays: "Mauritanie", drapeau: "🇲🇷" },
  { code: "220", pays: "Gambie", drapeau: "🇬🇲" },
  { code: "223", pays: "Mali", drapeau: "🇲🇱" },
  { code: "224", pays: "Guinée", drapeau: "🇬🇳" },
  { code: "225", pays: "Côte d’Ivoire", drapeau: "🇨🇮" },
  { code: "238", pays: "Cap-Vert", drapeau: "🇨🇻" },
  { code: "241", pays: "Gabon", drapeau: "🇬🇦" },
  { code: "971", pays: "Émirats arabes unis", drapeau: "🇦🇪" },
  { code: "966", pays: "Arabie saoudite", drapeau: "🇸🇦" },
  { code: "90", pays: "Turquie", drapeau: "🇹🇷" },
  { code: "86", pays: "Chine", drapeau: "🇨🇳" },
  { code: "27", pays: "Afrique du Sud", drapeau: "🇿🇦" },
] as const;

/** Indicatifs du plus long au plus court : « 221 » doit primer sur « 22 ». */
const CODES_TRIES = [...INDICATIFS].map((i) => i.code).sort((a, b) => b.length - a.length);

/** Le pays d'un indicatif, pour l'affichage. */
export function paysDeLIndicatif(code: string): string | null {
  return INDICATIFS.find((i) => i.code === code)?.pays ?? null;
}

/**
 * Numero canonique : uniquement des chiffres, indicatif pays compris.
 * C'est la forme stockee en base et celle qu'attendent `tel:` et `wa.me`.
 *
 * `indicatif` est celui choisi dans le formulaire ; il ne sert que si la
 * saisie ne dit pas elle-meme d'ou elle vient.
 */
export function numeroCanonique(saisie: string | null | undefined, indicatif?: string): string {
  const brut = (saisie ?? "").trim();
  if (!brut) return "";

  // 1. La saisie annonce son pays. On la croit sur parole : c'est la seule
  //    information non ambigue qu'on puisse recevoir.
  if (brut.startsWith("+")) return brut.slice(1).replace(/\D/g, "");
  const chiffres = brut.replace(/\D/g, "");
  if (chiffres.startsWith("00")) return chiffres.slice(2);

  // 2. Un pays vient d'etre choisi dans le formulaire. C'est le signal le
  //    plus fort dont on dispose, et il prime sur toute deduction : sans
  //    cela, un mobile espagnol (612 34 56 78, neuf chiffres) serait lu
  //    comme senegalais, et un mobile italien (333…) comme francais.
  //    On retire le zero de depart des numeros nationaux (06… en France,
  //    07… au Royaume-Uni) : il ne se compose pas depuis l'etranger.
  if (indicatif) {
    const national = chiffres.replace(/^0+/, "");
    return national ? `${indicatif}${national}` : "";
  }

  // 3. Personne n'a rien indique : on relit un numero deja enregistre.
  //    Neuf chiffres, c'est le format national senegalais, et lui seul.
  //    Cette regle preserve tous les numeros deja en base.
  if (chiffres.length === LONGUEUR_SENEGAL) return `${INDICATIF_DEFAUT}${chiffres}`;

  // Deja precede d'un indicatif connu, avec une longueur credible.
  const connu = CODES_TRIES.find((c) => chiffres.startsWith(c));
  if (connu && chiffres.length > connu.length + 5) return chiffres;

  const national = chiffres.replace(/^0+/, "");
  return national ? `${INDICATIF_DEFAUT}${national}` : "";
}

/** Vrai si le numero est senegalais. */
export function estSenegalais(tel: string | null | undefined): boolean {
  const c = numeroCanonique(tel);
  return c.startsWith(INDICATIF_DEFAUT) && c.length === INDICATIF_DEFAUT.length + LONGUEUR_SENEGAL;
}

/**
 * Numero utilisable dans un lien `tel:` ou `wa.me` : chiffres seuls,
 * indicatif compris, sans « + ».
 */
export function pourLien(tel: string | null | undefined): string {
  return numeroCanonique(tel);
}

/**
 * Numero lisible a l'ecran.
 * Senegalais : « +221 77 123 45 67 », le decoupage que tout le monde connait.
 * Etranger : « +33 6 12 34 56 78 », groupe par deux a partir de la fin, ce
 * qui reste lisible sans connaitre le plan de numerotation de chaque pays.
 */
export function pourAffichage(tel: string | null | undefined): string {
  if (!tel) return "—";
  const c = numeroCanonique(tel);
  if (!c) return tel;

  if (estSenegalais(c)) {
    const l = c.slice(INDICATIF_DEFAUT.length);
    return `+221 ${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7)}`;
  }

  const code = CODES_TRIES.find((x) => c.startsWith(x));
  if (!code) return `+${c}`;

  const reste = c.slice(code.length);

  // L'Amerique du Nord ne groupe pas par deux mais en 3-3-4 : un numero de
  // New York doit ressembler a un numero de New York.
  if (code === "1" && reste.length === 10) {
    return `+1 ${reste.slice(0, 3)} ${reste.slice(3, 6)} ${reste.slice(6)}`;
  }

  // Ailleurs, groupes de deux depuis la fin : le premier groupe absorbe le
  // chiffre impair eventuel, comme le veut l'usage en France et en Italie.
  const groupes: string[] = [];
  let i = reste.length;
  while (i > 2) {
    groupes.unshift(reste.slice(i - 2, i));
    i -= 2;
  }
  if (i > 0) groupes.unshift(reste.slice(0, i));

  return `+${code} ${groupes.join(" ")}`;
}

/**
 * Deux numeros designent-ils la meme ligne ?
 * Sert a la connexion de l'espace locataire : « 77 123 45 67 »,
 * « +221771234567 » et « 00221 77 123 45 67 » sont la meme personne.
 */
export function memeNumero(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = numeroCanonique(a);
  const cb = numeroCanonique(b);
  return ca !== "" && ca === cb;
}

/**
 * Le numero envoye par un `ChampTelephone`, sous sa forme canonique.
 * A appeler dans l'action serveur : le navigateur n'assemble rien.
 */
export function numeroSoumis(fd: FormData, nom = "telephone"): string {
  const saisie = String(fd.get(nom) ?? "").trim();
  if (!saisie) return "";
  const indicatif = String(fd.get(`${nom}_indicatif`) ?? "").trim() || undefined;
  return numeroCanonique(saisie, indicatif);
}
