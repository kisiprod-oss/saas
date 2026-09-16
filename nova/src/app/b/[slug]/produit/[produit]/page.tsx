import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { chargerBoutique, messageWhatsapp, lienWhatsapp } from "@/lib/boutique-publique";
import { produitParSlug, variantes as lireVariantes } from "@/lib/requetes";
import { apparenceDe, texteSur } from "@/lib/modeles";
import { AchatProduit } from "@/components/achat-produit";
import { GalerieProduit } from "@/components/galerie-produit";
import { CarteProduit } from "@/components/sections-rendu";
import { extrait } from "@/lib/format";
import { Whatsapp, FlecheGauche } from "@/components/icones";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; produit: string }> },
): Promise<Metadata> {
  const { slug, produit: slugProduit } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) return { title: "Produit introuvable" };

  const produit = produitParSlug(chargee.boutique.id, slugProduit);
  if (!produit) return { title: "Produit introuvable" };

  const description = extrait(produit.description ?? chargee.boutique.description, 155);
  const image = produit.photos[0]
    ? `/api/photo/${chargee.boutique.id}/${produit.photos[0]}`
    : undefined;

  return {
    title: produit.nom,
    description,
    openGraph: {
      title: produit.nom, description, type: "website",
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function PageProduitPublic({
  params,
}: { params: Promise<{ slug: string; produit: string }> }) {
  const { slug, produit: slugProduit } = await params;

  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { boutique, contexte } = chargee;
  const produit = produitParSlug(boutique.id, slugProduit);
  // Un produit retire de la vente n'est plus servi : son adresse peut avoir
  // ete partagee, mais il n'est plus achetable.
  if (!produit || !produit.actif) notFound();

  const apparence = apparenceDe(boutique.modele);
  const options = lireVariantes(boutique.id, produit.id);
  const surCouleur = texteSur(contexte.couleur);

  const lienDemande = lienWhatsapp(boutique.whatsapp, messageWhatsapp({
    nomBoutique: boutique.nom,
    lignes: [{ nom: produit.nom, quantite: 1 }],
  }));

  const similaires = contexte.produits
    .filter((p) => p.id !== produit.id && p.categorie_id === produit.categorie_id)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/b/${slug}/catalogue`}
        className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:underline">
        <FlecheGauche className="size-4" /> Catalogue
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <GalerieProduit
          photos={produit.photos.map((f) => ({
            grande: `/api/photo/${boutique.id}/${f}`,
            petite: `/api/photo/${boutique.id}/v_${f}`,
          }))}
          alt={produit.nom}
          arrondi={apparence.arrondi}
        />

        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{produit.nom}</h1>
          {produit.categorie_nom ? (
            <Link href={`/b/${slug}/catalogue?c=${produit.categorie_id}`}
              className="mt-1.5 inline-block text-sm text-encre-500 hover:underline">
              {produit.categorie_nom}
            </Link>
          ) : null}

          <div className="mt-5">
            <AchatProduit
              slug={slug}
              produitId={produit.id}
              prixBase={produit.prix}
              variantes={options}
              libelleVariante={produit.variante_libelle}
              suiviStock={produit.suivi_stock === 1}
              stock={produit.stock}
              devise={contexte.devise}
              decimales={contexte.decimales}
              couleur={contexte.couleur}
              texteCouleur={surCouleur}
              arrondi={apparence.arrondi}
              lienPanier={`/b/${slug}/panier`}
            />
          </div>

          {lienDemande ? (
            <a href={lienDemande} target="_blank" rel="noopener"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-encre-700 hover:underline">
              <Whatsapp className="size-4" /> Poser une question sur WhatsApp
            </a>
          ) : null}

          {produit.description ? (
            <div className="mt-7 border-t border-encre-200 pt-6">
              <h2 className="font-semibold">Description</h2>
              <div className="mt-2.5 space-y-3 leading-relaxed text-encre-700">
                {produit.description.split(/\n{2,}/).filter(Boolean).map((bloc, i) => (
                  <p key={i}>{bloc}</p>
                ))}
              </div>
            </div>
          ) : null}

          {produit.caracteristiques.length > 0 ? (
            <div className="mt-6 border-t border-encre-200 pt-6">
              <h2 className="font-semibold">Caractéristiques</h2>
              <dl className="mt-3 divide-y divide-encre-100">
                {produit.caracteristiques.map((caract, i) => (
                  <div key={i} className="flex gap-4 py-2 text-sm">
                    <dt className="w-32 shrink-0 text-encre-500">{caract.nom}</dt>
                    <dd className="text-encre-800">{caract.valeur}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <p className="mt-6 text-xs leading-relaxed text-encre-500">
            Les informations de cette fiche sont fournies par {boutique.nom}.{" "}
            <Link href={`/b/${slug}/conditions`} className="underline">
              Conditions de vente et de livraison
            </Link>
          </p>
        </div>
      </div>

      {similaires.length > 0 ? (
        <section className="mt-14 border-t border-encre-200 pt-10">
          <h2 className={apparence.titre}>Dans la même catégorie</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similaires.map((p) => <CarteProduit key={p.id} produit={p} contexte={contexte} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
