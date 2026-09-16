import { notFound } from "next/navigation";
import { chargerBoutique } from "@/lib/boutique-publique";
import { apparenceDe } from "@/lib/modeles";
import { FormulaireSuivi } from "@/components/formulaire-suivi";

export const metadata = { title: "Suivre ma commande" };

export default async function PageSuivi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();
  const apparence = apparenceDe(chargee.boutique.modele);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className={apparence.titre}>Suivre ma commande</h1>
      <p className="mt-2 text-sm text-encre-600">
        Entrez la référence reçue à la commande et le numéro de téléphone que vous
        avez donné.
      </p>
      <div className="mt-6">
        <FormulaireSuivi slug={slug} />
      </div>
    </div>
  );
}
