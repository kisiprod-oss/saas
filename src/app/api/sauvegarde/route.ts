import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { utilisateurCourant } from "@/lib/auth";

/**
 * Telechargement d'une copie de la base par le titulaire du compte.
 *
 * La copie est produite par l'API de sauvegarde de SQLite : elle est
 * coherente meme si quelqu'un ecrit au meme moment.
 */

const TAILLE_MAX = 100 * 1024 * 1024; // au-dela, on renvoie vers le script

export async function GET() {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) {
    return new Response("Connexion requise", { status: 401 });
  }
  if (utilisateur.role !== "proprietaire") {
    return new Response("Seul le titulaire du compte peut télécharger la sauvegarde", { status: 403 });
  }

  const source = process.env.DATABASE_FILE
    ?? path.join(process.cwd(), "data", "sen-gestion.db");

  if (!fs.existsSync(source)) {
    return new Response("Base introuvable", { status: 404 });
  }
  if (fs.statSync(source).size > TAILLE_MAX) {
    return new Response(
      "Base trop volumineuse pour un téléchargement direct. Utilisez « npm run sauvegarde » sur le serveur.",
      { status: 413 },
    );
  }

  const copie = path.join(os.tmpdir(), `sen-gestion-${crypto.randomBytes(8).toString("hex")}.db`);

  try {
    const db = new Database(source, { readonly: true });
    await db.backup(copie);
    db.close();

    const contenu = fs.readFileSync(copie);
    const nom = `sen-gestion-${new Date().toISOString().slice(0, 10)}.db`;

    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${nom}"`,
        "Content-Length": String(contenu.length),
        "Cache-Control": "no-store",
      },
    });
  } finally {
    if (fs.existsSync(copie)) fs.unlinkSync(copie);
  }
}
