import Link from "next/link";

/**
 * La marque de l'application, sous deux formes tirees du meme fichier.
 *
 * `LogoSen` : l'embleme rond suivi du nom, pour les barres de navigation,
 * ou la hauteur disponible est celle d'une ligne de texte. Le nom y est du
 * vrai texte — net a toutes les tailles, et lisible par les lecteurs
 * d'ecran ; l'embleme n'a donc pas de texte de remplacement, il ferait
 * doublon.
 *
 * `LogoSenComplet` : le verrou entier, embleme + nom + slogan, pour les
 * pages de connexion ou il y a la place de le montrer en grand. En dessous
 * d'environ 180 px de large, son slogan devient illisible : c'est pourquoi
 * il ne sert pas dans les en-tetes.
 */
export function LogoSen() {
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/embleme-sen-gestion.webp"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 object-contain"
      />
      <span className="text-lg font-extrabold tracking-tight text-logo-marine">
        Sen<span className="text-logo-vert">Gestion</span>
      </span>
    </span>
  );
}

export function LogoSenComplet({ className = "max-w-[220px]" }: { className?: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/logo-sen-gestion.webp"
      alt="Sen Gestion — gérer aujourd'hui, valoriser demain"
      width={1156}
      height={888}
      className={`h-auto w-full ${className}`}
    />
  );
}

export function EntetePublic() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/"><LogoSen /></Link>
        <nav className="flex items-center gap-2">
          <Link href="/#annonces" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
            Les annonces
          </Link>
          <Link href="/tarifs" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
            Tarifs
          </Link>
          <Link href="/professionnels" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
            Professionnels
          </Link>
          <Link href="/espace-locataire/connexion" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-700 sm:block">
            Espace locataire
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
            <LogoSen />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              La plateforme de gestion locative pensée pour les agences immobilières
              et les propriétaires au Sénégal.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Espace professionnel</p>
            <ul className="mt-2 space-y-1.5 text-slate-500">
              <li><Link href="/tarifs" className="hover:text-brand-700">Tarifs et formules</Link></li>
              <li><Link href="/professionnels" className="hover:text-brand-700">Artisans et professionnels</Link></li>
              <li><Link href="/connexion" className="hover:text-brand-700">Se connecter</Link></li>
              <li><Link href="/inscription" className="hover:text-brand-700">Inscrire mon agence</Link></li>
              <li><Link href="/espace-locataire/connexion" className="hover:text-brand-700">Espace locataire</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Sen Gestion — Dakar, Sénégal. Montants en francs CFA (XOF).
          </p>
          <nav className="flex flex-wrap gap-4 text-xs text-slate-500">
            <Link href="/mentions-legales" className="hover:text-brand-700">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-brand-700">Confidentialité</Link>
            <Link href="/cgu" className="hover:text-brand-700">Conditions d&apos;utilisation</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
