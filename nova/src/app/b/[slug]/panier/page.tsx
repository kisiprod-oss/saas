import { notFound } from "next/navigation";
import { chargerBoutique } from "@/lib/boutique-publique";
import { apparenceDe, texteSur } from "@/lib/modeles";
import { TunnelPanier } from "@/components/tunnel-panier";

export const metadata = { title: "Mon panier" };

export default async function PagePanier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { boutique, contexte } = chargee;
  const apparence = apparenceDe(boutique.modele);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className={apparence.titre}>Mon panier</h1>
      <div className="mt-6">
        <TunnelPanier
          slug={slug}
          couleur={contexte.couleur}
          texteCouleur={texteSur(contexte.couleur)}
          arrondi={apparence.arrondi}
          devise={contexte.devise}
          decimales={contexte.decimales}
        />
      </div>
    </div>
  );
}
