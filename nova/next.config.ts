import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ces deux paquets chargent du binaire natif : Next ne doit pas tenter de
  // les empaqueter dans le bundle serveur.
  serverExternalPackages: ["better-sqlite3", "sharp"],

  experimental: {
    serverActions: {
      // Un commercant televerse des photos prises au telephone, souvent
      // plusieurs a la fois et jamais redimensionnees. Elles sont compressees
      // des la reception (src/lib/photos.ts) ; il faut d'abord les accepter.
      bodySizeLimit: "25mb",
    },
  },

  async headers() {
    return [{
      source: "/:chemin*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), interest-cohort=()" },
      ],
    }];
  },
};

export default nextConfig;
