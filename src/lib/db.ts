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
    ["agences", "encaissement_actif", "INTEGER NOT NULL DEFAULT 0"],
    ["agences", "encaissement_fournisseur", "TEXT"],
    ["agences", "encaissement_mode", "TEXT NOT NULL DEFAULT 'test'"],
    ["agences", "encaissement_cle_maitre", "TEXT"],
    ["agences", "encaissement_cle_privee", "TEXT"],
    ["agences", "encaissement_jeton", "TEXT"],
    // Fin de la periode payee. NULL = aucun abonnement regle a ce jour ;
    // la formule vaut alors ce que dit `plan`, sans echeance.
    ["agences", "plan_expire_le", "TEXT"],
    ["artisans", "origine", "TEXT NOT NULL DEFAULT 'agence'"],
    ["artisans", "email", "TEXT"],
    ["artisans", "mot_de_passe_hash", "TEXT"],
    ["artisans", "experience_annees", "INTEGER NOT NULL DEFAULT 0"],
    ["artisans", "cv_url", "TEXT"],
    ["artisans", "documents", "TEXT"],
    ["artisans", "statut_candidature", "TEXT NOT NULL DEFAULT 'valide'"],
    ["artisans", "motif_refus", "TEXT"],
    ["artisans", "valide_le", "TEXT"],
    ["artisans", "quiz_score", "INTEGER"],
    ["artisans", "quiz_total", "INTEGER"],
    ["artisans", "quiz_reussi", "INTEGER NOT NULL DEFAULT 0"],
    ["artisans", "quiz_passe_le", "TEXT"],
    ["agences", "compte_gratuit_reutilise", "INTEGER NOT NULL DEFAULT 0"],
    ["factures", "code_verification", "TEXT"],
    ["contrats", "code_verification", "TEXT"],
    ["artisans", "plan_devis", "TEXT NOT NULL DEFAULT 'gratuit'"],
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

  ouvrirArtisansAuxCandidatures(base);
  retirerEssaiDate(base);

  // Index — et non contrainte inline : ALTER TABLE ne sait pas ajouter de
  // contrainte UNIQUE a une table existante. Il se cree ici, apres les
  // colonnes : place dans schema.sql, il s'executerait avant elles.
  base.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_google
       ON utilisateurs(google_id) WHERE google_id IS NOT NULL`,
  );
  base.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_artisans_email
       ON artisans(email) WHERE email IS NOT NULL`,
  );
  base.exec(
    "CREATE INDEX IF NOT EXISTS idx_artisans_statut ON artisans(statut_candidature)",
  );
  // Unicite des codes de verification : c'est elle qui permet a
  // codeVerification() de retenter sereinement en cas de collision.
  base.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_verification
       ON factures(code_verification) WHERE code_verification IS NOT NULL`,
  );
  base.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_contrats_verification
       ON contrats(code_verification) WHERE code_verification IS NOT NULL`,
  );
  base.exec(
    `CREATE INDEX IF NOT EXISTS idx_documents_agence
       ON documents_emis(agence_id, derniere_edition DESC)`,
  );
  base.exec(
    "CREATE INDEX IF NOT EXISTS idx_envois_agence ON envois_documents(agence_id)",
  );
}

/**
 * Retire les traces de l'essai limite dans le temps, abandonne au profit
 * d'un quota mensuel de factures (voir src/lib/quota.ts).
 *
 * Deux choses a reprendre sur une base deja migree une fois : la table qui
 * portait les adresses, renommee, et la colonne de date de fin d'essai,
 * devenue sans objet. Les deux operations sont gardees par un test
 * d'existence : elles ne font rien sur une base neuve.
 */
function retirerEssaiDate(base: Database.Database) {
  const existe = (nom: string) =>
    Boolean(base.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(nom));

  // L'ancienne table gardait exactement la meme information : quelles boites
  // ont deja ouvert un compte gratuit. On la reprend telle quelle.
  if (existe("essais_consommes")) {
    base.exec(
      `INSERT OR IGNORE INTO comptes_gratuits (email_normalise, email_saisi, agence_id, cree_le)
         SELECT email_normalise, email_saisi, agence_id, cree_le FROM essais_consommes`,
    );
    base.exec("DROP TABLE essais_consommes");
  }

  const colonnes = base.pragma("table_info(agences)") as { name: string }[];
  if (colonnes.some((c) => c.name === "essai_expire_le")) {
    base.exec("ALTER TABLE agences DROP COLUMN essai_expire_le");
  }
}

