import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  experimental: {
    serverActions: {
      // Les photos prises au telephone sont lourdes : on autorise un envoi
      // de 25 Mo au total (elles sont compressees juste apres reception).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
