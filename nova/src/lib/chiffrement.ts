import "server-only";
import crypto from "node:crypto";

/**
 * Chiffrement des secrets des commercants (cles de leur prestataire de
 * paiement) avant stockage.
 *
 * Ces cles ne nous appartiennent pas : elles donnent acces au compte marchand
 * du commercant. Une copie de la base ne doit pas suffire a s'en servir.
 *
 * La cle maitre vient de NOVA_CLE_SECRETE. Si elle manque, on refuse
 * d'ecrire — plutot que d'enregistrer un secret en clair en silence.
 */

const ALGO = "aes-256-gcm";

function cleMaitre(): Buffer {
  const brut = process.env.NOVA_CLE_SECRETE;
  if (!brut || brut.length < 32) {
    throw new Error(
      "NOVA_CLE_SECRETE absente ou trop courte (32 caractères minimum). " +
      "Sans elle, les clés de paiement ne peuvent pas être chiffrées : " +
      "voir .env.example.",
    );
  }
  // Derivation pour obtenir 32 octets quelle que soit la longueur fournie.
  return crypto.createHash("sha256").update(brut).digest();
}

/** Dit si le chiffrement est utilisable, sans lever d'exception. */
export function chiffrementPret(): boolean {
  try { cleMaitre(); return true; } catch { return false; }
}

export function chiffrer(clair: string): string {
  const cle = cleMaitre();
  const iv = crypto.randomBytes(12);
  const chiffreur = crypto.createCipheriv(ALGO, cle, iv);
  const corps = Buffer.concat([chiffreur.update(clair, "utf8"), chiffreur.final()]);
  const marque = chiffreur.getAuthTag();
  return `${iv.toString("base64")}.${marque.toString("base64")}.${corps.toString("base64")}`;
}

/** Renvoie null si la valeur a ete alteree ou si la cle a change. */
export function dechiffrer(enveloppe: string | null | undefined): string | null {
  if (!enveloppe) return null;
  const [iv, marque, corps] = enveloppe.split(".");
  if (!iv || !marque || !corps) return null;
  try {
    const dechiffreur = crypto.createDecipheriv(ALGO, cleMaitre(), Buffer.from(iv, "base64"));
    dechiffreur.setAuthTag(Buffer.from(marque, "base64"));
    return Buffer.concat([
      dechiffreur.update(Buffer.from(corps, "base64")),
      dechiffreur.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Ne montre que la fin d'un secret : « ••••••3f9a ». */
export function masquer(secret: string | null | undefined): string {
  if (!secret) return "—";
  return `••••••${secret.slice(-4)}`;
}
