import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { RUBRIQUES } from "@/components/coque-marchand";
import { resume } from "@/lib/requetes";
import { offreEnVigueur } from "@/lib/offres";
import { actionDeconnexion } from "@/lib/actions-compte";
import { Fleche } from "@/components/icones";

export const metadata = { title: "Plus" };

/**
 * La page « Plus » du telephone.
 *
 * Elle existe parce que quatre onglets ne suffisent pas a dix rubriques, et
 * qu'un tiroir qui glisse depuis le bord est invisible pour qui ne sait pas
 * qu'il existe. Ici, tout est ecrit, atteignable au pouce, et la page se lit
 * comme un sommaire.
 *
 * Sur ordinateur, la colonne de gauche rend cette page inutile : elle reste
 * accessible, mais personne n'a besoin d'y aller.
 */
export default async function PagePlus() {
  const { boutique, utilisateur } = await exigerSession();
  const chiffres = resume(boutique.id);
  const offre = offreEnVigueur(boutique);

  // On retire les trois rubriques deja presentes dans la barre d'onglets.
  const autres = RUBRIQUES.filter(
    (r) => !["/tableau-de-bord", "/tableau-de-bord/commandes", "/tableau-de-bord/produits"]
      .includes(r.href),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="titre-page">{boutique.nom}</h1>
        <p className="mt-1 text-sm text-encre-600">
          Formule {offre.nom} · {utilisateur.nom}
        </p>
      </header>

      <nav aria-label="Toutes les rubriques">
        <ul className="carte divide-y divide-encre-100 overflow-hidden">
          {autres.map(({ href, libelle, icone: Icone }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-encre-50">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-vert-50 text-vert-700">
                  <Icone className="size-5" />
                </span>
                <span className="flex-1 font-medium text-encre-900">{libelle}</span>
                {href === "/tableau-de-bord/commandes" && chiffres.aTraiter > 0 ? (
                  <span className="rounded-full bg-terre-500 px-2 py-0.5 text-xs font-bold text-white">
                    {chiffres.aTraiter}
                  </span>
                ) : null}
                <Fleche className="size-4 text-encre-300" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="carte overflow-hidden">
        <a href={`/b/${boutique.slug}`} target="_blank" rel="noopener"
          className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-encre-50">
          <span className="flex-1 font-medium text-encre-900">Voir ma boutique</span>
          <Fleche className="size-4 text-encre-300" />
        </a>
      </div>

      <form action={actionDeconnexion}>
        <button type="submit" className="btn-secondaire w-full">Se déconnecter</button>
      </form>

      <p className="text-center text-xs text-encre-500">
        NOVA Boutique · <Link href="/conditions" className="hover:text-vert-700">Conditions</Link>
        {" · "}
        <Link href="/confidentialite" className="hover:text-vert-700">Données personnelles</Link>
      </p>
    </div>
  );
}
