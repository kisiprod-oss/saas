"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Embleme } from "./marque";
import {
  Maison, Panier, Boite, Points, Etiquette, Personnes, Boutique as IconeBoutique,
  Camion, Carte, Reglages, Etincelle, Graphique,
} from "./icones";

/**
 * La navigation de l'espace marchand.
 *
 * DEUX formes pour un seul jeu de liens :
 *
 *  — Sur ordinateur, une colonne à gauche, toujours visible.
 *  — Sur téléphone, QUATRE onglets en bas : Accueil, Commandes, Produits,
 *    Plus. Quatre, pas cinq : au-delà, les cibles passent sous 60 px de large
 *    et on tape à côté. Le reste vit derrière « Plus », qui est une vraie
 *    page et non un tiroir — un menu qui glisse est invisible pour qui ne
 *    sait pas qu'il existe.
 *
 * La barre du bas est `fixed` : elle reste atteignable au pouce quelle que
 * soit la longueur de la page.
 */

export type Entree = {
  href: string;
  libelle: string;
  icone: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export const RUBRIQUES: Entree[] = [
  { href: "/tableau-de-bord", libelle: "Accueil", icone: Maison },
  { href: "/tableau-de-bord/commandes", libelle: "Commandes", icone: Panier },
  { href: "/tableau-de-bord/produits", libelle: "Produits", icone: Boite },
  { href: "/tableau-de-bord/categories", libelle: "Catégories", icone: Etiquette },
  { href: "/tableau-de-bord/clients", libelle: "Clients", icone: Personnes },
  { href: "/tableau-de-bord/boutique", libelle: "Ma boutique", icone: IconeBoutique },
  { href: "/tableau-de-bord/statistiques", libelle: "Statistiques", icone: Graphique },
  { href: "/tableau-de-bord/livraison", libelle: "Livraison", icone: Camion },
  { href: "/tableau-de-bord/paiements", libelle: "Paiements", icone: Carte },
  { href: "/tableau-de-bord/abonnement", libelle: "Abonnement", icone: Etincelle },
  { href: "/tableau-de-bord/parametres", libelle: "Paramètres", icone: Reglages },
];

/** Les quatre onglets du téléphone. « Plus » mène à la liste complète. */
const ONGLETS: Entree[] = [
  { href: "/tableau-de-bord", libelle: "Accueil", icone: Maison },
  { href: "/tableau-de-bord/commandes", libelle: "Commandes", icone: Panier },
  { href: "/tableau-de-bord/produits", libelle: "Produits", icone: Boite },
  { href: "/tableau-de-bord/plus", libelle: "Plus", icone: Points },
];

function estActif(chemin: string, href: string): boolean {
  if (href === "/tableau-de-bord") return chemin === href;
  return chemin === href || chemin.startsWith(`${href}/`);
}

export function NavLaterale({
  nomBoutique, commandesATraiter,
}: { nomBoutique: string; commandesATraiter: number }) {
  const chemin = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-encre-200 bg-white lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <Link href="/tableau-de-bord"
          className="flex items-center gap-2.5 border-b border-encre-200 px-5 py-4">
          <Embleme className="size-7" />
          <span className="truncate text-sm font-bold text-encre-900">{nomBoutique}</span>
        </Link>

        <nav aria-label="Navigation de la boutique" className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {RUBRIQUES.map(({ href, libelle, icone: Icone }) => {
            const actif = estActif(chemin, href);
            return (
              <Link key={href} href={href}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                  ${actif ? "bg-vert-50 text-vert-800" : "text-encre-700 hover:bg-encre-100"}`}>
                <Icone className="size-5 shrink-0" />
                <span className="truncate">{libelle}</span>
                {href === "/tableau-de-bord/commandes" && commandesATraiter > 0 ? (
                  <span className="ml-auto rounded-full bg-terre-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {commandesATraiter > 99 ? "99+" : commandesATraiter}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function OngletsMobile({ commandesATraiter }: { commandesATraiter: number }) {
  const chemin = usePathname();

  return (
    <nav aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-encre-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="grid grid-cols-4">
        {ONGLETS.map(({ href, libelle, icone: Icone }) => {
          const actif = href === "/tableau-de-bord/plus"
            // « Plus » s'allume pour toutes les rubriques qui ne sont pas
            // dans les trois premiers onglets : sinon, on navigue dans une
            // page sans qu'aucun onglet ne soit marqué.
            ? !ONGLETS.slice(0, 3).some((o) => estActif(chemin, o.href))
            : estActif(chemin, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={actif ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium
                  ${actif ? "text-vert-700" : "text-encre-500"}`}>
                <Icone className="size-6" />
                {libelle}
                {href === "/tableau-de-bord/commandes" && commandesATraiter > 0 ? (
                  <span className="absolute right-[22%] top-2 min-w-4 rounded-full bg-terre-500 px-1 text-[10px] font-bold leading-4 text-white">
                    {commandesATraiter > 9 ? "9+" : commandesATraiter}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
