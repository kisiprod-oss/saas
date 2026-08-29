import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db, ecrire, tous, un } from "./db";
import { libelle, METIERS } from "./constantes";

/**
 * Quiz metier des professionnels.
 *
 * Trois regles de securite, indissociables :
 *
 *  1. La bonne reponse ne quitte JAMAIS le serveur. Les questions envoyees au
 *     navigateur ne contiennent que l'enonce et les propositions ; la
 *     correction se fait ici. Sinon il suffirait d'afficher le code source de
 *     la page pour avoir 20/20.
 *  2. Le minuteur fait foi cote serveur. `expire_le` est fige a l'ouverture ;
 *     une reponse arrivee apres est refusee. Le compte a rebours affiche dans
 *     le navigateur n'est qu'un confort — on peut le trafiquer en trois clics.
 *  3. Les questions sont tirees au hasard dans une banque, differente a chaque
 *     tentative : deux candidats ne passent pas le meme quiz.
 *
 * Ce que le quiz prouve, et ce qu'il ne prouve pas : il est passe sans
 * surveillance, donc il ne prouve pas qu'on a affaire a un bon artisan — il
 * ecarte ceux qui ne connaissent pas les bases de leur metier. Les textes
 * affiches doivent rester fideles a cela.
 */

/** Nombre de questions posees, et duree accordee. */
export const NB_QUESTIONS = 10;
export const DUREE_MINUTES = 10;
/** Bonnes reponses necessaires pour obtenir le badge. */
export const SEUIL_REUSSITE = 7;

/** Questions a produire par metier quand l'administrateur remplit la banque. */
const A_GENERER = 25;

export type QuestionPublique = {
  id: number;
  question: string;
  propositions: string[];
};

export type SessionQuiz = {
  id: number;
  artisan_id: number;
  metier: string;
  questions: string;
  score: number | null;
  total: number;
  reussi: number;
  commence_le: string;
  expire_le: string;
  termine_le: string | null;
};

export function compterQuestions(metier: string): number {
  const l = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM quiz_questions WHERE metier = ? AND active = 1", metier,
  );
  return l?.n ?? 0;
}

/** Etat de la banque de questions, metier par metier, pour l'administration. */
export function etatBanque() {
  return METIERS.map((m) => ({
    metier: m.valeur,
    libelle: m.libelle,
    nombre: compterQuestions(m.valeur),
  }));
}

// ------------------------------------------------- Generation par l'IA

type QuestionBrute = {
  question?: unknown;
  propositions?: unknown;
  bonne_reponse?: unknown;
  explication?: unknown;
};

/**
 * Demande a l'IA d'ecrire des questions pour un metier, et les enregistre.
 *
 * Appelee par l'administrateur, jamais pendant un quiz : une panne de l'IA
 * ne doit pas empecher un candidat de passer son test.
 */
