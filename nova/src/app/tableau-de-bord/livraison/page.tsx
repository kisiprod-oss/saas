import { exigerSession } from "@/lib/auth";
import { zones } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { GestionLivraison } from "@/components/gestion-livraison";

export const metadata = { title: "Livraison" };

export default async function PageLivraison() {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="titre-page">Livraison et retrait</h1>
        <p className="mt-1 text-sm text-encre-600">
          Comment vos clients reçoivent leurs commandes, et ce que ça leur coûte.
        </p>
      </header>

      <GestionLivraison
        devise={pays.devise_libelle}
        reglages={{
          retraitActif: boutique.retrait_actif === 1,
          retraitAdresse: boutique.retrait_adresse,
          retraitHoraires: boutique.retrait_horaires,
          livraisonActive: boutique.livraison_active === 1,
          paiementLivraison: boutique.paiement_livraison === 1,
        }}
        zones={zones(boutique.id)}
      />
    </div>
  );
}
