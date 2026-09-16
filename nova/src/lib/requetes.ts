import "server-only";
import { tous, un } from "./db";
import { lirePhotos } from "./photos";
import type { Boutique } from "./auth";

/**
 * Toutes les lectures de donnees de commercant.
 *
 * REGLE UNIQUE ET SANS EXCEPTION : chaque fonction de ce fichier prend
 * `boutiqueId` en PREMIER argument, et chaque requete porte
 * `WHERE boutique_id = ?`. Y compris quand la jointure suffirait.
 *
 * Cette monotonie est volontaire. Elle rend une omission visible a l'oeil nu
 * en relisant le fichier, et elle evite d'avoir a se demander, requete par
 * requete, « celle-ci est-elle filtree ? ». L'essai
 * essais/isolation.test.mjs verifie mecaniquement qu'aucune requete
 * n'echappe a la regle.
 */

export type Categorie = {
  id: number; boutique_id: number; nom: string; slug: string; ordre: number;
};

export type LigneProduit = {
  id: number; boutique_id: number; categorie_id: number | null;
  nom: string; slug: string; description: string | null;
  caracteristiques: string; prix: number; prix_barre: number | null;
  stock: number; suivi_stock: number; seuil_alerte: number;
  photos: string; type: string; variante_libelle: string | null;
  actif: number; cree_le: string;
};

export type Caracteristique = { nom: string; valeur: string };

export type Produit = Omit<LigneProduit, "photos" | "caracteristiques"> & {
  photos: string[];
  caracteristiques: Caracteristique[];
  categorie_nom?: string | null;
};

export type Variante = {
  id: number; boutique_id: number; produit_id: number;
  valeur: string; supplement: number; stock: number; ordre: number;
};

export type Zone = {
  id: number; boutique_id: number; nom: string; frais: number;
  delai: string | null; actif: number; ordre: number;
};

export type Commande = {
  id: number; boutique_id: number; reference: string; cle_idempotence: string | null;
  client_nom: string; client_telephone: string; client_ville: string | null;
  client_quartier: string | null; client_repere: string | null; client_adresse: string | null;
  mode_livraison: string; zone_id: number | null; zone_nom: string | null;
  sous_total: number; frais_livraison: number; total: number; devise: string;
  moyen_paiement: string; statut: string; statut_livraison: string; statut_paiement: string;
  montant_encaisse: number; note_client: string | null; jeton_suivi: string;
  annulee_le: string | null; cree_le: string;
};

export type LigneCommande = {
  id: number; boutique_id: number; commande_id: number;
  produit_id: number | null; variante_id: number | null;
  nom: string; variante_texte: string | null;
  prix_unitaire: number; quantite: number; total_ligne: number;
};

function relireProduit(ligne: LigneProduit & { categorie_nom?: string | null }): Produit {
  let caracteristiques: Caracteristique[] = [];
  try {
    const brut = JSON.parse(ligne.caracteristiques || "[]");
    if (Array.isArray(brut)) {
      caracteristiques = brut
        .filter((c) => c && typeof c.nom === "string" && typeof c.valeur === "string")
        .slice(0, 20);
    }
  } catch { /* caracteristiques illisibles : on affiche le produit sans elles */ }
  return { ...ligne, photos: lirePhotos(ligne.photos), caracteristiques };
}

// ---------------------------------------------------------------------------
//  Catalogue
// ---------------------------------------------------------------------------

export function categories(boutiqueId: number): Categorie[] {
  return tous<Categorie>(
    "SELECT * FROM categories WHERE boutique_id = ? ORDER BY ordre, nom", boutiqueId,
  );
}

export function categorieParSlug(boutiqueId: number, slug: string): Categorie | undefined {
  return un<Categorie>(
    "SELECT * FROM categories WHERE boutique_id = ? AND slug = ?", boutiqueId, slug,
  );
}

