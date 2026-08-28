import Link from "next/link";
import { googleConfigure } from "@/lib/google";

/**
 * Bouton « Continuer avec Google ».
 *
 * Ne s'affiche que si les identifiants Google sont configures : sans eux, le
 * bouton menerait a une impasse. Le logo est dessine en SVG pour ne dependre
 * d'aucune image externe.
 */
export function BoutonGoogle({ libelle = "Continuer avec Google" }: { libelle?: string }) {
  if (!googleConfigure()) return null;

  return (
    <div className="mt-6">
      <Link
        href="/connexion/google"
        prefetch={false}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3
                   text-sm font-semibold text-slate-700 transition hover:bg-slate-50
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        <LogoGoogle />
        {libelle}
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">ou</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </div>
  );
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.2z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.09-5.5c-1.97 1.32-4.49 2.1-7.47 2.1-5.74 0-10.6-3.87-12.34-9.08H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.2c-.5-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.2C2.8 17 2 20.4 2 24s.8 7 2.2 9.9l7.4-5.7z" />
      <path fill="#EA4335" d="M24 10.7c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.3 2 7.8 6.9 4.2 14.1l7.4 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  );
}
