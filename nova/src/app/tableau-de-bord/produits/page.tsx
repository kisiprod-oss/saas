import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { produits, nombreProduits, categories } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { offreEnVigueur } from "@/lib/offres";
import { montant } from "@/lib/format";
import { EcranVide, Photo } from "@/components/ui";
import { Boite, Plus, Recherche, Alerte } from "@/components/icones";
import { actionBasculerProduit } from "@/lib/actions-catalogue";

export const metadata = { title: "Produits" };

/**
 * La liste des produits.
 *
 * La recherche et les filtres passent par l'URL (`?q=`, `?filtre=`) plutot que
 * par un etat local : le commercant peut mettre en favori une vue, la
 * partager, et le bouton « precedent » du navigateur fait ce qu'on attend.
 */
export default async function PageProduits({
  searchParams,
}: { searchParams: Promise<{ q?: string; filtre?: string; categorie?: string }> }) {
  const { boutique } = await exigerSession();
  const { q, filtre, categorie } = await searchParams;
  const pays = paysDe(boutique.pays);
  const offre = offreEnVigueur(boutique);

  const rayons = categories(boutique.id);
  const categorieId = categorie ? Number(categorie) : undefined;

  let liste = produits(boutique.id, {
    recherche: q,
    categorieId: Number.isSafeInteger(categorieId) ? categorieId : undefined,
  });
  if (filtre === "stock") liste = liste.filter((p) => p.suivi_stock && p.stock <= p.seuil_alerte);
  if (filtre === "inactifs") liste = liste.filter((p) => !p.actif);

  const total = nombreProduits(boutique.id);
  const place = offre.max_produits - total;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titre-page">Produits</h1>
          <p className="mt-1 text-sm text-encre-600">
            {total} produit{total > 1 ? "s" : ""} sur {offre.max_produits} inclus dans la formule {offre.nom}.
            {place <= 3 && place > 0 ? ` Encore ${place} possible${place > 1 ? "s" : ""}.` : ""}
          </p>
        </div>
        <Link href="/tableau-de-bord/produits/nouveau" className="btn-principal">
          <Plus className="size-4" /> Ajouter
        </Link>
      </header>

      {place <= 0 ? (
        <div className="message message-alerte">
          <div>
            Vous avez atteint les {offre.max_produits} produits de la formule {offre.nom}.
            Vos produits restent en vente ; seuls les ajouts sont bloqués.{" "}
            <Link href="/tableau-de-bord/abonnement" className="font-semibold underline">
              Voir les formules
            </Link>
          </div>
        </div>
      ) : null}

      {/* Recherche et filtres */}
      <form className="flex flex-wrap gap-2" role="search">
        <div className="relative min-w-52 flex-1">
          <Recherche className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-encre-400" />
          <input name="q" defaultValue={q} className="champ pl-9" placeholder="Chercher un produit"
            aria-label="Chercher un produit" />
        </div>
        <select name="categorie" defaultValue={categorie ?? ""} className="champ w-auto"
          aria-label="Filtrer par catégorie">
          <option value="">Toutes les catégories</option>
          {rayons.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </select>
        <select name="filtre" defaultValue={filtre ?? ""} className="champ w-auto"
          aria-label="Filtrer">
          <option value="">Tous</option>
          <option value="stock">Stock bas</option>
          <option value="inactifs">Retirés de la vente</option>
        </select>
        <button type="submit" className="btn-secondaire">Filtrer</button>
      </form>

      {liste.length === 0 ? (
        total === 0 ? (
          <EcranVide
            icone={<Boite className="size-6" />}
            titre="Votre catalogue est vide"
            texte="Un produit, c'est une photo, un nom et un prix. Le reste peut attendre."
            action={
              <Link href="/tableau-de-bord/produits/nouveau" className="btn-principal">
                <Plus className="size-4" /> Ajouter mon premier produit
              </Link>
            }
          />
        ) : (
          <EcranVide
            icone={<Recherche className="size-6" />}
            titre="Aucun produit ne correspond"
            texte="Essayez avec un autre mot, ou retirez les filtres."
            action={<Link href="/tableau-de-bord/produits" className="btn-secondaire">Tout afficher</Link>}
          />
        )
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((produit) => {
            const enTension = produit.suivi_stock && produit.stock <= produit.seuil_alerte;
            return (
              <li key={produit.id} className="carte overflow-hidden">
                <Link href={`/tableau-de-bord/produits/${produit.id}`} className="block">
                  <Photo
                    src={produit.photos[0] ? `/api/photo/${boutique.id}/v_${produit.photos[0]}` : null}
                    alt={produit.nom}
                    ratio="aspect-[4/3]"
                  />
                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold text-encre-900">{produit.nom}</h2>
                      {!produit.actif ? <span className="puce puce-neutre shrink-0">Retiré</span> : null}
                    </div>
                    <p className="mt-1.5 font-semibold text-encre-900">
                      {montant(produit.prix, pays.devise_libelle, pays.decimales)}
                      {produit.prix_barre ? (
                        <span className="ml-2 text-sm font-normal text-encre-400 line-through">
                          {montant(produit.prix_barre, pays.devise_libelle, pays.decimales)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-encre-600">
                      {enTension ? <Alerte className="size-3.5 text-terre-600" /> : null}
                      {produit.suivi_stock
                        ? produit.stock === 0 ? "Épuisé" : `${produit.stock} en stock`
                        : "Stock non suivi"}
                      {produit.categorie_nom ? <> · {produit.categorie_nom}</> : null}
                    </p>
                  </div>
                </Link>
                <form action={actionBasculerProduit} className="border-t border-encre-100 px-3.5 py-2">
                  <input type="hidden" name="id" value={produit.id} />
                  <button type="submit" className="text-xs font-medium text-encre-600 hover:text-vert-700">
                    {produit.actif ? "Retirer de la vente" : "Remettre en vente"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
