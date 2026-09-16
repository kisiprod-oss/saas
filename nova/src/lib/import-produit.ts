import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { un, tous, ecrire } from "./db";
import { paysDe } from "./pays";
import { lireTaux, convertir, prixDeVente, devisePar } from "./devises";
import { peutUtiliserIa } from "./offres";
import { categories as lireCategories } from "./requetes";
import {
  recuperer, extraire, origineDe, type FicheExtraite,
} from "./import-web";
import type { Boutique } from "./auth";

/**
 * Importer un produit depuis un lien ou depuis une photo.
 *
 * ============================================================================
 *  CE QUE L'IMPORT PRODUIT, ET CE QU'IL NE FAIT PAS
 * ============================================================================
 *  Il produit une PROPOSITION. Rien n'entre au catalogue avant que le
 *  commerçant ait relu et enregistré. C'est la même règle que partout
 *  ailleurs dans l'application : l'assistant propose, le commerçant décide.
 *
 *  Le prix est particulièrement délicat. Le prix trouvé sur une place de
 *  marché est un PRIX DE REVIENT dans une devise étrangère, hors frais de
 *  port, hors douane, hors marge. Le proposer tel quel comme prix de vente
 *  ferait vendre à perte. On l'affiche donc comme prix d'origine, converti,
 *  et on propose un prix de vente à partir de la marge que le commerçant a
 *  réglée — clairement présenté comme une suggestion à corriger.
 *
 *  Le texte importé appartient à quelqu'un d'autre. L'assistant le RÉÉCRIT
 *  en français, à partir des seules caractéristiques extraites, plutôt que
 *  de le recopier. Sans clé d'API, la fiche affiche les caractéristiques
 *  brutes et laisse le commerçant écrire.
 * ============================================================================
 */

export type Proposition = {
  importId: number;
  source: "lien" | "photo";
  origine: string;
  adresse: string | null;
  nom: string;
  description: string;
  caracteristiques: { nom: string; valeur: string }[];
  marque: string | null;
  /** Prix d'origine tel qu'affiché sur la page, avant conversion. */
  prixOrigine: { montant: number; devise: string; libelle: string } | null;
  /** Prix de revient converti dans la devise de la boutique, ou null. */
  prixRevient: number | null;
  /** Prix de vente suggéré (revient + marge, arrondi). */
  prixSuggere: number | null;
  conversion: string | null;
  tauxManquant: string | null;
  images: string[];
  categorieSuggeree: string | null;
  /** Ce qui a servi à lire la page, pour que le résultat soit explicable. */
  sources: string[];
  /** Ce que l'assistant a fait, ou pourquoi il n'a rien fait. */
  noteAssistant: string | null;
};

export type ResultatImport =
  | { ok: true; proposition: Proposition }
  | { ok: false; erreur: string; conseil?: string };

// ---------------------------------------------------------------------------
//  Journal
// ---------------------------------------------------------------------------

function ouvrirImport(
  boutiqueId: number, utilisateurId: number | null,
  source: "lien" | "photo", origine: string, adresse: string | null,
): number {
  const r = ecrire(
    `INSERT INTO imports_produit (boutique_id, utilisateur_id, source, origine, adresse, statut)
     VALUES (?, ?, ?, ?, ?, 'propose')`,
    boutiqueId, utilisateurId, source, origine, adresse?.slice(0, 1000) ?? null,
  );
  return Number(r.lastInsertRowid);
}

function echouerImport(id: number, erreur: string) {
  ecrire(
    "UPDATE imports_produit SET statut = 'echoue', erreur = ? WHERE id = ?",
    erreur.slice(0, 500), id,
  );
}

function noterImport(id: number, charge: unknown) {
  ecrire(
    "UPDATE imports_produit SET charge_utile = ? WHERE id = ?",
    JSON.stringify(charge).slice(0, 20_000), id,
  );
}

// ---------------------------------------------------------------------------
//  Enrichissement par l'assistant
// ---------------------------------------------------------------------------

