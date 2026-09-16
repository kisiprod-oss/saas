import { notFound } from "next/navigation";
import { chargerBoutique } from "@/lib/boutique-publique";
import { apparenceDe, texteSur } from "@/lib/modeles";
import { TunnelCommande } from "@/components/tunnel-commande";

export const metadata = { title: "Ma commande" };

export default async function PageCommande({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { boutique, contexte } = chargee;
  const apparence = apparenceDe(boutique.modele);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className={apparence.titre}>Finaliser ma commande</h1>
      <p className="mt-2 text-sm text-encre-600">
        Pas de compte à créer. Quelques informations suffisent.
      </p>
      <div className="mt-7">
        <TunnelCommande
          slug={slug}
          nomBoutique={boutique.nom}
          couleur={contexte.couleur}
          texteCouleur={texteSur(contexte.couleur)}
          arrondi={apparence.arrondi}
        />
      </div>
    </div>
  );
}
