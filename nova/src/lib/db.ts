import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * Connexion unique a la base SQLite.
 *
 * Pourquoi SQLite pour un SaaS : au lancement, une boutique represente
 * quelques milliers de lignes. Un fichier unique se sauvegarde par copie, se
 * restaure en le remettant en place, et ne demande aucun serveur a
 * administrer. Tout l'acces passe par les trois fonctions du bas de ce
 * fichier ; changer pour PostgreSQL le jour ou la charge l'exige est un
 * changement de pilote, pas une reecriture.
 */

const racine = process.cwd();

/** Dossier de TOUTES les donnees : base, photos, logos. Un seul a sauvegarder. */
export const dossierDonnees: string =
  process.env.NOVA_DOSSIER_DONNEES ?? path.join(racine, "donnees");

const cheminBase = process.env.NOVA_FICHIER_BASE ?? path.join(dossierDonnees, "nova.db");

function ouvrir(): Database.Database {
  fs.mkdirSync(path.dirname(cheminBase), { recursive: true });
  const base = new Database(cheminBase);
  // WAL : un ecrivain et plusieurs lecteurs en meme temps. Sans lui, une page
  // publique de boutique attend qu'une commande finisse de s'ecrire.
  base.pragma("journal_mode = WAL");
  base.pragma("foreign_keys = ON");
  // 5 s d'attente avant de rendre « database is locked » : le temps qu'une
  // ecriture concurrente se termine, plutot qu'une erreur au visiteur.
  base.pragma("busy_timeout = 5000");
  base.exec(fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8"));
  migrer(base);
  garnir(base);
  return base;
}

/**
 * Colonnes apparues apres la premiere mise en service.
 *
 * `CREATE TABLE IF NOT EXISTS` ne touche pas a une table existante : les
 * bases deja en production ne verraient jamais une nouvelle colonne. On les
 * ajoute donc une par une, en ignorant l'erreur « duplicate column ».
 */
function migrer(base: Database.Database) {
  const colonnes: [string, string, string][] = [
    // [table, colonne, definition]
    ["boutiques", "taux_change", "TEXT NOT NULL DEFAULT '{}'"],
    ["boutiques", "marge_import", "INTEGER NOT NULL DEFAULT 0"],
  ];
  for (const [table, colonne, definition] of colonnes) {
    try {
      base.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
    } catch (e) {
      const message = (e as Error).message;
      if (!message.includes("duplicate column")) throw e;
    }
  }
}

/**
 * Donnees de reference indispensables au demarrage : les pays servis et les
 * offres. Elles sont inserees si absentes, JAMAIS ecrasees — les tarifs sont
 * modifiables depuis l'administration, et une remise a zero a chaque
 * demarrage effacerait ces reglages.
 */
function garnir(base: Database.Database) {
  const paysExistants = base.prepare("SELECT COUNT(*) n FROM pays").get() as { n: number };
  if (paysExistants.n === 0) {
    base.prepare(
      `INSERT INTO pays (code, nom, devise, devise_libelle, decimales, indicatif,
                         longueur_nationale, villes, moyens_paiement, actif, ordre)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "SN", "Sénégal", "XOF", "FCFA", 0, "+221", 9,
      JSON.stringify([
        "Dakar", "Pikine", "Guédiawaye", "Rufisque", "Thiès", "Mbour", "Saint-Louis",
        "Kaolack", "Ziguinchor", "Touba", "Diourbel", "Louga", "Tambacounda", "Kolda",
      ]),
      // Codes des prestataires ENVISAGES pour ce pays. Leur presence ici ne
      // veut pas dire qu'une integration existe : voir src/lib/paiements.ts,
      // ou chaque prestataire declare son etat reel.
      JSON.stringify(["paydunya", "wave", "orange_money"]),
      1, 1,
    );
    // Les pays suivants sont poses inactifs : l'ossature est la, mais rien
    // n'est affiche tant que les moyens de paiement et la livraison n'ont pas
    // ete verifies sur place.
    const aVenir: [string, string, string, string, string, number, string][] = [
      ["CI", "Côte d'Ivoire", "XOF", "FCFA", "+225", 10, "Abidjan,Bouaké,Yamoussoukro"],
      ["ML", "Mali", "XOF", "FCFA", "+223", 8, "Bamako,Sikasso,Ségou"],
      ["BF", "Burkina Faso", "XOF", "FCFA", "+226", 8, "Ouagadougou,Bobo-Dioulasso"],
      ["BJ", "Bénin", "XOF", "FCFA", "+229", 8, "Cotonou,Porto-Novo"],
      ["TG", "Togo", "XOF", "FCFA", "+228", 8, "Lomé,Sokodé"],
      ["CM", "Cameroun", "XAF", "FCFA", "+237", 9, "Douala,Yaoundé"],
      ["GN", "Guinée", "GNF", "GNF", "+224", 9, "Conakry,Kankan"],
    ];
    const ins = base.prepare(
      `INSERT INTO pays (code, nom, devise, devise_libelle, decimales, indicatif,
                         longueur_nationale, villes, moyens_paiement, actif, ordre)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, '[]', 0, ?)`,
    );
    aVenir.forEach(([code, nom, devise, libelle, indicatif, longueur, villes], i) => {
      ins.run(code, nom, devise, libelle, indicatif, longueur,
        JSON.stringify(villes.split(",")), 10 + i);
    });
  }

  const offresExistantes = base.prepare("SELECT COUNT(*) n FROM offres").get() as { n: number };
  if (offresExistantes.n === 0) {
    const ins = base.prepare(
      `INSERT INTO offres (code, nom, prix_mensuel, devise, max_produits, quota_ia,
                           max_membres, domaine_personnalise, publication, accroche, ordre, actif)
       VALUES (?, ?, ?, 'XOF', ?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    ins.run("decouverte", "Découverte", 0, 5, 10, 1, 0, 0,
      "Construisez et essayez votre boutique. La publication demande une formule payante.", 1);
    ins.run("essentiel", "Essentiel", 5000, 30, 100, 1, 0, 1,
      "Votre boutique en ligne, publiée sur une adresse nova.shop.", 2);
    ins.run("business", "Business", 12500, 300, 400, 3, 1, 1,
      "Plus de produits, votre propre nom de domaine.", 3);
    ins.run("pro", "Pro", 25000, 3000, 1500, 10, 1, 1,
      "Pour une équipe, avec des quotas confortables.", 4);
  }
}

/**
 * En developpement, Next recharge les modules a chaque modification. Sans ce
 * cache, chaque rechargement rouvrirait la base et finirait par epuiser les
 * descripteurs de fichiers.
 */
const cache = globalThis as unknown as { __novaDb?: Database.Database };
export const db: Database.Database = cache.__novaDb ?? ouvrir();
if (process.env.NODE_ENV !== "production") cache.__novaDb = db;

export function tous<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as T[];
}
export function un<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as T | undefined;
}
export function ecrire(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...(params as never[]));
}
/** Enveloppe une suite d'ecritures : tout passe, ou rien ne passe. */
export function transaction<T>(travail: () => T): T {
  return db.transaction(travail)();
}
