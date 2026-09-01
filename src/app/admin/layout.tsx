import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import { compterCandidaturesEnAttente } from "@/lib/requetes";
import { LogoSen } from "@/components/entete-public";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { utilisateur } = await exigerAdmin();
  const enAttente = compterCandidaturesEnAttente();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-lg bg-white px-3 py-1.5"><LogoSen /></Link>
            <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-100">
              Administration
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/plateforme" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
              Vue d&apos;ensemble
            </Link>
            <Link href="/admin/candidatures" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
              Candidatures
              {enAttente > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">
                  {enAttente}
                </span>
              )}
            </Link>
            <Link href="/admin/quiz" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
              Questions
            </Link>
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:text-white">
              Quitter
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {children}
        <p className="mt-10 text-center text-xs text-slate-400">
          Connecté comme administrateur : {utilisateur.email}
        </p>
      </main>
    </div>
  );
}
