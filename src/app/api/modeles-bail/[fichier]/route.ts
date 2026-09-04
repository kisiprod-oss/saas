import fs from "node:fs";
import { cheminModeleBail } from "@/lib/modele-bail";
import { utilisateurCourant } from "@/lib/auth";
import { un } from "@/lib/db";

/**
 * Sert le modele de bail d'une agence.
 *
 * Prive : seuls les membres de l'agence qui l'a envoye peuvent le
 * telecharger. Un lien devine ou partage entre agences ne suffit pas — on
 * verifie que le fichier demande est bien celui enregistre pour LEUR agence.
 *
 * Toujours en telechargement (`attachment`) et avec `nosniff` : meme un
 * fichier piege ne peut pas s'executer dans la page.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const modele = cheminModeleBail(fichier);
  if (!modele) return new Response("Introuvable", { status: 404 });

  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return new Response("Introuvable", { status: 404 });

  const agence = un<{ modele_bail_url: string | null; modele_bail_nom: string | null }>(
    "SELECT modele_bail_url, modele_bail_nom FROM agences WHERE id = ?", utilisateur.agence_id,
  );
  if (!agence?.modele_bail_url?.endsWith(`/${fichier}`)) {
    // 404 plutot que 403 : inutile de confirmer que le fichier existe.
    return new Response("Introuvable", { status: 404 });
  }

  return new Response(fs.readFileSync(modele.chemin), {
    headers: {
      "Content-Type": modele.type,
      "Content-Disposition": `attachment; filename="${agence.modele_bail_nom ?? fichier}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
