import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { un, tous, ecrire } from "./db";
import { peutUtiliserIa } from "./offres";
import {
  valider, contenuParDefaut, TYPES_SECTION, ICONES, MAX_SECTIONS,
  type ContenuBoutique, type Modele,
} from "./sections";
import type { Boutique } from "./auth";

/**
 * ============================================================================
 *  L'IA DE NOVA BOUTIQUE
 * ============================================================================
 *
 *  Ce qu'elle fait : proposer une structure de page, ecrire des textes,
 *  suggerer des couleurs, appliquer une demande en francais courant
 *  (« ajoute une section presentation »).
 *
 *  Ce qu'elle ne fait JAMAIS :
 *    — produire du code, du HTML ou du CSS. Sa sortie est un objet JSON dont
 *      la forme est fixee par src/lib/sections.ts, et qui repasse par
 *      `valider()` avant d'etre stocke. Rien de genere n'est execute.
 *    — inventer une caracteristique, une certification, un avis client, un
 *      delai de livraison ou une garantie. Le prompt l'interdit ; et comme un
 *      prompt n'est pas une barriere, ce qu'elle ecrit va dans un BROUILLON
 *      que le commercant lit avant publication.
 *    — toucher a un prix, a un stock, a un reglage de paiement ou publier
 *      quoi que ce soit. Ces quatre gestes ne passent pas par ce fichier.
 *
 *  QUOTA : une operation est enregistree avant l'appel, avec le statut
 *  « en_cours ». Elle ne devient « reussie » — et donc decomptee — que si un
 *  resultat valide est revenu. Une panne, une coupure reseau, une reponse
 *  illisible : le commercant ne perd rien.
 * ============================================================================
 */

const MODELE_IA = process.env.NOVA_MODELE_IA ?? "claude-sonnet-5";

export type TypeOperation = "structure" | "description" | "modification" | "couleurs";

export type Operation = {
  id: number;
  boutique_id: number;
  type: string;
  demande: string | null;
  statut: "en_cours" | "reussie" | "echouee";
  moteur: string;
  resultat: string | null;
  erreur: string | null;
  cree_le: string;
  termine_le: string | null;
};

/** L'IA distante est-elle branchee ? Sinon, on bascule sur le moteur local. */
export function iaDistanteDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function moteurCourant(): "anthropic" | "local" {
  return iaDistanteDisponible() ? "anthropic" : "local";
}

// ---------------------------------------------------------------------------
//  Journal des operations
// ---------------------------------------------------------------------------

function ouvrirOperation(
  boutique: Boutique, utilisateurId: number | null, type: TypeOperation, demande: string,
): number {
  const r = ecrire(
    `INSERT INTO operations_ia (boutique_id, utilisateur_id, type, demande, statut, moteur)
     VALUES (?, ?, ?, ?, 'en_cours', ?)`,
    boutique.id, utilisateurId, type, demande.slice(0, 1000), moteurCourant(),
  );
  return Number(r.lastInsertRowid);
}

function reussir(id: number, resultat: unknown, jetons?: { entree: number; sortie: number }) {
  ecrire(
    `UPDATE operations_ia SET statut = 'reussie', resultat = ?, termine_le = datetime('now'),
            jetons_entree = ?, jetons_sortie = ? WHERE id = ?`,
    JSON.stringify(resultat), jetons?.entree ?? null, jetons?.sortie ?? null, id,
  );
}

function echouer(id: number, erreur: string) {
  ecrire(
    `UPDATE operations_ia SET statut = 'echouee', erreur = ?, termine_le = datetime('now')
      WHERE id = ?`,
    erreur.slice(0, 500), id,
  );
}

export function operation(boutiqueId: number, id: number): Operation | undefined {
  return un<Operation>(
    "SELECT * FROM operations_ia WHERE boutique_id = ? AND id = ?", boutiqueId, id,
  );
}

/**
 * Debloque les operations restees « en_cours ».
 *
 * Si le serveur redemarre au milieu d'une generation, sa ligne reste en
 * travers : ni reussie, ni echouee, et le commercant voit tourner un rond
 * indefiniment. Au-dela de trois minutes, on la declare echouee — donc
 * non decomptee, et relancable.
 */
