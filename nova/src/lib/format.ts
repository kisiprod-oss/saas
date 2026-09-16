/**
 * Affichage : montants, dates, telephones. Aucune dependance au serveur —
 * ces fonctions servent autant dans une page rendue cote serveur que dans un
 * composant interactif.
 */

/** Espace insecable fine : jolie a l'ecran, penible a copier. On normalise. */
function espaces(texte: string): string {
  return texte.replace(/[  ]/g, " ");
}

/**
 * 5000 -> "5 000 FCFA".
 *
 * Le montant est un ENTIER dans l'unite mineure du pays. Le franc CFA n'a pas
 * de subdivision : 5000 vaut 5 000 francs, pas 50,00. `decimales` sert aux
 * devises qui en ont, le jour ou un pays en apporte une.
 */
export function montant(
  valeur: number | null | undefined,
  devise = "FCFA",
  decimales = 0,
): string {
  const brut = Number(valeur ?? 0);
  const affiche = decimales > 0 ? brut / 10 ** decimales : Math.round(brut);
  return `${espaces(affiche.toLocaleString("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }))} ${devise}`;
}

/** 5000 -> "5 000" (sans devise, pour les champs de saisie et les tableaux). */
export function nombre(valeur: number | null | undefined): string {
  return espaces(Math.round(Number(valeur ?? 0)).toLocaleString("fr-FR"));
}

/** "2026-09-16" -> "16/09/2026" */
export function dateFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-");
  if (!a || !m || !j) return iso;
  return `${j}/${m}/${a}`;
}

/**
 * "2026-09-16 14:05:00" -> "16/09/2026 à 14h05".
 *
 * Les dates sont stockees en UTC par SQLite et affichees telles quelles : le
 * Senegal est a GMT+0, et une conversion approximative sur un registre de
 * commandes ferait plus de degats qu'elle n'en reglerait.
 */
export function dateHeureFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const heure = iso.slice(11, 16).replace(":", "h");
  return heure ? `${dateFr(iso)} à ${heure}` : dateFr(iso);
}

/** "il y a 3 jours", pour les listes ou la date exacte n'apporte rien. */
export function depuis(iso: string | null | undefined): string {
  if (!iso) return "—";
  const quand = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (Number.isNaN(quand)) return dateFr(iso);
  const secondes = Math.max(0, Math.floor((Date.now() - quand) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return "hier";
  if (jours < 31) return `il y a ${jours} jours`;
  return dateFr(iso);
}

/** Fabrique un identifiant d'adresse lisible : "Chez Awa" -> "chez-awa". */
export function enSlug(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Coupe un texte sans couper un mot en deux. */
export function extrait(texte: string | null | undefined, longueur = 140): string {
  const propre = (texte ?? "").trim();
  if (propre.length <= longueur) return propre;
  const coupe = propre.slice(0, longueur);
  const espace = coupe.lastIndexOf(" ");
  return `${coupe.slice(0, espace > 40 ? espace : longueur)}…`;
}

export function pluriel(n: number, singulier: string, plur?: string): string {
  return n > 1 ? (plur ?? `${singulier}s`) : singulier;
}
