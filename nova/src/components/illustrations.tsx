/**
 * Illustrations du site public.
 *
 * Elles sont dessinées ici, en SVG, et non photographiées. Trois raisons :
 *
 *  1. Nous n'avons pas de photothèque. Publier des photos de commerçants que
 *     nous n'avons pas rencontrés, ou des images d'agence retouchées, serait
 *     une promesse visuelle que le produit ne tient pas.
 *  2. Un dessin vectoriel pèse quelques kilo-octets et reste net partout,
 *     là où une photographie coûte plusieurs centaines de kilo-octets au
 *     visiteur.
 *  3. Elles montrent des scènes de commerce ouest-africain — un étal, des
 *     pagnes pliés, une livraison en deux-roues — plutôt que le bureau
 *     lumineux habituel des sites de logiciels.
 *
 *  Quand de vraies photographies de boutiques partenaires seront disponibles,
 *  elles remplacent ces dessins : voir README, section « Visuels ».
 */

type Props = { className?: string };

/** Une devanture de boutique : auvent, étal, marchandise. */
export function Devanture({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img"
      aria-label="Illustration : une devanture de boutique avec son auvent et son étal">
      <rect width="400" height="300" className="fill-ivoire" />
      {/* mur */}
      <rect x="40" y="70" width="320" height="180" className="fill-white" />
      <rect x="40" y="70" width="320" height="180" className="fill-none stroke-encre-200" strokeWidth="2" />
      {/* auvent rayé */}
      <path d="M28 70h344l-18 34H46Z" className="fill-vert-700" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${52 + i * 48} 70 ${44 + i * 48} 104h22l8-34Z`} className="fill-craie" opacity="0.9" />
      ))}
      {/* enseigne */}
      <rect x="140" y="118" width="120" height="26" rx="6" className="fill-encre-900" />
      <rect x="152" y="127" width="52" height="8" rx="4" className="fill-craie" opacity="0.85" />
      <circle cx="224" cy="131" r="6" className="fill-terre-500" />
      {/* étal et marchandise */}
      <rect x="70" y="190" width="120" height="60" rx="4" className="fill-encre-100" />
      <rect x="82" y="168" width="28" height="24" rx="3" className="fill-terre-500" />
      <rect x="116" y="174" width="28" height="18" rx="3" className="fill-vert-500" />
      <rect x="150" y="164" width="28" height="28" rx="3" className="fill-encre-800" />
      {/* panier */}
      <path d="M222 214h72l-9 36h-54Z" className="fill-terre-200" />
      <path d="M222 214h72" className="stroke-terre-500" strokeWidth="4" strokeLinecap="round" />
      <path d="M240 214a18 14 0 0 1 36 0" className="fill-none stroke-terre-500" strokeWidth="4" />
      {/* porte */}
      <rect x="300" y="170" width="46" height="80" rx="3" className="fill-vert-50 stroke-encre-200" strokeWidth="2" />
      <circle cx="308" cy="212" r="3" className="fill-encre-400" />
    </svg>
  );
}

/** Un téléphone qui affiche une boutique : ce que voit le client. */
export function TelephoneBoutique({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 240 420" className={className} role="img"
      aria-label="Illustration : un téléphone affichant une page de boutique">
      <rect x="10" y="10" width="220" height="400" rx="30" className="fill-encre-900" />
      <rect x="20" y="20" width="200" height="380" rx="22" className="fill-craie" />
      <rect x="96" y="28" width="48" height="7" rx="3.5" className="fill-encre-900" opacity="0.5" />
      {/* bandeau */}
      <rect x="20" y="46" width="200" height="86" className="fill-vert-700" />
      <rect x="36" y="66" width="104" height="11" rx="5.5" className="fill-white" opacity="0.95" />
      <rect x="36" y="86" width="140" height="7" rx="3.5" className="fill-white" opacity="0.6" />
      <rect x="36" y="104" width="72" height="18" rx="9" className="fill-white" />
      <rect x="48" y="110" width="48" height="6" rx="3" className="fill-vert-700" />
      {/* grille de produits */}
      {[0, 1, 2, 3].map((i) => {
        const x = 34 + (i % 2) * 90;
        const y = 152 + Math.floor(i / 2) * 106;
        return (
          <g key={i}>
            <rect x={x} y={y} width="78" height="94" rx="10" className="fill-white stroke-encre-200" strokeWidth="1.5" />
            <rect x={x + 8} y={y + 8} width="62" height="50" rx="6" className="fill-ivoire" />
            <circle cx={x + 26} cy={y + 26} r="6" className="fill-encre-200" />
            <path d={`M${x + 12} ${y + 52} ${x + 30} ${y + 34} ${x + 44} ${y + 46} ${x + 56} ${y + 36} ${x + 66} ${y + 52}Z`}
              className="fill-encre-200" />
            <rect x={x + 8} y={y + 64} width="44" height="6" rx="3" className="fill-encre-300" />
            <rect x={x + 8} y={y + 76} width="30" height="8" rx="4" className="fill-vert-600" />
          </g>
        );
      })}
      {/* barre d'onglets */}
      <rect x="20" y="364" width="200" height="36" className="fill-white" />
      <line x1="20" y1="364" x2="220" y2="364" className="stroke-encre-200" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={38 + i * 48} y="374" width="16" height="12" rx="3"
            className={i === 0 ? "fill-vert-700" : "fill-encre-300"} />
          <rect x={36 + i * 48} y="390" width="20" height="4" rx="2"
            className={i === 0 ? "fill-vert-700" : "fill-encre-200"} />
        </g>
      ))}
    </svg>
  );
}

/** Une livraison en deux-roues : le dernier kilomètre, celui qui compte. */
export function Livraison({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 400 240" className={className} role="img"
      aria-label="Illustration : une livraison à deux-roues">
      <rect width="400" height="240" className="fill-ivoire" />
      <line x1="0" y1="196" x2="400" y2="196" className="stroke-encre-200" strokeWidth="3" />
      {/* roues */}
      <circle cx="108" cy="188" r="30" className="fill-none stroke-encre-800" strokeWidth="7" />
      <circle cx="286" cy="188" r="30" className="fill-none stroke-encre-800" strokeWidth="7" />
      {/* cadre */}
      <path d="M108 188 168 128h58l32 60" className="fill-none stroke-vert-700" strokeWidth="8" strokeLinejoin="round" />
      <path d="M168 128h-28" className="stroke-encre-800" strokeWidth="7" strokeLinecap="round" />
      {/* caisse de livraison */}
      <rect x="232" y="96" width="76" height="58" rx="8" className="fill-terre-500" />
      <rect x="248" y="114" width="44" height="6" rx="3" className="fill-white" opacity="0.85" />
      <rect x="248" y="128" width="28" height="6" rx="3" className="fill-white" opacity="0.6" />
      {/* personne */}
      <circle cx="196" cy="74" r="18" className="fill-encre-800" />
      <path d="M196 92c-20 0-30 16-30 36h60c0-20-10-36-30-36Z" className="fill-vert-700" />
      <path d="M212 112l30 16" className="stroke-encre-800" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

/** Une pile de pagnes : le produit, photographié par le commerçant. */
export function Etoffes({ className = "" }: Props) {
  return (
    <svg viewBox="0 0 320 240" className={className} role="img"
      aria-label="Illustration : une pile de tissus pliés">
      <rect width="320" height="240" className="fill-ivoire" />
      {[
        { y: 172, c: "fill-vert-700" },
        { y: 142, c: "fill-terre-500" },
        { y: 112, c: "fill-encre-800" },
        { y: 82, c: "fill-vert-400" },
      ].map((etage, i) => (
        <g key={i}>
          <rect x={56 + i * 4} y={etage.y} width={208 - i * 8} height="28" rx="6" className={etage.c} />
          <rect x={72 + i * 4} y={etage.y + 10} width={60} height="6" rx="3" className="fill-white" opacity="0.35" />
        </g>
      ))}
      <path d="M96 82c14-18 34-26 64-26s50 8 64 26" className="fill-none stroke-encre-300" strokeWidth="3" strokeDasharray="6 8" />
    </svg>
  );
}
