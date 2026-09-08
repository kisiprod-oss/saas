import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { cheminPhotoPrivee } from "@/lib/photos";
import { estAdmin } from "@/lib/admin";
import { utilisateurCourant } from "@/lib/auth";
import { locataireCourant } from "@/lib/auth-locataire";
import { un } from "@/lib/db";

/**
 * Sert la photo d'un locataire ou d'un proprietaire.
 *
 * Ces visages ne s'affichent nulle part publiquement, contrairement aux
 * photos d'annonces et aux portraits d'artisans de l'annuaire. Ils ne sortent
 * donc que pour trois personnes : l'agence a qui la fiche appartient, la
 * personne elle-meme quand elle a un espace, et l'administrateur.
 *
 * REGLE DE REFUS : on repond 404, jamais 403. Un 403 confirmerait que le
 * fichier existe, ce qui apprend deja quelque chose a qui tatonne.
 *
 * REGLE DE CACHE : `private, no-store`. Sans elle, un intermediaire — et
 * demain Cloudflare, place devant le site — garderait ces images en cache et
 * pourrait les resservir hors de tout controle.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const chemin = cheminPhotoPrivee(fichier);
  if (!chemin) return new Response("Introuvable", { status: 404 });

  if (!(await autorise(`/api/photo-privee/${fichier}`))) {
    return new Response("Introuvable", { status: 404 });
  }

  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;
  return new Response(flux, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(statSync(chemin).size),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * A qui appartient cette photo, et le demandeur y a-t-il droit ?
 *
 * La reponse se lit dans la base, pas dans l'adresse : on cherche la fiche
 * qui reference exactement cette URL. Si AUCUNE fiche ne la reference, on
 * refuse — un fichier orphelin sur le disque ne doit pas devenir un fichier
 * public par accident. C'est un refus par defaut, et c'est voulu.
 */
async function autorise(url: string): Promise<boolean> {
  const locataire = un<{ id: number; agence_id: number }>(
    "SELECT id, agence_id FROM locataires WHERE photo_url = ?", url,
  );
  const proprietaire = locataire ? undefined : un<{ agence_id: number }>(
    "SELECT agence_id FROM proprietaires WHERE photo_url = ?", url,
  );

  const agenceProprietaireDeLaFiche = locataire?.agence_id ?? proprietaire?.agence_id;
  if (agenceProprietaireDeLaFiche === undefined) return false;

  const utilisateur = await utilisateurCourant();
  if (estAdmin(utilisateur?.email)) return true;
  if (utilisateur && utilisateur.agence_id === agenceProprietaireDeLaFiche) return true;

  // Le locataire connecte a son propre espace voit sa propre photo.
  if (locataire) {
    const connecte = await locataireCourant();
    if (connecte && connecte.id === locataire.id) return true;
  }

  return false;
}
