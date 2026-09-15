import "server-only";
import crypto from "node:crypto";

/**
 * Codes a usage unique, norme TOTP (RFC 6238).
 *
 * C'est ce que lisent Google Authenticator, Authy, FreeOTP et les gestionnaires
 * de mots de passe. Trente lignes de calcul et aucune dependance : la norme
 * tient en un HMAC-SHA1 sur le numero de la tranche de trente secondes.
 *
 * POURQUOI PAS UN CODE PAR E-MAIL. Ce serait plus simple, mais le facteur
 * s'effondre le jour ou la boite e-mail est compromise — or c'est justement
 * l'adresse e-mail qui designe l'administrateur. Un secret pose dans un
 * telephone est un facteur reellement distinct. Et il fonctionne sans reseau,
 * ce qui compte quand la connexion n'est pas garantie.
 */

const PAS_SECONDES = 30;
const CHIFFRES = 6;
/** Une tranche avant et une apres : tolère une horloge un peu décalée. */
const TOLERANCE = 1;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Secret aleatoire de 160 bits, en base32 — le format que lisent les applis. */
export function nouveauSecret(): string {
  const octets = crypto.randomBytes(20);
  let bits = "";
  for (const o of octets) bits += o.toString(2).padStart(8, "0");
  let sortie = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    sortie += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return sortie;
}

function base32VersOctets(secret: string): Buffer {
  const propre = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of propre) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}

/** Le code attendu pour une tranche de temps donnee. */
function codePourTranche(secret: string, tranche: number): string {
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(tranche));
  const empreinte = crypto.createHmac("sha1", base32VersOctets(secret)).update(compteur).digest();
  // « Troncature dynamique » de la norme : les 4 derniers bits designent
  // l'endroit ou lire les 31 bits qui font le code.
  const debut = empreinte[empreinte.length - 1] & 0x0f;
  const valeur = ((empreinte[debut] & 0x7f) << 24)
    | (empreinte[debut + 1] << 16)
    | (empreinte[debut + 2] << 8)
    | empreinte[debut + 3];
  return String(valeur % 10 ** CHIFFRES).padStart(CHIFFRES, "0");
}

/**
 * Verifie un code saisi. La comparaison passe par `timingSafeEqual` : comparer
 * deux chaines avec `===` s'arrete au premier caractere different, et ce temps
 * de reponse suffit a deviner un code chiffre par chiffre.
 */
export function codeValide(secret: string | null | undefined, saisie: string): boolean {
  if (!secret) return false;
  const propre = saisie.replace(/\D/g, "");
  if (propre.length !== CHIFFRES) return false;
  const tranche = Math.floor(Date.now() / 1000 / PAS_SECONDES);
  for (let d = -TOLERANCE; d <= TOLERANCE; d++) {
    const attendu = Buffer.from(codePourTranche(secret, tranche + d));
    const recu = Buffer.from(propre);
    if (attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu)) return true;
  }
  return false;
}

/** L'adresse que l'application d'authentification lit dans le QR code. */
export function adresseOtpauth(secret: string, email: string, emetteur = "Sen Gestion"): string {
  const libelle = encodeURIComponent(`${emetteur}:${email}`);
  const p = new URLSearchParams({
    secret, issuer: emetteur, algorithm: "SHA1",
    digits: String(CHIFFRES), period: String(PAS_SECONDES),
  });
  return `otpauth://totp/${libelle}?${p.toString()}`;
}

/** Le secret en groupes de quatre, pour qui doit le recopier a la main. */
export function secretLisible(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
