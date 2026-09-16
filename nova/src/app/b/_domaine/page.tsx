import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { boutiquePubliqueParDomaine } from "@/lib/requetes";

/**
 * Le point d'entree des domaines personnalises.
 *
 * Le middleware a reecrit la requete ici et pose le domaine demande dans
 * `x-nova-domaine`. On cherche la boutique qui l'a fait VERIFIER (un
 * enregistrement TXT prouve, voir actions-reglages.ts) : sans verification,
 * n'importe qui pourrait faire pointer un domaine vers nous et reclamer la
 * boutique d'un autre.
 */
export default async function PageDomaine() {
  const entetes = await headers();
  const domaine = entetes.get("x-nova-domaine");
  if (!domaine) notFound();

  const boutique = boutiquePubliqueParDomaine(domaine);
  if (!boutique) notFound();

  // Redirection interne vers la boutique : elle garde l'URL du commercant,
  // puisque le middleware a deja reecrit le chemin.
  redirect(`/b/${boutique.slug}`);
}