export function produits(
  boutiqueId: number,
  options: { actifsSeulement?: boolean; categorieId?: number; recherche?: string; limite?: number } = {},
): Produit[] {
  const conditions = ["p.boutique_id = ?"];
  const params: unknown[] = [boutiqueId];

  if (options.actifsSeulement) conditions.push("p.actif = 1");
  if (options.categorieId) { conditions.push("p.categorie_id = ?"); params.push(options.categorieId); }
  if (options.recherche?.trim()) {
    conditions.push("(p.nom LIKE ? OR p.description LIKE ?)");
    const motif = `%${options.recherche.trim()}%`;
    params.push(motif, motif);
  }
  const limite = Math.min(Math.max(1, options.limite ?? 200), 500);

  return tous<LigneProduit & { categorie_nom: string | null }>(
    `SELECT p.*, c.nom AS categorie_nom
       FROM produits p
       LEFT JOIN categories c ON c.id = p.categorie_id AND c.boutique_id = p.boutique_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY p.cree_le DESC
      LIMIT ${limite}`,
    ...params,
  ).map(relireProduit);
}

export function produit(boutiqueId: number, id: number): Produit | undefined {
  const ligne = un<LigneProduit & { categorie_nom: string | null }>(
    `SELECT p.*, c.nom AS categorie_nom
       FROM produits p
       LEFT JOIN categories c ON c.id = p.categorie_id AND c.boutique_id = p.boutique_id
      WHERE p.boutique_id = ? AND p.id = ?`,
    boutiqueId, id,
  );
  return ligne ? relireProduit(ligne) : undefined;
}

export function produitParSlug(boutiqueId: number, slug: string): Produit | undefined {
  const ligne = un<LigneProduit & { categorie_nom: string | null }>(
    `SELECT p.*, c.nom AS categorie_nom
       FROM produits p
       LEFT JOIN categories c ON c.id = p.categorie_id AND c.boutique_id = p.boutique_id
      WHERE p.boutique_id = ? AND p.slug = ?`,
    boutiqueId, slug,
  );
  return ligne ? relireProduit(ligne) : undefined;
}

export function variantes(boutiqueId: number, produitId: number): Variante[] {
  return tous<Variante>(
    "SELECT * FROM variantes WHERE boutique_id = ? AND produit_id = ? ORDER BY ordre, id",
    boutiqueId, produitId,
  );
}

export function nombreProduits(boutiqueId: number): number {
  return un<{ n: number }>(
    "SELECT COUNT(*) n FROM produits WHERE boutique_id = ?", boutiqueId,
  )?.n ?? 0;
}

/** Produits dont le stock est sous le seuil d'alerte du commercant. */
export function alertesStock(boutiqueId: number): Produit[] {
  return tous<LigneProduit>(
    `SELECT * FROM produits
      WHERE boutique_id = ? AND actif = 1 AND suivi_stock = 1 AND stock <= seuil_alerte
      ORDER BY stock ASC, nom LIMIT 20`,
    boutiqueId,
  ).map(relireProduit);
}

// ---------------------------------------------------------------------------
//  Livraison
// ---------------------------------------------------------------------------

export function zones(boutiqueId: number, actifsSeulement = false): Zone[] {
  return tous<Zone>(
    `SELECT * FROM zones_livraison
      WHERE boutique_id = ? ${actifsSeulement ? "AND actif = 1" : ""}
      ORDER BY ordre, nom`,
    boutiqueId,
  );
}

export function zone(boutiqueId: number, id: number): Zone | undefined {
  return un<Zone>(
    "SELECT * FROM zones_livraison WHERE boutique_id = ? AND id = ?", boutiqueId, id,
  );
}

// ---------------------------------------------------------------------------
//  Commandes
// ---------------------------------------------------------------------------

export type FiltreCommandes = {
  statut?: string;
  paiement?: string;
  recherche?: string;
  depuis?: string;
  jusqua?: string;
  limite?: number;
};

