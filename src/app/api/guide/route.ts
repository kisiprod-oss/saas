import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { exigerSession } from "@/lib/auth";
import { cheminGuide, noterGuideTelecharge, NOM_TELECHARGEMENT } from "@/lib/guide";

/**
 * Remet le guide d'utilisation a l'agence connectee, et note la date.
 *
 * C'est le SEUL endroit qui pose `guide_telecharge_le`. Le bouton
 * « Continuer » de la page d'accueil ne fait que verifier cette date : on ne
 * peut donc pas entrer en pretendant avoir telecharge, il faut etre passe
 * par ici, et donc avoir demande le fichier.
 *
 * `attachment` plutot que l'ouverture dans l'onglet : le navigateur enregistre
 * le PDF et la page reste affichee derriere. L'agence lit la suite des
 * explications au lieu de se retrouver devant un lecteur de PDF sans retour.
 */
export async function GET() {
  const { agence } = await exigerSession();

  const chemin = cheminGuide();
  if (!chemin) {
    // Le fichier manque sur le serveur. Ne PAS noter le telechargement : la
    // date servirait alors de passe-droit pour un guide que personne n'a eu.
    return new Response("Le guide n'est pas disponible pour le moment.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  noterGuideTelecharge(agence.id);

  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;

  return new Response(flux, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(statSync(chemin).size),
      "Content-Disposition": `attachment; filename="${NOM_TELECHARGEMENT}"`,
      // Servi derriere une session : aucun intermediaire ne doit le garder.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
