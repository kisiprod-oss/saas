/**
 * Sauvegarde de la base et des photos.
 *
 *   node scripts/sauvegarde.mjs [dossier-de-destination]
 *
 * Utilise l'API de sauvegarde de SQLite plutot qu'une copie de fichier : une
 * copie brute pendant une ecriture donne une base corrompue, et le fichier
 * WAL laisse des transactions dehors. `backup()` produit un fichier coherent
 * meme si le site tourne.
 */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const dossier = process.env.NOVA_DOSSIER_DONNEES ?? path.join(racine, "donnees");
const base = process.env.NOVA_FICHIER_BASE ?? path.join(dossier, "nova.db");

if (!fs.existsSync(base)) {
  console.error(`Aucune base à sauvegarder : ${base}`);
  process.exit(1);
}

const horodatage = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const destination = process.argv[2] ?? path.join(racine, "sauvegardes", horodatage);
fs.mkdirSync(destination, { recursive: true });

const db = new Database(base, { readonly: true });
await db.backup(path.join(destination, "nova.db"));
db.close();

// Les photos ne sont pas dans la base : sans elles, la sauvegarde restaure
// une boutique aux images manquantes.
const photos = path.join(dossier, "photos");
if (fs.existsSync(photos)) {
  fs.cpSync(photos, path.join(destination, "photos"), { recursive: true });
}

const taille = (chemin) => {
  let total = 0;
  for (const entree of fs.readdirSync(chemin, { withFileTypes: true })) {
    const complet = path.join(chemin, entree.name);
    total += entree.isDirectory() ? taille(complet) : fs.statSync(complet).size;
  }
  return total;
};

console.log(`Sauvegarde écrite dans ${destination}`);
console.log(`Taille : ${(taille(destination) / 1024 / 1024).toFixed(1)} Mo`);
console.log("\nPour restaurer : arrêtez le service, remplacez le contenu du dossier");
console.log("de données par celui-ci, puis redémarrez.");
