import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * Aucune police n'est téléchargée.
 *
 * Une police web, c'est 80 à 200 Ko avant le premier mot lisible, payés par
 * le visiteur sur une connexion mobile qu'il achète au mégaoctet. La pile
 * système donne une police propre sur chaque appareil, disponible
 * instantanément, et sans requête réseau. Le gain de caractère d'Inter ne
 * vaut pas ce prix-là pour ce public.
 */

export const metadata: Metadata = {
  title: {
    default: "NOVA Boutique — Votre boutique en ligne, créée avec l'IA",
    template: "%s · NOVA Boutique",
  },
  description:
    "Créez votre boutique en ligne depuis votre téléphone : décrivez votre activité, "
    + "personnalisez, publiez et recevez vos commandes.",
  applicationName: "NOVA Boutique",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale` n'est pas fixé : bloquer le zoom rend l'application
  // inutilisable pour qui a besoin d'agrandir.
  themeColor: "#0e5c3f",
};

export default function RacineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        {/* Premier élément focusable de la page : un lecteur au clavier
            atteint le contenu sans traverser toute la navigation. */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:rounded-lg focus:bg-vert-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
