/** Pastille d'etat d'une candidature de professionnel. */
export function BadgeCandidature({ statut }: { statut: string }) {
  const style = statut === "valide" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
    : statut === "en_attente" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
    : "bg-rose-100 text-rose-800 ring-rose-600/20";
  const texte = statut === "valide" ? "Validée"
    : statut === "en_attente" ? "À examiner" : "Refusée";
  return <span className={`badge ${style}`}>{texte}</span>;
}
