import { exigerAdmin } from "@/lib/admin";
import { toutesLesOffres } from "@/lib/offres";
import { EditeurOffre } from "@/components/editeur-offre";

export const metadata = { title: "Offres" };

/**
 * Les formules, modifiables sans redeployer.
 *
 * Les tarifs du cahier des charges (5 000 / 12 500 / 25 000 FCFA) sont des
 * hypotheses de depart. Ils vivent en base, se reglent ici, et la page
 * publique des tarifs les relit a chaque affichage : aucun risque qu'un prix
 * annonce diffère d'un prix applique.
 */
export default async function PageOffres() {
  await exigerAdmin();
  const offres = toutesLesOffres();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Offres</h1>
        <p className="mt-1 text-sm text-encre-600">
          Ce qui est enregistré ici est ce qui s&apos;affiche sur le site public et
          ce qui est appliqué comme limite côté serveur.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {offres.map((offre) => (
          <EditeurOffre key={offre.code} offre={{
            code: offre.code, nom: offre.nom, prix: offre.prix_mensuel,
            maxProduits: offre.max_produits, quotaIa: offre.quota_ia,
            maxMembres: offre.max_membres,
            domaine: offre.domaine_personnalise === 1,
            publication: offre.publication === 1,
            accroche: offre.accroche, actif: offre.actif === 1,
          }} />
        ))}
      </div>
    </div>
  );
}
