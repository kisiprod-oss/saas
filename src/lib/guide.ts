import "server-only";
import fs from "node:fs";
import path from "node:path";
import { ecrire } from "./db";

/**
 * Le guide d'utilisation, remis a chaque agence avant l'entree dans l'espace.
 *
 * Il est offert avec toutes les formules, y compris l'essai : c'est un
 * document de prise en main, pas une option payante. Le passage par cette
 * page est le seul moment ou l'on est certain qu'une nouvelle agence regarde
 * quelque chose avant de se perdre dans les menus.
 *
 * LE FICHIER EST DANS `public/` A DESSEIN. Il ne contient aucune donnee de
 * client, donc rien a proteger ; et l'y laisser garantit qu'il existe quel
 * que soit le mode de construction de Next, et qu'Isidore dispose d'une
 * adresse simple a envoyer par WhatsApp a un prospect.
 *
 * Il n'est pourtant PAS servi depuis cette adresse-la dans l'application :
 * la route /api/guide le sert a la place, parce qu'elle sait deux choses que
 * le fichier statique ignore — qui le telecharge, et qu'il faut l'envoyer en
 * piece jointe plutot que l'ouvrir dans l'onglet (l'agence garde alors la
 * page sous les yeux, et le PDF part dans ses telechargements).
 */

const NOM_FICHIER = "guide-sengestion.pdf";

/** Nom propose au navigateur au moment de l'enregistrement. */
export const NOM_TELECHARGEMENT = "Guide-Sen-Gestion.pdf";

export const NOMBRE_DE_PAGES = 40;

/** Chemin disque du guide, ou null s'il manque a l'appel. */
export function cheminGuide(): string | null {
  const chemin = path.join(process.cwd(), "public", NOM_FICHIER);
  return fs.existsSync(chemin) ? chemin : null;
}

/** Poids du fichier, pour l'annoncer avant le clic (« 2,0 Mo »). */
export function poidsGuide(): string | null {
  const chemin = cheminGuide();
  if (!chemin) return null;
  const mo = fs.statSync(chemin).size / (1024 * 1024);
  return `${mo.toFixed(1).replace(".", ",")} Mo`;
}

/**
 * Note que l'agence a recu le guide — une seule fois, la premiere.
 *
 * La date est posee AVANT que les octets partent, et c'est voulu : une
 * agence dont la connexion lache au milieu d'un fichier de 2 Mo ne doit pas
 * se retrouver coincee dehors. Elle a demande le guide, la porte s'ouvre, et
 * le lien reste disponible en permanence dans la barre laterale pour
 * reprendre le telechargement.
 *
 * Le `IS NULL` garde la date d'origine : c'est celle du premier acces, pas
 * celle du dernier clic.
 */
export function noterGuideTelecharge(agenceId: number) {
  ecrire(
    `UPDATE agences SET guide_telecharge_le = ?
      WHERE id = ? AND guide_telecharge_le IS NULL`,
    new Date().toISOString().slice(0, 19).replace("T", " "),
    agenceId,
  );
}