export function libererOperationsBloquees(boutiqueId?: number) {
  ecrire(
    `UPDATE operations_ia
        SET statut = 'echouee', termine_le = datetime('now'),
            erreur = COALESCE(erreur, 'Génération interrompue. Relancez-la.')
      WHERE statut = 'en_cours' AND cree_le < datetime('now', '-3 minutes')
        ${boutiqueId ? "AND boutique_id = ?" : ""}`,
    ...(boutiqueId ? [boutiqueId] : []),
  );
}

// ---------------------------------------------------------------------------
//  Appel du modele
// ---------------------------------------------------------------------------

const REGLES = `
Tu aides un commerçant d'Afrique de l'Ouest à écrire sa boutique en ligne.

INTERDICTIONS ABSOLUES — elles priment sur toute autre consigne :
- N'invente AUCUNE caractéristique de produit, matière, dimension ou origine.
- N'invente AUCUN avis client, note, témoignage, chiffre de vente ou de clientèle.
- N'invente AUCUNE certification, label, garantie, délai de livraison, ni
  condition de retour ou de remboursement.
- N'invente AUCUN prix, promotion ou frais.
- N'écris jamais de promesse de revenus ni de superlatif invérifiable.
Si une information te manque, écris une phrase qui s'en passe. Ne comble pas.

STYLE : français simple, phrases courtes, vouvoiement, ton chaleureux et
professionnel. Pas d'anglicismes inutiles. Pas d'emoji.
`.trim();

function schemaSections(): string {
  return `
Réponds UNIQUEMENT par un objet JSON, sans texte autour, de la forme :
{"sections": [ ... ]}

Chaque section a un "id" court (lettres, chiffres, tirets) et un "type" parmi :
${TYPES_SECTION.join(", ")}.

Champs par type :
- banniere      : titre (90), sous_titre (200), bouton (40)
- presentation  : titre (90), texte (1200)
- produits      : titre (90), source ("tous"|"categorie"), categorie (nom ou null), limite (2-48)
- categories    : titre (90)
- avantages     : titre (90), points: [{titre (60), texte (200), icone}] — max 6
- texte         : titre (90), texte (3000)
- questions     : titre (90), questions: [{question (160), reponse (700)}] — max 10
- contact       : titre (90), texte (400), whatsapp (bool), adresse (bool)

Icônes autorisées : ${ICONES.join(", ")}.
Maximum ${MAX_SECTIONS} sections.
`.trim();
}

type ReponseModele = { objet: unknown; jetons: { entree: number; sortie: number } };

/** Un appel au modele, qui renvoie du JSON ou leve. */
async function appeler(
  systeme: string, message: string, maxJetons = 3000,
): Promise<ReponseModele> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const reponse = await client.messages.create({
    model: MODELE_IA,
    max_tokens: maxJetons,
    system: systeme,
    messages: [{ role: "user", content: message }],
  });

  const texte = reponse.content
    .filter((bloc): bloc is Anthropic.TextBlock => bloc.type === "text")
    .map((bloc) => bloc.text)
    .join("");

  // Le modele encadre parfois son JSON de ```json … ```. On prend ce qui est
  // entre la premiere accolade et la derniere : plus robuste qu'une regex sur
  // les balises de code.
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut < 0 || fin <= debut) throw new Error("Réponse illisible du modèle.");

  return {
    objet: JSON.parse(texte.slice(debut, fin + 1)),
    jetons: {
      entree: reponse.usage?.input_tokens ?? 0,
      sortie: reponse.usage?.output_tokens ?? 0,
    },
  };
}

// ---------------------------------------------------------------------------
//  Moteur local : ce qui tourne SANS clef d'API
// ---------------------------------------------------------------------------

/**
 * Le moteur local n'est pas une imitation d'IA : il assemble des sections a
 * partir de ce que le commercant a DEJA declare. Il n'ecrit aucune phrase
 * inventee. C'est ce qui permet de faire tourner et de tester l'application
 * sans clef, sans jamais afficher un texte que personne n'a autorise.
 */
