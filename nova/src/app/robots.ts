import type { MetadataRoute } from "next";

/**
 * Ce que les moteurs de recherche ont le droit de parcourir.
 *
 * Les boutiques publiees (/b/...) doivent etre trouvables : c'est leur raison
 * d'etre. Tout le reste — tableau de bord, administration, assistant, API —
 * est ferme. Ce n'est pas une mesure de securite (le controle d'acces est
 * ailleurs), c'est une mesure de proprete : une page privee indexee finit par
 * apparaitre dans des resultats de recherche, et inquiete a juste titre.
 */
export default function robots(): MetadataRoute.Robots {
  const racine = process.env.NOVA_URL_PUBLIQUE ?? "http://localhost:3100";
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: [
        "/tableau-de-bord", "/administration", "/creer",
        "/api/", "/reinitialiser/", "/b/_domaine",
      ],
    }],
    sitemap: `${racine}/sitemap.xml`,
  };
}
