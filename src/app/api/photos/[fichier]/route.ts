import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { cheminPhoto } from "@/lib/photos";

/**
 * Sert les photos rangees dans `data/televersements/`.
 * Le nom de fichier est strictement valide en amont : aucune adresse
 * ne peut sortir de ce dossier.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const chemin = cheminPhoto(fichier);

  if (!chemin) {
    return new Response("Photo introuvable", { status: 404 });
  }

  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;

  return new Response(flux, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(statSync(chemin).size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
