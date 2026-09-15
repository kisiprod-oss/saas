import Link from "next/link";

/**
 * Les briques de l'espace d'administration.
 *
 * Chaque liste a besoin des memes quatre etats — chargement, vide, erreur,
 * reussite — et les ecrire quatre fois donne quatre variantes legerement
 * differentes. Ils sont donc ici, une bonne fois.
 */

export function Carte({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--adm-bord)] bg-white ${className}`}>
      {children}
    </div>
  );
}

export function TitrePage({
  titre, sous, action,
}: { titre: string; sous?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--adm-encre)]">{titre}</h1>
        {sous && <p className="mt-1 text-sm text-[var(--adm-encre-2)]">{sous}</p>}
      </div>
      {action}
    </div>
  );
}

/** Message de réussite ou d'échec, repris de l'adresse après une action. */
export function Message({ ok, erreur }: { ok?: string; erreur?: string }) {
  if (!ok && !erreur) return null;
  const rouge = Boolean(erreur);
  return (
    <p
      role={rouge ? "alert" : "status"}
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
        rouge
          ? "border-[#b3261e]/30 bg-[#b3261e]/10 text-[#7d1a15]"
          : "border-[#0f5546]/25 bg-[#0f5546]/10 text-[#0b3f34]"
      }`}
    >
      {erreur || ok}
    </p>
  );
}

/** Ce qu'on affiche quand il n'y a rien : jamais un tableau vide sans mot. */
export function ListeVide({ titre, texte, action }: { titre: string; texte: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden
           className="mb-3 h-10 w-10 text-[var(--adm-bord)]">
        <path d="M4 7h16v13H4zM4 7l2-3h12l2 3M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-semibold text-[var(--adm-encre)]">{titre}</p>
      <p className="mt-1 max-w-md text-sm text-[var(--adm-encre-2)]">{texte}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Etiquette({
  ton, children,
}: { ton: "vert" | "ambre" | "rouge" | "gris"; children: React.ReactNode }) {
  const tons = {
    vert: "bg-[#0f5546]/12 text-[#0b3f34] ring-[#0f5546]/25",
    ambre: "bg-[#eec477]/30 text-[#6b4a12] ring-[#b9892c]/35",
    rouge: "bg-[#b3261e]/10 text-[#7d1a15] ring-[#b3261e]/25",
    gris: "bg-black/5 text-[var(--adm-encre-2)] ring-black/10",
  };
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tons[ton]}`}>
      {children}
    </span>
  );
}

/** Pagination : les pages sont calculées côté serveur, jamais dans le navigateur. */
export function Pagination({
  page, pages, total, base,
}: { page: number; pages: number; total: number; base: URLSearchParams }) {
  if (pages <= 1) {
    return <p className="px-4 py-3 text-xs text-[var(--adm-encre-2)]">{total} résultat(s)</p>;
  }
  const lien = (p: number) => {
    const q = new URLSearchParams(base);
    q.set("page", String(p));
    return `?${q.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--adm-bord)] px-4 py-3">
      <p className="text-xs text-[var(--adm-encre-2)]">
        Page {page} sur {pages} · {total} résultat(s)
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={lien(page - 1)} className="rounded-lg border border-[var(--adm-bord)] px-3 py-1.5 text-sm font-medium hover:bg-black/5">
            Précédent
          </Link>
        )}
        {page < pages && (
          <Link href={lien(page + 1)} className="rounded-lg border border-[var(--adm-bord)] px-3 py-1.5 text-sm font-medium hover:bg-black/5">
            Suivant
          </Link>
        )}
      </div>
    </div>
  );
}

export function BoutonOr({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function BoutonSobre({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--adm-bord)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--adm-encre)] hover:bg-black/5"
    >
      {children}
    </button>
  );
}

/** Le tableau, avec son cadre et son défilement horizontal sur téléphone. */
export function Tableau({ entetes, children }: { entetes: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--adm-bord)] text-left">
            {entetes.map((e) => (
              <th key={e} scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--adm-encre-2)]">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--adm-bord)]">{children}</tbody>
      </table>
    </div>
  );
}