const REGLES_IMPORT = `
Tu aides un commerçant d'Afrique de l'Ouest à mettre en vente un produit qu'il
a repéré chez un fournisseur.

INTERDICTIONS ABSOLUES :
- N'ajoute AUCUNE caractéristique qui ne soit pas dans la liste fournie.
  Pas de matière devinée, pas de dimension estimée, pas d'origine supposée.
- N'invente AUCUNE garantie, AUCUN délai de livraison, AUCUN avis client,
  AUCUNE certification.
- Ne parle PAS du fournisseur, ni de la place de marché d'origine, ni d'un
  quelconque prix.
- Pas de superlatif invérifiable, pas de promesse.

STYLE : français simple, 2 à 4 phrases, vouvoiement, ton concret. Écris pour
quelqu'un qui hésite à acheter et veut savoir ce qu'il reçoit.
`.trim();

type Enrichissement = { description: string; categorie: string | null; note: string };

/**
 * Demande à l'assistant de réécrire la fiche en français.
 *
 * Deux raisons de réécrire plutôt que de recopier : le texte d'origine
 * appartient au fournisseur, et il est souvent en anglais approximatif, bourré
 * de mots-clés. Ce que l'assistant produit vient EXCLUSIVEMENT des
 * caractéristiques extraites.
 */
async function enrichir(
  boutique: Boutique,
  fiche: { nom: string; caracteristiques: { nom: string; valeur: string }[]; marque: string | null },
  categoriesExistantes: string[],
): Promise<Enrichissement> {
  const caracteristiques = fiche.caracteristiques
    .map((c) => `- ${c.nom} : ${c.valeur}`)
    .join("\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      description: "",
      categorie: null,
      note: "Assistant intelligent non activé : les caractéristiques sont reprises "
        + "telles quelles, à vous d'écrire la description.",
    };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const reponse = await client.messages.create({
      model: process.env.NOVA_MODELE_IA ?? "claude-sonnet-5",
      max_tokens: 800,
      system: `${REGLES_IMPORT}\n\nRéponds uniquement par `
        + `{"description": "...", "categorie": "..."} — la catégorie choisie `
        + `parmi celles proposées, ou null si aucune ne convient.`,
      messages: [{
        role: "user",
        content: [
          `Produit : ${fiche.nom}`,
          fiche.marque ? `Marque : ${fiche.marque}` : "",
          caracteristiques ? `Caractéristiques relevées :\n${caracteristiques}` : "Aucune caractéristique relevée.",
          boutique.activite ? `Type de boutique : ${boutique.activite}` : "",
          categoriesExistantes.length
            ? `Catégories de la boutique : ${categoriesExistantes.join(", ")}`
            : "La boutique n'a pas encore de catégories.",
        ].filter(Boolean).join("\n"),
      }],
    });

    const texte = reponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text).join("");
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    if (debut < 0 || fin <= debut) throw new Error("Réponse illisible.");

    const objet = JSON.parse(texte.slice(debut, fin + 1)) as Record<string, unknown>;
    const description = typeof objet.description === "string"
      ? objet.description.replace(/<[^>]*>/g, "").trim().slice(0, 1200) : "";
    const categorie = typeof objet.categorie === "string"
      && categoriesExistantes.includes(objet.categorie) ? objet.categorie : null;

    return {
      description,
      categorie,
      note: description
        ? "Description réécrite par l'assistant à partir des caractéristiques relevées. Relisez-la."
        : "L'assistant n'a rien écrit : complétez la description vous-même.",
    };
  } catch {
    return {
      description: "",
      categorie: null,
      note: "L'assistant n'a pas répondu. Les caractéristiques sont là, la description est à écrire.",
    };
  }
}

// ---------------------------------------------------------------------------
//  Import depuis un lien
// ---------------------------------------------------------------------------

