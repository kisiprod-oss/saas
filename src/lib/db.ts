import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Connexion unique a la base SQLite.
 * Le fichier de base est cree automatiquement au premier demarrage
 * dans le dossier `data/` a la racine du projet.
 */

const racine = process.cwd();

/**
 * Dossier qui contient TOUTES les donnees : base et photos.
 *
 * Sur un hebergement qui remplace le dossier de l'application a chaque
 * deploiement, il faut le placer ailleurs, par exemple :
 *   DOSSIER_DONNEES=/home/utilisateur/donnees-sen-gestion
 * Sans quoi la mise a jour du logiciel effacerait les donnees.
 */
export const dossierData = process.env.DOSSIER_DONNEES
  ? path.resolve(process.env.DOSSIER_DONNEES)
  : path.join(racine, "data");

const cheminBase = process.env.DATABASE_FILE ?? path.join(dossierData, "sen-gestion.db");

function ouvrirBase(): Database.Database {
  fs.mkdirSync(path.dirname(cheminBase), { recursive: true });
  const base = new Database(cheminBase);
  base.pragma("journal_mode = WAL");
  base.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8");
  base.exec(schema);
  migrer(base);
  return base;
}

/**
 * Ajoute les colonnes apparues apres la creation d'une base existante.
 * `CREATE TABLE IF NOT EXISTS` ne modifie pas une table deja presente :
 * il faut donc completer les tables anciennes une par une.
 */
function migrer(base: Database.Database) {
  const colonnes = [
    ["agences", "plan", "TEXT NOT NULL DEFAULT 'decouverte'"],
    ["utilisateurs", "google_id", "TEXT"],
    ["utilisateurs", "avatar_url", "TEXT"],
    ["locataires", "mot_de_passe_hash", "TEXT"],
    ["locataires", "acces_actif", "INTEGER NOT NULL DEFAULT 0"],
    ["paiements", "declare_par_locataire", "INTEGER NOT NULL DEFAULT 0"],
    ["paiements", "confirme", "INTEGER NOT NULL DEFAULT 1"],
    ["agences", "modele_rappel", "TEXT"],
    ["agences", "modele_relance", "TEXT"],
    ["agences", "modele_mise_en_demeure", "TEXT"],
    ["agences", "paiement_orange_money", "TEXT"],
    ["agences", "paiement_wave", "TEXT"],
    ["agences", "paiement_free_money", "TEXT"],
    ["agences", "paiement_consignes", "TEXT"],
    ["locataires", "photo_url", "TEXT"],
    ["biens", "courte_duree", "INTEGER NOT NULL DEFAULT 0"],
    ["biens", "prix_nuit", "INTEGER NOT NULL DEFAULT 0"],
    ["biens", "nuits_min", "INTEGER NOT NULL DEFAULT 1"],
    ["biens", "capacite", "INTEGER NOT NULL DEFAULT 2"],
  ] as const;

  for (const [table, colonne, type] of colonnes) {
    const existantes = base.pragma(`table_info(${table})`) as { name: string }[];
    if (existantes.some((c) => c.name === colonne)) continue;

    try {
      base.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${type}`);
    } catch (e) {
      // Plusieurs processus peuvent demarrer en meme temps (Next.js compile
      // les pages en parallele) et tenter la meme migration : le second
      // recoit « duplicate column name ». La colonne existe alors bien,
      // c'est exactement le resultat voulu. Toute autre erreur est reelle.
      if (!String((e as Error).message).includes("duplicate column name")) throw e;
    }
  }

  // Index — et non contrainte inline : ALTER TABLE ne sait pas ajouter de
  // contrainte UNIQUE a une table existante. Il se cree ici, apres les
  // colonnes : place dans schema.sql, il s'executerait avant elles.
  base.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_google
       ON utilisateurs(google_id) WHERE google_id IS NOT NULL`,
  );
}

// En developpement, Next.js recharge les modules a chaque modification :
// on garde la connexion dans globalThis pour ne pas en ouvrir des dizaines.
const cache = globalThis as unknown as { __senDb?: Database.Database };
export const db: Database.Database = cache.__senDb ?? ouvrirBase();
if (process.env.NODE_ENV !== "production") cache.__senDb = db;

/** Raccourci : renvoie toutes les lignes d'une requete. */
export function tous<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}

/** Raccourci : renvoie la premiere ligne d'une requete, ou undefined. */
export function un<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as T | undefined;
}

/** Raccourci : execute une requete d'ecriture (INSERT / UPDATE / DELETE). */
export function ecrire(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...(params as never[]));
}
