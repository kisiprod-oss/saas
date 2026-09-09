/**
 * Transforme une phrase en tracés SVG, UNE FOIS, ici — jamais chez le visiteur.
 *
 * POURQUOI CE SCRIPT EXISTE. L'effet « écrit à la main » demande les contours
 * des lettres : une police web s'affiche en formes pleines, sans contour à
 * parcourir, donc rien à animer. Les composants qui font cet effet lisent donc
 * le fichier de police dans le navigateur et le decoupent a la volee — ce qui
 * coute au visiteur une bibliotheque d'analyse (~180 Ko) plus le fichier de
 * police (~250 Ko), et deux appels vers des serveurs tiers, avant que le
 * premier trait n'apparaisse.
 *
 * Rien de tout cela n'a besoin de se passer chez le visiteur : la phrase est
 * connue d'avance. On la decoupe ici, et le site n'envoie que le resultat.
 * Cout pour le visiteur : zero JavaScript, zero appel exterieur.
 *
 * UTILISATION (seulement si l'on change la phrase) :
 *   npm install --no-save opentype.js
 *   node scripts/generer-trace-manuscrit.mjs "Tout simplement." chemin/vers/police.ttf
 *   npm uninstall --no-save opentype.js
 *
 * La police doit permettre l'incorporation. Celle utilisee ici est Caveat,
 * sous licence SIL Open Font License (http://scripts.sil.org/OFL), verifiee
 * dans les metadonnees du fichier lui-meme.
 */
import ot from "opentype.js";
import fs from "node:fs";

const TEXTE = process.argv[2];
const POLICE = process.argv[3];
if (!TEXTE || !POLICE) {
  console.error("Usage : node scripts/generer-trace-manuscrit.mjs \"<phrase>\" <police.ttf>");
  process.exit(1);
}

const police = ot.parse(fs.readFileSync(POLICE).buffer);

// Taille arbitraire : le viewBox normalise ensuite, quelle que soit la valeur.
const EM = 100;
const chemin = police.getPath(TEXTE, 0, EM, EM);
const boite = chemin.getBoundingBox();
// De l'air pour l'epaisseur du trait et les jambages qui descendent.
const marge = EM * 0.14;

// Une decimale suffit : a la taille ou cette phrase s'affiche, 0,1 unite de
// viewBox vaut environ un dixieme de pixel. Deux decimales doublaient le poids
// pour une difference que personne ne peut voir.
/**
 * Sérialisation maison, et non `toPathData()` de la bibliothèque.
 *
 * POURQUOI. `toPathData()` produit 70 « NaN » sur cette phrase, à TOUTES les
 * précisions — alors que les coordonnées brutes de `getPath()` sont saines
 * (4032 valeurs, zéro NaN, vérifié). Le navigateur, lui, arrête d'interpréter
 * un chemin dès qu'il rencontre une valeur invalide : la phrase s'affichait
 * jusqu'au troisième contour, puis plus rien. Comme l'erreur est silencieuse,
 * elle ne se voit qu'à l'écran — d'où le contrôle en fin de script.
 */
function serialiser(commandes, precision) {
  const n = (v) => {
    if (!Number.isFinite(v)) throw new Error(`coordonnée non finie : ${v}`);
    return String(+v.toFixed(precision));
  };
  let sortie = "";
  for (const c of commandes) {
    switch (c.type) {
      case "M": sortie += `M${n(c.x)} ${n(c.y)}`; break;
      case "L": sortie += `L${n(c.x)} ${n(c.y)}`; break;
      case "Q": sortie += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`; break;
      case "C": sortie += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`; break;
      case "Z": sortie += "Z"; break;
      default: throw new Error(`commande de chemin inconnue : ${c.type}`);
    }
  }
  return sortie;
}

const complet = serialiser(chemin.commands, 1);

/**
 * Un contour par lettre (ou deux, pour un « e » et son trou).
 *
 * Le découpage est indispensable : un motif de tirets SVG REPART À ZÉRO à
 * chaque sous-chemin. Un seul chemin portant toute la phrase ne peut donc pas
 * se dessiner progressivement — chaque lettre serait entièrement présente ou
 * entièrement absente. Ce sont les contours séparés, avec des retards décalés,
 * qui donnent l'impression d'un stylo qui traverse le mot.
 */
const contours = complet.split(/(?=M)/).filter((d) => d.trim().length > 1);

// Le tracé plein n'est pas stocké : il vaut exactement la concaténation des
// contours, et le composant la refait à l'affichage. L'écrire deux fois
// doublerait le poids envoyé pour rien. Vérifié plutôt que supposé :
if (contours.join("") !== complet) {
  console.error("ARRET : les contours ne se recollent pas a l'identique.");
  process.exit(1);
}

// Le controle qui manquait la premiere fois. Un chemin SVG invalide ne leve
// aucune erreur : le navigateur dessine jusqu'a la faute et abandonne la
// suite, sans rien dire. Mieux vaut echouer ici, bruyamment.
const CARACTERES_ATTENDUS = /^[MLQCZ0-9.\s-]+$/;
if (!CARACTERES_ATTENDUS.test(complet)) {
  const fautifs = [...new Set(complet.match(/[^MLQCZ0-9.\s-]/g) ?? [])];
  console.error(`ARRET : caracteres invalides dans le trace : ${fautifs.join(" ")}`);
  process.exit(1);
}
if (contours.some((d) => !d.startsWith("M"))) {
  console.error("ARRET : un contour ne commence pas par M.");
  process.exit(1);
}

const sortie = {
  texte: TEXTE,
  vue: {
    x: +(boite.x1 - marge).toFixed(1),
    y: +(boite.y1 - marge).toFixed(1),
    w: +(boite.x2 - boite.x1 + marge * 2).toFixed(1),
    h: +(boite.y2 - boite.y1 + marge * 2).toFixed(1),
  },
  contours,
};

console.log(JSON.stringify(sortie));
console.error(
  `  « ${TEXTE} » : ${contours.length} contours, `
  + `${(contours.join("").length / 1024).toFixed(1)} Ko de tracés`,
);
