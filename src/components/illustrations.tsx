/**
 * Illustrations des rubriques publiques.
 *
 * Dessins vectoriels plutot que photographies, pour trois raisons :
 *
 *  - ils pesent deux a quatre kilo-octets au lieu de vingt-cinq, et
 *    s'affichent donc instantanement sur une connexion mobile a Dakar ;
 *  - ils montrent ce que le logiciel FAIT (un calendrier qui se bloque, une
 *    quittance verifiable, une relance prete a partir) au lieu d'une photo
 *    d'ambiance qui pourrait illustrer n'importe quel produit ;
 *  - ils reprennent les trois roles de couleur du logo, sans jamais laisser
 *    croire qu'on montre un vrai bien ou une vraie personne.
 *
 * Convention de couleur, la meme que dans tout le produit :
 *   marine = la structure · or = ce sur quoi on agit · vert = l'argent
 *
 * Toutes sont decoratives : le texte de la carte porte deja l'information,
 * d'ou `aria-hidden`. Une capture d'ecran reelle les remplacera avantageusement
 * le jour ou l'application aura des donnees de demonstration presentables.
 */

const TAILLE = "0 0 120 90";

function Cadre({ fond, children }: { fond: string; children: React.ReactNode }) {
  // Bandeau court sur telephone, image pleine sur ordinateur : en 4/3, quatre
  // cartes empilees imposaient un defilement interminable sur un ecran de
  // 390 px — or c'est la que se trouve la quasi-totalite du public.
  return (
    <div
      className={`flex aspect-[16/7] items-center justify-center rounded-xl sm:aspect-[4/3] ${fond}`}
    >
      <svg
        viewBox={TAILLE}
        aria-hidden
        className="h-[76%] w-auto max-w-[78%] sm:h-[78%] sm:w-[78%]"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------ Tableau de bord --- */
export function IllustrationTableauBord() {
  return (
    <Cadre fond="bg-brand-50">
      {/* Trois compteurs, puis les barres du mois : la lecture d'un coup d'œil. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="10" y="10" width="28" height="18" rx="3" />
        <rect x="46" y="10" width="28" height="18" rx="3" />
        <rect x="82" y="10" width="28" height="18" rx="3" />
        <path d="M10 80h100" />
      </g>
      <g className="fill-succes-500">
        <rect x="16" y="52" width="12" height="24" rx="2" />
        <rect x="38" y="44" width="12" height="32" rx="2" />
        <rect x="60" y="58" width="12" height="18" rx="2" />
      </g>
      <rect x="82" y="36" width="12" height="40" rx="2" className="fill-or-400" />
      <g className="fill-brand-300">
        <rect x="15" y="16" width="14" height="3" rx="1.5" />
        <rect x="51" y="16" width="14" height="3" rx="1.5" />
        <rect x="87" y="16" width="14" height="3" rx="1.5" />
      </g>
    </Cadre>
  );
}

/* ------------------------------------------------- Factures / quittances --- */
export function IllustrationFacture() {
  return (
    <Cadre fond="bg-sable-50">
      {/* Une pile : « toutes les quittances du mois », pas une seule. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="14" y="6" width="66" height="76" rx="4" className="fill-white" />
        <path d="M26 26h42M26 38h42M26 50h26" />
      </g>
      <rect x="26" y="14" width="30" height="5" rx="2.5" className="fill-or-400" />
      <g className="stroke-brand-300" strokeWidth={2.2}>
        <path d="M86 14v62a4 4 0 0 1-4 4" />
        <path d="M94 22v54" />
      </g>
      {/* Le cachet vert : la quittance est reglee. */}
      <circle cx="72" cy="66" r="14" className="fill-succes-600" />
      <path d="M65 66l5 5 9-10" className="stroke-white" strokeWidth={3} />
    </Cadre>
  );
}

/* ---------------------------------------------- Orange Money / Wave / etc --- */
export function IllustrationPaiementMobile() {
  return (
    <Cadre fond="bg-succes-50">
      {/* Un telephone, et l'argent qui rentre : le geste quotidien au Senegal. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="12" y="8" width="44" height="74" rx="6" className="fill-white" />
        <path d="M28 16h12" />
      </g>
      <circle cx="34" cy="70" r="4" className="fill-brand-200" />
      <g className="fill-succes-600">
        <rect x="22" y="30" width="24" height="4" rx="2" />
        <rect x="22" y="40" width="16" height="4" rx="2" />
      </g>
      <path d="M66 46h34m0 0-9-9m9 9-9 9" className="stroke-or-500" strokeWidth={3.2} />
      {/* Une piece : deux cercles suffisent, la ou un sigle monetaire dessine
          a la main se lit de travers. */}
      <circle cx="86" cy="24" r="11" className="fill-or-400" />
      <circle cx="86" cy="24" r="5.5" className="stroke-brand-900" strokeWidth={2.2} />
    </Cadre>
  );
}

/* -------------------------------------------------- Relances / WhatsApp --- */
export function IllustrationRelance() {
  return (
    <Cadre fond="bg-brand-50">
      {/* Le message est deja redige : il ne reste qu'a l'envoyer. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <path d="M10 16a4 4 0 0 1 4-4h58a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H30l-12 10V46h-4a4 4 0 0 1-4-4z"
              className="fill-white" />
      </g>
      <g className="fill-brand-200">
        <rect x="20" y="22" width="44" height="4" rx="2" />
        <rect x="20" y="32" width="30" height="4" rx="2" />
      </g>
      <path d="M52 60a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H70l-10 8v-8h-4a4 4 0 0 1-4-4z"
            className="fill-succes-600" />
      <g className="fill-white">
        <rect x="62" y="66" width="36" height="4" rx="2" />
        <rect x="62" y="74" width="22" height="4" rx="2" />
      </g>
    </Cadre>
  );
}

/* ------------------------------------------------------------ Calendrier --- */
export function IllustrationCalendrier() {
  return (
    <Cadre fond="bg-brand-50">
      {/* Les nuits reservees se ferment d'elles-memes. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="10" y="14" width="100" height="68" rx="5" className="fill-white" />
        <path d="M10 34h100M34 14V6M86 14V6" />
      </g>
      <g className="fill-succes-500">
        <rect x="22" y="42" width="16" height="12" rx="2" />
        <rect x="44" y="42" width="16" height="12" rx="2" />
        <rect x="66" y="42" width="16" height="12" rx="2" />
      </g>
      <rect x="88" y="42" width="16" height="12" rx="2" className="fill-or-400" />
      <g className="fill-brand-100">
        <rect x="22" y="62" width="16" height="12" rx="2" />
        <rect x="44" y="62" width="16" height="12" rx="2" />
        <rect x="66" y="62" width="16" height="12" rx="2" />
        <rect x="88" y="62" width="16" height="12" rx="2" />
      </g>
    </Cadre>
  );
}

/* -------------------------------------------------------- Prix a la nuit --- */
export function IllustrationPrixNuit() {
  return (
    <Cadre fond="bg-sable-50">
      {/* Une etiquette de prix, et la nuit : le tarif par nuitee. */}
      <path d="M14 44 52 8h34a6 6 0 0 1 6 6v34L54 84a6 6 0 0 1-8 0L14 52a6 6 0 0 1 0-8z"
            className="fill-white stroke-brand-700" strokeWidth={2.4} />
      <circle cx="76" cy="26" r="6" className="fill-or-400" />
      <g className="fill-succes-600">
        <rect x="34" y="46" width="30" height="5" rx="2.5" />
        <rect x="34" y="58" width="18" height="5" rx="2.5" />
      </g>
    </Cadre>
  );
}

/* --------------------------------------------------- Sans commission --- */
export function IllustrationSansCommission() {
  return (
    <Cadre fond="bg-succes-50">
      {/* La page publique du logement, et zero pourcentage preleve. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="8" y="12" width="90" height="66" rx="5" className="fill-white" />
        <path d="M8 28h90" />
      </g>
      <g className="fill-brand-200">
        <circle cx="18" cy="20" r="2.5" />
        <circle cx="27" cy="20" r="2.5" />
        <rect x="20" y="38" width="42" height="4" rx="2" />
        <rect x="20" y="48" width="30" height="4" rx="2" />
      </g>
      <rect x="20" y="60" width="26" height="8" rx="4" className="fill-or-400" />
      <circle cx="92" cy="62" r="20" className="fill-succes-600" />
      <text x="92" y="69" textAnchor="middle"
            className="fill-white" style={{ font: "bold 19px system-ui, sans-serif" }}>
        0%
      </text>
    </Cadre>
  );
}

/* ------------------------------------------------------------- Revenus --- */
export function IllustrationRevenus() {
  return (
    <Cadre fond="bg-succes-50">
      {/* La courbe des encaissements, mois par mois. */}
      <path d="M14 74 38 56l20 12 22-26 22-14v46z" className="fill-succes-200" />
      <path d="M14 74 38 56l20 12 22-26 22-14" className="stroke-succes-600" strokeWidth={3} />
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <path d="M14 8v66h92" />
      </g>
      <circle cx="102" cy="30" r="5" className="fill-or-400" />
      <g className="fill-brand-200">
        <rect x="24" y="82" width="12" height="4" rx="2" />
        <rect x="46" y="82" width="12" height="4" rx="2" />
        <rect x="68" y="82" width="12" height="4" rx="2" />
        <rect x="90" y="82" width="12" height="4" rx="2" />
      </g>
    </Cadre>
  );
}

/* ------------------------------------------------------ Recu verifiable --- */
export function IllustrationRecu() {
  return (
    <Cadre fond="bg-sable-50">
      {/* Un document a votre nom, avec son code verifiable en ligne. */}
      <g className="stroke-brand-700" strokeWidth={2.4}>
        <rect x="16" y="6" width="66" height="78" rx="4" className="fill-white" />
        <path d="M28 32h42M28 44h42M28 56h24" />
      </g>
      <rect x="28" y="16" width="26" height="6" rx="3" className="fill-or-400" />
      {/* Le carre de verification : c'est lui qui rend le document opposable. */}
      <rect x="74" y="52" width="32" height="32" rx="4" className="fill-brand-900" />
      <g className="fill-white">
        <rect x="80" y="58" width="8" height="8" rx="1" />
        <rect x="92" y="58" width="8" height="8" rx="1" />
        <rect x="80" y="70" width="8" height="8" rx="1" />
        <rect x="94" y="72" width="4" height="4" rx="1" />
      </g>
    </Cadre>
  );
}
