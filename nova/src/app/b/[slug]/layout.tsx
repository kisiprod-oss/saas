import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { chargerBoutique } from "@/lib/boutique-publique";
import { apparenceDe, couleurSure } from "@/lib/modeles";
import { BadgePanier } from "@/components/panier";
import { Recherche } from "@/components/icones";

/**
 * La coque d'une boutique publique.
 *
 * Elle ne charge PAS le brouillon : le layout n'a pas acces aux parametres
 * d'URL des pages enfants, donc il sert toujours la version publiee. C'est
 * volontaire — l'en-tete et le pied d'une boutique en apercu sont ceux de la
 * boutique publiee, seul le CONTENU des pages change.
 */

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) return { title: "Boutique introuvable" };

  const { boutique } = chargee;
  const titre = boutique.titre_partage || boutique.nom;
  const description = boutique.description_partage || boutique.description
    || `La boutique en ligne de ${boutique.nom}.`;

  return {
    title: { default: titre, template: `%s · ${boutique.nom}` },
    description,
    openGraph: { title: titre, description, type: "website", siteName: boutique.nom },
    twitter: { card: "summary_large_image", title: titre, description },
    // Une boutique publiee doit etre trouvable. Les brouillons ne passent
    // jamais par ici : `chargerBoutique` renvoie null pour eux.
    robots: { index: true, follow: true },
  };
}

export default async function LayoutBoutique({
  children, params,
}: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { boutique, contexte } = chargee;
  const apparence = apparenceDe(boutique.modele);
  const couleur = couleurSure(boutique.couleur);
  const nbCategories = contexte.categories.length;

  return (
    <div className={`boutique flex min-h-dvh flex-col ${apparence.page}`}
      style={{ ["--couleur" as string]: couleur }}>

      <header className={`sticky top-0 z-30 ${apparence.entete}`}>
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Link href={`/b/${slug}`} className="min-w-0 flex-1">
            <span className="block truncate text-lg font-bold">{boutique.nom}</span>
            {boutique.ville ? (
              <span className="block truncate text-xs opacity-70">{boutique.ville}</span>
            ) : null}
          </Link>

          <nav aria-label="Navigation de la boutique" className="hidden items-center gap-1 sm:flex">
            <Link href={`/b/${slug}/catalogue`}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:opacity-70">
              Catalogue
            </Link>
            {nbCategories > 0 ? (
              <Link href={`/b/${slug}/catalogue#categories`}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:opacity-70">
                Catégories
              </Link>
            ) : null}
            <Link href={`/b/${slug}/conditions`}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:opacity-70">
              Infos
            </Link>
          </nav>

          <Link href={`/b/${slug}/catalogue`} aria-label="Chercher un produit"
            className="rounded-lg p-2 hover:opacity-70 sm:hidden">
            <Recherche className="size-5" />
          </Link>
          <Link href={`/b/${slug}/panier`} aria-label="Voir mon panier"
            className="rounded-lg p-2 hover:opacity-70">
            <BadgePanier slug={slug} couleur={couleur} />
          </Link>
        </div>
      </header>

      <main id="contenu" className="flex-1">{children}</main>

      <footer className="border-t border-encre-200 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="font-semibold">{boutique.nom}</p>
          <address className="mt-1.5 space-y-0.5 text-sm not-italic text-encre-600">
            {boutique.adresse ? <p>{boutique.adresse}</p> : null}
            {boutique.ville ? <p>{boutique.ville}</p> : null}
            {boutique.telephone ? (
              <p><a href={`tel:${boutique.telephone}`} className="hover:underline">{boutique.telephone}</a></p>
            ) : null}
          </address>

          <nav aria-label="Informations légales" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-encre-600">
            <Link href={`/b/${slug}/catalogue`} className="hover:underline">Catalogue</Link>
            <Link href={`/b/${slug}/conditions`} className="hover:underline">
              Conditions de vente et livraison
            </Link>
            <Link href={`/b/${slug}/suivi`} className="hover:underline">Suivre ma commande</Link>
          </nav>

          <p className="mt-6 text-xs text-encre-400">
            Boutique propulsée par{" "}
            <a href="/" className="hover:underline">NOVA Boutique</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