function structureLocale(boutique: Boutique, categories: string[]): ContenuBoutique {
  const base = contenuParDefaut(boutique.nom, boutique.description);
  const sections = [...base.sections];

  if (categories.length > 1) {
    sections.splice(2, 0, { id: "nos-rayons", type: "categories", titre: "Nos rayons" });
  }
  sections.splice(sections.length - 1, 0, {
    id: "infos", type: "avantages", titre: "Ce que nous proposons",
    points: [
      ...(boutique.livraison_active
        ? [{ titre: "Livraison", texte: "Nous livrons dans les zones indiquées à la commande.", icone: "livraison" as const }]
        : []),
      ...(boutique.retrait_actif
        ? [{ titre: "Retrait en boutique", texte: boutique.retrait_adresse ?? "Venez récupérer votre commande sur place.", icone: "panier" as const }]
        : []),
      ...(boutique.paiement_livraison
        ? [{ titre: "Paiement à la livraison", texte: "Vous payez en recevant votre commande.", icone: "paiement" as const }]
        : []),
      ...(boutique.whatsapp
        ? [{ titre: "Une question ?", texte: "Écrivez-nous sur WhatsApp, nous répondons.", icone: "telephone" as const }]
        : []),
    ],
  });
  return valider({ v: 1, sections });
}

/**
 * Description locale : reformate les caracteristiques SAISIES en phrases.
 * Aucune information nouvelle n'apparait — c'est exactement la contrainte
 * qu'on impose au modele distant.
 */
function descriptionLocale(
  nom: string, caracteristiques: { nom: string; valeur: string }[], notes: string,
): string {
  const morceaux: string[] = [];
  if (notes.trim()) morceaux.push(notes.trim());
  if (caracteristiques.length > 0) {
    const liste = caracteristiques
      .filter((c) => c.nom.trim() && c.valeur.trim())
      .map((c) => `${c.nom.toLowerCase()} : ${c.valeur}`)
      .join(" · ");
    if (liste) morceaux.push(liste);
  }
  if (morceaux.length === 0) {
    return `${nom}. Ajoutez quelques caractéristiques pour compléter cette fiche.`;
  }
  return `${nom}.\n\n${morceaux.join("\n\n")}`;
}

/** Palettes sobres par activite. Aucune n'est « generee » : elles sont choisies. */
const PALETTES: Record<string, { couleur: string; modele: Modele }> = {
  mode:        { couleur: "#1F2933", modele: "elegant" },
  beaute:      { couleur: "#8B3A62", modele: "elegant" },
  alimentaire: { couleur: "#0E5C3F", modele: "colore" },
  artisanat:   { couleur: "#9A5B27", modele: "colore" },
  electronique:{ couleur: "#14508F", modele: "epure" },
  maison:      { couleur: "#4A5D45", modele: "epure" },
  enfant:      { couleur: "#C2571F", modele: "colore" },
  sport:       { couleur: "#0F5132", modele: "epure" },
  autre:       { couleur: "#0E5C3F", modele: "epure" },
};

export function paletteLocale(activite: string | null | undefined) {
  return PALETTES[activite ?? "autre"] ?? PALETTES.autre;
}

// ---------------------------------------------------------------------------
//  Les quatre operations offertes au commercant
// ---------------------------------------------------------------------------

export type ResultatIa<T> =
  | { ok: true; valeur: T; operationId: number; moteur: string }
  | { ok: false; erreur: string; operationId: number | null; quota?: boolean };

