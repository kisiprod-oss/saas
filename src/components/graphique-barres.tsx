import { fcfa } from "@/lib/format";

/**
 * Graphique en barres groupees, dessine en SVG.
 *
 * SVG et non des div : le rendu reste net a l'impression, a n'importe
 * quelle taille de papier, et les infobulles natives (<title>) fonctionnent
 * sans une ligne de JavaScript.
 *
 * COULEURS. Le couple vert/bleu n'est pas un choix d'esthetique : le couple
 * vert/ocre de la charte, teste, est indistinguable pour un daltonien
 * protanope (ecart 2,1 la ou il en faut 8). Le bleu passe tous les controles
 * et, etant plus fonce que le vert, reste lisible imprime en noir et blanc.
 */

export const COULEUR_ENCAISSE = "#18a840";   // vert teranga (brand-500)
export const COULEUR_FACTURE = "#0369a1";    // bleu, distinguable en daltonisme
export const COULEUR_HONORAIRES = "#0c6e28"; // vert fonce (brand-700)

export type Serie = { nom: string; couleur: string; valeurs: number[] };

/** Montant abrege pour un axe : « 1,2 M », « 450 k ». */
function abrege(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${(Math.round(m * 10) / 10).toLocaleString("fr-FR")} M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)} k`;
  return String(Math.round(n));
}

/** Rectangle dont seul le sommet est arrondi : la base reste posee sur l'axe. */
function barre(x: number, y: number, l: number, h: number, r: number): string {
  const rayon = Math.min(r, l / 2, h);
  if (h <= 0) return "";
  return `M ${x} ${y + h} L ${x} ${y + rayon} Q ${x} ${y} ${x + rayon} ${y}`
    + ` L ${x + l - rayon} ${y} Q ${x + l} ${y} ${x + l} ${y + rayon}`
    + ` L ${x + l} ${y + h} Z`;
}

export function GraphiqueBarres({
  titre, sousTitre, etiquettes, series,
}: {
  titre: string;
  sousTitre?: string;
  etiquettes: string[];
  series: Serie[];
}) {
  const L = 760, H = 240;
  const margeG = 54, margeD = 8, margeH = 8, margeB = 26;
  const zoneL = L - margeG - margeD;
  const zoneH = H - margeH - margeB;

  const maximum = Math.max(1, ...series.flatMap((s) => s.valeurs));
  // Un maximum « rond » rend l'axe lisible : 1,2 M plutot que 1 187 430.
  const pas = Math.pow(10, Math.floor(Math.log10(maximum)));
  const plafond = Math.ceil(maximum / pas) * pas;

  const nbGroupes = etiquettes.length;
  const largeurGroupe = zoneL / nbGroupes;
  // 2 px entre deux barres voisines, comme entre deux groupes.
  const largeurBarre = Math.max(3, (largeurGroupe - 8) / series.length - 2);

  const y = (v: number) => margeH + zoneH - (v / plafond) * zoneH;

  // Sur de petites quantites (« 3 nouvelles agences »), les quarts tombent sur
  // des fractions : l'axe afficherait « 1, 1, 1, 0 » apres arrondi. On passe
  // alors par les entiers, seules valeurs qui aient un sens a compter.
  const lignes = plafond <= 4
    ? Array.from({ length: plafond + 1 }, (_, i) => i)
    : [0, 0.25, 0.5, 0.75, 1].map((f) => plafond * f);

  return (
    <figure className="m-0">
      <figcaption className="mb-3">
        <h3 className="font-semibold text-slate-900">{titre}</h3>
        {sousTitre && <p className="text-xs text-slate-500">{sousTitre}</p>}
        {series.length > 1 && (
          <ul className="mt-2 flex flex-wrap gap-4">
            {series.map((s) => (
              <li key={s.nom} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm impression-couleurs"
                  style={{ backgroundColor: s.couleur }}
                />
                {s.nom}
              </li>
            ))}
          </ul>
        )}
      </figcaption>

      <svg
        viewBox={`0 0 ${L} ${H}`}
        className="w-full impression-couleurs"
        role="img"
        aria-label={`${titre}. ${series.map((s) => s.nom).join(", ")}.`}
      >
        {/* Grille : discrete, elle situe sans attirer l'oeil. */}
        {lignes.map((v) => (
          <g key={v}>
            <line
              x1={margeG} x2={L - margeD} y1={y(v)} y2={y(v)}
              stroke="#e2e8f0" strokeWidth={1}
            />
            <text
              x={margeG - 8} y={y(v) + 4} textAnchor="end"
              fontSize={11} fill="#94a3b8"
            >
              {abrege(v)}
            </text>
          </g>
        ))}

        {etiquettes.map((etiquette, i) => {
          const xGroupe = margeG + i * largeurGroupe + 4;
          return (
            <g key={etiquette}>
              {series.map((s, j) => {
                const valeur = s.valeurs[i] ?? 0;
                const hauteur = valeur > 0 ? Math.max(2, (valeur / plafond) * zoneH) : 0;
                const x = xGroupe + j * (largeurBarre + 2);
                if (hauteur === 0) return null;
                return (
                  <path
                    key={s.nom}
                    d={barre(x, margeH + zoneH - hauteur, largeurBarre, hauteur, 4)}
                    fill={s.couleur}
                  >
                    <title>{`${etiquette} — ${s.nom} : ${fcfa(valeur)}`}</title>
                  </path>
                );
              })}
              <text
                x={xGroupe + (largeurGroupe - 8) / 2} y={H - 8}
                textAnchor="middle" fontSize={11} fill="#64748b"
              >
                {etiquette}
              </text>
            </g>
          );
        })}

        {/* Ligne de base : la seule qui porte du sens. */}
        <line
          x1={margeG} x2={L - margeD} y1={y(0)} y2={y(0)}
          stroke="#cbd5e1" strokeWidth={1}
        />
      </svg>
    </figure>
  );
}
