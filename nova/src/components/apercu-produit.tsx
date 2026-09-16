/**
 * L'aperçu du produit sur la page d'accueil : un écran d'ordinateur et un
 * téléphone, côte à côte.
 *
 * Ce n'est pas une capture d'écran retouchée, et ce n'est pas un dessin
 * flatteur : c'est le vrai gabarit du tableau de bord et de la boutique,
 * rendu en HTML avec les mêmes couleurs et les mêmes composants. Les chiffres
 * affichés sont ceux de la boutique de démonstration (« Chez Awa »), et le
 * cadre le dit explicitement.
 *
 * L'intérêt : le jour où le tableau de bord change, cet aperçu jure, et on le
 * met à jour. Une capture PNG, elle, reste fausse pendant des mois sans que
 * personne s'en aperçoive.
 */

import { Boite, Panier, Graphique, Etincelle, Maison, Points } from "./icones";

function Barre({ largeur, ton = "bg-encre-200" }: { largeur: string; ton?: string }) {
  return <div className={`h-2 rounded-full ${ton}`} style={{ width: largeur }} />;
}

export function ApercuProduit() {
  return (
    <div className="relative" aria-label="Aperçu de NOVA Boutique sur ordinateur et sur téléphone" role="img">
      {/* ------------------------- Ordinateur ------------------------- */}
      <div className="overflow-hidden rounded-2xl border border-encre-200 bg-white shadow-[0_18px_50px_-24px_rgba(31,36,33,0.35)]">
        {/* barre de fenêtre */}
        <div className="flex items-center gap-2 border-b border-encre-200 bg-ivoire px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-encre-300" />
          <span className="size-2.5 rounded-full bg-encre-300" />
          <span className="size-2.5 rounded-full bg-encre-300" />
          <div className="ml-3 flex-1 rounded-md bg-white px-2.5 py-1 text-[11px] text-encre-500">
            chez-awa.nova.shop
          </div>
        </div>

        <div className="flex">
          {/* Colonne de navigation. Masquée sous 1280 px : la maquette doit
              rester lisible, et les chiffres comptent plus que le décor. */}
          <aside className="hidden w-44 shrink-0 border-r border-encre-200 bg-white p-3 xl:block">
            <div className="flex items-center gap-2 rounded-lg bg-vert-50 px-2.5 py-2 text-xs font-semibold text-vert-800">
              <Maison className="size-4" /> Accueil
            </div>
            {[
              { i: Panier, t: "Commandes" },
              { i: Boite, t: "Produits" },
              { i: Graphique, t: "Statistiques" },
              { i: Etincelle, t: "Ma boutique" },
            ].map(({ i: Icone, t }) => (
              <div key={t} className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-encre-600">
                <Icone className="size-4" /> {t}
              </div>
            ))}
          </aside>

          {/* contenu — la marge droite réserve la place du téléphone, qui se
              superpose au coin de la maquette sans masquer les chiffres. */}
          <div className="flex-1 space-y-3 p-4 sm:pr-40 xl:pr-32">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-encre-900">Bonjour Awa</p>
                <p className="text-[11px] text-encre-500">Voici vos commandes du jour</p>
              </div>
              <span className="rounded-lg bg-vert-700 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                Ajouter un produit
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { t: "À traiter", v: "3", ton: "text-encre-900" },
                { t: "Encaissé ce mois", v: "84 000", ton: "text-vert-700" },
                { t: "Non payé", v: "31 500", ton: "text-terre-600" },
              ].map((tuile) => (
                <div key={tuile.t} className="rounded-xl border border-encre-200 p-2.5">
                  <p className="text-[10px] text-encre-500">{tuile.t}</p>
                  <p className={`mt-0.5 text-base font-bold ${tuile.ton}`}>{tuile.v}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-encre-200">
              <div className="flex items-center justify-between border-b border-encre-200 px-3 py-2">
                <p className="text-[11px] font-semibold text-encre-800">Dernières commandes</p>
                <Points className="size-4 text-encre-400" />
              </div>
              {[
                { r: "CMD-7K2M9", n: "Fatou D.", m: "18 500", e: "Nouvelle", ton: "bg-sky-100 text-sky-900" },
                { r: "CMD-4Q8XT", n: "Moussa S.", m: "9 000", e: "Payée", ton: "bg-vert-100 text-vert-800" },
                { r: "CMD-2B6LP", n: "Aïssatou N.", m: "31 500", e: "À livrer", ton: "bg-terre-100 text-terre-700" },
              ].map((ligne) => (
                <div key={ligne.r} className="flex items-center gap-3 border-b border-encre-100 px-3 py-2 last:border-0">
                  <span className="w-20 shrink-0 text-[10px] font-mono text-encre-500">{ligne.r}</span>
                  <span className="flex-1 truncate text-[11px] text-encre-800">{ligne.n}</span>
                  <span className="text-[11px] font-semibold text-encre-900">{ligne.m} F</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ligne.ton}`}>
                    {ligne.e}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------- Téléphone ------------------------- */}
      <div className="absolute -bottom-6 right-2 hidden w-32 overflow-hidden rounded-[1.75rem] border-[6px] border-encre-900 bg-craie shadow-2xl sm:block xl:-right-8 xl:w-36">
        <div className="bg-vert-700 px-3 pb-4 pt-3 text-white">
          <p className="text-[11px] font-bold">Chez Awa</p>
          <p className="mt-0.5 text-[9px] opacity-80">Pagnes et accessoires · Dakar</p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-encre-200 bg-white">
              <div className="aspect-square bg-ivoire" />
              <div className="space-y-1 p-1.5">
                <Barre largeur="80%" />
                <div className="h-2.5 w-12 rounded bg-vert-600" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-around border-t border-encre-200 bg-white py-1.5">
          {[Maison, Panier, Boite, Points].map((Icone, i) => (
            <Icone key={i} className={`size-4 ${i === 0 ? "text-vert-700" : "text-encre-300"}`} />
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-encre-500 sm:mt-6 sm:text-left">
        Aperçu du tableau de bord et de la boutique publique, avec les données de la
        boutique de démonstration.
      </p>
    </div>
  );
}