export async function genererQuestions(
  metier: string,
): Promise<{ ok: true; ajoutees: number } | { ok: false; erreur: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, erreur: "La clé ANTHROPIC_API_KEY n'est pas configurée." };
  }
  if (!METIERS.some((m) => m.valeur === metier)) {
    return { ok: false, erreur: "Métier inconnu." };
  }

  const nom = libelle(METIERS, metier);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const consigne = `Tu écris un test de connaissances professionnelles pour des ${nom}s
exerçant au Sénégal.

Écris exactement ${A_GENERER} questions à choix multiple.

Règles :
- Chaque question porte sur la PRATIQUE du métier : gestes, outils, matériaux,
  sécurité, normes, diagnostic de panne. Jamais sur la culture générale.
- Quatre propositions, dont une seule correcte. Les trois mauvaises doivent
  être plausibles pour quelqu'un qui débute, pas absurdes.
- Français simple. Beaucoup d'artisans ont appris sur le terrain, pas à
  l'école : la question doit tester le métier, pas le niveau de lecture.
  Phrases courtes, vocabulaire de chantier, pas de tournures administratives.
- Contexte sénégalais quand c'est pertinent (matériaux et normes courants
  sur place, climat, tension du réseau électrique 230 V).
- Varie la difficulté : environ un tiers de questions faciles, un tiers
  moyennes, un tiers plus pointues.

Réponds UNIQUEMENT avec un tableau JSON, sans texte autour, de la forme :
[
  {
    "question": "…",
    "propositions": ["…", "…", "…", "…"],
    "bonne_reponse": 0,
    "explication": "…"
  }
]
"bonne_reponse" est l'index (0 à 3) de la bonne proposition.`;

  let texte: string;
  try {
    const reponse = await client.messages.create({
      model: process.env.ASSISTANT_MODELE ?? "claude-opus-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: consigne }],
    });
    texte = reponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (e) {
    console.error("Génération du quiz :", e);
    return { ok: false, erreur: "L'IA n'a pas répondu. Réessayez dans un instant." };
  }

  // Le modele encadre parfois le JSON d'un bloc de code : on extrait le tableau.
  const debut = texte.indexOf("[");
  const fin = texte.lastIndexOf("]");
  if (debut === -1 || fin <= debut) {
    return { ok: false, erreur: "La réponse de l'IA n'était pas exploitable." };
  }

  let brutes: QuestionBrute[];
  try {
    brutes = JSON.parse(texte.slice(debut, fin + 1)) as QuestionBrute[];
  } catch {
    return { ok: false, erreur: "La réponse de l'IA n'était pas exploitable." };
  }

  // On ne fait confiance a rien de ce qui revient : chaque question est
  // verifiee avant d'entrer en base. Une question mal formee fausserait
  // durablement la notation de tous les candidats.
  const valides = brutes.filter((q): q is Required<QuestionBrute> =>
    typeof q?.question === "string" && q.question.trim().length > 5
    && Array.isArray(q.propositions) && q.propositions.length === 4
    && q.propositions.every((p) => typeof p === "string" && p.trim().length > 0)
    && typeof q.bonne_reponse === "number"
    && Number.isInteger(q.bonne_reponse) && q.bonne_reponse >= 0 && q.bonne_reponse <= 3);

  if (valides.length === 0) {
    return { ok: false, erreur: "Aucune question exploitable n'a été produite." };
  }

  const inserer = db.prepare(
    `INSERT INTO quiz_questions (metier, question, propositions, bonne_reponse, explication)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const tout = db.transaction((liste: Required<QuestionBrute>[]) => {
    for (const q of liste) {
      inserer.run(
        metier,
        String(q.question).trim(),
        (q.propositions as string[]).map((p) => String(p).trim()).join("\n"),
        q.bonne_reponse as number,
        q.explication ? String(q.explication).trim() : null,
      );
    }
  });
  tout(valides);

  return { ok: true, ajoutees: valides.length };
}

/** Vide la banque d'un metier, pour la regenerer proprement. */
export function viderBanque(metier: string) {
  ecrire("DELETE FROM quiz_questions WHERE metier = ?", metier);
}

// ------------------------------------------------------ Passage du quiz

/** Session en cours d'un artisan, si elle n'a pas expire. */
export function sessionEnCours(artisanId: number): SessionQuiz | undefined {
  const s = un<SessionQuiz>(
    `SELECT * FROM quiz_sessions
      WHERE artisan_id = ? AND termine_le IS NULL
      ORDER BY id DESC LIMIT 1`,
    artisanId,
  );
  if (!s) return undefined;
  return new Date(s.expire_le).getTime() > Date.now() ? s : undefined;
}

/**
 * Ouvre une session : tire les questions au hasard et fixe l'heure limite.
 */
export function ouvrirSessionQuiz(
  artisanId: number, metier: string,
): { ok: true; session: SessionQuiz } | { ok: false; erreur: string } {
  const disponibles = compterQuestions(metier);
  if (disponibles < NB_QUESTIONS) {
    return {
      ok: false,
      erreur: "Le test de ce métier n'est pas encore prêt. Réessayez plus tard.",
    };
  }

  const tirees = tous<{ id: number }>(
    `SELECT id FROM quiz_questions WHERE metier = ? AND active = 1
      ORDER BY RANDOM() LIMIT ?`,
    metier, NB_QUESTIONS,
  ).map((q) => q.id);

  const expire = new Date(Date.now() + DUREE_MINUTES * 60_000).toISOString();
  const res = ecrire(
    `INSERT INTO quiz_sessions (artisan_id, metier, questions, total, expire_le)
     VALUES (?, ?, ?, ?, ?)`,
    artisanId, metier, tirees.join(","), tirees.length, expire,
  );

  const session = un<SessionQuiz>(
    "SELECT * FROM quiz_sessions WHERE id = ?", Number(res.lastInsertRowid),
  );
  return session
    ? { ok: true, session }
    : { ok: false, erreur: "Le test n'a pas pu être ouvert." };
}

/**
 * Questions d'une session, SANS les bonnes reponses.
 * C'est la seule forme qui a le droit d'atteindre le navigateur.
 */
export function questionsDeLaSession(session: SessionQuiz): QuestionPublique[] {
  const ids = session.questions.split(",").map(Number).filter(Number.isFinite);
  if (ids.length === 0) return [];

  const lignes = tous<{ id: number; question: string; propositions: string }>(
    `SELECT id, question, propositions FROM quiz_questions
      WHERE id IN (${ids.map(() => "?").join(",")})`,
    ...ids,
  );

  // On respecte l'ordre du tirage, que le SQL ne garantit pas.
  return ids
    .map((id) => lignes.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
    .map((l) => ({
      id: l.id,
      question: l.question,
      propositions: l.propositions.split("\n"),
    }));
}

export type Correction = {
  score: number;
  total: number;
  reussi: boolean;
  horsDelai: boolean;
};

/**
 * Corrige une session et enregistre le resultat sur la fiche de l'artisan.
 *
 * `reponses` associe l'identifiant d'une question a l'index choisi.
 * Une session hors delai est corrigee malgre tout — mais elle est comptee
 * comme un echec, et l'artisan le voit clairement.
 */
export function corrigerSession(
  session: SessionQuiz, reponses: Map<number, number>,
): Correction {
  const horsDelai = new Date(session.expire_le).getTime() < Date.now();

  const ids = session.questions.split(",").map(Number).filter(Number.isFinite);
  const bonnes = tous<{ id: number; bonne_reponse: number }>(
    `SELECT id, bonne_reponse FROM quiz_questions
      WHERE id IN (${ids.map(() => "?").join(",")})`,
    ...ids,
  );

  let score = 0;
  for (const q of bonnes) {
    if (reponses.get(q.id) === q.bonne_reponse) score += 1;
  }

  const reussi = !horsDelai && score >= SEUIL_REUSSITE;

  const enregistrer = db.transaction(() => {
    ecrire(
      `UPDATE quiz_sessions SET score = ?, reussi = ?, termine_le = datetime('now')
        WHERE id = ? AND termine_le IS NULL`,
      score, reussi ? 1 : 0, session.id,
    );
    // On ne garde sur la fiche que le MEILLEUR resultat : un artisan qui
    // repasse le test ne doit pas perdre un badge deja obtenu.
    ecrire(
      `UPDATE artisans
          SET quiz_score = CASE WHEN quiz_score IS NULL OR quiz_score < ? THEN ? ELSE quiz_score END,
              quiz_total = ?,
              quiz_reussi = CASE WHEN quiz_reussi = 1 OR ? = 1 THEN 1 ELSE 0 END,
              quiz_passe_le = datetime('now')
        WHERE id = ?`,
      score, score, session.total, reussi ? 1 : 0, session.artisan_id,
    );
  });
  enregistrer();

  return { score, total: session.total, reussi, horsDelai };
}
