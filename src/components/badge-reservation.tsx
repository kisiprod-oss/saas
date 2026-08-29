/** Pastille d'etat d'une reservation, partagee par la liste et la fiche. */
export function BadgeReservation({ statut }: { statut: string }) {
  const style = statut === "confirmee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
    : statut === "demande" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
    : statut === "terminee" ? "bg-slate-100 text-slate-700 ring-slate-500/20"
    : "bg-rose-100 text-rose-800 ring-rose-600/20";
  const texte = statut === "confirmee" ? "Confirmée"
    : statut === "demande" ? "À traiter"
    : statut === "terminee" ? "Terminée" : "Annulée";
  return <span className={`badge ${style}`}>{texte}</span>;
}