export function commandes(boutiqueId: number, filtre: FiltreCommandes = {}): Commande[] {
  const conditions = ["boutique_id = ?"];
  const params: unknown[] = [boutiqueId];

  if (filtre.statut) { conditions.push("statut = ?"); params.push(filtre.statut); }
  if (filtre.paiement) { conditions.push("statut_paiement = ?"); params.push(filtre.paiement); }
  if (filtre.depuis) { conditions.push("cree_le >= ?"); params.push(filtre.depuis); }
  if (filtre.jusqua) { conditions.push("cree_le <= ?"); params.push(`${filtre.jusqua} 23:59:59`); }
  if (filtre.recherche?.trim()) {
    conditions.push("(reference LIKE ? OR client_nom LIKE ? OR client_telephone LIKE ?)");
    const motif = `%${filtre.recherche.trim()}%`;
    params.push(motif, motif, motif);
  }
  const limite = Math.min(Math.max(1, filtre.limite ?? 200), 1000);

  return tous<Commande>(
    `SELECT * FROM commandes WHERE ${conditions.join(" AND ")}
      ORDER BY cree_le DESC LIMIT ${limite}`,
    ...params,
  );
}

export function commande(boutiqueId: number, id: number): Commande | undefined {
  return un<Commande>("SELECT * FROM commandes WHERE boutique_id = ? AND id = ?", boutiqueId, id);
}

export function commandeParReference(boutiqueId: number, reference: string): Commande | undefined {
  return un<Commande>(
    "SELECT * FROM commandes WHERE boutique_id = ? AND reference = ?", boutiqueId, reference,
  );
}

export function lignesDe(boutiqueId: number, commandeId: number): LigneCommande[] {
  return tous<LigneCommande>(
    "SELECT * FROM lignes_commande WHERE boutique_id = ? AND commande_id = ? ORDER BY id",
    boutiqueId, commandeId,
  );
}

export type Client = {
  id: number; boutique_id: number; nom: string; telephone: string;
  ville: string | null; quartier: string | null;
  nb_commandes: number; total_commande: number; total_encaisse: number;
  derniere_commande_le: string | null;
};

export function clients(boutiqueId: number, recherche?: string): Client[] {
  if (recherche?.trim()) {
    const motif = `%${recherche.trim()}%`;
    return tous<Client>(
      `SELECT * FROM clients WHERE boutique_id = ? AND (nom LIKE ? OR telephone LIKE ?)
        ORDER BY derniere_commande_le DESC LIMIT 200`,
      boutiqueId, motif, motif,
    );
  }
  return tous<Client>(
    "SELECT * FROM clients WHERE boutique_id = ? ORDER BY derniere_commande_le DESC LIMIT 200",
    boutiqueId,
  );
}

// ---------------------------------------------------------------------------
//  Tableau de bord
// ---------------------------------------------------------------------------

export type Resume = {
  aTraiter: number;
  encaisse: number;
  nonPaye: number;
  nonPayeNombre: number;
  commandesDuMois: number;
  chiffreDuMois: number;
  alertes: number;
  demandesWhatsapp: number;
};

/**
 * Les chiffres de l'accueil.
 *
 * `encaisse` additionne `montant_encaisse`, PAS `total`. Une commande recue
 * n'est pas de l'argent recu : tant que le commercant n'a pas confirme
 * l'encaissement (ou qu'un prestataire verifie ne l'a pas notifie), elle
 * compte dans `nonPaye`. C'est la difference entre un chiffre d'affaires
 * espere et une caisse.
 */
