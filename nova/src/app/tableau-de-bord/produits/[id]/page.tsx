import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { produit as lireProduit, categories, variantes } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { quotaIa } from "@/lib/offres";
import { iaDistanteDisponible } from "@/lib/ia";
import { FormulaireProduit } from "@/components/formulaire-produit";
import { EditeurVariantes } from "@/components/editeur-variantes";
import { Message } from "@/components/ui";
import { FlecheGauche, Oeil } from "@/components/icones";
import { actionSupprimerProduit, actionSupprimerPhoto } from "@/lib/actions-catalogue";
import { Photo } from "@/components/ui";

export const metadata = { title: "Fiche produit" };

export default async function PageProduit({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { boutique } = await exigerSession();
  const { id } = await params;
  const { enregistre } = await searchParams;

  // `lireProduit` filtre sur boutique_id : un identifiant qui appartient a une
  // autre boutique donne 404, pas la fiche de quelqu'un d'autre.
  const produit = lireProduit(boutique.id, Number(id));
  if (!produit) notFound();

  const pays = paysDe(boutique.pays);
  const quota = quotaIa(boutique);
  const options = variantes(boutique.id, produit.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/tableau-de-bord/produits"
          className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:text-vert-700">
          <FlecheGauche className="size-4" /> Produits
        </Link>
        {boutique.publiee_le && produit.actif ? (
          <a href={`/b/${boutique.slug}/produit/${produit.slug}`} target="_blank" rel="noopener"
            className="btn-secondaire btn-petit">
            <Oeil className="size-4" /> Voir sur la boutique
          </a>
        ) : null}
      </div>

      <h1 className="titre-page">{produit.nom}</h1>

      {enregistre ? <Message ton="succes">Produit enregistré.</Message> : null}

      <FormulaireProduit
        produit={produit}
        categories={categories(boutique.id)}
        devise={pays.devise_libelle}
        iaDisponible={iaDistanteDisponible()}
        quotaRestant={quota.restant}
      />

      {/* Retirer une photo : action separee, car elle agit tout de suite
          alors que le reste du formulaire attend « Enregistrer ». */}
      {produit.photos.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Retirer une photo</h2>
          <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {produit.photos.map((fichier) => (
              <form key={fichier} action={actionSupprimerPhoto} className="space-y-1.5">
                <input type="hidden" name="id" value={produit.id} />
                <input type="hidden" name="fichier" value={fichier} />
                <div className="overflow-hidden rounded-xl border border-encre-200">
                  <Photo src={`/api/photo/${boutique.id}/v_${fichier}`} alt={`Photo de ${produit.nom}`} />
                </div>
                <button type="submit" className="w-full text-xs font-medium text-red-700 hover:underline">
                  Retirer
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <EditeurVariantes
        produitId={produit.id}
        libelle={produit.variante_libelle}
        variantes={options}
        devise={pays.devise_libelle}
      />

      <section className="carte border-red-200 p-5">
        <h2 className="titre-section text-red-800">Supprimer ce produit</h2>
        <p className="mt-1 text-sm text-encre-600">
          Le produit et ses photos disparaissent définitivement. Les commandes
          déjà passées gardent le nom et le prix du jour de l&apos;achat.
        </p>
        <form action={actionSupprimerProduit} className="mt-4">
          <input type="hidden" name="id" value={produit.id} />
          <button type="submit" className="btn-danger">Supprimer définitivement</button>
        </form>
      </section>
    </div>
  );
}
