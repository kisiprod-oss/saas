import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { categories, nombreProduits } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { offreEnVigueur, peutAjouterProduit } from "@/lib/offres";
import { iaDistanteDisponible } from "@/lib/ia";
import { lireTaux, DEVISES_SOURCE } from "@/lib/devises";
import { historiqueImports } from "@/lib/import-produit";
import { ORIGINES_LIBELLES } from "@/lib/origines";
import { Importateur, ReglagesImport } from "@/components/importateur";
import { dateHeureFr } from "@/lib/format";
import { FlecheGauche } from "@/components/icones";

export const metadata = { title: "Importer un produit" };

/**
 * L'ecran d'import.
 *
 * Il met la PHOTO en premier, volontairement. C'est le chemin qui ne depend de
 * personne : la photo appartient au commercant, aucune place de marche ne peut
 * la refuser, et la fiche obtenue decrit ce qui est reellement sur l'image.
 * Le lien vient ensuite, avec ce qu'il faut savoir de ses limites.
 */
export default async function PageImporter() {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);
  const offre = offreEnVigueur(boutique);
  const place = peutAjouterProduit(boutique);
  const taux = lireTaux(boutique.taux_change);
  const total = nombreProduits(boutique.id);
  const passes = historiqueImports(boutique.id, 12);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/tableau-de-bord/produits"
        className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:text-vert-700">
        <FlecheGauche className="size-4" /> Produits
      </Link>

      <header>
        <h1 className="titre-page">Importer un produit</h1>
        <p className="mt-2 text-encre-600">
          Une photo de votre produit, ou l&apos;adresse d&apos;une fiche chez un
          fournisseur. L&apos;assistant prépare la fiche, vous la relisez, vous fixez
          votre prix.
        </p>
      </header>

      {!place.ok ? (
        <div className="message message-alerte">
          <div>
            {place.raison} Vous êtes à {total} produits sur {offre.max_produits}.{" "}
            <Link href="/tableau-de-bord/abonnement" className="font-semibold underline">
              Changer de formule
            </Link>
          </div>
        </div>
      ) : (
        <Importateur
          categories={categories(boutique.id).map((c) => ({ id: c.id, nom: c.nom }))}
          devise={pays.devise_libelle}
          iaDisponible={iaDistanteDisponible()}
          tauxSaisis={Object.keys(taux)}
          marge={boutique.marge_import}
          paysDevise={pays.devise}
        />
      )}

      <ReglagesImport
        devises={DEVISES_SOURCE.map((d) => ({ code: d.code, nom: d.nom, symbole: d.symbole }))}
        tauxActuels={taux}
        marge={boutique.marge_import}
        paysDevise={pays.devise}
        paysDeviseLibelle={pays.devise_libelle}
      />

      {passes.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Vos derniers imports</h2>
          <p className="mt-1 text-xs text-encre-500">
            Conservés pour retrouver d&apos;où vient un produit, et répondre si un
            fournisseur le demande.
          </p>
          <ul className="mt-3 divide-y divide-encre-100 text-sm">
            {passes.map((passe) => (
              // L'adresse prend sa propre ligne : sur un telephone, coincee
              // entre deux pastilles et une date, elle se reduisait a « h. »
              // et ne disait donc plus d'ou venait le produit.
              <li key={passe.id} className="space-y-1 py-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="puce puce-neutre">
                    {passe.source === "photo" ? "Photo" : ORIGINES_LIBELLES[passe.origine ?? "autre"] ?? "Lien"}
                  </span>
                  <span className={`puce ${
                    passe.statut === "accepte" ? "puce-vert"
                      : passe.statut === "echoue" ? "puce-rouge" : "puce-neutre"}`}>
                    {passe.statut === "accepte" ? "Ajouté"
                      : passe.statut === "echoue" ? "Échec"
                      : passe.statut === "abandonne" ? "Abandonné" : "Proposé"}
                  </span>
                  {passe.image_reprise ? <span className="puce puce-terre">Photo reprise</span> : null}
                  <span className="ml-auto text-xs text-encre-400">{dateHeureFr(passe.cree_le)}</span>
                </div>
                <p className="truncate font-mono text-xs text-encre-500"
                  title={passe.adresse ?? undefined}>
                  {passe.adresse ?? "Photo envoyée depuis votre appareil"}
                </p>
                {passe.erreur ? (
                  <p className="text-xs text-encre-500">{passe.erreur}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
