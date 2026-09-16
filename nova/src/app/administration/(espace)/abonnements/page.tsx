import { exigerAdmin, abonnementsEnAttente } from "@/lib/admin";
import { GestionAbonnements } from "@/components/gestion-abonnements";
import { montant, dateHeureFr } from "@/lib/format";

export const metadata = { title: "Abonnements" };

export default async function PageAbonnements() {
  await exigerAdmin();
  const demandes = abonnementsEnAttente();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Abonnements en attente</h1>
        <p className="mt-1 text-sm text-encre-600">
          Le règlement n&apos;est pas automatisé : une demande reste en attente
          jusqu&apos;à ce que le paiement soit constaté, puis activée ici.
        </p>
      </header>

      {demandes.length === 0 ? (
        <div className="carte px-6 py-12 text-center text-encre-500">
          Aucune demande en attente.
        </div>
      ) : (
        <GestionAbonnements demandes={demandes.map((d) => ({
          id: d.id, boutique: d.boutique, boutiqueId: d.boutique_id,
          offre: d.offre, montant: montant(d.montant, "FCFA"),
          email: d.email, quand: dateHeureFr(d.cree_le),
        }))} />
      )}
    </div>
  );
}
