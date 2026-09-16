import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { resume } from "@/lib/requetes";
import { NavLaterale, OngletsMobile } from "@/components/coque-marchand";
import { actionDeconnexion } from "@/lib/actions-compte";
import { Embleme } from "@/components/marque";
import { Oeil, Lien as IconeLien } from "@/components/icones";

/**
 * La coque de l'espace marchand.
 *
 * Elle fait UNE chose avant tout le reste : `exigerSession()`. Toute page
 * placee sous /tableau-de-bord herite donc du controle d'acces, et aucune
 * page ne peut l'oublier. Le `boutique_id` utilise partout en dessous vient
 * de la session, jamais de l'URL.
 */
export default async function LayoutMarchand({ children }: { children: React.ReactNode }) {
  const { utilisateur, boutique } = await exigerSession();

  // Tant que l'assistant de creation n'est pas fini, le tableau de bord n'a
  // rien a montrer : on renvoie la ou le travail a ete laisse.
  if (!boutique.assistant_fini_le) redirect("/creer");

  const chiffres = resume(boutique.id);
  const enLigne = Boolean(boutique.publiee_le);

  return (
    <div className="flex min-h-dvh bg-craie">
      <NavLaterale nomBoutique={boutique.nom} commandesATraiter={chiffres.aTraiter} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tete : sur mobile il porte le nom de la boutique et son etat ;
            sur ordinateur, l'adresse publique et la deconnexion. */}
        <header className="sticky top-0 z-30 border-b border-encre-200 bg-craie/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Embleme className="size-7 lg:hidden" />
            <div className="min-w-0 flex-1 lg:flex lg:items-center lg:gap-3">
              <p className="truncate text-sm font-semibold text-encre-900 lg:hidden">
                {boutique.nom}
              </p>
              {enLigne ? (
                <a href={`/b/${boutique.slug}`} target="_blank" rel="noopener"
                  className="hidden items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 font-mono text-xs text-encre-600 ring-1 ring-encre-200 hover:text-vert-700 lg:inline-flex">
                  <IconeLien className="size-3.5" />
                  {boutique.slug}.nova.shop
                </a>
              ) : (
                <span className="hidden puce puce-terre lg:inline-flex">Boutique non publiée</span>
              )}
            </div>

            <Link href={`/b/${boutique.slug}?apercu=1`} target="_blank" rel="noopener"
              className="btn-secondaire btn-petit" title="Voir la boutique telle que la voient vos clients">
              <Oeil className="size-4" />
              <span className="hidden sm:inline">Voir ma boutique</span>
            </Link>

            <form action={actionDeconnexion}>
              <button type="submit" className="btn-discret btn-petit">Quitter</button>
            </form>
          </div>

          {/* Bandeau d'etat : un brouillon doit se rappeler a son proprietaire. */}
          {!enLigne ? (
            <div className="border-t border-terre-200 bg-terre-50 px-4 py-2 text-xs text-terre-700 sm:px-6">
              Votre boutique est un brouillon : personne d&apos;autre que vous ne la voit.{" "}
              <Link href="/tableau-de-bord/boutique" className="font-semibold underline">
                La publier
              </Link>
            </div>
          ) : null}
        </header>

        {/* pb-24 : la barre d'onglets du mobile ne doit pas recouvrir le
            dernier bouton de la page. */}
        <main id="contenu" className="flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>

        <p className="sr-only">Connecté en tant que {utilisateur.nom}</p>
      </div>

      <OngletsMobile commandesATraiter={chiffres.aTraiter} />
    </div>
  );
}
