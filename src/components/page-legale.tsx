import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { mentionsIncompletes } from "@/lib/editeur";

/** Mise en page commune aux pages legales. */
export function PageLegale({
  titre, miseAJour, children,
}: { titre: string; miseAJour: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <EntetePublic />

      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{titre}</h1>
        <p className="mt-2 text-sm text-slate-500">Dernière mise à jour : {miseAJour}</p>

        {mentionsIncompletes() && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Document non finalisé.</strong> Certaines informations de l&apos;éditeur
            restent à renseigner dans <code className="rounded bg-amber-100 px-1">src/lib/editeur.ts</code>,
            et ce texte doit être relu par un juriste avant la mise en ligne.
          </div>
        )}

        <div className="mt-8 space-y-8">{children}</div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm">
          <Link href="/mentions-legales" className="text-brand-700 hover:underline">Mentions légales</Link>
          <Link href="/confidentialite" className="text-brand-700 hover:underline">Confidentialité</Link>
          <Link href="/cgu" className="text-brand-700 hover:underline">Conditions d&apos;utilisation</Link>
        </div>
      </main>

      <PiedPublic />
    </div>
  );
}

export function Article({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-900">{titre}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}
