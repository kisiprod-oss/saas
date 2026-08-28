/** Fonctions d'affichage : montants en FCFA, dates, telephones senegalais. */

/** 1250000 -> "1 250 000 FCFA" */
export function fcfa(montant: number | null | undefined): string {
  const n = Math.round(Number(montant ?? 0));
  return `${n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} FCFA`;
}

/** 1250000 -> "1 250 000" (sans la devise) */
export function nombre(montant: number | null | undefined): string {
  return Math.round(Number(montant ?? 0)).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
}

/** "2026-08-28" -> "28/08/2026" */
export function dateFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-");
  if (!a || !m || !j) return iso;
  return `${j}/${m}/${a}`;
}

const MOIS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

const MOIS_ACCENTS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** "2026-08" -> "Août 2026" */
export function periodeLisible(periode: string): string {
  const [a, m] = periode.split("-");
  const i = Number(m) - 1;
  return `${MOIS_ACCENTS[i] ?? m} ${a}`;
}

/** Abreviations distinctes : juin et juillet ne doivent pas se confondre. */
const MOIS_COURTS = [
  "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

/** "2026-08" -> "Août" (forme courte, pour les graphiques) */
export function moisCourt(periode: string): string {
  const i = Number(periode.split("-")[1]) - 1;
  return MOIS_COURTS[i] ?? periode;
}

/** "2026-08-28" -> "28 août 2026" */
export function dateLongue(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-");
  const i = Number(m) - 1;
  return `${Number(j)} ${(MOIS_ACCENTS[i] ?? m).toLowerCase()} ${a}`;
}

/** "771234567" -> "+221 77 123 45 67" */
export function telephoneFr(tel: string | null | undefined): string {
  if (!tel) return "—";
  const chiffres = tel.replace(/\D/g, "");
  const local = chiffres.startsWith("221") ? chiffres.slice(3) : chiffres;
  if (local.length !== 9) return tel;
  return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

/** Numero utilisable dans un lien tel: ou wa.me */
export function telephoneBrut(tel: string | null | undefined): string {
  const chiffres = (tel ?? "").replace(/\D/g, "");
  return chiffres.startsWith("221") ? chiffres : `221${chiffres}`;
}

/** Date du jour au format AAAA-MM-JJ */
export function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Mois courant au format AAAA-MM */
export function moisCourant(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Decale un mois "AAAA-MM" de n mois (n peut etre negatif). */
export function decalerMois(periode: string, n: number): string {
  const [a, m] = periode.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

/** Nombre de jours dans le mois d'une periode "AAAA-MM". */
export function joursDansMois(periode: string): number {
  const [a, m] = periode.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export { MOIS, MOIS_ACCENTS, MOIS_COURTS };

/* ------------------------------------------------------------------
   Montant en toutes lettres (obligatoire sur beaucoup de quittances).
   Ex : 1250000 -> "un million deux cent cinquante mille"
   ------------------------------------------------------------------ */

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const DIZAINES = [
  "", "", "vingt", "trente", "quarante", "cinquante",
  "soixante", "soixante", "quatre-vingt", "quatre-vingt",
];

function centaineEnLettres(n: number): string {
  if (n < 20) return UNITES[n];

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    // 70-79 et 90-99 se disent "soixante-dix" et "quatre-vingt-dix"
    if (d === 7 || d === 9) {
      const reste = UNITES[10 + u];
      return `${DIZAINES[d]}${d === 7 && u === 1 ? "-et-" : "-"}${reste}`;
    }
    if (u === 0) return DIZAINES[d] + (d === 8 ? "s" : "");
    if (u === 1 && d !== 8) return `${DIZAINES[d]}-et-un`;
    return `${DIZAINES[d]}-${UNITES[u]}`;
  }

  const c = Math.floor(n / 100);
  const reste = n % 100;
  const prefixe = c === 1 ? "cent" : `${UNITES[c]} cent`;
  if (reste === 0) return c === 1 ? "cent" : `${prefixe}s`;
  return `${prefixe} ${centaineEnLettres(reste)}`;
}

/** Convertit un entier en toutes lettres, en français. */
export function enLettres(montant: number): string {
  let n = Math.abs(Math.round(montant));
  if (n === 0) return "zéro";

  const tranches: { valeur: number; singulier: string; pluriel: string }[] = [
    { valeur: 1_000_000_000, singulier: "milliard", pluriel: "milliards" },
    { valeur: 1_000_000, singulier: "million", pluriel: "millions" },
    { valeur: 1_000, singulier: "mille", pluriel: "mille" },
  ];

  const morceaux: string[] = [];

  for (const t of tranches) {
    const quotient = Math.floor(n / t.valeur);
    if (quotient === 0) continue;
    n -= quotient * t.valeur;

    if (t.valeur === 1_000) {
      morceaux.push(quotient === 1 ? "mille" : `${centaineEnLettres(quotient)} mille`);
    } else {
      morceaux.push(`${centaineEnLettres(quotient)} ${quotient > 1 ? t.pluriel : t.singulier}`);
    }
  }

  if (n > 0) morceaux.push(centaineEnLettres(n));
  return morceaux.join(" ");
}
