import fs from "node:fs";
import { NextRequest } from "next/server";
import { cheminPhoto, PREFIXE_VIGNETTE } from "@/lib/photos";

/**
 * Sert une photo de produit.
 *
 * Les photos de produits sont PUBLIQUES par nature : elles s'affichent sur une
 * boutique ouverte à tous. Cette route ne verifie donc pas de session — mais
 * elle verifie tout le reste :
 *
 *   — le nom du fichier doit correspondre exactement au motif attendu
 *     (32 hexadecimaux + .webp), sinon rien n'est servi ;
 *   — le chemin est recompose par `cheminPhoto`, qui refuse tout ce qui
 *     sortirait du dossier de la boutique ;
 *   — le type renvoye est fixe a image/webp, pas deduit du nom : un fichier
 *     ne peut pas etre servi comme du HTML et devenir un XSS.
 *
 * Les logos et les photos ne sont pas devinables : leur nom est tire au
 * hasard sur 128 bits.
 */
export async function GET(
  _requete: NextRequest,
  { params }: { params: Promise<{ boutique: string; fichier: string }> },
) {
  const { boutique, fichier } = await params;

  const boutiqueId = Number(boutique);
  if (!Number.isSafeInteger(boutiqueId) || boutiqueId <= 0) {
    return new Response("Introuvable", { status: 404 });
  }

  const vignette = fichier.startsWith(PREFIXE_VIGNETTE);
  const nom = vignette ? fichier.slice(PREFIXE_VIGNETTE.length) : fichier;

  const chemin = cheminPhoto(boutiqueId, nom, vignette);
  if (!chemin || !fs.existsSync(chemin)) {
    return new Response("Introuvable", { status: 404 });
  }

  const octets = await fs.promises.readFile(chemin);
  return new Response(new Uint8Array(octets), {
    headers: {
      "content-type": "image/webp",
      // Le nom du fichier change a chaque televersement : le contenu derriere
      // une adresse donnee ne bouge jamais, on peut donc le garder un an.
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(octets.length),
    },
  });
}
