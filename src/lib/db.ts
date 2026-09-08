import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { dossierDonneesSur } from "./dossier-donnees.mjs";
import { numeroCanonique } from "./telephone";
import {
  dossiersPhotos, NOM_PHOTO_VALIDE, PREFIXE_PRIVE, PREFIXE_PUBLIC,
} from "./emplacements-photos";

/**
 * Connexion unique a la base SQLite.
 */

const racine = process.cwd();

/**
 * Dossier qui contient TOUTES les donnees : base, photos, documents.
 *
 * La regle vit dans dossier-donnees.mjs, partagee avec les scripts en ligne
 * de commande (sauvegarde, remise a zero, donnees de demonstration) : ils
 * doivent tous designer le meme dossier, faute de quoi une sauvegarde
 * viserait un emplacement vide sans que rien ne le signale.
 */
export const dossierData: string = dossierDonneesSur(racine);

const cheminBase = process.env.DATABASE_FILE ?? path.join(dossierData, "sen-gestion.db");

/** Chemin de repli, a l'ancienne place, si le premier ne s'ouvre pas. */
const cheminSecours = path.join(racine, "data", "sen-gestion.db");

function ouvrirA(chemin: string): Database.Database {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  const base = new Database(chemin);
  base.pragma("journal_mode = WAL");
  base.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8");
  base.exec(schema);
  migrer(base);
  return base;
}

/**
 * Ouvre la base, et ne laisse JAMAIS un probleme de dossier abattre le site.
 *
 * Ce module est charge par toutes les pages : une exception ici et c'est
 * « Application error » partout, pour tout le monde, y compris sur la page
 * d'accueil publique. Un disque plein, un droit refuse ou une variable mal
 * renseignee chez l'hebergeur ne doivent pas avoir ce pouvoir. On retente
 * donc a l'ancienne place avant d'abandonner, en disant pourquoi dans le
 * journal du serveur.
 */
function ouvrirBase(): Database.Database {
  try {
    return ouvrirA(cheminBase);
  } catch (e) {
    console.error(
      `[Sen Gestion] Ouverture de la base impossible dans ${cheminBase} :`,
      (e as Error).message,
    );
    if (cheminSecours === cheminBase) throw e;
    console.error(`[Sen Gestion] Nouvel essai a l'ancienne place : ${cheminSecours}`);
    return ouvrirA(cheminSecours);
  }
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
    ["abonnements", "devise", "TEXT NOT NULL DEFAULT 'XOF'"],
    ["abonnements", "montant_devise", "INTEGER"],
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
    ["agences", "modele_bail_url", "TEXT"],
    ["agences", "modele_bail_nom", "TEXT"],
    ["agences", "modele_bail_le", "TEXT"],
    ["agences", "modele_bail_clauses", "TEXT"],
    ["biens", "proprietaire_id", "INTEGER REFERENCES proprietaires(id) ON DELETE SET NULL"],
    ["proprietaires", "photo_url", "TEXT"],
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
  // Sur biens(proprietaire_id) : la colonne n'existe sur une base ancienne
  // qu'apres la boucle ALTER TABLE ci-dessus, donc l'index ne peut pas vivre
  // dans schema.sql (il y echouerait sur toute base pas encore migree).
  base.exec(
    "CREATE INDEX IF NOT EXISTS idx_biens_proprietaire ON biens(proprietaire_id)",
  );

  creerProprietairesDepuisBiens(base);
  rangerPhotosPrivees(base);
}

/**
 * Deplace vers le dossier ferme les photos de locataires et de proprietaires
 * qui dorment encore dans le dossier public.
 *
 * Ces visages etaient servis par une adresse publique, sans verification et
 * avec « cache un an ». Changer le code pour les nouvelles photos ne suffit
 * pas : celles deja envoyees resteraient accessibles a qui detient le lien.
 *
 * ORDRE DES OPERATIONS, ET POURQUOI IL EST DANS CET ORDRE. On COPIE, puis on
 * met a jour l'adresse en base, puis SEULEMENT ENSUITE on efface l'original.
 * Une coupure de courant entre deux etapes ne peut donc jamais faire
 * disparaitre une photo : au pire le fichier existe en double, la fiche
 * pointe encore sur l'ancien, et le prochain demarrage termine le travail.
 * L'ordre inverse — deplacer puis mettre a jour — perdrait l'image a la
 * moindre interruption.
 *
 * Idempotent : ne regarde que les fiches encore sur l'ancien prefixe. Une
 * fois toutes migrees, la requete ne renvoie rien et la fonction ne coute
 * qu'une lecture.
 */
