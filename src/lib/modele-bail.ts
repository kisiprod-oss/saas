import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { dossierData } from "./db";

/**
 * Le modele de bail propre a chaque agence.
 *
 * Le bail que le logiciel genere (src/components/document-bail.tsx) est un
 * modele generique d'usage courant au Senegal. Il ne convient pas a toutes
 * les agences : une agence constituee en societe, un bailleur particulier,
 * ou une agence avec des clauses propres a son statut juridique ou social
 * a parfois besoin d'un contrat different. Cet espace lui permet d'envoyer
 * SON propre exemplaire (PDF ou Word) et de le retrouver a tout moment pour
 * le remplir ou le modifier, sans devoir passer par le modele standard.
 *
 * Un seul fichier par agence : en envoyer un nouveau remplace l'ancien.
 * Prive : seule l'agence qui l'a envoye peut le telecharger (voir la route
 * qui le sert), sur le meme principe que src/lib/documents.ts.
 */

const DOSSIER = path.join(dossierData, "modeles-bail");
const PREFIXE_URL = "/api/modeles-bail/";

export const TAILLE_MAX_MODELE = 8 * 1024 * 1024; // 8 Mo

/** Extensions acceptees, et le type que la route annoncera. */
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const NOM_VALIDE = /^[a-f0-9]{32}\.(pdf|doc|docx)$/;

function extension(nom: string): string {
  return nom.includes(".") ? nom.split(".").pop()!.toLowerCase() : "";
}

/**
 * Verifie les premiers octets plutot que de se fier a l'extension annoncee.
 * Un .docx est une archive ZIP (signature PK) ; un .doc ancien format est un
 * conteneur OLE. Ce n'est pas la seule protection (voir l'en-tete de ce
 * fichier), mais elle ferme la porte a un contenu quelconque deguise en
 * modele de bail.
 */
function correspondSignature(ext: string, octets: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return octets.subarray(0, 5).toString("latin1") === "%PDF-";
    case "docx":
      return octets[0] === 0x50 && octets[1] === 0x4b; // "PK"
    case "doc":
      return octets.subarray(0, 8).equals(
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      );
    default:
      return false;
  }
}

export type ResultatModeleBail = { url: string | null; nom: string | null; erreur: string | null };

/** Enregistre le modele envoye par une agence et renvoie son adresse privee. */
export async function enregistrerModeleBail(fichier: File | null): Promise<ResultatModeleBail> {
  if (!fichier || fichier.size === 0) return { url: null, nom: null, erreur: null };

  if (fichier.size > TAILLE_MAX_MODELE) {
    return { url: null, nom: null, erreur: "Le fichier dépasse 8 Mo." };
  }

  const ext = extension(fichier.name);
  if (!(ext in TYPES)) {
    return { url: null, nom: null, erreur: "Formats acceptés : PDF, DOC ou DOCX." };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());
  if (!correspondSignature(ext, octets)) {
    return { url: null, nom: null, erreur: "Ce fichier ne correspond pas à son extension." };
  }

  await fsp.mkdir(DOSSIER, { recursive: true });
  const nomDisque = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await fsp.writeFile(path.join(DOSSIER, nomDisque), octets);

  // Nettoye pour un usage sans risque dans un en-tete HTTP (Content-Disposition) :
  // guillemets et caracteres de controle retires plutot qu'echappes.
  const nom = fichier.name.replace(/["\r\n]/g, "").slice(0, 200) || `bail.${ext}`;

  return { url: `${PREFIXE_URL}${nomDisque}`, nom, erreur: null };
}

/** Supprime le fichier sur le disque (l'agence en envoie un nouveau, ou le retire). */
export function supprimerModeleBail(url: string | null): void {
  if (!url) return;
  const nomDisque = url.replace(PREFIXE_URL, "");
  if (!NOM_VALIDE.test(nomDisque)) return;
  const chemin = path.join(DOSSIER, nomDisque);
  if (fs.existsSync(chemin)) fs.unlinkSync(chemin);
}

/** Chemin et type MIME d'un fichier, verifie contre le nom attendu sur le disque. */
export function cheminModeleBail(nomDisque: string): { chemin: string; type: string } | null {
  if (!NOM_VALIDE.test(nomDisque)) return null;
  const chemin = path.join(DOSSIER, nomDisque);
  if (!fs.existsSync(chemin)) return null;
  return { chemin, type: TYPES[extension(nomDisque)] };
}
