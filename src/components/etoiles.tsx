/**
 * Note en etoiles.
 *
 * Les demi-etoiles sont rendues par un decoupage en largeur plutot que par
 * une icone dediee : une moyenne de 4,3 doit se voir telle quelle, sans
 * etre arrondie a 4 ou a 4,5.
 */
export function Etoiles({
  note, nombre, taille = "normale",
}: { note: number; nombre?: number; taille?: "normale" | "grande" }) {
  const pleines = Math.max(0, Math.min(5, note));
  const dimension = taille === "grande" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span className="flex items-center gap-1.5">
      <span className="flex" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const remplissage = Math.max(0, Math.min(1, pleines - i));
          return (
            <span key={i} className={`relative ${dimension}`}>
              <Etoile className={`${dimension} absolute inset-0 text-slate-200`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${remplissage * 100}%` }}>
                <Etoile className={`${dimension} text-amber-400`} />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-sm font-semibold text-slate-700">
        {pleines.toFixed(1).replace(".", ",")}
      </span>
      {nombre !== undefined && (
        <span className="text-xs text-slate-400">
          ({nombre} avis)
        </span>
      )}
      <span className="sr-only">{pleines.toFixed(1)} sur 5</span>
    </span>
  );
}

function Etoile({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />
    </svg>
  );
}
