/**
 * Badge « Competence verifiee ».
 *
 * L'infobulle dit exactement ce que le badge prouve — et ce qu'il ne prouve
 * pas. Le test se passe sans surveillance : il ecarte ceux qui ne connaissent
 * pas leur metier, il ne garantit pas un bon chantier. Promettre davantage
 * tromperait celui qui choisit un artisan sur cette base.
 */
export function BadgeVerifie({
  score, total,
}: { score?: number | null; total?: number | null }) {
  const detail = score !== null && score !== undefined && total
    ? ` (${score}/${total})`
    : "";

  return (
    <span
      title={`Ce professionnel a réussi le test de connaissances de son métier${detail}. Le test se passe en ligne, sans surveillance : il atteste des bases du métier, pas de la qualité d'un chantier.`}
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"
           strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      Compétence vérifiée
    </span>
  );
}
