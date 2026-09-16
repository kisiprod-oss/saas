import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/coque-publique";
import { boutiquesDemonstration } from "@/lib/requetes";
import { nombreProduits } from "@/lib/requetes";
import { Oeil, Alerte } from "@/components/icones";

export const metadata = {
  title: "Démonstrations",
  description: "Des boutiques d'exemple créées par l'équipe NOVA Boutique.",
};

export const dynamic = "force-dynamic";

/**
 * Les boutiques de demonstration.
 *
 * Elles sont creees par le script `npm run seed` et marquees
 * `demonstration = 1` en base. Elles sont presentees comme telles PARTOUT :
 * ici, sur la page d'accueil, et dans la liste de l'administration. Un
 * visiteur ne doit jamais croire qu'il regarde le commerce de quelqu'un.
 */
export default function PageDemonstration() {
  const boutiques = boutiquesDemonstration();

  return (
    <>
      <EntetePublic />
      <main id="contenu" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="titre-page">Boutiques de démonstration</h1>
        <p className="mt-3 max-w-2xl text-encre-600">
          Ces boutiques ont été créées par notre équipe pour montrer le résultat.
        </p>

        <div className="mt-6 message message-alerte">
          <Alerte className="mt-0.5 size-4.5 shrink-0" />
          <div>
            <p className="font-semibold">Ce ne sont pas de vrais commerces</p>
            <p className="mt-0.5">
              Les noms, les produits, les prix et les photos sont inventés pour
              l&apos;exemple. Ne passez pas commande : personne ne vous livrera.
            </p>
          </div>
        </div>

        {boutiques.length === 0 ? (
          <div className="mt-10 carte px-6 py-12 text-center">
            <p className="font-medium text-encre-900">
              Les démonstrations ne sont pas installées sur ce serveur
            </p>
            <p className="mt-1.5 text-sm text-encre-600">
              Lancez <code className="rounded bg-ivoire px-1.5 py-0.5 font-mono text-xs">npm run seed</code>{" "}
              pour les créer.
            </p>
            <Link href="/inscription" className="btn-principal mt-5">Créer ma boutique</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {boutiques.map((boutique) => (
              <article key={boutique.id} className="carte overflow-hidden">
                <div className="h-32" style={{ backgroundColor: boutique.couleur }} />
                <div className="p-5">
                  <span className="puce puce-neutre">Démonstration</span>
                  <h2 className="mt-2.5 font-semibold text-encre-900">{boutique.nom}</h2>
                  <p className="mt-1 text-sm text-encre-600">
                    {boutique.description ?? "Boutique d'exemple."}
                  </p>
                  <p className="mt-2 text-xs text-encre-500">
                    {nombreProduits(boutique.id)} produits ·{" "}
                    {boutique.ville ?? "Sénégal"} · modèle {boutique.modele}
                  </p>
                  <Link href={`/b/${boutique.slug}`} className="btn-secondaire mt-4 w-full">
                    <Oeil className="size-4" /> Ouvrir la boutique
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl bg-vert-700 px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-white">La vôtre en quelques minutes</h2>
          <p className="mx-auto mt-2 max-w-md text-vert-100">
            Vous partez de vos photos, l&apos;assistant fait le reste.
          </p>
          <Link href="/inscription"
            className="btn mt-6 min-h-11 rounded-xl bg-white px-6 font-semibold text-vert-800 hover:bg-vert-50">
            Créer ma boutique
          </Link>
        </div>
      </main>
      <PiedPublic />
    </>
  );
}
