import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Ou vivent TOUTES les donnees : base, photos, documents, modeles de bail.
 *
 * LE PROBLEME QUE CECI RESOUT. La plupart des hebergeurs (Hostinger, Render,
 * Railway...) REMPLACENT le dossier de l'application a chaque mise en ligne.
 * Le dossier `data/` etant a l'interieur — et volontairement absent du depot,
 * puisqu'il contient les donnees des clients — il disparaissait a chaque
 * deploiement : les agences retrouvaient un logiciel vide et devaient tout
 * ressaisir. Une perte totale, silencieuse, repetee a chaque mise a jour.
 *
 * LA REGLE, de la plus explicite a la plus prudente :
 *
 *   1. DOSSIER_DONNEES est renseigne : on obeit, sans discuter. C'est le
 *      reglage explicite de l'hebergeur, et il reste le moyen le plus sur.
 *   2. Sinon, on vise un dossier situe HORS de l'application, a cote d'elle,
 *      la ou aucun deploiement ne passe.
 *   3. Si des donnees existent encore dans l'ancien emplacement interne, on
 *      les RECOPIE vers le nouveau avant de s'en servir. Rien n'est jamais
 *      supprime : l'original reste en place.
 *   4. Si aucun dossier exterieur n'est utilisable (droits refuses), on
 *      retombe sur l'ancien comportement plutot que de refuser de demarrer.
 *
 * Consequence voulue : une mise a jour du logiciel ne touche plus aux
 * donnees des agences, sans que personne ait de reglage a faire.
 *
 * CE FICHIER EST EN JAVASCRIPT A DESSEIN. L'application (TypeScript) et les
 * scripts en ligne de commande — sauvegarde, remise a zero, donnees de
 * demonstration — doivent designer EXACTEMENT le meme dossier. Une regle
 * recopiee a deux endroits finit par diverger, et une sauvegarde qui vise le
 * mauvais dossier ne se remarque que le jour ou l'on en a besoin.
 */

/** Nom du dossier de donnees range hors de l'application. */
const NOM_DOSSIER_SUR = "donnees-sen-gestion";

/** Le dossier contient-il deja une base ? */
function contientUneBase(dossier) {
  return fs.existsSync(path.join(dossier, "sen-gestion.db"));
}

/**
 * Le dossier est-il REELLEMENT utilisable ?
 *
 * On le cree et on y ecrit un fichier d'essai, au lieu de se contenter de
 * demander la permission au parent. Un hebergeur mutualise peut accorder le
 * droit d'ecriture sur le dossier personnel et refuser la creation dedans —
 * quota atteint, identifiant d'execution different, dossier protege. La
 * seule reponse fiable, c'est d'essayer.
 */
function utilisable(dossier) {
  try {
    fs.mkdirSync(dossier, { recursive: true });
    const essai = path.join(dossier, `.essai-${process.pid}`);
    fs.writeFileSync(essai, "ok");
    fs.rmSync(essai, { force: true });
    return true;
  } catch {
    return false;
  }
}

/** Un dossier ou l'on peut ecrire, et que les deploiements ne remplacent pas. */
function dossierExterieur(racine) {
  const candidats = [];

  // Le dossier personnel du compte d'hebergement, quand l'application y est
  // installee : c'est la forme habituelle (/home/uXXXXXXXX/domains/...).
  try {
    const maison = os.homedir();
    if (maison && maison !== racine && racine.startsWith(maison + path.sep)) {
      candidats.push(maison);
    }
  } catch {
    /* pas de dossier personnel identifiable */
  }

  // A defaut, le dossier qui contient l'application.
  const parent = path.dirname(racine);
  if (parent && parent !== racine) candidats.push(parent);

  for (const base of candidats) {
    const vise = path.join(base, NOM_DOSSIER_SUR);
    if (utilisable(vise)) return vise;
  }
  return null;
}

/**
 * Recopie les donnees de l'ancien emplacement vers le nouveau.
 *
 * La base est d'abord repliee sur elle-meme (checkpoint WAL) pour n'avoir
 * qu'un seul fichier coherent a copier, puis mise en place par un lien :
 * `link` echoue si la destination existe, ce qui garantit qu'on n'ecrase
 * jamais une base deja presente, meme si deux processus demarrent ensemble.
 */
