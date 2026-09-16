/**
 * Les trois familles de statuts d'une commande.
 *
 * Ce fichier est SANS « server-only » a dessein : les pages publiques et le
 * tableau de bord les affichent cote navigateur. Il ne contient que des
 * libelles — aucune logique metier, aucun acces a la base.
 *
 * Trois listes separees, et jamais une seule : « la commande est livree » ne
 * dit rien de « l'argent est arrive ». Confondre les deux, c'est afficher un
 * chiffre d'affaires qui n'existe pas.
 */

export const STATUTS_COMMANDE = [
  ["nouvelle", "Nouvelle"],
  ["confirmee", "Confirmée"],
  ["preparee", "Préparée"],
  ["expediee", "Expédiée"],
  ["livree", "Livrée"],
  ["annulee", "Annulée"],
] as const;

export const STATUTS_LIVRAISON = [
  ["a_preparer", "À préparer"],
  ["prete", "Prête"],
  ["en_route", "En route"],
  ["remise", "Remise au client"],
  ["echec", "Échec de livraison"],
  ["annulee", "Annulée"],
] as const;

export const STATUTS_PAIEMENT = [
  ["en_attente", "En attente"],
  ["partiel", "Partiel"],
  ["paye", "Payé"],
  ["rembourse", "Remboursé"],
  ["echoue", "Échoué"],
] as const;

export type CodeStatut = (typeof STATUTS_COMMANDE)[number][0];

export function libelle(liste: readonly (readonly [string, string])[], code: string): string {
  return liste.find(([c]) => c === code)?.[1] ?? code;
}

/** La couleur de pastille associee a un statut de commande. */
export function tonCommande(code: string): string {
  switch (code) {
    case "nouvelle": return "puce-bleu";
    case "confirmee": return "puce-bleu";
    case "preparee": return "puce-neutre";
    case "expediee": return "puce-terre";
    case "livree": return "puce-vert";
    case "annulee": return "puce-rouge";
    default: return "puce-neutre";
  }
}

export function tonPaiement(code: string): string {
  switch (code) {
    case "paye": return "puce-vert";
    case "partiel": return "puce-terre";
    case "echoue": return "puce-rouge";
    case "rembourse": return "puce-neutre";
    default: return "puce-neutre";
  }
}
