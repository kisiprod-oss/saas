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

  /**
   * En-tetes de securite, poses ici plutot que chez l'hebergeur ou devant :
   * ils suivent alors le code, restent valables si le site change de serveur,
   * et se relisent dans le depot au lieu d'un panneau d'administration.
   *
   * PAS DE Content-Security-Policy POUR L'INSTANT, et c'est delibere : elle
   * est la protection la plus utile de la liste, mais l'application pose des
   * scripts en ligne (donnees structurees, animations de l'accueil). Une CSP
   * stricte les bloquerait tous. Elle demande donc une passe dediee, avec un
   * `nonce` par requete — a faire, mais pas au milieu d'un correctif de faille.
   *
   * PAS DE Strict-Transport-Security non plus : le jour ou il est pose, un
   * navigateur refuse le site en clair pendant toute la duree annoncee, sans
   * possibilite de revenir en arriere cote visiteur. A activer une fois le
   * HTTPS confirme stable, de preference depuis Cloudflare ou l'interrupteur
   * est reversible.
   */
  async headers() {
    return [{
      source: "/:chemin*",
      headers: [
        // Le site n'utilise aucune iframe : personne ne doit pouvoir
        // l'encadrer pour faire cliquer un bouton a l'insu du visiteur.
        { key: "X-Frame-Options", value: "DENY" },
        // Un fichier servi ne doit jamais etre reinterprete dans un autre type.
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Les adresses des pages privees portent des identifiants et des
        // jetons : elles ne partent pas vers les sites tiers.
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Aucune de ces fonctions n'est utilisee par l'application.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      ],
    }];
  },
};

export default nextConfig;
