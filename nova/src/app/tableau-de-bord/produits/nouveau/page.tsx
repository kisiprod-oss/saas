import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { categories } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { peutAjouterProduit, quotaIa } from "@/lib/offres";
import { iaDistanteDisponible } from "@/lib/ia";
import { FormulaireProduit } from "@/components/formulaire-produit";
import { RaccourciImport } from "@/components/importateur";
import { FlecheGauche } from "@/components/icones";

export const metadata = { title: "Nouveau produit" };

export default async function PageNouveauProduit() {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);
  const place = peutAjouterProduit(boutique);
  const quota = quotaIa(boutique);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/tableau-de-bord/produits"
        className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:text-vert-700">
        <FlecheGauche className="size-4" /> Produits
      </Link>
      <h1 className="titre-page">Ajouter un produit</h1>

      {!place.ok ? (
        <div className="message message-alerte">
          <div>
            {place.raison} Vos produits actuels restent en vente.{" "}
            <Link href="/tableau-de-bord/abonnement" className="font-semibold underline">
              Changer de formule
            </Link>
          </div>
        </div>
      ) : (
        <>
          <RaccourciImport />
          <p className="text-center text-sm text-encre-500">ou remplissez la fiche vous-même</p>
            <FormulaireProduit
            categories={categories(boutique.id)}
            devise={pays.devise_libelle}
            iaDisponible={iaDistanteDisponible()}
            quotaRestant={quota.restant}
          />
        </>
      )}
    </div>
  );
}
