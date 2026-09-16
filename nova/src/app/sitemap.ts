import type { MetadataRoute } from "next";
import { tous } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Le plan du site : les pages commerciales, puis chaque boutique publiee.
 *
 * Les brouillons et les boutiques suspendues n'y figurent pas — la requete les
 * exclut a la source plutot que de compter sur un filtre en aval.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const racine = process.env.NOVA_URL_PUBLIQUE ?? "http://localhost:3100";

  const pages: MetadataRoute.Sitemap = [
    { url: racine, changeFrequency: "weekly", priority: 1 },
    { url: `${racine}/tarifs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${racine}/aide`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${racine}/demonstration`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${racine}/inscription`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${racine}/conditions`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${racine}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let boutiques: { slug: string; publiee_le: string }[] = [];
  try {
    boutiques = tous<{ slug: string; publiee_le: string }>(
      `SELECT slug, publiee_le FROM boutiques
        WHERE publiee_le IS NOT NULL AND suspendue_le IS NULL
        ORDER BY publiee_le DESC LIMIT 5000`,
    );
  } catch {
    // Base indisponible au moment de la generation : on rend le plan des
    // pages fixes plutot que rien du tout.
  }

  for (const boutique of boutiques) {
    pages.push({
      url: `${racine}/b/${boutique.slug}`,
      lastModified: new Date(boutique.publiee_le),
      changeFrequency: "daily",
      priority: 0.9,
    });
    pages.push({
      url: `${racine}/b/${boutique.slug}/catalogue`,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }
  return pages;
}
