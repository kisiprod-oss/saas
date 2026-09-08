import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { dossierData } from "./db";
import {
  dossiersPhotos, NOM_PHOTO_VALIDE, PREFIXE_PRIVE, PREFIXE_PUBLIC,
} from "./emplacements-photos";

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

const DOSSIER = dossiersPhotos(dossierData).public;
const PREFIXE_URL = PREFIXE_PUBLIC;

/**
 * DEUX DOSSIERS, PARCE QUE DEUX PUBLICS.
 *
 * `televersements/` : ce qui est fait pour etre vu de tous — photos
 * d'annonces, logo d'agence, portrait d'artisan qui figure dans l'annuaire
 * public. Servi sans compte, et mis en cache longtemps : c'est voulu.
 *
 * `televersements/prive/` : les visages des LOCATAIRES et des PROPRIETAIRES.
 * Ce sont des personnes qui n'ont rien demande a personne et qui ne
 * s'affichent nulle part publiquement. Leur photo ne doit sortir que pour
 * leur agence, pour eux-memes, ou pour l'administrateur.
 *
 * Avant cette separation, tout partageait la meme adresse publique, servie
 * sans aucune verification et avec « cache un an ». L'adresse etait certes
 * introuvable au hasard (16 octets tires au sort), mais une adresse difficile
 * a deviner n'est pas un controle d'acces : il suffisait qu'un lien fuite une
 * fois — capture d'ecran, historique, journal d'un intermediaire — pour que
 * la photo reste accessible a vie, et en prime recopiee dans les caches.
 */
const DOSSIER_PRIVE = dossiersPhotos(dossierData).prive;

const LARGEUR_MAX = 1600;
/** Photo de profil : carree, elle ne s'affiche jamais plus grande. */
const LARGEUR_PROFIL = 512;
/** Logo : borne dans un carre de ce cote, sans etre deforme. */
const LARGEUR_LOGO = 400;
const QUALITE = 78;
export const TAILLE_MAX_FICHIER = 15 * 1024 * 1024; // 15 Mo par photo
export const NOMBRE_MAX_PHOTOS = 12;

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];

const NOM_VALIDE = NOM_PHOTO_VALIDE;

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

/**
 * Enregistre une photo de profil : recadree en carre, 512 px de cote.
 *
 * Separee de `enregistrerPhotos` parce que les contraintes different — une
 * seule image, cadrage carre, poids reduit : la vignette s'affiche dans des
 * listes, souvent sur une connexion mobile.
 */
export async function enregistrerPhotoProfil(
  fichier: File,
  options: { prive?: boolean } = {},
): Promise<{ url: string | null; erreur: string | null }> {
  if (!fichier || fichier.size === 0) return { url: null, erreur: null };

  if (fichier.size > TAILLE_MAX_FICHIER) {
    return { url: null, erreur: "La photo dépasse 15 Mo. Choisissez une image plus légère." };
  }
  if (fichier.type && !TYPES_ACCEPTES.includes(fichier.type)) {
    return { url: null, erreur: "Ce fichier n'est pas une image reconnue (JPEG, PNG ou HEIC)." };
  }

  try {
    const donnees = Buffer.from(await fichier.arrayBuffer());
    const image = await sharp(donnees, { failOn: "none" })
      .rotate()
      .resize(LARGEUR_PROFIL, LARGEUR_PROFIL, { fit: "cover", position: "attention" })
      .webp({ quality: QUALITE })
      .toBuffer();

    const dossier = options.prive ? DOSSIER_PRIVE : DOSSIER;
    const prefixe = options.prive ? PREFIXE_PRIVE : PREFIXE_URL;
    await fsp.mkdir(dossier, { recursive: true });
    const nom = `${crypto.randomBytes(16).toString("hex")}.webp`;
    await fsp.writeFile(path.join(dossier, nom), image);
    return { url: prefixe + nom, erreur: null };
  } catch {
    return { url: null, erreur: "La photo n'a pas pu être traitée : le fichier est peut-être abîmé." };
  }
}

