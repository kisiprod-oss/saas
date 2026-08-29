import "server-only";
import crypto from "node:crypto";
import { un, ecrire } from "./db";
import type { TypeDocument } from "./verification";

/**
 * Remise d'un document au locataire, et accuse de reception.
 *
 * LE PRINCIPE — deux canaux, pas un.
 *
 * Le document part par un lien (e-mail). Le code qui sert a confirmer sa
 * reception part par un AUTRE canal (WhatsApp). Confirmer demande donc
 * d'avoir recu les deux. Quelqu'un qui intercepte une seule boite ne peut
 * pas accuser reception a la place du locataire, et le locataire ne peut
 * pas soutenir n'avoir rien recu alors qu'il a saisi un code arrive sur son
 * propre telephone.
 *
 * CE QUE L'ACCUSE PROUVE — et ce qu'il ne prouve pas.
 *
 * Il etablit qu'a telle date, quelqu'un detenant le code l'a saisi. C'est un
 * commencement de preuve serieux entre gens de bonne foi, et c'est tout ce
 * qu'il faut pour trancher un « je ne l'ai jamais recue » ordinaire.
 *
 * Ce n'est PAS une signature electronique et cela n'identifie personne : un
 * proche a qui le locataire prete son telephone peut saisir le code. La
 * confirmation faite depuis l'espace locataire, apres authentification, est
 * nettement plus forte — c'est pourquoi les deux voies sont distinguees et
 * conservees telles quelles.
 */

/** Sans caracteres confondables : le code se lit et se recopie a la main. */
const ALPHABET = "ABCDEFGHJKMNPQRSTWXYZ23456789";
const LONGUEUR_CODE = 6;
const LONGUEUR_JETON = 24;

function tirer(longueur: number): string {
  const octets = crypto.randomBytes(longueur);
  let s = "";
  for (const o of octets) s += ALPHABET[o % ALPHABET.length];
  return s;
}

export type Envoi = {
  id: number;
  agence_id: number;
  type: TypeDocument;
  document_id: number;
  locataire_id: number | null;
  jeton: string;
  code_reception: string;
  destinataire_email: string | null;
  destinataire_tel: string | null;
  envoye_email_le: string | null;
  envoye_whatsapp_le: string | null;
  remis_main_propre_le: string | null;
  accuse_le: string | null;
  accuse_voie: string | null;
  cree_le: string;
};

/**
 * L'envoi d'un document, cree s'il n'existe pas encore.
 *
 * Le jeton et le code sont tires une seule fois et ne changent plus : un
 * locataire qui a note son code sur un carnet doit pouvoir s'en servir
 * meme si l'agence renvoie le document.
 */
export function envoiDuDocument(params: {
  agenceId: number;
  type: TypeDocument;
  documentId: number;
  locataireId: number | null;
}): Envoi {
  const existant = un<Envoi>(
    "SELECT * FROM envois_documents WHERE type = ? AND document_id = ?",
    params.type, params.documentId,
  );
  if (existant) return existant;

  for (let essai = 0; essai < 5; essai++) {
    try {
      ecrire(
        `INSERT INTO envois_documents
           (agence_id, type, document_id, locataire_id, jeton, code_reception)
         VALUES (?, ?, ?, ?, ?, ?)`,
        params.agenceId, params.type, params.documentId, params.locataireId,
        tirer(LONGUEUR_JETON), tirer(LONGUEUR_CODE),
      );
      break;
    } catch (e) {
      // Jeton deja pris (quasi impossible) : on retire.
      if (!String((e as Error).message).includes("UNIQUE")) throw e;
    }
  }

  return un<Envoi>(
    "SELECT * FROM envois_documents WHERE type = ? AND document_id = ?",
    params.type, params.documentId,
  )!;
}

/** Note qu'un canal vient d'etre utilise, avec le destinataire atteint. */
export function noterEnvoi(
  id: number,
  canal: "email" | "whatsapp" | "main_propre",
  destinataire: string | null,
): void {
  const colonne = canal === "email" ? "envoye_email_le"
    : canal === "whatsapp" ? "envoye_whatsapp_le"
    : "remis_main_propre_le";
  const champDestinataire = canal === "email" ? "destinataire_email" : "destinataire_tel";

  if (canal === "main_propre") {
    ecrire(`UPDATE envois_documents SET ${colonne} = datetime('now') WHERE id = ?`, id);
    return;
  }
  ecrire(
    `UPDATE envois_documents
        SET ${colonne} = datetime('now'), ${champDestinataire} = COALESCE(?, ${champDestinataire})
      WHERE id = ?`,
    destinataire, id,
  );
}

export function envoiParJeton(jeton: string): Envoi | undefined {
  if (!/^[A-Z0-9]{24}$/.test(jeton)) return undefined;
  return un<Envoi>("SELECT * FROM envois_documents WHERE jeton = ?", jeton);
}

export function envoiDuDocumentSiExiste(
  type: TypeDocument, documentId: number,
): Envoi | undefined {
  return un<Envoi>(
    "SELECT * FROM envois_documents WHERE type = ? AND document_id = ?", type, documentId,
  );
}

export type ResultatAccuse =
  | { ok: true; deja: boolean }
  | { ok: false; erreur: string };

/**
 * Enregistre l'accuse de reception.
 *
 * Un accuse deja donne n'est jamais ecrase : la premiere date est celle qui
 * compte, et la reecrire permettrait de deplacer une preuve apres coup.
 */
export function accuserReception(
  jeton: string, voie: "code" | "espace_locataire", codeSaisi?: string,
): ResultatAccuse {
  const envoi = envoiParJeton(jeton);
  if (!envoi) return { ok: false, erreur: "Ce lien n'est pas valide." };
  if (envoi.accuse_le) return { ok: true, deja: true };

  if (voie === "code") {
    const propre = (codeSaisi ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!propre) return { ok: false, erreur: "Saisissez le code reçu sur WhatsApp." };
    // Comparaison a temps constant : un code de six caracteres se devinerait
    // sinon en mesurant le temps de reponse.
    const attendu = Buffer.from(envoi.code_reception);
    const recu = Buffer.from(propre.padEnd(envoi.code_reception.length).slice(0, envoi.code_reception.length));
    if (propre.length !== envoi.code_reception.length || !crypto.timingSafeEqual(attendu, recu)) {
      return { ok: false, erreur: "Ce code ne correspond pas. Vérifiez chaque caractère." };
    }
  }

  ecrire(
    "UPDATE envois_documents SET accuse_le = datetime('now'), accuse_voie = ? WHERE id = ? AND accuse_le IS NULL",
    voie, envoi.id,
  );
  return { ok: true, deja: false };
}

/** Message pret a envoyer sur WhatsApp, portant le code et non le document. */
export function messageWhatsApp(params: {
  agence: string;
  prenom: string;
  quoi: string;
  code: string;
}): string {
  return (
    `Bonjour ${params.prenom},\n\n` +
    `${params.agence} vous a envoyé par e-mail votre ${params.quoi}.\n\n` +
    `Votre code de réception : ${params.code}\n\n` +
    `Saisissez-le sur la page du document pour confirmer que vous l'avez bien reçu. ` +
    `Ce code ne se communique à personne d'autre.`
  );
}