async function executer<T>(
  boutique: Boutique,
  utilisateurId: number | null,
  type: TypeOperation,
  demande: string,
  travail: () => Promise<{ valeur: T; jetons?: { entree: number; sortie: number } }>,
  repli: () => T,
): Promise<ResultatIa<T>> {
  libererOperationsBloquees(boutique.id);

  const autorise = peutUtiliserIa(boutique);
  if (!autorise.ok) {
    return { ok: false, erreur: autorise.raison, operationId: null, quota: true };
  }

  const operationId = ouvrirOperation(boutique, utilisateurId, type, demande);

  // Sans clef d'API : le moteur local repond tout de suite. L'operation est
  // tracee avec moteur = 'local' pour que l'interface puisse le dire.
  if (!iaDistanteDisponible()) {
    try {
      const valeur = repli();
      reussir(operationId, valeur);
      return { ok: true, valeur, operationId, moteur: "local" };
    } catch (e) {
      // Certaines demandes n'ont pas d'equivalent local (comprendre une
      // phrase libre). On le dit, et on ne decompte rien.
      const message = (e as Error).message === "MOTEUR_LOCAL"
        ? "Cette demande a besoin de l'assistant intelligent, qui n'est pas activé "
          + "sur cette installation. Vous pouvez modifier la section à la main."
        : "La génération n'a pas abouti. Réessayez.";
      echouer(operationId, message);
      return { ok: false, erreur: message, operationId };
    }
  }

  try {
    const { valeur, jetons } = await travail();
    reussir(operationId, valeur, jetons);
    return { ok: true, valeur, operationId, moteur: "anthropic" };
  } catch (e) {
    const message = (e as Error).message ?? "Erreur inconnue";
    echouer(operationId, message);
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'ia', ?, ?)",
      boutique.id, `Génération ${type} échouée`, message.slice(0, 500),
    );
    return {
      ok: false,
      // Le detail technique reste dans le journal : il ne sert a rien au
      // commercant, et peut contenir des elements de configuration.
      erreur: "La génération n'a pas abouti. Votre quota n'a pas été décompté : réessayez.",
      operationId,
    };
  }
}

/** Propose la structure et les textes de la boutique. */
export async function genererStructure(
  boutique: Boutique, utilisateurId: number | null,
  infos: { categories: string[]; produits: string[] },
): Promise<ResultatIa<ContenuBoutique>> {
  return executer(
    boutique, utilisateurId, "structure",
    `Structure pour ${boutique.nom}`,
    async () => {
      const { objet, jetons } = await appeler(
        `${REGLES}\n\n${schemaSections()}`,
        [
          `Boutique : ${boutique.nom}`,
          boutique.activite ? `Activité : ${boutique.activite}` : "",
          boutique.description ? `Description donnée par le commerçant : ${boutique.description}` : "",
          boutique.ville ? `Ville : ${boutique.ville}` : "",
          infos.categories.length ? `Catégories existantes : ${infos.categories.join(", ")}` : "",
          infos.produits.length ? `Produits déjà saisis : ${infos.produits.slice(0, 20).join(", ")}` : "",
          boutique.livraison_active ? "La boutique livre." : "",
          boutique.retrait_actif ? "La boutique propose le retrait sur place." : "",
          "",
          "Propose l'accueil de cette boutique : 4 à 7 sections, dans un ordre qui",
          "donne envie d'acheter. Commence par une bannière, place au moins une",
          "section de produits, et termine par le contact.",
        ].filter(Boolean).join("\n"),
      );
      return { valeur: valider(objet), jetons };
    },
    () => structureLocale(boutique, infos.categories),
  );
}

/** Ecrit la description d'un produit a partir de ses caracteristiques. */
export async function genererDescription(
  boutique: Boutique, utilisateurId: number | null,
  produit: { nom: string; caracteristiques: { nom: string; valeur: string }[]; notes: string },
): Promise<ResultatIa<string>> {
  return executer(
    boutique, utilisateurId, "description",
    `Description de ${produit.nom}`,
    async () => {
      const caracteristiques = produit.caracteristiques
        .filter((c) => c.nom.trim() && c.valeur.trim())
        .map((c) => `- ${c.nom} : ${c.valeur}`)
        .join("\n");
      const { objet, jetons } = await appeler(
        `${REGLES}\n\nRéponds uniquement par {"description": "..."} — 400 caractères maximum, `
        + `2 ou 3 phrases. Tu ne peux utiliser QUE les caractéristiques fournies.`,
        [
          `Produit : ${produit.nom}`,
          caracteristiques ? `Caractéristiques fournies :\n${caracteristiques}` : "Aucune caractéristique fournie.",
          produit.notes.trim() ? `Précisions du commerçant : ${produit.notes.trim()}` : "",
          boutique.activite ? `Type de boutique : ${boutique.activite}` : "",
        ].filter(Boolean).join("\n"),
        800,
      );
      const brut = (objet as { description?: unknown })?.description;
      const texte = typeof brut === "string" ? brut.replace(/<[^>]*>/g, "").trim().slice(0, 900) : "";
      if (!texte) throw new Error("Description vide.");
      return { valeur: texte, jetons };
    },
    () => descriptionLocale(produit.nom, produit.caracteristiques, produit.notes),
  );
}

