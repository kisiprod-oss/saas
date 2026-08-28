import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dossierData } from "./db";

/**
 * Stockage des photos envoyees depuis le telephone ou l'ordinateur.
 *
 * Les fichiers sont ranges dans `televersements/`, a cote de la base, dans le
 * dossier de donnees (voir DOSSIER_DONNEES) : celui-ci contient donc TOUT,
 * et une sauvegarde se resume a le copier.
 *
 * Chaque image est recompressee en WebP, largeur maximale 1600 px : une photo
 * de telephone de 5 Mo tombe autour de 150 a 300 Ko. C'est important quand la
 * connexion se fait en donnees mobiles.
 */

const DOSSIER = path.join(dossierData, "televersements");
const PREFIXE_URL = "/api/photos/";

const LARGEUR_MAX = 1600;
const QUALITE = 78;
export const TAILLE_MAX_FICHIER = 15 * 1024 * 1024; // 15 Mo par photo
export const NOMBRE_MAX_PHOTOS = 12;

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];

/** Nom de fichier sur : 32 caracteres hexadecimaux suivis de .webp */
const NOM_VALIDE = /^[a-f0-9]{32}\.webp$/;

export type ResultatTeleversement = {
  urls: string[];
  erreurs: string[];
};

/**
 * Compresse et enregistre les fichiers recus. Renvoie les adresses a stocker
 * dans la colonne `photos` du bien, plus les eventuels messages d'erreur.
 */
export async function enregistrerPhotos(fichiers: File[]): Promise<ResultatTeleversement> {
  const urls: string[] = [];
  const erreurs: string[] = [];

  const aTraiter = fichiers.filter((f) => f && f.size > 0);
  if (aTraiter.length === 0) return { urls, erreurs };

  await fsp.mkdir(DOSSIER, { recursive: true });

  for (const fichier of aTraiter.slice(0, NOMBRE_MAX_PHOTOS)) {
    const nomAffiche = fichier.name || "photo";

    if (fichier.size > TAILLE_MAX_FICHIER) {
      erreurs.push(`« ${nomAffiche} » dépasse 15 Mo et n'a pas été envoyée.`);
      continue;
    }
    if (fichier.type && !TYPES_ACCEPTES.includes(fichier.type)) {
      erreurs.push(`« ${nomAffiche} » n'est pas une image reconnue.`);
      continue;
    }

    try {
      const donnees = Buffer.from(await fichier.arrayBuffer());
      const image = await sharp(donnees, { failOn: "none" })
        .rotate()                         // respecte l'orientation du telephone
        .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
        .webp({ quality: QUALITE })
        .toBuffer();

      const nom = `${crypto.randomBytes(16).toString("hex")}.webp`;
      await fsp.writeFile(path.join(DOSSIER, nom), image);
      urls.push(PREFIXE_URL + nom);
    } catch {
      erreurs.push(`« ${nomAffiche} » n'a pas pu être traitée : le fichier est peut-être abîmé.`);
    }
  }

  if (aTraiter.length > NOMBRE_MAX_PHOTOS) {
    erreurs.push(`Seules les ${NOMBRE_MAX_PHOTOS} premières photos ont été conservées.`);
  }

  return { urls, erreurs };
}

/** Vrai si l'adresse designe une photo stockee par nos soins. */
export function estPhotoTeleversee(url: string): boolean {
  return url.startsWith(PREFIXE_URL) && NOM_VALIDE.test(url.slice(PREFIXE_URL.length));
}

/** Supprime du disque une photo que l'agence retire d'un bien. */
export async function supprimerPhoto(url: string): Promise<void> {
  if (!estPhotoTeleversee(url)) return; // adresse externe : rien a supprimer
  try {
    await fsp.unlink(path.join(DOSSIER, url.slice(PREFIXE_URL.length)));
  } catch {
    // Fichier deja absent : il n'y a rien a faire.
  }
}

/**
 * Chemin disque d'une photo, pour la route qui la sert.
 * Renvoie null si le nom est invalide : cela bloque toute tentative
 * de remonter dans l'arborescence (« ../../ »).
 */
export function cheminPhoto(nom: string): string | null {
  if (!NOM_VALIDE.test(nom)) return null;
  const chemin = path.join(DOSSIER, nom);
  if (!chemin.startsWith(DOSSIER + path.sep)) return null;
  return fs.existsSync(chemin) ? chemin : null;
}
