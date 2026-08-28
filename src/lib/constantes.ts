/** Listes de reference utilisees dans toute l'application. */

export const TYPES_BIEN = [
  { valeur: "appartement",      libelle: "Appartement" },
  { valeur: "villa",            libelle: "Villa" },
  { valeur: "maison",           libelle: "Maison" },
  { valeur: "duplex",           libelle: "Duplex" },
  { valeur: "studio",           libelle: "Studio" },
  { valeur: "chambre",          libelle: "Chambre" },
  { valeur: "bureau",           libelle: "Bureau" },
  { valeur: "local_commercial", libelle: "Local commercial" },
  { valeur: "magasin",          libelle: "Magasin" },
  { valeur: "terrain",          libelle: "Terrain" },
] as const;

export const STATUTS_BIEN = [
  { valeur: "disponible", libelle: "Disponible", couleur: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" },
  { valeur: "loue",       libelle: "Loué",       couleur: "bg-blue-100 text-blue-800 ring-blue-600/20" },
  { valeur: "reserve",    libelle: "Réservé",    couleur: "bg-amber-100 text-amber-800 ring-amber-600/20" },
  { valeur: "travaux",    libelle: "En travaux", couleur: "bg-slate-200 text-slate-700 ring-slate-600/20" },
] as const;

export const STATUTS_CONTRAT = [
  { valeur: "actif",   libelle: "Actif",    couleur: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" },
  { valeur: "termine", libelle: "Terminé",  couleur: "bg-slate-200 text-slate-700 ring-slate-600/20" },
  { valeur: "resilie", libelle: "Résilié",  couleur: "bg-rose-100 text-rose-800 ring-rose-600/20" },
] as const;

export const MODES_PAIEMENT = [
  { valeur: "orange_money", libelle: "Orange Money" },
  { valeur: "wave",         libelle: "Wave" },
  { valeur: "free_money",   libelle: "Free Money" },
  { valeur: "especes",      libelle: "Espèces" },
  { valeur: "virement",     libelle: "Virement bancaire" },
  { valeur: "cheque",       libelle: "Chèque" },
] as const;

/** Principales villes senegalaises. */
export const VILLES = [
  "Dakar", "Guédiawaye", "Pikine", "Rufisque", "Diamniadio", "Thiès",
  "Mbour", "Saly", "Saint-Louis", "Touba", "Kaolack", "Ziguinchor",
  "Tambacounda", "Louga", "Fatick", "Kolda", "Matam", "Sédhiou", "Kédougou",
] as const;

/** Quartiers frequents (aide a la saisie, la valeur reste libre). */
export const QUARTIERS = [
  "Almadies", "Ngor", "Yoff", "Ouakam", "Mermoz", "Sacré-Cœur", "Point E",
  "Fann", "Plateau", "Médina", "Grand Dakar", "Grand Yoff", "Liberté 6",
  "Sicap Baobab", "HLM", "Parcelles Assainies", "Cité Keur Gorgui",
  "Ouest Foire", "Cambérène", "Golf Sud", "Hann Mariste", "VDN", "Ngaparou",
] as const;

export const EQUIPEMENTS = [
  "Climatisation", "Cuisine équipée", "Eau chaude", "Internet / Fibre",
  "Groupe électrogène", "Parking", "Ascenseur", "Gardien", "Piscine",
  "Terrasse", "Balcon", "Jardin", "Meublé", "Sécurité 24h/24",
] as const;

export function libelle(liste: readonly { valeur: string; libelle: string }[], valeur: string): string {
  return liste.find((e) => e.valeur === valeur)?.libelle ?? valeur;
}

export function couleurStatut(
  liste: readonly { valeur: string; libelle: string; couleur: string }[],
  valeur: string,
): string {
  return liste.find((e) => e.valeur === valeur)?.couleur ?? "bg-slate-100 text-slate-700 ring-slate-600/20";
}
