/**
 * Remise a zero de la base locale.
 *
 *   npm run reset
 *
 * DETRUIT le fichier de base et le dossier des photos. Refuse de s'executer
 * si NODE_ENV vaut "production" : cette commande n'a rien a faire sur un
 * serveur qui porte de vraies boutiques.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

if (process.env.NODE_ENV === "production") {
  console.error("Refusé : NODE_ENV=production. Cette commande efface toutes les données.");
  process.exit(1);
}

const racine = process.cwd();
const dossier = process.env.NOVA_DOSSIER_DONNEES ?? path.join(racine, "donnees");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const reponse = await rl.question(
  `Effacer définitivement ${dossier} (base et photos) ? Tapez EFFACER pour confirmer : `,
);
rl.close();

if (reponse.trim() !== "EFFACER") {
  console.log("Annulé. Rien n'a été touché.");
  process.exit(0);
}

fs.rmSync(dossier, { recursive: true, force: true });
console.log(`Effacé : ${dossier}`);
console.log("Relancez `npm run seed` pour réinstaller les démonstrations.");
