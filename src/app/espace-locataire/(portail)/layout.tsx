import Link from "next/link";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { actionDeconnexionLocataire } from "@/lib/actions";
import { LogoSen } from "@/components/entete-public";
import { IconeSortie } from "@/components/icones";

export default async function LayoutEspaceLocataire({ children }: { children: React.ReactNode }) {
  const locataire = await exigerSessionLocataire();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/espace-locataire"><LogoSen /></Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {locataire.prenom} {locataire.nom}
            </span>
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
