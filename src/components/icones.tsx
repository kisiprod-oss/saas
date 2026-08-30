type Props = { className?: string };

const base = "h-5 w-5";

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      className={className ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconeTableauBord = (p: Props) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Svg>
);
export const IconeMaison = (p: Props) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 9.5V21h13V9.5" /><path d="M10 21v-6h4v6" /></Svg>
);
export const IconeUtilisateurs = (p: Props) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16.5 5.5a3 3 0 0 1 0 5.6" /><path d="M18 14.5a5.6 5.6 0 0 1 3.5 5.5" /></Svg>
);
export const IconeContrat = (p: Props) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></Svg>
);
export const IconeFacture = (p: Props) => (
  <Svg {...p}><path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z" /><path d="M9.5 8h5" /><path d="M9.5 12h5" /><path d="M9.5 16h3" /></Svg>
);
export const IconeArgent = (p: Props) => (
  <Svg {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5v.01M18 14.5v.01" /></Svg>
);
export const IconeBoiteReception = (p: Props) => (
  <Svg {...p}><path d="M3 13h5l1.5 3h5L16 13h5" /><path d="M4.6 5.5h14.8l1.6 7.5v5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18v-5z" /></Svg>
);
export const IconeAgence = (p: Props) => (
  <Svg {...p}><path d="M3.5 21h17" /><path d="M5 21V6l7-3.5L19 6v15" /><path d="M9.5 21v-5h5v5" /><path d="M9.5 9.5h1M13.5 9.5h1M9.5 13h1M13.5 13h1" /></Svg>
);
export const IconePlus = (p: Props) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconeRecherche = (p: Props) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const IconeImprimer = (p: Props) => (
  <Svg {...p}><path d="M7 9V3h10v6" /><rect x="4" y="9" width="16" height="7" rx="1.5" /><path d="M7 14h10v7H7z" /></Svg>
);
export const IconeTelephone = (p: Props) => (
  <Svg {...p}><path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6 6L16.5 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.2 2 2 0 0 1 5.5 3z" /></Svg>
);
export const IconeAlerte = (p: Props) => (
  <Svg {...p}><path d="M12 4 2.8 20h18.4z" /><path d="M12 10v4M12 17v.01" /></Svg>
);
export const IconeCheck = (p: Props) => (
  <Svg {...p}><path d="m4.5 12.5 5 5 10-11" /></Svg>
);
export const IconeLit = (p: Props) => (
  <Svg {...p}><path d="M3 18V7" /><path d="M3 11h13a5 5 0 0 1 5 5v2" /><path d="M3 18h18" /><circle cx="7.5" cy="8.5" r="1.8" /></Svg>
);
export const IconeSurface = (p: Props) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="1.5" /><path d="M8 3.5v3M3.5 8h3M16 20.5v-3M20.5 16h-3" /></Svg>
);
export const IconeDouche = (p: Props) => (
  <Svg {...p}><path d="M4 12h16" /><path d="M6 12V6a2.5 2.5 0 0 1 5 0" /><path d="M6 12v4a5 5 0 0 0 10 0v-4" /><path d="M8.5 21v.01M12 21v.01M15.5 21v.01" /></Svg>
);
export const IconeLieu = (p: Props) => (
  <Svg {...p}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const IconeSortie = (p: Props) => (
  <Svg {...p}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 8 6 12l4 4" /><path d="M6 12h9" /></Svg>
);
export const IconeRetour = (p: Props) => (
  <Svg {...p}><path d="M15 6 9 12l6 6" /></Svg>
);
export const IconeCorbeille = (p: Props) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></Svg>
);
export const IconeCrayon = (p: Props) => (
  <Svg {...p}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M15 6l3 3" /></Svg>
);
export const IconeRelance = (p: Props) => (
  <Svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" /><path d="M12 8v4M12 15.5v.01" /></Svg>
);
export const IconeCalendrier = (p: Props) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /><path d="M8 14h3M8 17.5h5" /></Svg>
);
export const IconeCarte = (p: Props) => (
  <Svg {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /><path d="M6 14.5h3.5" /></Svg>
);
export const IconeOutils = (p: Props) => (
  <Svg {...p}><path d="M14.5 6.5a4 4 0 0 0-5.4 4.9L3.5 17l2 2 5.6-5.6a4 4 0 0 0 4.9-5.4l-2.6 2.6-2-2z" /></Svg>
);
export const IconeMenu = (p: Props) => (
  <Svg {...p}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></Svg>
);
