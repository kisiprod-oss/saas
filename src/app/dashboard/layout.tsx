import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { estAdmin } from "@/lib/admin";
import {
  compterARelancer, compterDemandesNouvelles, compterPaiementsEnAttente,
  compterReservationsDemandes,
} from "@/lib/requetes";
import { actionDeconnexion } from "@/lib/actions";
import { NavLaterale } from "@/components/nav-laterale";
import { LogoSen } from "@/components/entete-public";
import { IconeContrat, IconeSortie } from "@/components/icones";

import type { Metadata } from "next";
import { NON_INDEXABLE } from "@/lib/seo";

/**
 * Espace prive : jamais dans un moteur de recherche.
 *
 * robots.txt le demande deja, mais cet en-tete l'impose meme si l'adresse
 * est decouverte autrement — par un lien partage, par exemple. Les pages
 * d'ici portent des noms, des telephones et des montants de loyer.
 */
export const metadata: Metadata = NON_INDEXABLE;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { utilisateur, agence } = await exigerSession();

  /**
   * LE GUIDE D'ABORD.
   *
   * Tant que l'agence n'a pas recu le guide d'utilisation, aucune page de
   * l'espace ne s'affiche. Le controle est pose ICI, dans la mise en page,
   * et non page par page : une mise en page couvre tout ce qui est range
   * dessous, y compris les ecrans ajoutes plus tard. Poser le controle sur
   * chaque page laisserait tot ou tard passer la prochaine.
   *
   * `/bienvenue` vit hors de ce dossier : sinon cette ligne la renverrait
   * vers elle-meme indefiniment.
   *
   * Ne concerne que les agences. Les locataires et les artisans ont leurs
   * propres espaces, leurs propres mises en page, et ce guide ne leur est
   * pas destine.
   */
  if (!agence.guide_telecharge_le) redirect("/bienvenue");

  const nouvellesDemandes = compterDemandesNouvelles(agence.id);
  const aRelancer = compterARelancer(agence.id);
  const paiementsEnAttente = compterPaiementsEnAttente(agence.id);
  const reservations = compterReservationsDemandes(agence.id);
  const administrateur = estAdmin(utilisateur.email);

  return (
    <div className="min-h-screen lg:flex">
      {/* ------------------------------ Barre laterale ------------------------------ */}
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link href="/dashboard"><LogoSen /></Link>
          <Link
            href="/"
            target="_blank"
            className="text-xs font-medium text-slate-400 hover:text-brand-700 lg:mt-3 lg:block"
          >
            Voir la vitrine publique ↗
          </Link>
        </div>

        <div className="px-2 pb-3 lg:px-3">
          <NavLaterale
            nouvellesDemandes={nouvellesDemandes}
            aRelancer={aRelancer}
            paiementsEnAttente={paiementsEnAttente}
            reservations={reservations}
          />
        </div>

        <div className="mt-auto hidden border-t border-slate-100 p-3 lg:block">
          {administrateur && (
            <Link
              href="/admin"
              className="mb-2 flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Administration
            </Link>
          )}
          {/* L'adresse de connexion, et pas seulement le nom.
              Elle decide de droits invisibles — l'acces a l'administration
              depend d'elle (voir estAdmin) — et personne ne pouvait la lire
              nulle part dans l'application. On cherchait « pourquoi je ne
              vois pas l'administration » sans pouvoir constater avec quel
              compte on etait entre. C'est aussi utile quand une agence a
              plusieurs utilisateurs : on sait qui est connecte. */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold text-slate-900">{utilisateur.nom}</p>
            <p className="truncate text-xs text-slate-500">{agence.nom}</p>
            <p className="mt-1 truncate text-xs text-slate-400" title={utilisateur.email}>
              {utilisateur.email}
            </p>
          </div>
          {/* Le guide reste a portee de clic. La page d'accueil le promet,
              et une agence qui a perdu le fichier ne doit pas avoir a
              ecrire pour le redemander. */}
          <a href="/api/guide" className="lien-nav mt-1 w-full">
            <IconeContrat className="h-5 w-5 shrink-0" /> Guide d&apos;utilisation
          </a>
          <form action={actionDeconnexion}>
            <button type="submit" className="lien-nav mt-1 w-full text-left">
              <IconeSortie className="h-5 w-5" /> Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      {/* -------------------------------- Contenu -------------------------------- */}
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-slate-900">{agence.nom}</p>
            <p className="text-xs text-slate-500">{utilisateur.nom}</p>
          </div>
          <form action={actionDeconnexion}>
            <button type="submit" className="btn-secondaire px-3 py-2">
              <IconeSortie className="h-4 w-4" />
            </button>
          </form>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
