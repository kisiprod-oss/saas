import Link from "next/link";
import { Logo } from "./marque";

/**
 * Le cadre des pages de compte (connexion, inscription, mot de passe).
 *
 * Une colonne centree sur mobile, deux colonnes sur grand ecran : le
 * formulaire a gauche, un rappel de ce qu'on obtient a droite. Le rappel
 * disparait sous 1024 px, ou l'espace doit aller au formulaire.
 */
export function CadreCompte({
  titre, sous_titre, children, aside,
}: {
  titre: string; sous_titre?: string; children: React.ReactNode; aside?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1fr_1fr]">
      <main id="contenu" className="flex flex-col px-4 py-8 sm:px-8">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="titre-page">{titre}</h1>
          {sous_titre ? <p className="mt-2 text-encre-600">{sous_titre}</p> : null}
          <div className="mt-7">{children}</div>
        </div>
        <p className="text-center text-xs text-encre-500">
          <Link href="/" className="hover:text-vert-700">Retour au site</Link>
          {" · "}
          <Link href="/conditions" className="hover:text-vert-700">Conditions</Link>
        </p>
      </main>

      {aside ? (
        <aside className="hidden bg-vert-700 p-12 text-white lg:flex lg:flex-col lg:justify-center">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
