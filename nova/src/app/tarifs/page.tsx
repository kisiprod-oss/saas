import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/coque-publique";
import { offresPubliques } from "@/lib/offres";
import { FOURNISSEURS, ETATS_LIBELLES } from "@/lib/paiements";
import { montant } from "@/lib/format";
import { Coche, Croix } from "@/components/icones";

export const metadata = {
  title: "Tarifs",
  description: "Les formules de NOVA Boutique, en francs CFA, et ce qu'elles incluent.",
};

export const dynamic = "force-dynamic";

/**
 * La page des tarifs.
 *
 * Les prix sont LUS EN BASE, comme ceux appliques par le serveur : un tarif
 * affiche ici ne peut pas differer de celui qui sera facture. Modifier un
 * prix dans l'administration change cette page immediatement.
 */
export default function PageTarifs() {
  const offres = offresPubliques();

  return (
    <>
      <EntetePublic />
      <main id="contenu" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="titre-page">Tarifs</h1>
        <p className="mt-3 max-w-2xl text-encre-600">
          Créer et essayer votre boutique est gratuit. Vous payez le jour où vous
          la mettez en ligne. Prix en francs CFA, par mois, sans engagement de durée.
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="sr-only">Comparaison des formules</caption>
            <thead>
              <tr>
                <th scope="col" className="w-48 px-4 py-3 text-left font-medium text-encre-500">
                  Ce qui est inclus
                </th>
                {offres.map((offre) => (
                  <th key={offre.code} scope="col" className="px-4 py-3 text-left">
                    <span className="block text-base font-bold text-encre-900">{offre.nom}</span>
                    <span className="mt-1 block text-lg font-bold text-vert-700">
                      {offre.prix_mensuel === 0 ? "Gratuit" : montant(offre.prix_mensuel, "FCFA")}
                    </span>
                    {offre.prix_mensuel > 0 ? (
                      <span className="block text-xs font-normal text-encre-500">par mois</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-encre-200 border-y border-encre-200">
              <Ligne titre="Produits" valeurs={offres.map((o) => String(o.max_produits))} />
              <Ligne titre="Générations IA par mois" valeurs={offres.map((o) => String(o.quota_ia))} />
              <Ligne titre="Boutique en ligne" valeurs={offres.map((o) => o.publication === 1)} />
              <Ligne titre="Adresse nova.shop" valeurs={offres.map((o) => o.publication === 1)} />
              <Ligne titre="Nom de domaine" valeurs={offres.map((o) => o.domaine_personnalise === 1)} />
              <Ligne titre="Personnes" valeurs={offres.map((o) => String(o.max_membres))} />
              <Ligne titre="Commandes" valeurs={offres.map(() => "Illimitées")} />
              <Ligne titre="Paiement à la livraison" valeurs={offres.map(() => true)} />
              <Ligne titre="Export des commandes" valeurs={offres.map(() => true)} />
            </tbody>
            <tfoot>
              <tr>
                <td />
                {offres.map((offre) => (
                  <td key={offre.code} className="px-4 py-5">
                    <Link href="/inscription" className="btn-principal w-full">Commencer</Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        <section className="mt-14">
          <h2 className="titre-page text-2xl">Ce qui n&apos;est pas compris</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="carte p-5">
              <h3 className="font-semibold text-encre-900">Les frais de votre prestataire de paiement</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-600">
                Quand vous encaissez en ligne, votre prestataire prélève sa commission
                sur chaque transaction. Elle va chez lui, pas chez nous : nous ne
                touchons rien sur vos ventes. Les montants dépendent du prestataire
                et de votre contrat avec lui.
              </p>
            </div>
            <div className="carte p-5">
              <h3 className="font-semibold text-encre-900">Votre nom de domaine</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-600">
                Si vous voulez votre propre adresse, vous l&apos;achetez chez un
                bureau d&apos;enregistrement. Nous vous aidons à la brancher ; nous ne
                la vendons pas.
              </p>
            </div>
            <div className="carte p-5">
              <h3 className="font-semibold text-encre-900">La livraison</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-600">
                Vous fixez vos zones et vos tarifs, et vous organisez vos livraisons.
                NOVA Boutique calcule et affiche les frais ; il ne livre pas.
              </p>
            </div>
            <div className="carte p-5">
              <h3 className="font-semibold text-encre-900">La photographie</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-600">
                Vos photos sont les vôtres. L&apos;application les compresse et les
                redimensionne, mais elle ne les prend pas à votre place.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="titre-page text-2xl">Moyens de paiement</h2>
          <p className="mt-3 max-w-2xl text-encre-600">
            Le paiement à la réception fonctionne dès le premier jour, sans rien
            brancher. Pour l&apos;encaissement en ligne, voici l&apos;état réel de
            chaque intégration :
          </p>
          <ul className="mt-5 space-y-3">
            {FOURNISSEURS.filter((f) => f.code !== "test").map((fournisseur) => (
              <li key={fournisseur.code} className="carte flex flex-wrap items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-encre-900">{fournisseur.nom}</span>
                    <span className={`puce ${ETATS_LIBELLES[fournisseur.etat].ton}`}>
                      {ETATS_LIBELLES[fournisseur.etat].texte}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-encre-600">{fournisseur.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 rounded-2xl bg-ivoire p-5 text-sm leading-relaxed text-encre-600">
          Ces tarifs sont ceux en vigueur aujourd&apos;hui sur cette installation.
          Ils peuvent évoluer ; vous serez prévenu avant tout changement sur votre
          formule en cours.
        </p>
      </main>
      <PiedPublic />
    </>
  );
}

function Ligne({ titre, valeurs }: { titre: string; valeurs: (string | boolean)[] }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left font-medium text-encre-700">{titre}</th>
      {valeurs.map((valeur, i) => (
        <td key={i} className="px-4 py-3">
          {typeof valeur === "boolean" ? (
            valeur
              ? <><Coche className="inline size-4 text-vert-600" /> <span className="sr-only">Inclus</span></>
              : <><Croix className="inline size-4 text-encre-300" /> <span className="sr-only">Non inclus</span></>
          ) : valeur}
        </td>
      ))}
    </tr>
  );
}
