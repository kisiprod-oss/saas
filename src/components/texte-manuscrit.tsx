import { TRACE_MANUSCRIT } from "./trace-manuscrit.data";

/**
 * Une phrase qui s'écrit au stylo, puis s'encre.
 *
 * ZÉRO JAVASCRIPT, ZÉRO APPEL EXTÉRIEUR. Les composants qui font cet effet
 * lisent d'ordinaire le fichier de police dans le navigateur et le découpent à
 * la volée : cela coûte au visiteur une bibliothèque d'analyse (~180 Ko) plus
 * la police (~250 Ko), tirées de deux serveurs tiers, avant le premier trait.
 * Ici la phrase est connue d'avance : elle a été découpée une fois, par
 * scripts/generer-trace-manuscrit.mjs, et le site n'envoie que le résultat —
 * 17 Ko de tracés, dans la page, avec le reste du HTML.
 *
 * Trois détails font que cela ressemble à une main qui écrit, et non à une
 * apparition en fondu :
 *
 * 1. Chaque contour est un <path> séparé. Un motif de tirets SVG REPART À ZÉRO
 *    à chaque sous-chemin : un seul chemin portant toute la phrase ne peut donc
 *    pas se dessiner progressivement — chaque lettre serait entièrement là ou
 *    entièrement absente. Ce sont les contours séparés, décalés dans le temps,
 *    qui donnent le stylo qui traverse le mot.
 *
 * 2. `pathLength="1"` laisse le navigateur normaliser la longueur de chaque
 *    contour. Sans lui, il faudrait mesurer chaque tracé en JavaScript
 *    (`getTotalLength()`) — soit exactement le JavaScript qu'on cherche à ne
 *    pas envoyer.
 *
 * 3. Le corps de la lettre vient d'UNE SEULE forme pleine, posée dessous et
 *    révélée quand le trait s'achève. Elle doit rester d'un seul tenant : le
 *    trou d'un « e » est un contour distinct, et il ne se lit comme un trou que
 *    si la règle de remplissage le voit avec son contour extérieur. Remplir les
 *    contours un par un transformerait chaque lettre en pâté.
 *
 * Si les animations sont refusées (réglage « réduire les animations ») ou si le
 * navigateur ignore ces propriétés, la phrase s'affiche pleine et immobile :
 * l'animation est un supplément, jamais la condition pour lire le texte.
 *
 * La couleur vient de `currentColor` : `className="text-succes-900"` la pose.
 */
export function TexteManuscrit({
  className = "",
  epaisseur = 2.4,
  duree = 1.6,
  retard = 0,
}: {
  className?: string;
  /** Épaisseur du trait, en unités du viewBox. */
  epaisseur?: number;
  /** Secondes que met le stylo à traverser toute la phrase. */
  duree?: number;
  /** Secondes avant que le stylo ne parte. */
  retard?: number;
}) {
  const { texte, vue, contours } = TRACE_MANUSCRIT;
  const n = contours.length;

  return (
    <svg
      viewBox={`${vue.x} ${vue.y} ${vue.w} ${vue.h}`}
      role="img"
      aria-label={texte}
      className={`manuscrit inline-block h-[1.3em] w-auto align-baseline ${className}`}
      style={{ overflow: "visible" }}
    >
      {/* Le corps des lettres, d'un seul tenant : c'est lui qui donne les trous. */}
      <path
        d={contours.join("")}
        fill="currentColor"
        stroke="none"
        className="manuscrit-plein"
        style={{ animationDelay: `${(retard + duree * 0.68).toFixed(2)}s` } as React.CSSProperties}
      />

      {contours.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="manuscrit-trait"
          style={{
            // Les contours se chevauchent : le trait se lit comme un mouvement
            // continu, et non comme des lettres qui s'allument l'une après l'autre.
            animationDuration: `${((duree / n) * 2.6).toFixed(3)}s`,
            animationDelay: `${(retard + (i / n) * duree).toFixed(3)}s`,
          } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
