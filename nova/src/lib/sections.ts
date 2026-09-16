/**
 * Le schema du contenu d'une boutique.
 *
 * ============================================================================
 *  POURQUOI CE FICHIER EXISTE
 * ============================================================================
 *  L'IA ne produit JAMAIS de HTML, de CSS ni de code. Elle produit un objet
 *  JSON decrit ici : une liste de sections, chacune d'un type connu, avec des
 *  champs connus. Ce fichier est le seul endroit qui dise ce qu'une section a
 *  le droit d'etre.
 *
 *  Le rendu (src/components/sections-rendu.tsx) ne sait afficher que ces
 *  types-la. Une section inconnue n'est pas « affichee bizarrement » : elle
 *  est jetee par `valider()` avant d'atteindre la base.
 *
 *  Consequence directe : une reponse d'IA malformee, tronquee, ou qui
 *  tenterait de glisser du script, ne peut pas arriver jusqu'au visiteur.
 *  Aucun `dangerouslySetInnerHTML` n'existe dans l'application.
 *
 *  Ce module est volontairement sans dependance et sans « server-only » :
 *  l'editeur s'en sert aussi dans le navigateur pour son apercu.
 * ============================================================================
 */

export const MODELES = ["epure", "elegant", "colore"] as const;
export type Modele = (typeof MODELES)[number];

export const MODELES_LIBELLES: Record<Modele, { nom: string; description: string }> = {
  epure:   { nom: "Épuré",   description: "Beaucoup de blanc, la photo du produit au centre." },
  elegant: { nom: "Élégant", description: "Titres en gros, contrastes marqués, allure de marque." },
  colore:  { nom: "Coloré",  description: "Votre couleur partout, cartes arrondies, ambiance vive." },
};

/** Les seules icones que l'IA peut demander. Tout autre nom devient "etoile". */
export const ICONES = [
  "etoile", "livraison", "paiement", "telephone", "horloge", "bouclier",
  "coeur", "feuille", "panier", "cadeau",
] as const;
export type Icone = (typeof ICONES)[number];

export type Section =
  | { id: string; type: "banniere"; titre: string; sous_titre: string; bouton: string }
  | { id: string; type: "presentation"; titre: string; texte: string }
  | {
      id: string; type: "produits"; titre: string;
      source: "tous" | "categorie"; categorie: string | null; limite: number;
    }
  | { id: string; type: "categories"; titre: string }
  | {
      id: string; type: "avantages"; titre: string;
      points: { titre: string; texte: string; icone: Icone }[];
    }
  | { id: string; type: "texte"; titre: string; texte: string }
  | {
      id: string; type: "questions"; titre: string;
      questions: { question: string; reponse: string }[];
    }
  | {
      id: string; type: "contact"; titre: string; texte: string;
      whatsapp: boolean; adresse: boolean;
    };

export type TypeSection = Section["type"];

export const TYPES_SECTION: TypeSection[] = [
  "banniere", "presentation", "produits", "categories",
  "avantages", "texte", "questions", "contact",
];

export const SECTIONS_LIBELLES: Record<TypeSection, string> = {
  banniere: "Bandeau d'accueil",
  presentation: "Présentation",
  produits: "Liste de produits",
  categories: "Catégories",
  avantages: "Points forts",
  texte: "Texte libre",
  questions: "Questions fréquentes",
  contact: "Nous contacter",
};

export type ContenuBoutique = {
  /** Version du schema : permet de faire evoluer le format sans casser l'existant. */
  v: 1;
  sections: Section[];
};

// ---------------------------------------------------------------------------
//  Nettoyage
// ---------------------------------------------------------------------------

/** Caracteres de controle : invisibles, et jamais legitimes dans un titre. */
const CONTROLE = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");
const BALISES = /<[^>]*>/g;

/**
 * Ramene n'importe quelle valeur a du texte affichable.
 *
 * Les chevrons partent : le rendu echappe deja tout (React le fait), mais un
 * titre plein de balises reste illisible, et un texte qui ressemble a du HTML
 * dans la base finit toujours par etre insere quelque part sans echappement.
 * On coupe le probleme a l'entree.
 */
