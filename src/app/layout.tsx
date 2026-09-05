import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AssistantMonte } from "@/components/assistant-monte";
import { ficheOrganisation, MOTS_CLES, NOM_SITE, SITE } from "@/lib/seo";

export const metadata: Metadata = {
  // Sans metadataBase, Next produit des adresses RELATIVES pour les partages
  // et les liens canoniques : les apercus WhatsApp et Facebook restent alors
  // vides, et Google ne sait pas quelle adresse fait foi.
  metadataBase: new URL(SITE),
  title: {
    default: "Sen Gestion — Logiciel de gestion locative au Sénégal",
    template: "%s · Sen Gestion",
  },
  description:
    "Logiciel de gestion locative pour les agences immobilières et les propriétaires au Sénégal : biens, locataires, baux, quittances de loyer et suivi des paiements en FCFA.",
  keywords: MOTS_CLES,
  applicationName: NOM_SITE,
  authors: [{ name: NOM_SITE, url: SITE }],
  creator: NOM_SITE,
  publisher: NOM_SITE,
  alternates: { canonical: "/" },
  category: "Immobilier",
  // Autorise explicitement l'indexation, et demande les grands apercus :
  // sur une recherche de logement, l'image decide du clic.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: NOM_SITE,
    locale: "fr_SN",
    url: SITE,
    title: "Sen Gestion — Logiciel de gestion locative au Sénégal",
    description:
      "Vos loyers rentrent, vous savez où vous en êtes. Biens, locataires, baux, quittances et paiements en FCFA, depuis un seul tableau de bord.",
    images: [{
      url: "/logo-sen-gestion.webp",
      width: 1156,
      height: 888,
      alt: "Sen Gestion — gérer aujourd'hui, valoriser demain",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sen Gestion — Logiciel de gestion locative au Sénégal",
    description:
      "Biens, locataires, baux, quittances et paiements en FCFA, depuis un seul tableau de bord.",
    images: ["/logo-sen-gestion.webp"],
  },
  formatDetection: { telephone: true, address: false, email: false },
  // Preuve de propriete du site pour Google Search Console.
  //
  // Elle passe par une variable d'environnement, et non par le code : la
  // personne qui gere le site colle le code fourni par Google chez
  // l'hebergeur, sans avoir a modifier ni deployer quoi que ce soit. La
  // balise n'apparait que si la variable est renseignee.
  verification: process.env.GOOGLE_VERIFICATION
    ? { google: process.env.GOOGLE_VERIFICATION.trim() }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#108130",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Fiche d'identite lisible par les moteurs : c'est elle qui permet
            d'afficher le nom, le logo et l'activite plutot qu'un lien nu. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ficheOrganisation()) }}
        />
        {children}
        <AssistantMonte />
      </body>
    </html>
  );
}