export async function importerDepuisLien(
  boutique: Boutique, utilisateurId: number | null, adresse: string,
): Promise<ResultatImport> {
  const propre = String(adresse ?? "").trim();
  if (!propre) return { ok: false, erreur: "Collez l'adresse de la page du produit." };

  const hote = (() => { try { return new URL(propre).hostname; } catch { return ""; } })();
  const origine = origineDe(hote);
  const importId = ouvrirImport(boutique.id, utilisateurId, "lien", origine, propre);

  const recuperation = await recuperer(propre);
  if (!recuperation.ok) {
    echouerImport(importId, `${recuperation.echec.code} : ${recuperation.echec.message}`);
    return {
      ok: false,
      erreur: recuperation.echec.message,
      conseil: recuperation.echec.code === "refus"
        ? "Beaucoup de places de marché bloquent ce genre de lecture. "
          + "Enregistrez la photo du produit sur votre téléphone et utilisez « Partir d'une photo »."
        : recuperation.echec.code === "adresse_interne"
          ? "Cette adresse n'est pas une page publique."
          : undefined,
    };
  }

  const fiche = extraire(recuperation.page);
  noterImport(importId, { hote: recuperation.page.hote, fiche });

  if (!fiche.nom) {
    echouerImport(importId, "Aucun nom de produit trouvé sur la page.");
    return {
      ok: false,
      erreur: "Cette page ne publie pas de fiche produit lisible.",
      conseil: "Vérifiez que le lien mène bien à un produit, et non à une liste "
        + "de résultats. Sinon, partez d'une photo.",
    };
  }

  const proposition = await composer(
    boutique, importId, "lien", origine, recuperation.page.url, fiche,
  );
  return { ok: true, proposition };
}

/** Assemble la proposition finale : conversion, marge, enrichissement. */
async function composer(
  boutique: Boutique, importId: number, source: "lien" | "photo",
  origine: string, adresse: string | null, fiche: FicheExtraite,
): Promise<Proposition> {
  const pays = paysDe(boutique.pays);
  const taux = lireTaux(boutique.taux_change);
  const rubriques = lireCategories(boutique.id).map((c) => c.nom);

  // --- prix --------------------------------------------------------------
  let prixOrigine: Proposition["prixOrigine"] = null;
  let prixRevient: number | null = null;
  let conversion: string | null = null;
  let tauxManquant: string | null = null;

  if (fiche.prix !== null) {
    const devise = fiche.devise ?? "USD";
    const info = devisePar(devise);
    prixOrigine = {
      montant: fiche.prix,
      devise,
      libelle: `${fiche.prix.toLocaleString("fr-FR")} ${info?.symbole ?? devise}`,
    };

    const resultat = convertir(fiche.prix, devise, pays.devise, taux);
    if (resultat.ok) {
      prixRevient = resultat.montant;
      conversion = resultat.explication;
    } else {
      tauxManquant = resultat.tauxManquant;
      conversion = resultat.raison;
    }
  }

  const prixSuggere = prixRevient !== null
    ? prixDeVente(prixRevient, boutique.marge_import)
    : null;

  // --- texte -------------------------------------------------------------
  const enrichissement = await enrichir(
    boutique,
    { nom: fiche.nom, caracteristiques: fiche.caracteristiques, marque: fiche.marque },
    rubriques,
  );

  return {
    importId,
    source,
    origine,
    adresse,
    nom: fiche.nom,
    description: enrichissement.description,
    caracteristiques: fiche.caracteristiques,
    marque: fiche.marque,
    prixOrigine,
    prixRevient,
    prixSuggere,
    conversion,
    tauxManquant,
    images: fiche.images,
    categorieSuggeree: enrichissement.categorie,
    sources: fiche.sources,
    noteAssistant: enrichissement.note,
  };
}

// ---------------------------------------------------------------------------
//  Import depuis une photo
// ---------------------------------------------------------------------------

