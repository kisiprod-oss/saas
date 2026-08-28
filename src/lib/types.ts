export type Bien = {
  id: number;
  agence_id: number;
  reference: string;
  titre: string;
  type: string;
  description: string | null;
  ville: string;
  quartier: string | null;
  adresse: string | null;
  chambres: number;
  salles_bain: number;
  surface: number | null;
  etage: string | null;
  meuble: number;
  equipements: string | null;
  photos: string | null;
  loyer: number;
  charges: number;
  caution_mois: number;
  statut: string;
  publie: number;
  proprietaire_nom: string | null;
  proprietaire_telephone: string | null;
  cree_le: string;
};

export type Locataire = {
  id: number;
  agence_id: number;
  prenom: string;
  nom: string;
  telephone: string;
  telephone2: string | null;
  email: string | null;
  cni: string | null;
  profession: string | null;
  employeur: string | null;
  adresse: string | null;
  garant_nom: string | null;
  garant_telephone: string | null;
  notes: string | null;
  mot_de_passe_hash: string | null;
  acces_actif: number;
  cree_le: string;
};

export type Contrat = {
  id: number;
  agence_id: number;
  bien_id: number;
  locataire_id: number;
  reference: string;
  date_debut: string;
  date_fin: string | null;
  duree_mois: number;
  loyer: number;
  charges: number;
  caution: number;
  caution_rendue: number;
  jour_echeance: number;
  commission_pct: number;
  statut: string;
  notes: string | null;
  cree_le: string;
};

export type ContratDetaille = Contrat & {
  bien_titre: string;
  bien_reference: string;
  bien_quartier: string | null;
  bien_ville: string;
  locataire_prenom: string;
  locataire_nom: string;
  locataire_telephone: string;
};

export type Facture = {
  id: number;
  agence_id: number;
  contrat_id: number;
  numero: string;
  periode: string;
  date_emission: string;
  date_echeance: string;
  montant_loyer: number;
  montant_charges: number;
  montant_autres: number;
  libelle_autres: string | null;
  montant_total: number;
  statut: string;
  cree_le: string;
};

export type FactureDetaillee = Facture & {
  montant_paye: number;
  reste: number;
  etat: "payee" | "partielle" | "impayee" | "annulee";
  en_retard: boolean;
  locataire_prenom: string;
  locataire_nom: string;
  locataire_telephone: string;
  bien_titre: string;
  bien_reference: string;
  contrat_reference: string;
};

export type Paiement = {
  id: number;
  agence_id: number;
  facture_id: number;
  montant: number;
  date_paiement: string;
  mode: string;
  reference: string | null;
  note: string | null;
  declare_par_locataire: number;
  confirme: number;
  cree_le: string;
};

export type Demande = {
  id: number;
  agence_id: number;
  bien_id: number | null;
  nom: string;
  telephone: string;
  email: string | null;
  message: string | null;
  statut: string;
  cree_le: string;
};
