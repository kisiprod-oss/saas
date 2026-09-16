import { notFound } from "next/navigation";
import Link from "next/link";
import { chargerBoutique } from "@/lib/boutique-publique";
import { CarteProduit } from "@/components/sections-rendu";
import { apparenceDe } from "@/lib/modeles";
import { Recherche } from "@/components/icones";

export const metadata = { title: "Catalogue" };

/**
 * Le catalogue complet : recherche et filtre par categorie, tous deux dans
 * l'URL pour qu'un client puisse envoyer « regarde ce rayon » par WhatsApp.
 */
export default async function PageCatalogue({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { c, q } = await searchParams;

  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { contexte } = chargee;
  const apparence = apparenceDe(chargee.boutique.modele);

  const categorie = c ? contexte.categories.find((cat) => cat.slug === c) : undefined;
  const recherche = (q ?? "").trim().toLowerCase();

  let liste = contexte.produits;
  if (categorie) liste = liste.filter((p) => p.categorie_id === categorie.id);
  if (recherche) {
    liste = liste.filter((p) =>
      p.nom.toLowerCase().includes(recherche)
      || (p.description ?? "").toLowerCase().includes(recherche));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className={apparence.titre}>
        {categorie ? categorie.nom : "Tous nos produits"}
      </h1>

      <form className="mt-5 flex gap-2" role="search">
        <div className="relative flex-1">
          <Recherche className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-encre-400" />
          <input name="q" defaultValue={q} className="champ pl-9"
            placeholder="Chercher dans la boutique" aria-label="Chercher un produit" />
        </div>
        {categorie ? <input type="hidden" name="c" value={categorie.slug} /> : null}
        <button type="submit" className="btn-secondaire">Chercher</button>
      </form>

      {contexte.categories.length > 0 ? (
        <nav id="categories" aria-label="Catégories" className="mt-5 flex flex-wrap gap-2">
          <Link href={`/b/${slug}/catalogue`}
            className={`inline-flex min-h-10 items-center border px-4 text-sm ${apparence.bouton}
              ${!categorie ? "text-white" : "border-encre-300"}`}
            style={!categorie ? { backgroundColor: contexte.couleur, borderColor: contexte.couleur } : undefined}>
            Tout
          </Link>
          {contexte.categories.map((cat) => {
            const actif = categorie?.id === cat.id;
            return (
              <Link key={cat.id} href={`/b/${slug}/catalogue?c=${cat.slug}`}
                className={`inline-flex min-h-10 items-center border px-4 text-sm ${apparence.bouton}
                  ${actif ? "text-white" : "border-encre-300"}`}
                style={actif ? { backgroundColor: contexte.couleur, borderColor: contexte.couleur } : undefined}>
                {cat.nom}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {liste.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-encre-300 px-6 py-14 text-center">
          <p className="font-medium">Aucun produit ne correspond</p>
          <p className="mt-1.5 text-sm text-encre-600">
            {recherche
              ? "Essayez avec un autre mot."
              : "Cette catégorie est vide pour l'instant."}
          </p>
          <Link href={`/b/${slug}/catalogue`} className="btn-secondaire mt-5">
            Voir tout le catalogue
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-encre-500">
            {liste.length} produit{liste.length > 1 ? "s" : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {liste.map((produit) => (
              <CarteProduit key={produit.id} produit={produit} contexte={contexte} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
