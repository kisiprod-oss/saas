import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AssistantMonte } from "@/components/assistant-monte";
import { ficheOrganisation, MOTS_CLES, NOM_SITE, SITE } from "@/lib/seo";

/**
 * Code de propriete remis par Google Search Console, methode « Balise HTML ».
 * 43 caracteres, alphabet base64url. Il identifie le compte autorise a
 * consulter les statistiques de recherche du site — il n'ouvre aucun acces
 * au site lui-meme.
 */
const CODE_GOOGLE = "rHwhIsIk6MGAHv_pphZkFPY9uy7WJ-mu_VL4AGuV2sE";

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
  // Le code est ecrit dans le depot, en clair, et c'est voulu : Google le
  // publie lui-meme dans le code source de chaque page, ce n'est donc pas
  // un secret. Le faire dependre d'une variable d'environnement paraissait
  // plus propre, mais ajoutait quatre facons d'echouer en silence — variable
  // mal nommee, valeur tronquee a la saisie, guillemets colles avec le code,
  // application pas redemarree — et la validation echouait sans que rien
  // n'indique laquelle. Ecrit ici, la balise part avec le deploiement.
  //
  // GOOGLE_VERIFICATION reste prioritaire : elle permet de valider une
  // autre propriete (second domaine, autre compte Google) sans toucher au
  // code.
  verification: { google: process.env.GOOGLE_VERIFICATION?.trim() || CODE_GOOGLE },
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
