import "server-only";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { un, ecrire } from "./db";

/**
 * Verification en ligne des documents officiels (quittances et baux).
 *
 * CE QUI PROTEGE VRAIMENT — et ce qui ne protege pas.
 *
 * Un filigrane, un cachet et une belle mise en page se photocopient. Ils
 * rendent l'imitation plus penible, rien de plus : ce sont des ornements
 * dissuasifs, pas une securite. Personne ne doit croire l'inverse, et c'est
 * pourquoi ces documents ne portent PAS la mention « infalsifiable ».
 *
 * Ce qui protege reellement, c'est ceci : chaque document recoit un code
 * tire au hasard, impossible a deviner, et une page publique permet a
 * n'importe qui — un locataire, un proprietaire, un juge — de verifier que
 * le document existe bel et bien chez l'agence et que les montants
 * concordent. Un faux peut copier l'apparence ; il ne peut pas fabriquer
 * une entree dans la base de l'agence.
 *
 * Le code est donc un SECRET tire au hasard, jamais une suite previsible :
 * un numero sequentiel se devinerait, et la verification ne vaudrait rien.
 */

/**
 * Alphabet sans caracteres confondables : ni O/0, ni I/1/L, ni U/V.
 * Un code se lit souvent au telephone ou se recopie a la main.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTWXYZ23456789";
const LONGUEUR = 12;

export type TypeDocument = "quittance" | "bail";

/** Tire un code au hasard, en puisant dans une source cryptographique. */
function tirerCode(): string {
  const octets = crypto.randomBytes(LONGUEUR);
  let code = "";
  for (const o of octets) code += ALPHABET[o % ALPHABET.length];
  return code;
}

/** Presentation lisible : XXXX-XXXX-XXXX. */
export function codeLisible(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}

/** Enleve la mise en forme d'un code saisi a la main. */
export function codeNormalise(saisi: string): string {
  return saisi.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const TABLE: Record<TypeDocument, string> = { quittance: "factures", bail: "contrats" };

/**
 * Renvoie le code de verification du document, en le creant a la volee s'il
 * n'en a pas encore.
 *
 * Cree a la demande plutot qu'a l'emission : les documents deja en base en
 * recoivent un des la premiere impression, sans migration de donnees.
 */
export function codeVerification(type: TypeDocument, id: number): string {
  const table = TABLE[type];
  const ligne = un<{ code_verification: string | null }>(
    `SELECT code_verification FROM ${table} WHERE id = ?`, id,
  );
  if (ligne?.code_verification) return ligne.code_verification;

  // Collision quasi impossible (29^12), mais la table impose l'unicite :
  // on retente plutot que d'ecrire un doublon.
  for (let essai = 0; essai < 5; essai++) {
    const code = tirerCode();
    try {
      ecrire(`UPDATE ${table} SET code_verification = ? WHERE id = ?`, code, id);
      return code;
    } catch (e) {
      if (!String((e as Error).message).includes("UNIQUE")) throw e;
    }
  }
  throw new Error("Impossible d'attribuer un code de vérification.");
}

/** Adresse publique de verification d'un document. */
export function lienVerification(base: string, code: string): string {
  return `${base.replace(/\/$/, "")}/verifier/${code}`;
}

/** QR code au format SVG, pret a etre insere dans la page. */
export async function qrSvg(contenu: string): Promise<string> {
  return QRCode.toString(contenu, {
    type: "svg",
    margin: 0,
    // « M » corrige environ 15 % de degats : suffisant pour un papier plie
    // ou legerement sali, sans grossir le dessin outre mesure.
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

export type DocumentVerifie = {
  type: TypeDocument;
  numero: string;
  agence: string;
  agenceVille: string | null;
  /** Nom du locataire, volontairement abrege. Voir plus bas. */
  locataire: string;
  date: string;
  montant: number | null;
  detail: string;
  annule: boolean;
};

/**
 * Abrege un nom : « Jean Diop » devient « Jean D. ».
 *
 * La page de verification est publique : qui possede le code voit la fiche.
 * Celui qui verifie tient le document en main et reconnait le nom abrege ;
 * celui qui a seulement recupere un code — sur une photo publiee, par
 * exemple — n'apprend pas l'identite complete d'un locataire.
 */
function nomAbrege(prenom: string, nom: string): string {
  const initiale = nom.trim().charAt(0).toUpperCase();
  return initiale ? `${prenom.trim()} ${initiale}.` : prenom.trim();
}

/** Retrouve un document par son code. Renvoie null si le code est inconnu. */
export function verifierDocument(code: string): DocumentVerifie | null {
  const propre = codeNormalise(code);
  if (propre.length !== LONGUEUR) return null;

  const facture = un<{
    numero: string; periode: string; date_emission: string; montant_total: number;
    statut: string; agence: string; ville: string | null; prenom: string; nom: string;
  }>(
    `SELECT f.numero, f.periode, f.date_emission, f.montant_total, f.statut,
            a.nom AS agence, a.ville, l.prenom, l.nom
       FROM factures f
       JOIN agences a ON a.id = f.agence_id
       JOIN contrats c ON c.id = f.contrat_id
       JOIN locataires l ON l.id = c.locataire_id
      WHERE f.code_verification = ?`,
    propre,
  );
  if (facture) {
    return {
      type: "quittance",
      numero: facture.numero,
      agence: facture.agence,
      agenceVille: facture.ville,
      locataire: nomAbrege(facture.prenom, facture.nom),
      date: facture.date_emission,
      montant: facture.montant_total,
      detail: `Période ${facture.periode}`,
      annule: facture.statut === "annulee",
    };
  }

  const bail = un<{
    reference: string; date_debut: string; date_fin: string | null; loyer: number;
    charges: number; statut: string; agence: string; ville: string | null;
    prenom: string; nom: string; bien: string;
  }>(
    `SELECT c.reference, c.date_debut, c.date_fin, c.loyer, c.charges, c.statut,
            a.nom AS agence, a.ville, l.prenom, l.nom, b.titre AS bien
       FROM contrats c
       JOIN agences a ON a.id = c.agence_id
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens b ON b.id = c.bien_id
      WHERE c.code_verification = ?`,
    propre,
  );
  if (bail) {
    return {
      type: "bail",
      numero: bail.reference,
      agence: bail.agence,
      agenceVille: bail.ville,
      locataire: nomAbrege(bail.prenom, bail.nom),
      date: bail.date_debut,
      montant: bail.loyer + bail.charges,
      detail: bail.bien,
      annule: bail.statut === "resilie",
    };
  }

  return null;
}
