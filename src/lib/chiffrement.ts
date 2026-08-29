import "server-only";
import crypto from "node:crypto";

/**
 * Chiffrement des secrets stockes en base.
 *
 * Les cles marchandes d'une agence donnent le droit d'encaisser en son nom :
 * ce sont des mots de passe. Elles ne doivent jamais se retrouver en clair
 * dans la base, ni dans une sauvegarde, ni sous les yeux de qui recupere le
 * fichier SQLite.
 *
 * AES-256-GCM : chiffre ET authentifie. Une valeur modifiee est rejetee au
 * dechiffrement au lieu de produire des octets faux.
 *
 * La cle vient de CLE_CHIFFREMENT. Sans elle, l'encaissement automatique
 * refuse simplement de s'activer : mieux vaut une fonction indisponible
 * qu'un secret ecrit en clair.
 */

const ALGO = "aes-256-gcm";
const SEL = "sen-gestion:encaissement";

/** Vrai si une cle de chiffrement utilisable est configuree. */
export function chiffrementConfigure(): boolean {
  const brute = process.env.CLE_CHIFFREMENT ?? "";
  return brute.length >= 16;
}

/**
 * Derive une cle de 32 octets a partir de CLE_CHIFFREMENT.
 * scrypt permet d'accepter une phrase saisie a la main plutot que
 * d'exiger exactement 32 octets aleatoires.
 */
function cle(): Buffer {
  const brute = process.env.CLE_CHIFFREMENT ?? "";
  if (brute.length < 16) {
    throw new Error("CLE_CHIFFREMENT absente ou trop courte (16 caractères minimum).");
  }
  return crypto.scryptSync(brute, SEL, 32);
}

/** Chiffre une valeur. Renvoie « iv:tag:donnees », en hexadecimal. */
export function chiffrer(valeur: string): string {
  const iv = crypto.randomBytes(12);
  const chiffreur = crypto.createCipheriv(ALGO, cle(), iv);
  const donnees = Buffer.concat([chiffreur.update(valeur, "utf8"), chiffreur.final()]);
  return [iv.toString("hex"), chiffreur.getAuthTag().toString("hex"), donnees.toString("hex")].join(":");
}

/**
 * Dechiffre une valeur produite par `chiffrer`.
 * Renvoie null si la valeur est absente, abimee, ou si la cle a change —
 * l'appelant traite alors l'encaissement comme non configure.
 */
export function dechiffrer(stocke: string | null | undefined): string | null {
  if (!stocke) return null;
  const [ivHex, tagHex, donneesHex] = stocke.split(":");
  if (!ivHex || !tagHex || !donneesHex) return null;

  try {
    const dechiffreur = crypto.createDecipheriv(ALGO, cle(), Buffer.from(ivHex, "hex"));
    dechiffreur.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      dechiffreur.update(Buffer.from(donneesHex, "hex")),
      dechiffreur.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Masque un secret pour l'afficher sans le reveler : « test_pri…F5 ».
 * Sert a confirmer a l'agence que la bonne cle est enregistree, sans
 * permettre a personne de la recopier depuis l'ecran.
 */
export function masquer(secret: string | null): string {
  if (!secret) return "";
  if (secret.length <= 10) return "•".repeat(secret.length);
  return `${secret.slice(0, 6)}${"•".repeat(8)}${secret.slice(-2)}`;
}