export function texteSur(valeur: unknown, maximum: number): string {
  if (typeof valeur !== "string") return "";
  return valeur
    .replace(BALISES, " ")
    .replace(CONTROLE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

/** Meme chose, mais les retours a la ligne sont conserves (paragraphes). */
export function paragrapheSur(valeur: unknown, maximum: number): string {
  if (typeof valeur !== "string") return "";
  return valeur
    .replace(BALISES, " ")
    .replace(CONTROLE, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maximum);
}

function entierEntre(valeur: unknown, min: number, max: number, defaut: number): number {
  const n = Math.round(Number(valeur));
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
}

function identifiant(valeur: unknown): string {
  const propre = typeof valeur === "string"
    ? valeur.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)
    : "";
  return propre || `s${Math.random().toString(36).slice(2, 9)}`;
}

function icone(valeur: unknown): Icone {
  return (ICONES as readonly string[]).includes(valeur as string) ? (valeur as Icone) : "etoile";
}

/** Nombre maximum de sections sur une page. Au-dela, plus personne ne lit. */
export const MAX_SECTIONS = 14;

/**
 * Valide UNE section. Renvoie null si le type est inconnu — c'est le filet :
 * tout ce qui n'est pas explicitement prevu disparait.
 */
export function validerSection(brut: unknown): Section | null {
  if (!brut || typeof brut !== "object") return null;
  const s = brut as Record<string, unknown>;
  const id = identifiant(s.id);

  switch (s.type) {
    case "banniere":
      return {
        id, type: "banniere",
        titre: texteSur(s.titre, 90) || "Bienvenue",
        sous_titre: texteSur(s.sous_titre, 200),
        bouton: texteSur(s.bouton, 40) || "Voir les produits",
      };

    case "presentation":
      return {
        id, type: "presentation",
        titre: texteSur(s.titre, 90) || "À propos",
        texte: paragrapheSur(s.texte, 1200),
      };

    case "produits":
      return {
        id, type: "produits",
        titre: texteSur(s.titre, 90) || "Nos produits",
        source: s.source === "categorie" ? "categorie" : "tous",
        categorie: typeof s.categorie === "string" ? texteSur(s.categorie, 60) || null : null,
        limite: entierEntre(s.limite, 2, 48, 8),
      };

    case "categories":
      return { id, type: "categories", titre: texteSur(s.titre, 90) || "Catégories" };

    case "avantages": {
      const bruts = Array.isArray(s.points) ? s.points.slice(0, 6) : [];
      const points = bruts
        .map((p) => {
          const o = (p ?? {}) as Record<string, unknown>;
          return {
            titre: texteSur(o.titre, 60),
            texte: texteSur(o.texte, 200),
            icone: icone(o.icone),
          };
        })
        .filter((p) => p.titre.length > 0);
      return {
        id, type: "avantages",
        titre: texteSur(s.titre, 90) || "Pourquoi nous choisir",
        points,
      };
    }

    case "texte":
      return {
        id, type: "texte",
        titre: texteSur(s.titre, 90),
        texte: paragrapheSur(s.texte, 3000),
      };

    case "questions": {
      const bruts = Array.isArray(s.questions) ? s.questions.slice(0, 10) : [];
      const questions = bruts
        .map((q) => {
          const o = (q ?? {}) as Record<string, unknown>;
          return {
            question: texteSur(o.question, 160),
            reponse: paragrapheSur(o.reponse, 700),
          };
        })
        .filter((q) => q.question.length > 0 && q.reponse.length > 0);
      return {
        id, type: "questions",
        titre: texteSur(s.titre, 90) || "Questions fréquentes",
        questions,
      };
    }

    case "contact":
      return {
        id, type: "contact",
        titre: texteSur(s.titre, 90) || "Nous contacter",
        texte: paragrapheSur(s.texte, 400),
        whatsapp: s.whatsapp !== false,
        adresse: s.adresse !== false,
      };

    default:
      return null;
  }
}

/**
 * Valide un contenu complet. Ne leve jamais : renvoie toujours quelque chose
 * d'affichable, quitte a ce que ce soit vide. Une page de boutique ne doit
 * pas tomber en panne parce qu'une generation s'est mal passee.
 */
export function valider(brut: unknown): ContenuBoutique {
  let objet: unknown = brut;
  if (typeof brut === "string") {
    try { objet = JSON.parse(brut); } catch { objet = null; }
  }
  if (!objet || typeof objet !== "object") return { v: 1, sections: [] };

  const source = objet as Record<string, unknown>;
  const liste = Array.isArray(source.sections) ? source.sections : [];
  const vues = new Set<string>();
  const sections: Section[] = [];

  for (const brutSection of liste.slice(0, MAX_SECTIONS * 2)) {
    const section = validerSection(brutSection);
    if (!section) continue;
    // Deux sections ne peuvent pas partager un identifiant : l'editeur s'en
    // sert comme cle de deplacement et de suppression.
    while (vues.has(section.id)) section.id = identifiant(null);
    vues.add(section.id);
    sections.push(section);
    if (sections.length >= MAX_SECTIONS) break;
  }
  return { v: 1, sections };
}

/** Compte les differences entre deux contenus, pour resumer un apercu. */
export function comparer(avant: ContenuBoutique, apres: ContenuBoutique): {
  ajoutees: number; retirees: number; modifiees: number;
} {
  const parId = (c: ContenuBoutique) => new Map(c.sections.map((s) => [s.id, s]));
  const a = parId(avant);
  const b = parId(apres);
  let ajoutees = 0, retirees = 0, modifiees = 0;
  for (const [id, section] of b) {
    const ancienne = a.get(id);
    if (!ancienne) ajoutees++;
    else if (JSON.stringify(ancienne) !== JSON.stringify(section)) modifiees++;
  }
  for (const id of a.keys()) if (!b.has(id)) retirees++;
  return { ajoutees, retirees, modifiees };
}

/** Une section neuve, prete a etre ajoutee par l'editeur. */
export function sectionNeuve(type: TypeSection): Section {
  const base = { id: `s${Math.random().toString(36).slice(2, 9)}` };
  switch (type) {
    case "banniere":
      return { ...base, type, titre: "Bienvenue", sous_titre: "", bouton: "Voir les produits" };
    case "presentation":
      return { ...base, type, titre: "À propos", texte: "" };
    case "produits":
      return { ...base, type, titre: "Nos produits", source: "tous", categorie: null, limite: 8 };
    case "categories":
      return { ...base, type, titre: "Catégories" };
    case "avantages":
      return { ...base, type, titre: "Pourquoi nous choisir", points: [] };
    case "texte":
      return { ...base, type, titre: "", texte: "" };
    case "questions":
      return { ...base, type, titre: "Questions fréquentes", questions: [] };
    case "contact":
      return { ...base, type, titre: "Nous contacter", texte: "", whatsapp: true, adresse: true };
  }
}

/**
 * Le contenu de depart d'une boutique neuve.
 *
 * Aucune promesse commerciale, aucun chiffre, aucun temoignage : le texte
 * decrit ce que le commercant a reellement declare, et rien de plus. Les
 * blancs sont laisses au commercant, ou a l'IA a partir de ses informations.
 */
export function contenuParDefaut(nom: string, description?: string | null): ContenuBoutique {
  return valider({
    v: 1,
    sections: [
      {
        id: "accueil", type: "banniere", titre: nom,
        sous_titre: description ?? "", bouton: "Voir les produits",
      },
      { id: "catalogue", type: "produits", titre: "Nos produits", source: "tous", limite: 8 },
      { id: "apropos", type: "presentation", titre: "À propos", texte: description ?? "" },
      {
        id: "nous-joindre", type: "contact", titre: "Nous contacter",
        texte: "Une question ? Écrivez-nous, nous répondons vite.",
        whatsapp: true, adresse: true,
      },
    ],
  });
}