export function resume(boutiqueId: number): Resume {
  const mois = new Date().toISOString().slice(0, 7);
  const nombre = (sql: string, ...p: unknown[]) =>
    un<{ n: number }>(sql, boutiqueId, ...p)?.n ?? 0;

  return {
    aTraiter: nombre(
      `SELECT COUNT(*) n FROM commandes
        WHERE boutique_id = ? AND statut IN ('nouvelle', 'confirmee') AND annulee_le IS NULL`,
    ),
    encaisse: nombre(
      `SELECT COALESCE(SUM(montant_encaisse), 0) n FROM commandes
        WHERE boutique_id = ? AND annulee_le IS NULL`,
    ),
    nonPaye: nombre(
      `SELECT COALESCE(SUM(total - montant_encaisse), 0) n FROM commandes
        WHERE boutique_id = ? AND annulee_le IS NULL AND total > montant_encaisse`,
    ),
    nonPayeNombre: nombre(
      `SELECT COUNT(*) n FROM commandes
        WHERE boutique_id = ? AND annulee_le IS NULL AND total > montant_encaisse`,
    ),
    commandesDuMois: nombre(
      `SELECT COUNT(*) n FROM commandes
        WHERE boutique_id = ? AND substr(cree_le, 1, 7) = ? AND annulee_le IS NULL`, mois,
    ),
    chiffreDuMois: nombre(
      `SELECT COALESCE(SUM(montant_encaisse), 0) n FROM commandes
        WHERE boutique_id = ? AND substr(cree_le, 1, 7) = ? AND annulee_le IS NULL`, mois,
    ),
    alertes: nombre(
      `SELECT COUNT(*) n FROM produits
        WHERE boutique_id = ? AND actif = 1 AND suivi_stock = 1 AND stock <= seuil_alerte`,
    ),
    demandesWhatsapp: nombre(
      `SELECT COUNT(*) n FROM demandes_whatsapp
        WHERE boutique_id = ? AND commande_id IS NULL`,
    ),
  };
}

/** Les sept derniers jours, pour un petit graphique honnete (0 si 0). */
export function derniersJours(boutiqueId: number): { jour: string; commandes: number; encaisse: number }[] {
  const lignes = tous<{ jour: string; commandes: number; encaisse: number }>(
    `SELECT substr(cree_le, 1, 10) jour, COUNT(*) commandes,
            COALESCE(SUM(montant_encaisse), 0) encaisse
       FROM commandes
      WHERE boutique_id = ? AND annulee_le IS NULL AND cree_le >= date('now', '-6 days')
      GROUP BY jour ORDER BY jour`,
    boutiqueId,
  );
  const parJour = new Map(lignes.map((l) => [l.jour, l]));
  const resultat: { jour: string; commandes: number; encaisse: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    resultat.push(parJour.get(date) ?? { jour: date, commandes: 0, encaisse: 0 });
  }
  return resultat;
}

// ---------------------------------------------------------------------------
//  Boutique publique
// ---------------------------------------------------------------------------

/**
 * La boutique derriere une adresse publique.
 *
 * Une boutique suspendue ou non publiee n'est pas servie ici : la fonction
 * renvoie undefined et l'appelant affiche un 404. C'est la seule facon de
 * garantir qu'un brouillon reste invisible.
 */
export function boutiquePubliqueParSlug(slug: string): Boutique | undefined {
  return un<Boutique>(
    `SELECT * FROM boutiques
      WHERE slug = ? AND suspendue_le IS NULL AND publiee_le IS NOT NULL AND publie IS NOT NULL`,
    slug,
  );
}

export function boutiquePubliqueParDomaine(domaine: string): Boutique | undefined {
  return un<Boutique>(
    `SELECT * FROM boutiques
      WHERE domaine = ? AND domaine_verifie_le IS NOT NULL
        AND suspendue_le IS NULL AND publiee_le IS NOT NULL AND publie IS NOT NULL`,
    domaine.toLowerCase(),
  );
}

/** Les boutiques de demonstration montrees sur le site public. */
export function boutiquesDemonstration(): Boutique[] {
  return tous<Boutique>(
    `SELECT * FROM boutiques WHERE demonstration = 1 AND publiee_le IS NOT NULL
      ORDER BY id LIMIT 6`,
  );
}
