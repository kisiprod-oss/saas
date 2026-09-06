/**
 * Fils animes du bandeau d'accueil.
 *
 * POURQUOI PAS LA BIBLIOTHEQUE HABITUELLE. L'effet demande existe tout fait,
 * en WebGL, avec reaction a la souris. Il aurait coute une bibliotheque
 * graphique, un canvas redessine soixante fois par seconde et une soixantaine
 * de kilo-octets — sur la page que consultent des gerantes d'agence en
 * donnees mobiles a Dakar, souvent depuis un Android d'entree de gamme. Le
 * site entier tient aujourd'hui en 103 Ko de JavaScript ; ce seul decor en
 * aurait ajoute plus de la moitie, pour un fond que personne ne regarde.
 *
 * Ici : du SVG en ligne et deux regles CSS. Aucun JavaScript n'est envoye au
 * navigateur — c'est un composant serveur —, aucune dependance, et le poids
 * se compte en centaines d'octets. L'animation est portee par le compositeur
 * du navigateur (transform seul), donc elle ne declenche aucun recalcul de
 * mise en page et ne fait pas chauffer le telephone.
 *
 * LE CONTRASTE COMMANDE L'OPACITE. Ces fils passent DERRIERE le titre et le
 * paragraphe. Un trait clair sous un texte blanc eclaircit le fond et mange
 * le contraste. Calcule sur le cas le plus defavorable — un fil traversant le
 * texte a l'endroit le plus clair du degrade (brand-700) :
 *
 *     opacite 0.10 → paragraphe a 7.5:1   (confortable, au-dela de AAA)
 *     opacite 0.20 → paragraphe a 5.6:1   (AA seulement)
 *     opacite 0.30 → paragraphe a 4.2:1   (insuffisant)
 *
 * D'ou le plafond de 0.10 applique ci-dessous, blanc comme dore. Ne pas le
 * relever sans refaire le calcul : le decor ne vaut pas un texte moins
 * lisible.
 */

/** Un fil : sa courbe, sa couleur, son opacite, son rythme. */
type Fil = {
  d: string;
  couleur: string;
  opacite: number;
  epaisseur: number;
  /** Duree du va-et-vient. Des nombres premiers : les fils ne se resynchronisent jamais. */
  duree: string;
  /** Retard negatif : au chargement, chaque fil est deja a un point different. */
  retard: string;
};

/**
 * Les courbes debordent volontairement du cadre (de -120 a 1320 pour une
 * largeur de 1200) : la derive ne doit jamais faire apparaitre une extremite.
 */
const FILS: Fil[] = [
  { d: "M-120 44 C 240 104, 400 -4, 700 64 S 1120 134, 1320 54",
    couleur: "#ffffff", opacite: 0.10, epaisseur: 1.4, duree: "23s", retard: "-3s" },
  { d: "M-120 94 C 180 44, 420 154, 700 104 S 1080 34, 1320 114",
    couleur: "#ffffff", opacite: 0.08, epaisseur: 1.1, duree: "29s", retard: "-11s" },
  { d: "M-120 154 C 200 94, 430 214, 700 164 S 1090 104, 1320 184",
    couleur: "#f8b810", opacite: 0.10, epaisseur: 1.2, duree: "31s", retard: "-7s" },
  { d: "M-120 214 C 220 154, 440 274, 700 224 S 1100 164, 1320 244",
    couleur: "#ffffff", opacite: 0.07, epaisseur: 1.0, duree: "37s", retard: "-19s" },
  { d: "M-120 264 C 210 324, 450 204, 700 284 S 1080 344, 1320 264",
    couleur: "#ffffff", opacite: 0.09, epaisseur: 1.3, duree: "41s", retard: "-5s" },
  { d: "M-120 324 C 190 384, 460 264, 700 344 S 1090 404, 1320 324",
    couleur: "#ffffff", opacite: 0.06, epaisseur: 1.0, duree: "43s", retard: "-23s" },
];

export function FilsAnimes() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 400"
      // Le bandeau est bien plus large que haut sur ordinateur et presque
      // carre sur telephone : on laisse les fils s'etirer plutot que de
      // reserver des marges vides sur les cotes.
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      {FILS.map((f, i) => (
        <path
          key={i}
          className="fil"
          d={f.d}
          fill="none"
          stroke={f.couleur}
          strokeOpacity={f.opacite}
          strokeWidth={f.epaisseur}
          strokeLinecap="round"
          style={{ "--duree": f.duree, "--retard": f.retard } as React.CSSProperties}
        />
      ))}
    </svg>
  );
}
