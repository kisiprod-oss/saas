import type { MetadataRoute } from "next";
import { CHEMINS_PRIVES, SITE, url } from "@/lib/seo";

/**
 * Ce que les moteurs de recherche ont le droit de parcourir.
 *
 * Le fichier manquait entierement : Google explorait donc TOUT, y compris
 * les adresses a jeton qui ouvrent une quittance nominative. Ces pages sont
 * fermees par mot de passe ou par secret, mais une adresse indexee reste
 * visible dans les resultats pour toujours — le mal serait fait avant qu'on
 * s'en apercoive.
 *
 * Le plan du site est annonce ici : c'est ainsi que Google decouvre les
 * annonces de logement sans avoir a les deviner de lien en lien.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: CHEMINS_PRIVES.map((c) => `${c}/`),
      },
    ],
    sitemap: url("/sitemap.xml"),
    host: SITE,
  };
}
