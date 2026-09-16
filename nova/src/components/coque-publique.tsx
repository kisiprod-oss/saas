import Link from "next/link";
import { Logo } from "./marque";
import { sessionEventuelle } from "@/lib/auth";

/**
 * L'en-tête et le pied de page du site commercial.
 *
 * L'en-tête s'adapte : un visiteur voit « Se connecter » et « Créer ma
 * boutique » ; un commerçant déjà connecté voit un raccourci vers son tableau
 * de bord. Rien n'est plus agaçant qu'un site qui propose de s'inscrire à
 * quelqu'un qui est déjà client.
 */

const LIENS = [
  { href: "/#fonctionnalites", libelle: "Fonctionnalités" },
  { href: "/demonstration", libelle: "Démonstrations" },
  { href: "/tarifs", libelle: "Tarifs" },
  { href: "/aide", libelle: "Questions" },
];

export async function EntetePublic() {
  const session = await sessionEventuelle();

  return (
    <header className="sticky top-0 z-40 border-b border-encre-200/80 bg-craie/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Navigation principale" className="ml-auto hidden items-center gap-1 lg:flex">
          {LIENS.map((lien) => (
            <Link key={lien.href} href={lien.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-encre-700 hover:bg-encre-100">
              {lien.libelle}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {session ? (
            <Link href="/tableau-de-bord" className="btn-principal btn-petit sm:btn-principal">
              Mon tableau de bord
            </Link>
          ) : (
            <>
              <Link href="/connexion"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-encre-800 hover:bg-encre-100 sm:block">
                Se connecter
              </Link>
              <Link href="/inscription" className="btn-principal btn-petit sm:min-h-11 sm:px-4 sm:text-sm">
                Créer ma boutique
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Sur mobile, les liens passent sous l'en-tête en bande défilante :
          pas de menu caché derrière un bouton, donc rien à découvrir. */}
      <nav aria-label="Sections du site"
        className="flex gap-1 overflow-x-auto border-t border-encre-200/70 px-3 py-1.5 lg:hidden">
        {LIENS.map((lien) => (
          <Link key={lien.href} href={lien.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-encre-700 hover:bg-encre-100">
            {lien.libelle}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function PiedPublic() {
  const annee = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-encre-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-encre-600">
            NOVA Boutique aide un commerçant à ouvrir sa boutique en ligne depuis son
            téléphone, et à suivre ses commandes. Service lancé au Sénégal.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-encre-900">Le produit</h2>
          <ul className="mt-3 space-y-2 text-sm text-encre-600">
            <li><Link href="/#fonctionnalites" className="hover:text-vert-700">Fonctionnalités</Link></li>
            <li><Link href="/demonstration" className="hover:text-vert-700">Démonstrations</Link></li>
            <li><Link href="/tarifs" className="hover:text-vert-700">Tarifs</Link></li>
            <li><Link href="/aide" className="hover:text-vert-700">Questions fréquentes</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-encre-900">Votre compte</h2>
          <ul className="mt-3 space-y-2 text-sm text-encre-600">
            <li><Link href="/inscription" className="hover:text-vert-700">Créer ma boutique</Link></li>
            <li><Link href="/connexion" className="hover:text-vert-700">Se connecter</Link></li>
            <li><Link href="/mot-de-passe-oublie" className="hover:text-vert-700">Mot de passe oublié</Link></li>
            <li><Link href="/conditions" className="hover:text-vert-700">Conditions d&apos;utilisation</Link></li>
            <li><Link href="/confidentialite" className="hover:text-vert-700">Données personnelles</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-encre-200 px-4 py-5 text-center text-xs text-encre-500 sm:px-6">
        © {annee} NOVA Boutique. Les boutiques présentées en exemple sont des
        démonstrations, créées par nos soins.
      </div>
    </footer>
  );
}