/**
 * Enregistre le logo d'une agence.
 *
 * Traitement different d'une photo de profil : on NE recadre PAS en carre.
 * Un logo a ses proportions, les ecraser le defigure. On borne seulement la
 * taille, et on garde la transparence — un logo sur fond blanc colle sur une
 * quittance ferait une vilaine boite blanche.
 */
export async function enregistrerLogo(
  fichier: File,
): Promise<{ url: string | null; erreur: string | null }> {
  if (!fichier || fichier.size === 0) return { url: null, erreur: null };

  if (fichier.size > TAILLE_MAX_FICHIER) {
    return { url: null, erreur: "Le logo dépasse 15 Mo. Choisissez un fichier plus léger." };
  }
  if (fichier.type && !TYPES_ACCEPTES.includes(fichier.type)) {
    return { url: null, erreur: "Ce fichier n'est pas une image reconnue (JPEG, PNG ou WebP)." };
  }

  try {
    const donnees = Buffer.from(await fichier.arrayBuffer());
    const image = await sharp(donnees, { failOn: "none" })
      .rotate()
      .resize({ width: LARGEUR_LOGO, height: LARGEUR_LOGO, fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITE, alphaQuality: 100 })
      .toBuffer();

    await fsp.mkdir(DOSSIER, { recursive: true });
    const nom = `${crypto.randomBytes(16).toString("hex")}.webp`;
    await fsp.writeFile(path.join(DOSSIER, nom), image);
    return { url: PREFIXE_URL + nom, erreur: null };
  } catch {
    return { url: null, erreur: "Le logo n'a pas pu être traité : le fichier est peut-être abîmé." };
  }
}

/** Vrai si l'adresse designe une photo privee stockee par nos soins. */
export function estPhotoPrivee(url: string): boolean {
  return url.startsWith(PREFIXE_PRIVE) && NOM_VALIDE.test(url.slice(PREFIXE_PRIVE.length));
}

/**
 * Vrai si l'adresse designe une photo stockee par nos soins, publique OU
 * privee. Les deux comptent : cette fonction sert a decider si un fichier
 * nous appartient et doit etre efface quand l'agence le remplace. Oublier
 * les privees laisserait justement les visages sur le disque pour toujours.
 */
export function estPhotoTeleversee(url: string): boolean {
  return estPhotoPrivee(url)
    || (url.startsWith(PREFIXE_URL) && NOM_VALIDE.test(url.slice(PREFIXE_URL.length)));
}

/** Supprime du disque une photo que l'agence remplace ou retire. */
export async function supprimerPhoto(url: string): Promise<void> {
  if (!estPhotoTeleversee(url)) return; // adresse externe : rien a supprimer
  const prive = estPhotoPrivee(url);
  const dossier = prive ? DOSSIER_PRIVE : DOSSIER;
  const prefixe = prive ? PREFIXE_PRIVE : PREFIXE_URL;
  try {
    await fsp.unlink(path.join(dossier, url.slice(prefixe.length)));
  } catch {
    // Fichier deja absent : il n'y a rien a faire.
  }
}

/**
 * Chemin disque d'une photo PRIVEE, pour la route qui la sert.
 *
 * Meme double verrou que pour les photos publiques : le nom doit etre
 * exactement 32 caracteres hexadecimaux suivis de « .webp », puis le chemin
 * resolu doit rester sous le dossier prive. Une adresse contenant « ../ »
 * echoue des la premiere regle.
 */
export function cheminPhotoPrivee(nom: string): string | null {
  if (!NOM_VALIDE.test(nom)) return null;
  const chemin = path.join(DOSSIER_PRIVE, nom);
  if (!chemin.startsWith(DOSSIER_PRIVE + path.sep)) return null;
  return fs.existsSync(chemin) ? chemin : null;
}

/** Emplacements bruts, pour la migration des photos deja en place. */
export const EMPLACEMENTS_PHOTOS = {
  dossierPublic: DOSSIER,
  dossierPrive: DOSSIER_PRIVE,
  prefixePublic: PREFIXE_URL,
  prefixePrive: PREFIXE_PRIVE,
};

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
