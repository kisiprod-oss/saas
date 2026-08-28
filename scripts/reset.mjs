/** Supprime la base de donnees locale. Utilisation : npm run reset */
import fs from "node:fs";
import path from "node:path";

const dossierData = process.env.DOSSIER_DONNEES
  ? path.resolve(process.env.DOSSIER_DONNEES)
  : path.join(process.cwd(), "data");
const base = process.env.DATABASE_FILE ?? path.join(dossierData, "sen-gestion.db");
let supprimes = 0;

for (const suffixe of ["", "-wal", "-shm"]) {
  const chemin = base + suffixe;
  if (fs.existsSync(chemin)) { fs.unlinkSync(chemin); supprimes++; }
}

console.log(supprimes > 0
  ? "Base supprimee. Lancez `npm run seed` pour repartir des donnees de demonstration."
  : "Aucune base a supprimer.");