/** Applique une demande en francais courant au contenu actuel. */
export async function appliquerDemande(
  boutique: Boutique, utilisateurId: number | null,
  contenu: ContenuBoutique, demande: string,
  infos: { categories: string[] },
): Promise<ResultatIa<ContenuBoutique>> {
  return executer(
    boutique, utilisateurId, "modification", demande,
    async () => {
      const { objet, jetons } = await appeler(
        `${REGLES}\n\n${schemaSections()}\n\n`
        + `On te donne la page actuelle et une demande. Renvoie la page ENTIÈRE `
        + `après modification. Conserve l'"id" des sections que tu ne changes pas : `
        + `c'est ce qui permet de montrer au commerçant ce qui a bougé. `
        + `Ne touche à rien d'autre que ce qui est demandé.`,
        [
          `Boutique : ${boutique.nom}${boutique.activite ? ` (${boutique.activite})` : ""}`,
          infos.categories.length ? `Catégories : ${infos.categories.join(", ")}` : "",
          "",
          "Page actuelle :",
          JSON.stringify(contenu),
          "",
          `Demande du commerçant : ${demande}`,
        ].filter(Boolean).join("\n"),
        4000,
      );
      const propose = valider(objet);
      if (propose.sections.length === 0) throw new Error("La page proposée est vide.");
      return { valeur: propose, jetons };
    },
    // Sans IA distante, une demande libre ne peut pas etre comprise. On le dit
    // franchement plutot que de renvoyer la page inchangee en faisant mine.
    () => { throw new Error("MOTEUR_LOCAL"); },
  );
}

export type Palette = { couleur: string; modele: Modele; explication: string };

/** Propose une couleur et un modele. */
export async function genererPalette(
  boutique: Boutique, utilisateurId: number | null,
): Promise<ResultatIa<Palette>> {
  return executer(
    boutique, utilisateurId, "couleurs",
    `Couleurs pour ${boutique.nom}`,
    async () => {
      const { objet, jetons } = await appeler(
        `${REGLES}\n\nRéponds uniquement par `
        + `{"couleur": "#RRGGBB", "modele": "epure"|"elegant"|"colore", "explication": "..."}. `
        + `La couleur doit rester lisible sous du texte blanc (foncée). `
        + `L'explication fait une phrase.`,
        [
          `Boutique : ${boutique.nom}`,
          boutique.activite ? `Activité : ${boutique.activite}` : "",
          boutique.description ? `Description : ${boutique.description}` : "",
        ].filter(Boolean).join("\n"),
        500,
      );
      const o = (objet ?? {}) as Record<string, unknown>;
      const couleur = typeof o.couleur === "string" && /^#[0-9a-fA-F]{6}$/.test(o.couleur)
        ? o.couleur : paletteLocale(boutique.activite).couleur;
      const modele = ["epure", "elegant", "colore"].includes(String(o.modele))
        ? (o.modele as Modele) : paletteLocale(boutique.activite).modele;
      const explication = typeof o.explication === "string"
        ? o.explication.replace(/<[^>]*>/g, "").slice(0, 200) : "";
      return { valeur: { couleur, modele, explication }, jetons };
    },
    () => {
      const palette = paletteLocale(boutique.activite);
      return { ...palette, explication: "Proposition standard pour cette activité." };
    },
  );
}

/** L'historique de consommation, pour la page Abonnement et l'administration. */
export function historiqueIa(boutiqueId: number, limite = 50): Operation[] {
  return tous<Operation>(
    "SELECT * FROM operations_ia WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT ?",
    boutiqueId, Math.min(Math.max(1, limite), 200),
  );
}
