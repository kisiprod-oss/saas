import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AssistantMonte } from "@/components/assistant-monte";

export const metadata: Metadata = {
  title: {
    default: "Sen Gestion — Gestion locative au Sénégal",
    template: "%s · Sen Gestion",
  },
  description:
    "Logiciel de gestion locative pour les agences immobilières au Sénégal : biens, locataires, baux, quittances de loyer et suivi des paiements en FCFA.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f8156",
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
        {children}
        <AssistantMonte />
      </body>
    </html>
  );
}
