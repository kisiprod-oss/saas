import Link from "next/link";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { actionDeconnexionLocataire } from "@/lib/actions";
import { LogoSen } from "@/components/entete-public";
import { IconeSortie } from "@/components/icones";

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

export default async function LayoutEspaceLocataire({ children }: { children: React.ReactNode }) {
  const locataire = await exigerSessionLocataire();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/espace-locataire"><LogoSen /></Link>
          <div className="flex items-center gap-3">
            <Link
              href="/espace-locataire/profil"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              title="Ma photo et mes informations"
            >
              {locataire.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={locataire.photo_url}
                  alt=""
                  className="h-8 w-8 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {locataire.prenom.charAt(0)}{locataire.nom.charAt(0)}
                </span>
              )}
              <span className="hidden text-sm text-slate-500 sm:inline">
                {locataire.prenom} {locataire.nom}
              </span>
            </Link>
            <form action={actionDeconnexionLocataire}>
              <button type="submit" className="btn-secondaire px-3 py-2 text-sm">
                <IconeSortie className="h-4 w-4" /> Quitter
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
