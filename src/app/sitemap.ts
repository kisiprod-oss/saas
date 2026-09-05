import type { MetadataRoute } from "next";
import { tous } from "@/lib/db";
import { url } from "@/lib/seo";

/**
 * Le plan du site : la liste des pages que Google doit connaitre.
 *
 * Il manquait, et c'est ce qui coutait le plus cher. Sans lui, un moteur ne
 * decouvre une annonce que s'il tombe dessus en suivant les liens de la page
 * de recherche — donc tard, et rarement pour les annonces les moins visibles.
 * Ici, chaque logement publie est annonce explicitement, avec sa date de
 * derniere modification.
 *
 * Les annonces sont la vraie matiere referencable du site : elles portent un
 * quartier, une ville, un nombre de chambres et un prix, c'est-a-dire
 * exactement ce que les gens tapent dans Google.
 */

// Le plan se construit a partir de la base : il doit refleter les annonces
// du moment, pas celles du jour de la mise en ligne.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/courte-duree"), changeFrequency: "weekly", priority: 0.9 },
    { url: url("/tarifs"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/professionnels"), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/pro"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/inscription"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/verifier"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/mentions-legales"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/cgu"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/confidentialite"), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Une base indisponible ne doit pas faire echouer le plan : mieux vaut
  // livrer les pages fixes que rien du tout.
  try {
    const biens = tous<{ id: number; cree_le: string }>(
      "SELECT id, cree_le FROM biens WHERE publie = 1 ORDER BY id",
    );
    for (const b of biens) {
      pages.push({
        url: url(`/biens/${b.id}`),
        lastModified: new Date(b.cree_le),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    /* on livre au moins les pages fixes */
  }

  return pages;
}