/**
 * Rend `artisans.agence_id` facultatif sur une base ancienne.
 *
 * A l'origine, un artisan appartenait forcement a une agence. Depuis que les
 * professionnels peuvent postuler seuls, cette colonne doit accepter NULL —
 * et SQLite ne sait pas retirer une contrainte NOT NULL par ALTER TABLE.
 * La seule voie est de reconstruire la table : on en cree une correcte, on y
 * recopie les donnees, puis on remplace l'ancienne.
 *
 * L'operation ne s'execute que si la contrainte est encore la, et tout se
 * fait dans une transaction : en cas d'interruption, la base reste intacte.
 */
function ouvrirArtisansAuxCandidatures(base: Database.Database) {
  const colonnes = base.pragma("table_info(artisans)") as {
    name: string; notnull: number;
  }[];
  const agenceId = colonnes.find((c) => c.name === "agence_id");
  if (!agenceId || agenceId.notnull === 0) return; // deja fait, ou table absente

  // Les cles etrangeres doivent etre desactivees le temps de l'echange, sinon
  // le DROP TABLE emporterait les lignes qui referencent les artisans.
  // Un PRAGMA ne peut pas vivre dans une transaction : d'ou l'ordre ci-dessous.
  base.pragma("foreign_keys = OFF");
  try {
    base.transaction(() => {
      base.exec(`
        CREATE TABLE artisans_nouveau (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          agence_id     INTEGER REFERENCES agences(id) ON DELETE CASCADE,
          origine       TEXT NOT NULL DEFAULT 'agence',
          nom           TEXT NOT NULL,
          metier        TEXT NOT NULL DEFAULT 'autre',
          telephone     TEXT NOT NULL,
          telephone2    TEXT,
          ville         TEXT NOT NULL DEFAULT 'Dakar',
          quartier      TEXT,
          description   TEXT,
          tarif_indicatif TEXT,
          photo_url     TEXT,
          publie        INTEGER NOT NULL DEFAULT 1,
          email             TEXT,
          mot_de_passe_hash TEXT,
          experience_annees INTEGER NOT NULL DEFAULT 0,
          cv_url            TEXT,
          documents         TEXT,
          statut_candidature TEXT NOT NULL DEFAULT 'valide',
          motif_refus       TEXT,
          valide_le         TEXT,
          quiz_score        INTEGER,
          quiz_total        INTEGER,
          quiz_reussi       INTEGER NOT NULL DEFAULT 0,
          quiz_passe_le     TEXT,
          cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO artisans_nouveau
          (id, agence_id, origine, nom, metier, telephone, telephone2, ville, quartier,
           description, tarif_indicatif, photo_url, publie, email, mot_de_passe_hash,
           experience_annees, cv_url, documents, statut_candidature, motif_refus,
           valide_le, quiz_score, quiz_total, quiz_reussi, quiz_passe_le, cree_le)
        SELECT
           id, agence_id, origine, nom, metier, telephone, telephone2, ville, quartier,
           description, tarif_indicatif, photo_url, publie, email, mot_de_passe_hash,
           experience_annees, cv_url, documents, statut_candidature, motif_refus,
           valide_le, quiz_score, quiz_total, quiz_reussi, quiz_passe_le, cree_le
          FROM artisans;

        DROP TABLE artisans;
        ALTER TABLE artisans_nouveau RENAME TO artisans;

        CREATE INDEX IF NOT EXISTS idx_artisans_agence  ON artisans(agence_id);
        CREATE INDEX IF NOT EXISTS idx_artisans_vitrine ON artisans(publie, metier);
      `);
    })();
  } finally {
    base.pragma("foreign_keys = ON");
  }
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
