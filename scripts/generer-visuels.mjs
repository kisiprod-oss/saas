/**
 * Genere des illustrations SVG de demonstration pour les annonces.
 * Elles sont stockees dans public/photos/ et fonctionnent hors ligne.
 */
import fs from "node:fs";
import path from "node:path";

const PALETTES = [
  { ciel: ["#0c6e28", "#39d064"], mur: "#f4ecdb", toit: "#0a451b", accent: "#cb9f5d" },
  { ciel: ["#c1873f", "#e8d8b7"], mur: "#fbf8f1", toit: "#8c542d", accent: "#108130" },
  { ciel: ["#108130", "#acecbe"], mur: "#ffffff", toit: "#0b5921", accent: "#c1873f" },
  { ciel: ["#8c542d", "#d9bd89"], mur: "#f7f8f7", toit: "#4a2f1a", accent: "#18a840" },
  { ciel: ["#06280f", "#108130"], mur: "#e8d8b7", toit: "#04180a", accent: "#cb9f5d" },
  { ciel: ["#a96e34", "#f4ecdb"], mur: "#ffffff", toit: "#6d4423", accent: "#0c6e28" },
  { ciel: ["#0b5921", "#7cde98"], mur: "#fbf8f1", toit: "#06280f", accent: "#c1873f" },
  { ciel: ["#cb9f5d", "#fbf8f1"], mur: "#ffffff", toit: "#8c542d", accent: "#108130" },
];

/** Immeuble a n etages avec des fenetres. */
function immeuble(x, largeur, hauteur, p, graine) {
  const sol = 800;
  const haut = sol - hauteur;
  const colonnes = Math.max(2, Math.round(largeur / 70));
  const rangees = Math.max(2, Math.round(hauteur / 90));
  const fenetres = [];

  for (let r = 0; r < rangees; r++) {
    for (let c = 0; c < colonnes; c++) {
      const allumee = (graine * 7 + r * 3 + c * 5) % 4 === 0;
      const fx = x + 22 + c * ((largeur - 44) / colonnes);
      const fy = haut + 34 + r * ((hauteur - 50) / rangees);
      fenetres.push(
        `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="26" height="34" rx="3" ` +
        `fill="${allumee ? p.accent : "#2b3a34"}" opacity="${allumee ? 0.9 : 0.55}"/>`,
      );
    }
  }

  return `
    <rect x="${x}" y="${haut}" width="${largeur}" height="${hauteur}" rx="6" fill="${p.mur}"/>
    <rect x="${x - 8}" y="${haut - 16}" width="${largeur + 16}" height="20" rx="5" fill="${p.toit}"/>
    ${fenetres.join("")}`;
}

function palmier(x, echelle, couleur) {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const angle = -150 + i * 48;
    const rad = (angle * Math.PI) / 180;
    p.push(
      `<path d="M0 0 Q ${Math.cos(rad) * 60} ${Math.sin(rad) * 45 - 18}, ${Math.cos(rad) * 105} ${Math.sin(rad) * 60}" ` +
      `stroke="${couleur}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    );
  }
  return `<g transform="translate(${x} 800) scale(${echelle})">
    <path d="M0 0 C -6 -90, 6 -150, 0 -210" stroke="${couleur}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <g transform="translate(0 -210)">${p.join("")}</g>
  </g>`;
}

function visuel(indice) {
  const p = PALETTES[indice % PALETTES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.ciel[0]}"/>
      <stop offset="100%" stop-color="${p.ciel[1]}"/>
    </linearGradient>
    <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.toit}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${p.toit}" stop-opacity="0.55"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="800" fill="url(#ciel)"/>
  <circle cx="${180 + indice * 90}" cy="170" r="72" fill="#ffffff" opacity="0.22"/>

  ${immeuble(120, 300, 430 + (indice % 3) * 45, p, indice + 1)}
  ${immeuble(470, 250, 320 + (indice % 4) * 40, p, indice + 4)}
  ${immeuble(760, 330, 500 - (indice % 3) * 50, p, indice + 7)}

  ${palmier(1090, 1.05, p.toit)}
  ${palmier(70, 0.8, p.toit)}

  <rect y="720" width="1200" height="80" fill="url(#sol)"/>
</svg>`;
}

const dossier = path.join(process.cwd(), "public", "photos");
fs.mkdirSync(dossier, { recursive: true });

for (let i = 0; i < 8; i++) {
  fs.writeFileSync(path.join(dossier, `bien-${i + 1}.svg`), visuel(i));
}

console.log("8 visuels generes dans public/photos/");
