/**
 * Numeros de telephone.
 *
 * Au Senegal un numero se donne « 77 123 45 67 », se tape parfois
 * « 221771234567 », et WhatsApp veut « 221771234567 » sans le plus. Trois
 * formes pour une meme ligne : on en retient UNE en base (la forme
 * internationale avec le plus) et on fabrique les autres a l'affichage.
 */

export type Indicatif = { indicatif: string; longueur: number };

/** Le Senegal par defaut : c'est le pays de lancement. */
export const SENEGAL: Indicatif = { indicatif: "+221", longueur: 9 };

/**
 * Ramene n'importe quelle saisie a « +221771234567 », ou null si le numero
 * ne peut pas etre un numero du pays vise.
 */
export function canonique(saisie: string | null | undefined, pays = SENEGAL): string | null {
  if (!saisie) return null;
  let chiffres = String(saisie).replace(/[^\d+]/g, "");
  if (!chiffres) return null;

  const indicatifChiffres = pays.indicatif.replace("+", "");

  if (chiffres.startsWith("+")) chiffres = chiffres.slice(1);
  // « 00221... » : la forme internationale a l'ancienne.
  else if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);

  // Numero national tape sans indicatif.
  if (chiffres.length === pays.longueur) chiffres = indicatifChiffres + chiffres;
  // Certains ajoutent un 0 devant le numero national, par habitude française.
  else if (chiffres.length === pays.longueur + 1 && chiffres.startsWith("0")) {
    chiffres = indicatifChiffres + chiffres.slice(1);
  }

  if (!chiffres.startsWith(indicatifChiffres)) return null;
  if (chiffres.length !== indicatifChiffres.length + pays.longueur) return null;
  return `+${chiffres}`;
}

/** "+221771234567" -> "77 123 45 67" (la forme qu'on lit et qu'on dicte). */
export function pourAffichage(numero: string | null | undefined, pays = SENEGAL): string {
  const propre = canonique(numero, pays);
  if (!propre) return numero ?? "—";
  const national = propre.slice(pays.indicatif.length);
  if (national.length !== 9) return propre;
  return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
}

/** "+221771234567" -> "221771234567", la forme attendue par wa.me. */
export function pourWhatsapp(numero: string | null | undefined, pays = SENEGAL): string | null {
  const propre = canonique(numero, pays);
  return propre ? propre.slice(1) : null;
}

/** Lien tel: pour les boutons d'appel sur telephone. */
export function pourAppel(numero: string | null | undefined, pays = SENEGAL): string | null {
  const propre = canonique(numero, pays);
  return propre ? `tel:${propre}` : null;
}
