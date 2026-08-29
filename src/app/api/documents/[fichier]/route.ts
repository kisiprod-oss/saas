import fs from "node:fs";
import { cheminDocument } from "@/lib/documents";
import { estAdmin } from "@/lib/admin";
import { utilisateurCourant } from "@/lib/auth";
import { artisanCourant } from "@/lib/auth-artisan";
import { un } from "@/lib/db";

/**
 * Sert un document de candidature (CV, diplome).
 *
 * Contrairement aux photos d'annonces, ces fichiers sont PRIVES : seuls
 * l'administrateur de la plateforme et le professionnel qui les a envoyes
 * peuvent les lire. Un lien devine ou partage ne suffit donc pas.
 *
 * Le document part toujours en telechargement (`attachment`) et avec
 * `nosniff` : meme un fichier piege ne peut pas s'executer dans la page.
 */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  const document = cheminDocument(fichier);
  if (!document) return new Response("Introuvable", { status: 404 });

  if (!(await autorise(fichier))) {
    // 404 plutot que 403 : inutile de confirmer que le fichier existe.
    return new Response("Introuvable", { status: 404 });
  }

  return new Response(fs.readFileSync(document.chemin), {
    headers: {
      "Content-Type": document.type,
      "Content-Disposition": `attachment; filename="${fichier}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

/** L'administrateur voit tout ; un artisan ne voit que ses propres pieces. */
async function autorise(fichier: string): Promise<boolean> {
  const utilisateur = await utilisateurCourant();
  if (estAdmin(utilisateur?.email)) return true;

  const artisan = await artisanCourant();
  if (!artisan) return false;

  const ligne = un<{ cv_url: string | null; documents: string | null }>(
    "SELECT cv_url, documents FROM artisans WHERE id = ?", artisan.id,
  );
  const siennes = [ligne?.cv_url ?? "", ...(ligne?.documents ?? "").split("\n")];
  return siennes.some((u) => u.trim().endsWith(`/${fichier}`));
}
