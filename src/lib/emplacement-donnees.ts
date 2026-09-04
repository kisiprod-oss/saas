import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dossierData } from "./db";

/**
 * Ou vivent reellement les donnees, et est-ce un endroit sur ?
 *
 * Toute l'application ecrit dans UN seul dossier (base, photos, documents,
 * e-mails de secours). Par defaut, ce dossier est `data/` A L'INTERIEUR du
 * dossier de l'application — pratique en developpement, dangereux en ligne :
 * la plupart des hebergeurs remplacent le dossier de l'application a chaque
 * mise a jour, et emporteraient les donnees avec.
 *
 * La variable DOSSIER_DONNEES sert a le deplacer ailleurs. Encore faut-il
 * savoir ou l'on en est : cette page-diagnostic repond a la question sans
 * qu'il faille ouvrir un gestionnaire de fichiers, et propose la valeur
 * exacte a coller chez l'hebergeur. On evite ainsi le pire scenario — une
 * valeur devinee, qui ferait repartir le logiciel sur une base vide en
 * laissant les vraies donnees derriere lui.
 */

/** Au-dela, on arrete de compter : un diagnostic ne doit jamais ralentir une page. */
const MAX_FICHIERS = 20_000;

export type EmplacementDonnees = {
  /** Chemin absolu reellement utilise pour ecrire. */
  chemin: string;
  /** Chemin du dossier de l'application (celui que l'hebergeur remplace). */
  cheminApplication: string;
  /** La variable DOSSIER_DONNEES est-elle renseignee ? */
  configure: boolean;
  /** Le dossier de donnees est-il A L'INTERIEUR du dossier de l'application ? */
  dansApplication: boolean;
  /** Le dossier existe-t-il deja sur le disque ? */
  existe: boolean;
  /** Nombre de fichiers trouves (plafonne). */
  fichiers: number;
  /** Le compte a-t-il ete arrete au plafond ? */
  plafonne: boolean;
  /** Taille totale en octets. */
  octets: number;
  /** Taille du fichier de base, en octets (0 si absent). */
  octetsBase: number;
  /** Valeur a coller dans DOSSIER_DONNEES, calculee sur ce serveur. */
  valeurProposee: string;
  /** La valeur proposee designe-t-elle un dossier deja existant ? */
  proposeeExiste: boolean;
};

/** Taille lisible : « 4,2 Mo » plutot que « 4404019 ». */
export function octetsLisibles(n: number): string {
  if (n < 1024) return `${n} octet${n > 1 ? "s" : ""}`;
  const unites = ["Ko", "Mo", "Go", "To"];
  let valeur = n / 1024;
  let i = 0;
  while (valeur >= 1024 && i < unites.length - 1) {
    valeur /= 1024;
    i += 1;
  }
  return `${valeur.toFixed(valeur < 10 ? 1 : 0).replace(".", ",")} ${unites[i]}`;
}

/** Parcourt le dossier sans jamais s'emballer : on plafonne le nombre d'entrees. */
function mesurer(racine: string): { fichiers: number; octets: number; plafonne: boolean } {
  let fichiers = 0;
  let octets = 0;
  const aVisiter = [racine];

  while (aVisiter.length > 0 && fichiers < MAX_FICHIERS) {
    const dossier = aVisiter.pop() as string;
    let entrees: fs.Dirent[];
    try {
      entrees = fs.readdirSync(dossier, { withFileTypes: true });
    } catch {
      continue; // dossier illisible : on l'ignore plutot que de casser la page
    }
    for (const e of entrees) {
      const complet = path.join(dossier, e.name);
      if (e.isDirectory()) {
        aVisiter.push(complet);
      } else if (e.isFile()) {
        fichiers += 1;
        try {
          octets += fs.statSync(complet).size;
        } catch {
          /* fichier disparu entre-temps */
        }
        if (fichiers >= MAX_FICHIERS) break;
      }
    }
  }

  return { fichiers, octets, plafonne: fichiers >= MAX_FICHIERS };
}

/** Vrai si `enfant` est situe dans `parent` (ou est ce dossier lui-meme). */
function estDans(enfant: string, parent: string): boolean {
  const relatif = path.relative(parent, enfant);
  return relatif === "" || (!relatif.startsWith("..") && !path.isAbsolute(relatif));
}

/**
 * Ou proposer de ranger les donnees ?
 *
 * On vise le dossier personnel du compte d'hebergement quand l'application y
 * est installee (c'est la forme habituelle : /home/uXXXXXXXX/domains/...).
 * Sinon, on propose le dossier voisin de l'application. Dans les deux cas la
 * proposition est CALCULEE SUR CE SERVEUR : elle ne peut pas etre a cote de
 * la plaque comme le serait un exemple recopie d'une documentation.
 */
function proposition(cheminApplication: string): string {
  let base: string;
  try {
    const maison = os.homedir();
    base = maison && estDans(cheminApplication, maison) && maison !== cheminApplication
      ? maison
      : path.dirname(cheminApplication);
  } catch {
    base = path.dirname(cheminApplication);
  }
  return path.join(base, "donnees-sen-gestion");
}

export function emplacementDonnees(): EmplacementDonnees {
  const cheminApplication = process.cwd();
  const chemin = dossierData;
  const existe = fs.existsSync(chemin);
  const mesure = existe ? mesurer(chemin) : { fichiers: 0, octets: 0, plafonne: false };

  const base = process.env.DATABASE_FILE ?? path.join(chemin, "sen-gestion.db");
  let octetsBase = 0;
  try {
    octetsBase = fs.statSync(base).size;
  } catch {
    /* base pas encore creee */
  }

  const valeurProposee = proposition(cheminApplication);

  return {
    chemin,
    cheminApplication,
    configure: Boolean(process.env.DOSSIER_DONNEES),
    dansApplication: estDans(chemin, cheminApplication),
    existe,
    fichiers: mesure.fichiers,
    plafonne: mesure.plafonne,
    octets: mesure.octets,
    octetsBase,
    valeurProposee,
    proposeeExiste: fs.existsSync(valeurProposee),
  };
}
