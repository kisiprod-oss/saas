import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Sharp, Metadata } from "sharp";
import { dossierDonnees } from "./db";

/**
 * Photos des produits et logos.
 *
 * Trois regles, dans cet ordre d'importance :
 *
 *  1. ISOLATION. Chaque boutique ecrit dans son propre dossier,
 *     `donnees/photos/<boutique_id>/`. Le nom de fichier stocke en base ne
 *     contient jamais de chemin : il est recompose ici a partir de
 *     l'identifiant de la boutique lu dans la session. Un commercant ne peut
 *     donc pas designer le fichier d'un autre, meme en falsifiant un nom.
 *
 *  2. ON NE FAIT PAS CONFIANCE AU NAVIGATEUR. Ni au type declare, ni a
 *     l'extension, ni au nom. Le fichier est decode par sharp : s'il n'est pas
 *     une image, le decodage echoue et on refuse. Ce qui est enregistre est
 *     le resultat du re-encodage, pas l'octet recu.
 *
 *  3. POIDS. Le public cible paie sa connexion au megaoctet. Toute photo est
 *     ramenee a 1400 px et convertie en WebP, avec une vignette de 400 px pour
 *     les listes.
 */

const RACINE_PHOTOS = path.join(dossierDonnees, "photos");
const LARGEUR_MAX = 1400;
const LARGEUR_VIGNETTE = 400;
const POIDS_MAX = 12 * 1024 * 1024;

/** Un nom de fichier valide : 32 caracteres hexadecimaux, puis .webp. */
const NOM_VALIDE = /^[0-9a-f]{32}\.webp$/;
const PREFIXE_VIGNETTE = "v_";

export type Resultat =
  | { ok: true; fichier: string }
  | { ok: false; erreur: string };

function dossierDe(boutiqueId: number): string {
  // `boutiqueId` vient toujours de la session cote serveur. On le force en
  // entier malgre tout : c'est la derniere barriere avant un chemin.
  const id = Math.trunc(Number(boutiqueId));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identifiant de boutique invalide.");
  return path.join(RACINE_PHOTOS, String(id));
}

/**
 * Le chemin sur le disque d'une photo, ou null si le nom est suspect.
 *
 * Aucune concatenation de chaines : `path.join` d'abord, puis verification
 * que le resultat est bien SOUS le dossier de la boutique. C'est ce dernier
 * controle qui bloque un « ../../ » qui aurait survecu au filtre de nom.
 */
export function cheminPhoto(
  boutiqueId: number, fichier: string, vignette = false,
): string | null {
  if (!NOM_VALIDE.test(fichier)) return null;
  const dossier = dossierDe(boutiqueId);
  const nom = vignette ? PREFIXE_VIGNETTE + fichier : fichier;
  const chemin = path.join(dossier, nom);
  if (!chemin.startsWith(dossier + path.sep)) return null;
  return chemin;
}

/** L'adresse publique d'une photo. Passe par une route qui verifie le nom. */
export function urlPhoto(
  boutiqueId: number, fichier: string | null | undefined, vignette = false,
): string | null {
  if (!fichier || !NOM_VALIDE.test(fichier)) return null;
  return `/api/photo/${boutiqueId}/${vignette ? PREFIXE_VIGNETTE : ""}${fichier}`;
}

/**
 * Enregistre une image envoyee par un formulaire.
 *
 * Renvoie le NOM du fichier, jamais un chemin : c'est ce nom qui va en base.
 */
export async function enregistrer(boutiqueId: number, fichier: File): Promise<Resultat> {
  if (!fichier || fichier.size === 0) return { ok: false, erreur: "Fichier vide." };
  if (fichier.size > POIDS_MAX) {
    return { ok: false, erreur: "Cette image dépasse 12 Mo. Choisissez-en une plus légère." };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());

  let image: Sharp;
  let metadonnees: Metadata;
  try {
    // `failOn: "error"` : une image tronquee ou bricolee est refusee plutot
    // que reparee en silence.
    image = sharp(octets, { failOn: "error", limitInputPixels: 50_000_000 });
    metadonnees = await image.metadata();
  } catch {
    return { ok: false, erreur: "Ce fichier n'est pas une image que nous savons lire." };
  }

  const formats = ["jpeg", "jpg", "png", "webp", "avif", "heif", "gif", "tiff"];
  if (!metadonnees.format || !formats.includes(metadonnees.format)) {
    return { ok: false, erreur: "Format d'image non pris en charge (JPEG, PNG, WebP, HEIC)." };
  }

  const nom = `${crypto.randomBytes(16).toString("hex")}.webp`;
  const dossier = dossierDe(boutiqueId);
  fs.mkdirSync(dossier, { recursive: true });

  try {
    // `rotate()` sans argument applique l'orientation EXIF : sans lui, les
    // photos prises au telephone arrivent couchees. Le re-encodage supprime
    // au passage les metadonnees, dont la position GPS de la boutique.
    const base = sharp(octets, { failOn: "error" }).rotate();

    await base
      .clone()
      .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(dossier, nom));

    await base
      .clone()
      .resize({ width: LARGEUR_VIGNETTE, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(path.join(dossier, PREFIXE_VIGNETTE + nom));
  } catch {
    return { ok: false, erreur: "L'enregistrement de l'image a échoué. Réessayez." };
  }

  return { ok: true, fichier: nom };
}

/** Supprime une photo et sa vignette. Silencieux si elles n'existent plus. */
export function supprimer(boutiqueId: number, fichier: string) {
  for (const vignette of [false, true]) {
    const chemin = cheminPhoto(boutiqueId, fichier, vignette);
    if (chemin) { try { fs.unlinkSync(chemin); } catch { /* deja partie */ } }
  }
}

/** Relit une liste de photos stockee en JSON, en jetant les noms invalides. */
export function lirePhotos(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const valeur = JSON.parse(json);
    if (!Array.isArray(valeur)) return [];
    return valeur.filter((n) => typeof n === "string" && NOM_VALIDE.test(n)).slice(0, 8);
  } catch {
    return [];
  }
}

export function estNomValide(nom: string): boolean {
  return NOM_VALIDE.test(nom.startsWith(PREFIXE_VIGNETTE) ? nom.slice(PREFIXE_VIGNETTE.length) : nom);
}

export { PREFIXE_VIGNETTE, RACINE_PHOTOS };
