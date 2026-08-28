import Link from "next/link";

export function LogoKeur({ clair = false }: { clair?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white shadow-sm">
        K
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${clair ? "text-white" : "text-slate-900"}`}>
        Keur<span className="text-brand-500">Gestion</span>
      </span>
    </span>
  );
}

export function EntetePublic() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/"><LogoKeur /></Link>
        <nav className="flex items-center gap-2">
          <Link href="/#annonces" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
            Les annonces
          </Link>
          <Link href="/connexion" className="btn-secondaire">Espace agence</Link>
          <Link href="/inscription" className="btn-primaire hidden sm:inline-flex">Créer mon agence</Link>
        </nav>
      </div>
    </header>
  );
}

export function PiedPublic() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <LogoKeur />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              La plateforme de gestion locative pensée pour les agences immobilières
              et les propriétaires au Sénégal.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Espace professionnel</p>
            <ul className="mt-2 space-y-1.5 text-slate-500">
              <li><Link href="/connexion" className="hover:text-brand-700">Se connecter</Link></li>
              <li><Link href="/inscription" className="hover:text-brand-700">Inscrire mon agence</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © {new Date().getFullYear()} Keur Gestion — Dakar, Sénégal. Montants en francs CFA (XOF).
        </p>
      </div>
    </footer>
  );
}