/**
 * Lit une photo de produit et en propose une fiche.
 *
 * C'est le chemin le plus solide des deux : la photo appartient au commerçant,
 * aucune place de marché ne peut la refuser, et le résultat décrit ce qui est
 * RÉELLEMENT sur l'image.
 *
 * L'assistant ne décrit que ce qu'il voit. Il ne devine pas une matière au
 * toucher, ne lit pas une taille invisible, n'invente pas une contenance. Les
 * champs qu'il ne peut pas remplir restent vides, et le commerçant les
 * complète — c'est plus utile qu'une caractéristique plausible mais fausse.
 */
export async function importerDepuisPhoto(
  boutique: Boutique, utilisateurId: number | null, fichier: File,
): Promise<ResultatImport> {
  const importId = ouvrirImport(boutique.id, utilisateurId, "photo", "photo", null);

  if (!process.env.ANTHROPIC_API_KEY) {
    echouerImport(importId, "Assistant intelligent non activé.");
    return {
      ok: false,
      erreur: "Lire une photo demande l'assistant intelligent, qui n'est pas activé "
        + "sur cette installation.",
      conseil: "Vous pouvez ajouter le produit à la main : la photo, le nom et le prix "
        + "suffisent pour commencer.",
    };
  }

  if (!fichier || fichier.size === 0) {
    echouerImport(importId, "Fichier vide.");
    return { ok: false, erreur: "Choisissez une photo." };
  }
  if (fichier.size > 12 * 1024 * 1024) {
    echouerImport(importId, "Photo trop lourde.");
    return { ok: false, erreur: "Cette photo dépasse 12 Mo." };
  }

  // La photo est décodée puis RÉ-ENCODÉE avant d'être envoyée : on ne transmet
  // jamais les octets reçus tels quels, et on retire au passage les
  // métadonnées EXIF, dont la position GPS.
  let base64: string;
  try {
    const octets = Buffer.from(await fichier.arrayBuffer());
    const reduite = await sharp(octets, { failOn: "error", limitInputPixels: 50_000_000 })
      .rotate()
      // 1024 px suffisent largement pour décrire un produit, et allègent
      // l'appel d'autant.
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    base64 = reduite.toString("base64");
  } catch {
    echouerImport(importId, "Image illisible.");
    return { ok: false, erreur: "Ce fichier n'est pas une image que nous savons lire." };
  }

  const rubriques = lireCategories(boutique.id).map((c) => c.nom);
  const pays = paysDe(boutique.pays);

  let lecture: {
    nom: string;
    caracteristiques: { nom: string; valeur: string }[];
    description: string;
    categorie: string | null;
  };

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const reponse = await client.messages.create({
      model: process.env.NOVA_MODELE_IA ?? "claude-sonnet-5",
      max_tokens: 1200,
      system: `${REGLES_IMPORT}

Tu regardes la photo d'un produit qu'un commerçant veut mettre en vente.

Réponds uniquement par :
{"nom": "...", "description": "...", "caracteristiques": [{"nom": "...", "valeur": "..."}], "categorie": "..." }

RÈGLE SUR LES CARACTÉRISTIQUES : ne mets QUE ce que la photo montre
réellement. Une couleur se voit, une forme se voit, un motif se voit. Une
matière ne se voit que si elle est évidente (bois, verre, métal). Une taille,
une contenance, un poids, une composition ne se voient PAS : ne les mets pas.
Mieux vaut trois caractéristiques justes que huit plausibles.

Le nom fait 3 à 8 mots, en français, tel qu'un commerçant l'écrirait sur son
étal. La catégorie est choisie parmi celles proposées, ou null.`,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64 },
          },
          {
            type: "text",
            text: [
              boutique.activite ? `Type de boutique : ${boutique.activite}` : "",
              rubriques.length ? `Catégories existantes : ${rubriques.join(", ")}` : "",
              `Pays : ${pays.nom}`,
            ].filter(Boolean).join("\n") || "Décris ce produit.",
          },
        ],
      }],
    });

    const texte = reponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text).join("");
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    if (debut < 0 || fin <= debut) throw new Error("Réponse illisible.");

    const objet = JSON.parse(texte.slice(debut, fin + 1)) as Record<string, unknown>;
    const propre = (v: unknown, max: number) =>
      typeof v === "string" ? v.replace(/<[^>]*>/g, "").trim().slice(0, max) : "";

    const caracteristiques = Array.isArray(objet.caracteristiques)
      ? objet.caracteristiques
        .slice(0, 10)
        .map((c) => {
          const o = (c ?? {}) as Record<string, unknown>;
          return { nom: propre(o.nom, 60), valeur: propre(o.valeur, 160) };
        })
        .filter((c) => c.nom && c.valeur)
      : [];

    lecture = {
      nom: propre(objet.nom, 120),
      description: propre(objet.description, 1200),
      caracteristiques,
      categorie: typeof objet.categorie === "string" && rubriques.includes(objet.categorie)
        ? objet.categorie : null,
    };
    if (!lecture.nom) throw new Error("Aucun nom proposé.");
  } catch (e) {
    echouerImport(importId, String((e as Error).message).slice(0, 200));
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'import', ?, ?)",
      boutique.id, "Lecture de photo échouée", String((e as Error).message).slice(0, 500),
    );
    return {
      ok: false,
      erreur: "L'assistant n'a pas réussi à lire cette photo. Votre quota n'a pas été décompté.",
      conseil: "Essayez une photo prise de face, sur fond uni, avec un seul produit.",
    };
  }

  noterImport(importId, lecture);

  return {
    ok: true,
    proposition: {
      importId,
      source: "photo",
      origine: "photo",
      adresse: null,
      nom: lecture.nom,
      description: lecture.description,
      caracteristiques: lecture.caracteristiques,
      marque: null,
      // Une photo ne porte aucun prix : le commerçant est le seul à le savoir.
      prixOrigine: null,
      prixRevient: null,
      prixSuggere: null,
      conversion: null,
      tauxManquant: null,
      images: [],
      categorieSuggeree: lecture.categorie,
      sources: ["lecture de la photo par l'assistant"],
      noteAssistant: "Fiche proposée d'après la photo. Vérifiez chaque ligne, et "
        + "ajoutez ce que la photo ne montre pas (taille, contenance, matière).",
    },
  };
}

