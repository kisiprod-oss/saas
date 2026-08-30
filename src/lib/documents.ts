import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { dossierData } from "./db";

/**
 * Pieces jointes des candidatures : CV, diplomes, attestations.
 *
 * Rangees a part des photos, pour une raison qui compte : ce sont des
 * documents PRIVES. Ils ne sont lisibles que par leur proprietaire et par
 * l'administrateur de la plateforme — la route qui les sert verifie les
 * droits avant de repondre, contrairement aux photos d'annonces.
 *
 * Les fichiers ne sont pas retraites : un PDF reste un PDF. La protection
 * repose donc entierement sur trois regles :
 *   - seules quelques extensions sont acceptees ;
 *   - le nom sur le disque est tire au hasard, jamais celui envoye ;
 *   - le fichier est toujours servi en telechargement, jamais affiche dans
 *     la page, ce qui neutralise un document piege.
 */

const DOSSIER = path.join(dossierData, "documents");
const PREFIXE_URL = "/api/documents/";

export const TAILLE_MAX_DOCUMENT = 8 * 1024 * 1024; // 8 Mo
export const NOMBRE_MAX_DOCUMENTS = 5;

/** Extensions acceptees, et le type que la route annoncera. */
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const NOM_VALIDE = /^[a-f0-9]{32}\.(pdf|jpg|jpeg|png|webp)$/;

/** Extension d'un fichier envoye, en minuscules, sans le point. */
function extension(nom: string): string {
  return nom.includes(".") ? nom.split(".").pop()!.toLowerCase() : "";
}

/**
 * Verifie les premiers octets du fichier plutot que de se fier a l'extension
 * annoncee : un fichier renomme en « .png » ne contient alors pas forcement
 * une image. Ce n'est pas la seule protection (voir l'en-tete de ce fichier),
 * mais elle ferme la porte a un contenu quelconque deguise en document accepte.
 */
function correspondSignature(ext: string, octets: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return octets.subarray(0, 5).toString("latin1") === "%PDF-";
    case "jpg":
    case "jpeg":
      return octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
    case "png":
      return octets.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "webp":
      return octets.subarray(0, 4).toString("latin1") === "RIFF"
        && octets.subarray(8, 12).toString("latin1") === "WEBP";
    default:
      return false;
  }
}

export type ResultatDocument = { urls: string[]; erreurs: string[] };

/** Enregistre les documents recus et renvoie leurs adresses. */
export async function enregistrerDocuments(fichiers: File[]): Promise<ResultatDocument> {
  const urls: string[] = [];
  const erreurs: string[] = [];

  const aTraiter = fichiers.filter((f) => f && f.size > 0).slice(0, NOMBRE_MAX_DOCUMENTS);
  if (aTraiter.length === 0) return { urls, erreurs };

  await fsp.mkdir(DOSSIER, { recursive: true });

  for (const fichier of aTraiter) {
    const affiche = fichier.name || "document";
    const ext = extension(affiche);

    if (!TYPES[ext]) {
      erreurs.push(`« ${affiche} » n'est pas accepté (PDF, JPEG ou PNG uniquement).`);
      continue;
    }
    if (fichier.size > TAILLE_MAX_DOCUMENT) {
      erreurs.push(`« ${affiche} » dépasse 8 Mo.`);
      continue;
    }

    try {
      const donnees = Buffer.from(await fichier.arrayBuffer());
      if (!correspondSignature(ext, donnees)) {
        erreurs.push(`« ${affiche} » ne correspond pas à un fichier ${ext.toUpperCase()} valide.`);
        continue;
      }
      const nom = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
      await fsp.writeFile(path.join(DOSSIER, nom), donnees);
      urls.push(PREFIXE_URL + nom);
    } catch {
      erreurs.push(`« ${affiche} » n'a pas pu être enregistré.`);
    }
  }

  return { urls, erreurs };
}

/** Chemin disque d'un document, ou null si le nom est invalide ou absent. */
export function cheminDocument(nom: string): { chemin: string; type: string } | null {
  if (!NOM_VALIDE.test(nom)) return null;
  const chemin = path.join(DOSSIER, nom);
  // Verrou contre toute tentative de remonter dans l'arborescence.
  if (!chemin.startsWith(DOSSIER + path.sep)) return null;
  if (!fs.existsSync(chemin)) return null;
  return { chemin, type: TYPES[extension(nom)] ?? "application/octet-stream" };
}

/** Vrai si l'adresse designe un document stocke par nos soins. */
export function estDocument(url: string): boolean {
  return url.startsWith(PREFIXE_URL) && NOM_VALIDE.test(url.slice(PREFIXE_URL.length));
}

export async function supprimerDocument(url: string): Promise<void> {
  if (!estDocument(url)) return;
  try {
    await fsp.unlink(path.join(DOSSIER, url.slice(PREFIXE_URL.length)));
  } catch {
    // Deja absent : rien a faire.
  }
}