function recopier(source, destination) {
  try {
    fs.mkdirSync(destination, { recursive: true });

    // Replie le journal WAL dans le fichier principal : une seule copie suffit.
    try {
      const base = new Database(path.join(source, "sen-gestion.db"));
      base.pragma("wal_checkpoint(TRUNCATE)");
      base.close();
    } catch {
      /* base verrouillee : on copiera le fichier tel quel */
    }

    const provisoire = path.join(destination, `.copie-${process.pid}-${Date.now()}.db`);
    fs.copyFileSync(path.join(source, "sen-gestion.db"), provisoire);
    try {
      fs.linkSync(provisoire, path.join(destination, "sen-gestion.db"));
    } catch {
      /* un autre processus est arrive avant : sa copie fait foi */
    }
    fs.rmSync(provisoire, { force: true });

    // Photos, documents, modeles : jamais ecrases non plus.
    for (const sous of ["televersements", "documents", "emails", "modeles-bail", "sauvegardes"]) {
      const depuis = path.join(source, sous);
      if (fs.existsSync(depuis)) {
        fs.cpSync(depuis, path.join(destination, sous), { recursive: true, force: false });
      }
    }

    console.log(`[Sen Gestion] Donnees recopiees de ${source} vers ${destination}.`);
    return true;
  } catch (e) {
    console.error("[Sen Gestion] Recopie des donnees impossible :", e.message);
    return false;
  }
}

/**
 * Le dossier de donnees a utiliser.
 * `deplacer` a false pour un script qui veut seulement LIRE l'emplacement
 * sans declencher de recopie.
 */
export function resoudreDossierDonnees(racine = process.cwd(), deplacer = true) {
  if (process.env.DOSSIER_DONNEES) {
    const choisi = path.resolve(process.env.DOSSIER_DONNEES);
    // Un reglage explicite fait foi — mais s'il designe un endroit ou l'on ne
    // peut pas ecrire, mieux vaut un site debout avec un avertissement bien
    // visible qu'une page blanche pour tout le monde.
    if (deplacer && !utilisable(choisi)) {
      console.error(
        `[Sen Gestion] DOSSIER_DONNEES vaut « ${process.env.DOSSIER_DONNEES} », ` +
        "mais ce dossier n'est pas accessible en ecriture. Verifiez cette " +
        "variable chez votre hebergeur. En attendant, le logiciel choisit " +
        "lui-meme un emplacement.",
      );
    } else {
      return choisi;
    }
  }

  const interne = path.join(racine, "data");
  const externe = dossierExterieur(racine);

  // Aucun endroit sur : on garde l'ancien comportement plutot que d'echouer.
  if (!externe) return interne;

  // Des donnees existent deja a l'abri : c'est elles qui font foi.
  if (contientUneBase(externe)) return externe;

  // Des donnees dans l'application : on les met a l'abri avant de continuer.
  if (contientUneBase(interne)) {
    if (!deplacer) return interne;
    if (recopier(interne, externe)) return externe;
    return interne;
  }

  // Installation neuve : elle demarre directement au bon endroit.
  return externe;
}

/**
 * L'emplacement retenu, garanti utilisable.
 *
 * Dernier filet : si rien de tout cela n'aboutit, on rend l'ancien dossier
 * interne. Il ne survit pas aux mises a jour, mais un site debout vaut mieux
 * qu'un site mort — et l'espace d'administration signale alors la situation
 * en clair.
 */
export function dossierDonneesSur(racine = process.cwd(), deplacer = true) {
  try {
    const choisi = resoudreDossierDonnees(racine, deplacer);
    if (!deplacer || utilisable(choisi)) return choisi;
    console.error(`[Sen Gestion] Ecriture impossible dans ${choisi} : repli sur data/.`);
  } catch (e) {
    console.error("[Sen Gestion] Choix du dossier de donnees impossible :", e.message);
  }
  return path.join(racine, "data");
}