// ---------------------------------------------------------------------------
//  Quota
// ---------------------------------------------------------------------------

/**
 * Un import consomme-t-il le quota IA ?
 *
 * Oui quand l'assistant travaille (lecture de photo, réécriture d'une fiche).
 * Non quand l'import se limite à lire les métadonnées d'une page : cette
 * lecture ne coûte rien et ne doit pas être rationnée.
 */
export function importAutorise(boutique: Boutique, source: "lien" | "photo") {
  // La lecture d'un lien passe par l'assistant pour la réécriture, mais reste
  // utile sans lui : on ne bloque donc pas sur le quota.
  if (source === "lien") return { ok: true as const };
  return peutUtiliserIa(boutique);
}

export function historiqueImports(boutiqueId: number, limite = 20) {
  return tous<{
    id: number; source: string; origine: string | null; adresse: string | null;
    statut: string; erreur: string | null; produit_id: number | null;
    image_reprise: number; cree_le: string;
  }>(
    `SELECT id, source, origine, adresse, statut, erreur, produit_id, image_reprise, cree_le
       FROM imports_produit WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT ?`,
    boutiqueId, Math.min(Math.max(1, limite), 100),
  );
}

/** Le détail d'un import, pour retrouver sa proposition après un aller-retour. */
export function lireImport(boutiqueId: number, importId: number) {
  return un<{
    id: number; source: string; origine: string | null; adresse: string | null;
    statut: string; charge_utile: string | null;
  }>(
    "SELECT id, source, origine, adresse, statut, charge_utile FROM imports_produit WHERE boutique_id = ? AND id = ?",
    boutiqueId, importId,
  );
}
