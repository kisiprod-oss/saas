/**
 * Les icônes de l'application, dessinées à la main en SVG.
 *
 * Pas de bibliothèque d'icônes : elles pèsent des centaines de kilo-octets
 * pour la vingtaine de symboles réellement utilisés ici, et le public cible
 * paie sa connexion au mégaoctet.
 *
 * Toutes partagent la même grille de 24, le même trait de 1,75 et
 * `currentColor` : elles prennent la couleur du texte qui les entoure, donc
 * elles restent lisibles sur fond clair comme sur fond vert.
 *
 * `aria-hidden` par défaut : une icône posée à côté d'un mot ne doit pas être
 * relue par un lecteur d'écran. Quand elle est seule dans un bouton, c'est le
 * bouton qui porte le `aria-label`.
 */

type Props = { className?: string; titre?: string };

function Svg({ className = "size-5", titre, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className={className}
      aria-hidden={titre ? undefined : true} role={titre ? "img" : undefined}
    >
      {titre ? <title>{titre}</title> : null}
      {children}
    </svg>
  );
}

export const Maison = (p: Props) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>
);

export const Panier = (p: Props) => (
  <Svg {...p}><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" /><circle cx="10" cy="20" r="1.2" /><circle cx="17.5" cy="20" r="1.2" /></Svg>
);

export const Boite = (p: Props) => (
  <Svg {...p}><path d="M21 8.5 12 4 3 8.5v7L12 20l9-4.5v-7Z" /><path d="M3 8.5 12 13l9-4.5" /><path d="M12 13v7" /></Svg>
);

export const Points = (p: Props) => (
  <Svg {...p}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></Svg>
);

export const Boutique = (p: Props) => (
  <Svg {...p}><path d="M4 9h16l-1 11H5L4 9Z" /><path d="M3 9l1.6-4.2A1.5 1.5 0 0 1 6 4h12a1.5 1.5 0 0 1 1.4 1L21 9" /><path d="M9.5 13.5h5" /></Svg>
);

export const Etiquette = (p: Props) => (
  <Svg {...p}><path d="M3 12.5V4h8.5L21 13.5 13.5 21 3 12.5Z" /><circle cx="7.5" cy="8" r="1.2" /></Svg>
);

export const Personnes = (p: Props) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" /><path d="M18 14.8c2 .7 3.3 2.5 3.3 5.2" /></Svg>
);

export const Camion = (p: Props) => (
  <Svg {...p}><path d="M2 7h11v9H2V7Z" /><path d="M13 10h4l3 3.2V16h-7" /><circle cx="6.5" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></Svg>
);

export const Carte = (p: Props) => (
  <Svg {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /><path d="M6 14.5h3.5" /></Svg>
);

export const Reglages = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" /></Svg>
);

export const Etincelle = (p: Props) => (
  <Svg {...p}><path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7L12 3.5Z" /><path d="M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></Svg>
);

export const Plus = (p: Props) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const Fleche = (p: Props) => (
  <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
);

export const FlecheGauche = (p: Props) => (
  <Svg {...p}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></Svg>
);

export const Coche = (p: Props) => (
  <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>
);

export const Croix = (p: Props) => (
  <Svg {...p}><path d="m6 6 12 12M18 6 6 18" /></Svg>
);

export const Alerte = (p: Props) => (
  <Svg {...p}><path d="M12 4.5 2.8 20h18.4L12 4.5Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r=".8" fill="currentColor" /></Svg>
);

export const Info = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r=".8" fill="currentColor" /></Svg>
);

export const Horloge = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></Svg>
);

export const Bouclier = (p: Props) => (
  <Svg {...p}><path d="M12 3 4.5 6v6c0 4.3 3 7.6 7.5 9 4.5-1.4 7.5-4.7 7.5-9V6L12 3Z" /><path d="m9 12 2.2 2.2L15.2 10" /></Svg>
);

export const Coeur = (p: Props) => (
  <Svg {...p}><path d="M12 20s-7.5-4.4-7.5-9.5A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.5C19.5 15.6 12 20 12 20Z" /></Svg>
);

export const Feuille = (p: Props) => (
  <Svg {...p}><path d="M4 20c0-8 5-14 16-14 0 9-5 13-11 13H4Z" /><path d="M4 20c3-4.5 6.5-7 10.5-8.5" /></Svg>
);

export const Cadeau = (p: Props) => (
  <Svg {...p}><rect x="3" y="9" width="18" height="11" rx="1.5" /><path d="M3 13h18M12 9v11" /><path d="M12 9S9.5 4 7.5 5.2 9 9 12 9Zm0 0s2.5-5 4.5-3.8S15 9 12 9Z" /></Svg>
);

export const Etoile = (p: Props) => (
  <Svg {...p}><path d="m12 4 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 4Z" /></Svg>
);

export const Telephone = (p: Props) => (
  <Svg {...p}><path d="M6.5 3.5h3L11 8l-2.2 1.5a13 13 0 0 0 5.7 5.7L16 13l4.5 1.5v3a2 2 0 0 1-2.2 2C10.6 18.8 5.2 13.4 4.5 5.7a2 2 0 0 1 2-2.2Z" /></Svg>
);

export const Whatsapp = (p: Props) => (
  <Svg {...p}><path d="M3.5 20.5 5 16.6a8 8 0 1 1 3 3l-4.5 1.9Z" /><path d="M9 9.3c0 3 2.3 5.3 5.3 5.3.6 0 1.1-.5 1.1-1.1l-.1-.8-1.7-.6-.8.9a5 5 0 0 1-2.1-2.1l.9-.8-.6-1.7-.8-.1c-.6 0-1.2.5-1.2 1Z" /></Svg>
);

export const Lien = (p: Props) => (
  <Svg {...p}><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.5-2.5a4 4 0 0 0-5.7-5.7l-1.3 1.3" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.5 2.5a4 4 0 0 0 5.7 5.7l1.3-1.3" /></Svg>
);

export const Oeil = (p: Props) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Svg>
);

export const Corbeille = (p: Props) => (
  <Svg {...p}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /><path d="M10.5 11v5.5M13.5 11v5.5" /></Svg>
);

export const Crayon = (p: Props) => (
  <Svg {...p}><path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="m14.5 5.5 4 4" /></Svg>
);

export const Retour = (p: Props) => (
  <Svg {...p}><path d="M4 9h11a5 5 0 0 1 0 10h-5" /><path d="m8 5-4 4 4 4" /></Svg>
);

export const Telecharger = (p: Props) => (
  <Svg {...p}><path d="M12 4v10" /><path d="m8 10.5 4 4 4-4" /><path d="M4.5 19h15" /></Svg>
);

export const Recherche = (p: Props) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Svg>
);

export const Cadenas = (p: Props) => (
  <Svg {...p}><rect x="4.5" y="10" width="15" height="10" rx="2" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /></Svg>
);

export const Graphique = (p: Props) => (
  <Svg {...p}><path d="M4 19V5M4 19h16" /><path d="M8 16v-4M12.5 16V8M17 16v-6" /></Svg>
);

/** Les icônes que l'IA peut demander dans une section « points forts ». */
export const ICONES_SECTION = {
  etoile: Etoile,
  livraison: Camion,
  paiement: Carte,
  telephone: Telephone,
  horloge: Horloge,
  bouclier: Bouclier,
  coeur: Coeur,
  feuille: Feuille,
  panier: Panier,
  cadeau: Cadeau,
} as const;
