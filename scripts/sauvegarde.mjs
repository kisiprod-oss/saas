/**
 * Sauvegarde de Sen Gestion.
 *
 * Cree une copie coherente de la base (meme si l'application tourne) et,
 * quand c'est possible, une archive contenant aussi les photos.
 * Les sauvegardes trop anciennes sont supprimees automatiquement.
 *
 * Utilisation :
 *   npm run sauvegarde
 *
 * Tous les jours a 2 h du matin (crontab -e sur le serveur) :
 *   0 2 * * * cd /chemin/vers/sen-gestion && /usr/bin/npm run sauvegarde >> data/sauvegardes.log 2>&1
 */
import Database from "better-sqlite3";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resoudreDossierDonnees } from "../src/lib/dossier-donnees.mjs";

const racine = process.cwd();
const dossierData = resoudreDossierDonnees(racine);
const base = process.env.DATABASE_FILE ?? path.join(dossierData, "sen-gestion.db");
const dossier = path.join(dossierData, "sauvegardes");
const aConserver = Number(process.env.SAUVEGARDES_A_CONSERVER ?? 14);

if (!fs.existsSync(base)) {
  console.error(`Aucune base a sauvegarder : ${base}`);
  process.exit(1);
}

fs.mkdirSync(dossier, { recursive: true });

const horodatage = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const nomBase = `sen-gestion-${horodatage}.db`;
const cheminBase = path.join(dossier, nomBase);

// L'API de sauvegarde de SQLite produit une copie coherente meme
// pendant que l'application ecrit : bien plus sur qu'un simple copier-coller.
const db = new Database(base, { readonly: true });
await db.backup(cheminBase);
db.close();

const lisible = (octets) =>
  octets > 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1)} Mo`
    : `${Math.round(octets / 1024)} Ko`;

let resultat = cheminBase;
const photos = path.join(dossierData, "televersements");

// Si des photos existent, on regroupe tout dans une seule archive.
if (fs.existsSync(photos) && fs.readdirSync(photos).length > 0) {
  const archive = path.join(dossier, `sen-gestion-${horodatage}.tar.gz`);
  try {
    execFileSync("tar", [
      "-czf", archive,
      "-C", dossier, nomBase,
      "-C", dossierData, "televersements",
    ], { stdio: "pipe" });
    fs.unlinkSync(cheminBase);
    resultat = archive;
  } catch {
    console.warn("Archive impossible (commande tar indisponible) : seule la base a ete copiee.");
  }
}

// Rotation : on ne garde que les sauvegardes les plus recentes.
const anciennes = fs.readdirSync(dossier)
  .filter((f) => f.startsWith("sen-gestion-"))
  .map((f) => ({ f, t: fs.statSync(path.join(dossier, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)
  .slice(aConserver);

for (const { f } of anciennes) fs.unlinkSync(path.join(dossier, f));

console.log(`Sauvegarde : ${resultat}  (${lisible(fs.statSync(resultat).size)})`);
if (anciennes.length > 0) {
  console.log(`${anciennes.length} sauvegarde(s) ancienne(s) supprimee(s), ${aConserver} conservee(s).`);
}
