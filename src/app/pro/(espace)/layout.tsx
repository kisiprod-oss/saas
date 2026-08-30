import Link from "next/link";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import { actionDeconnexionArtisan } from "@/lib/actions";
import { libelle, METIERS } from "@/lib/constantes";
import { LogoSen } from "@/components/entete-public";
import { IconeSortie } from "@/components/icones";

export default async function LayoutEspacePro({ children }: { children: React.ReactNode }) {
  const artisan = await exigerSessionArtisan();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-5">
            <Link href="/pro"><LogoSen /></Link>
            <nav className="hidden gap-4 text-sm font-medium text-slate-600 sm:flex">
              <Link href="/pro" className="hover:text-brand-700">Mon espace</Link>
              <Link href="/pro/devis" className="hover:text-brand-700">Mes devis</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{artisan.nom}</p>
              <p className="text-xs text-slate-500">{libelle(METIERS, artisan.metier)}</p>
            </div>
            <form action={actionDeconnexionArtisan}>
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
