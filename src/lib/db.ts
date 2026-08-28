import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Connexion unique a la base SQLite.
 * Le fichier de base est cree automatiquement au premier demarrage
 * dans le dossier `data/` a la racine du projet.
 */

const racine = process.cwd();
const dossierData = path.join(racine, "data");
const cheminBase = process.env.DATABASE_FILE ?? path.join(dossierData, "keur-gestion.db");

function ouvrirBase(): Database.Database {
  fs.mkdirSync(path.dirname(cheminBase), { recursive: true });
  const base = new Database(cheminBase);
  base.pragma("journal_mode = WAL");
  base.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8");
  base.exec(schema);
  return base;
}

// En developpement, Next.js recharge les modules a chaque modification :
// on garde la connexion dans globalThis pour ne pas en ouvrir des dizaines.
const cache = globalThis as unknown as { __keurDb?: Database.Database };
export const db: Database.Database = cache.__keurDb ?? ouvrirBase();
if (process.env.NODE_ENV !== "production") cache.__keurDb = db;

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