function rangerPhotosPrivees(base: Database.Database) {
  const aRanger = base.prepare(
    `SELECT 'locataires' AS t, id, photo_url FROM locataires
       WHERE photo_url LIKE ? || '%'
     UNION ALL
     SELECT 'proprietaires' AS t, id, photo_url FROM proprietaires
       WHERE photo_url LIKE ? || '%'`,
  ).all(PREFIXE_PUBLIC, PREFIXE_PUBLIC) as { t: string; id: number; photo_url: string }[];

  if (aRanger.length === 0) return;

  const dossiers = dossiersPhotos(dossierData);
  fs.mkdirSync(dossiers.prive, { recursive: true });
  let deplacees = 0;

  for (const ligne of aRanger) {
    // `ligne.t` vient des deux litteraux de la requete ci-dessus, jamais d'une
    // saisie. On le verifie quand meme avant de l'interpoler : une table
    // interpolee sans controle est exactement la forme que prend une injection
    // le jour ou quelqu'un modifie la requete sans y penser.
    if (ligne.t !== "locataires" && ligne.t !== "proprietaires") continue;

    const nom = ligne.photo_url.slice(PREFIXE_PUBLIC.length);
    // Un nom inattendu (adresse externe bricolee a la main) : on n'y touche pas.
    if (!NOM_PHOTO_VALIDE.test(nom)) continue;

    const source = path.join(dossiers.public, nom);
    const cible = path.join(dossiers.prive, nom);

    try {
      // Le fichier peut avoir deja ete copie par un demarrage interrompu.
      if (fs.existsSync(source)) fs.copyFileSync(source, cible);
      else if (!fs.existsSync(cible)) continue; // plus rien a deplacer : on laisse l'adresse telle quelle

      base.prepare(`UPDATE ${ligne.t} SET photo_url = ? WHERE id = ?`)
        .run(PREFIXE_PRIVE + nom, ligne.id);

      if (fs.existsSync(source)) fs.unlinkSync(source);
      deplacees++;
    } catch (e) {
      // On ne bloque JAMAIS le demarrage du site pour une photo : la fiche
      // garde son ancienne adresse, qui fonctionne encore, et le prochain
      // demarrage reessaiera.
      console.error(
        `[Sen Gestion] Photo privee non deplacee (${ligne.t} n°${ligne.id}) :`,
        (e as Error).message,
      );
    }
  }

  if (deplacees > 0) {
    console.log(`[Sen Gestion] ${deplacees} photo(s) de locataire ou de proprietaire rangee(s) a l'abri.`);
  }
}

/**
 * Cree une fiche Proprietaire pour chaque nom deja saisi sur un bien.
 *
 * Avant cette table, le proprietaire n'etait qu'un texte libre repete sur
 * chaque bien : cette fonction transforme ce texte en fiches reelles, sans
 * rien effacer — `proprietaire_nom` et `proprietaire_telephone` restent en
 * place sur `biens`.
 *
 * Deux biens d'une meme agence fusionnent dans la meme fiche quand leur nom
 * (une fois les espaces reduits) ET leur telephone (une fois passe par
 * `numeroCanonique`, comme partout ailleurs dans l'application) coincident.
 * C'est ce qui reunit correctement « 77 123 45 67 » et « +221771234567 » :
 * le meme numero, ecrit deux fois differemment. Un bien sans telephone
 * renseigne ne fusionne qu'avec un autre bien du meme nom lui aussi sans
 * telephone : mieux vaut deux fiches en double, faciles a fusionner a la
 * main plus tard, qu'une fusion hative entre deux personnes differentes qui
 * partagent un nom.
 *
 * Ne s'execute qu'une fois : si `proprietaires` contient deja une ligne,
 * la reprise a deja eu lieu (ou l'agence gere deja ses proprietaires a la
 * main) et on ne la refait pas.
 */
function creerProprietairesDepuisBiens(base: Database.Database) {
  const dejaFait = (base.prepare("SELECT COUNT(*) AS n FROM proprietaires").get() as { n: number }).n > 0;
  if (dejaFait) return;

  const biens = base.prepare(
    `SELECT id, agence_id, proprietaire_nom, proprietaire_telephone FROM biens
      WHERE proprietaire_nom IS NOT NULL AND TRIM(proprietaire_nom) != ''`,
  ).all() as { id: number; agence_id: number; proprietaire_nom: string; proprietaire_telephone: string | null }[];

  if (biens.length === 0) return;

  const inserer = base.prepare("INSERT INTO proprietaires (agence_id, nom, telephone) VALUES (?, ?, ?)");
  const lier = base.prepare("UPDATE biens SET proprietaire_id = ? WHERE id = ?");
  const cache = new Map<string, number>();

  base.transaction(() => {
    for (const b of biens) {
      const nom = b.proprietaire_nom.trim().replace(/\s+/g, " ");
      const telephone = numeroCanonique(b.proprietaire_telephone);
      const cle = `${b.agence_id}|${nom.toLowerCase()}|${telephone}`;

      let proprietaireId = cache.get(cle);
      if (proprietaireId === undefined) {
        const res = inserer.run(b.agence_id, nom, telephone || null);
        proprietaireId = Number(res.lastInsertRowid);
        cache.set(cle, proprietaireId);
      }
      lier.run(proprietaireId, b.id);
    }
  })();
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
