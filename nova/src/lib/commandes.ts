import "server-only";
import crypto from "node:crypto";
import { un, tous, ecrire, transaction } from "./db";
import { canonique } from "./telephone";
import { paysDe } from "./pays";
import type { Boutique } from "./auth";

/**
 * Creation et suivi des commandes.
 *
 * ============================================================================
 *  CE QUE LE NAVIGATEUR A LE DROIT DE DIRE
 * ============================================================================
 *  Uniquement CE QU'IL VEUT : quels produits, quelles variantes, en quelle
 *  quantite, ou livrer. Jamais COMBIEN CA COUTE.
 *
 *  Prix unitaires, supplements de variante, frais de livraison, sous-total et
 *  total sont relus en base ici, dans `calculer()`. Un panier qui arriverait
 *  avec « total: 100 » n'a aucun effet : le champ n'est meme pas lu.
 *
 *  Le stock est verifie et decremente DANS LA MEME TRANSACTION que l'ecriture
 *  de la commande. Deux clients qui achetent le dernier article a la meme
 *  seconde ne peuvent pas passer tous les deux.
 * ============================================================================
 */

export type ArticleDemande = {
  produitId: number;
  varianteId?: number | null;
  quantite: number;
};

export type ArticleCalcule = {
  produitId: number;
  varianteId: number | null;
  nom: string;
  varianteTexte: string | null;
  prixUnitaire: number;
  quantite: number;
  totalLigne: number;
  stockDisponible: number | null;
  suiviStock: boolean;
};

/**
 * Les trois façons de demander un chiffrage.
 *
 *   livraison / retrait  le client a choisi, les frais s'appliquent
 *   estimation           la page panier, AVANT que le mode soit choisi
 *
 * « estimation » existe parce qu'un panier doit afficher un sous-total même
 * quand la boutique ne propose pas le retrait et qu'aucune zone n'est encore
 * sélectionnée. Sans lui, le panier d'une telle boutique restait muet.
 * Une commande ne peut JAMAIS être enregistrée dans ce mode.
 */
export type ModeLivraison = "livraison" | "retrait" | "estimation";

export type Devis = {
  articles: ArticleCalcule[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  devise: string;
  devise_libelle: string;
  zoneNom: string | null;
  zoneId: number | null;
  modeLivraison: ModeLivraison;
};

export type Probleme = { code: string; message: string };

export type ResultatDevis =
  | { ok: true; devis: Devis }
  | { ok: false; problemes: Probleme[] };

const QUANTITE_MAX = 99;

/**
 * Recalcule un panier entierement a partir de la base.
 *
 * Ne modifie rien : c'est la meme fonction qui sert a afficher le recapitulatif
 * avant validation et a enregistrer la commande. Les deux montants sont donc
 * forcement les memes, ce qui evite le grand classique du « le prix a change
 * entre l'ecran et la facture ».
 */
export function calculer(
  boutique: Boutique,
  demandes: ArticleDemande[],
  livraison: { mode: ModeLivraison; zoneId?: number | null },
): ResultatDevis {
  const problemes: Probleme[] = [];
  const pays = paysDe(boutique.pays);

  if (!Array.isArray(demandes) || demandes.length === 0) {
    return { ok: false, problemes: [{ code: "panier_vide", message: "Votre panier est vide." }] };
  }

  // Deux lignes pour le meme couple produit/variante sont additionnees : sinon
  // le controle de stock passe deux fois sur la meme reserve.
  const fusion = new Map<string, ArticleDemande>();
  for (const brut of demandes.slice(0, 50)) {
    const produitId = Math.trunc(Number(brut?.produitId));
    const varianteId = brut?.varianteId ? Math.trunc(Number(brut.varianteId)) : null;
    const quantite = Math.trunc(Number(brut?.quantite));
    if (!Number.isSafeInteger(produitId) || produitId <= 0) continue;
    if (!Number.isSafeInteger(quantite) || quantite <= 0) continue;

    const cle = `${produitId}:${varianteId ?? 0}`;
    const existant = fusion.get(cle);
    if (existant) existant.quantite = Math.min(QUANTITE_MAX, existant.quantite + quantite);
    else fusion.set(cle, { produitId, varianteId, quantite: Math.min(QUANTITE_MAX, quantite) });
  }

  if (fusion.size === 0) {
    return { ok: false, problemes: [{ code: "panier_vide", message: "Votre panier est vide." }] };
  }

  const articles: ArticleCalcule[] = [];
  let sousTotal = 0;

  for (const demande of fusion.values()) {
    // `boutique_id` dans le WHERE : un identifiant de produit venu d'une autre
    // boutique ne remonte rien, il n'est pas « achete par erreur ».
    const produit = un<{
      id: number; nom: string; prix: number; stock: number;
      suivi_stock: number; actif: number; variante_libelle: string | null;
    }>(
      `SELECT id, nom, prix, stock, suivi_stock, actif, variante_libelle
         FROM produits WHERE boutique_id = ? AND id = ?`,
      boutique.id, demande.produitId,
    );

    if (!produit || !produit.actif) {
      problemes.push({
        code: "produit_indisponible",
        message: `Un article de votre panier n'est plus en vente.`,
      });
      continue;
    }

    let prixUnitaire = produit.prix;
    let varianteTexte: string | null = null;
    let stockDisponible = produit.stock;

    if (demande.varianteId) {
      const variante = un<{ id: number; valeur: string; supplement: number; stock: number }>(
        `SELECT id, valeur, supplement, stock FROM variantes
          WHERE boutique_id = ? AND produit_id = ? AND id = ?`,
        boutique.id, produit.id, demande.varianteId,
      );
      if (!variante) {
        problemes.push({
          code: "variante_inconnue",
          message: `Le choix sélectionné pour « ${produit.nom} » n'existe plus.`,
        });
        continue;
      }
      prixUnitaire += variante.supplement;
      varianteTexte = produit.variante_libelle
        ? `${produit.variante_libelle} : ${variante.valeur}`
        : variante.valeur;
      stockDisponible = variante.stock;
    } else if (un<{ n: number }>(
      "SELECT COUNT(*) n FROM variantes WHERE boutique_id = ? AND produit_id = ?",
      boutique.id, produit.id,
    )!.n > 0) {
      problemes.push({
        code: "variante_requise",
        message: `Choisissez une option pour « ${produit.nom} ».`,
      });
      continue;
    }

    const suiviStock = produit.suivi_stock === 1;
    if (suiviStock && stockDisponible < demande.quantite) {
      problemes.push({
        code: "stock_insuffisant",
        message: stockDisponible <= 0
          ? `« ${produit.nom} » est en rupture de stock.`
          : `Il ne reste que ${stockDisponible} « ${produit.nom} ».`,
      });
      continue;
    }

    // Le prix est un entier : aucun arrondi flottant ne peut s'y glisser.
    const totalLigne = prixUnitaire * demande.quantite;
    sousTotal += totalLigne;
    articles.push({
      produitId: produit.id,
      varianteId: demande.varianteId ?? null,
      nom: produit.nom,
      varianteTexte,
      prixUnitaire,
      quantite: demande.quantite,
      totalLigne,
      stockDisponible: suiviStock ? stockDisponible : null,
      suiviStock,
    });
  }

  if (problemes.length > 0 || articles.length === 0) {
    if (articles.length === 0 && problemes.length === 0) {
      problemes.push({ code: "panier_vide", message: "Votre panier est vide." });
    }
    return { ok: false, problemes };
  }

  // --- Livraison -----------------------------------------------------------
  let fraisLivraison = 0;
  let zoneNom: string | null = null;
  let zoneId: number | null = null;
  const mode: ModeLivraison = livraison.mode === "retrait" ? "retrait"
    : livraison.mode === "estimation" ? "estimation" : "livraison";

  if (mode === "estimation") {
    // Rien à valider : le panier montre le sous-total, et dit que les frais
    // viennent à l'étape suivante.
  } else if (mode === "retrait") {
    if (!boutique.retrait_actif) {
      return {
        ok: false,
        problemes: [{ code: "retrait_indisponible", message: "Cette boutique ne propose pas le retrait." }],
      };
    }
  } else {
    if (!boutique.livraison_active) {
      return {
        ok: false,
        problemes: [{ code: "livraison_indisponible", message: "Cette boutique ne livre pas." }],
      };
    }
    const zone = livraison.zoneId
      ? un<{ id: number; nom: string; frais: number }>(
          "SELECT id, nom, frais FROM zones_livraison WHERE boutique_id = ? AND id = ? AND actif = 1",
          boutique.id, Math.trunc(Number(livraison.zoneId)),
        )
      : undefined;
    if (!zone) {
      return {
        ok: false,
        problemes: [{ code: "zone_requise", message: "Choisissez une zone de livraison." }],
      };
    }
    fraisLivraison = zone.frais;
    zoneNom = zone.nom;
    zoneId = zone.id;
  }

  return {
    ok: true,
    devis: {
      articles, sousTotal, fraisLivraison,
      total: sousTotal + fraisLivraison,
      devise: pays.devise,
      devise_libelle: pays.devise_libelle,
      zoneNom, zoneId, modeLivraison: mode,
    },
  };
}

/** Reference courte, lisible au telephone : « CMD-7K2M9 ». */
function referenceLibre(boutiqueId: number): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // ni 0/O ni 1/I : on les dicte
  for (let essai = 0; essai < 30; essai++) {
    let suffixe = "";
    for (const octet of crypto.randomBytes(5)) suffixe += alphabet[octet % alphabet.length];
    const reference = `CMD-${suffixe}`;
    if (!un("SELECT id FROM commandes WHERE boutique_id = ? AND reference = ?", boutiqueId, reference)) {
      return reference;
    }
  }
  return `CMD-${Date.now().toString(36).toUpperCase()}`;
}

export type Coordonnees = {
  nom: string;
  telephone: string;
  ville?: string | null;
  quartier?: string | null;
  repere?: string | null;
  adresse?: string | null;
  note?: string | null;
};

export type ResultatCommande =
  | { ok: true; commandeId: number; reference: string; jeton: string; deja: boolean }
  | { ok: false; problemes: Probleme[] };

/**
 * Enregistre une commande.
 *
 * `cleIdempotence` est fabriquee par le navigateur a l'ouverture de la page de
 * commande et renvoyee telle quelle. Un double-clic, un rechargement, un
 * retour arriere : la meme cle revient, la contrainte unique de la base
 * l'attrape, et on rend la commande deja creee au lieu d'en faire une seconde.
 */
export function enregistrer(
  boutique: Boutique,
  demandes: ArticleDemande[],
  livraison: { mode: "livraison" | "retrait"; zoneId?: number | null },
  client: Coordonnees,
  options: { cleIdempotence?: string | null; moyenPaiement?: "livraison" | "en_ligne" } = {},
): ResultatCommande {
  const pays = paysDe(boutique.pays);
  const problemes: Probleme[] = [];

  const nom = (client.nom ?? "").trim().slice(0, 120);
  if (nom.length < 2) problemes.push({ code: "nom", message: "Indiquez votre nom." });

  const telephone = canonique(client.telephone, {
    indicatif: pays.indicatif, longueur: pays.longueur_nationale,
  });
  if (!telephone) {
    problemes.push({
      code: "telephone",
      message: `Indiquez un numéro valide (${pays.longueur_nationale} chiffres).`,
    });
  }

  // Une estimation n'est pas un choix de livraison : refuser ici plutôt que
  // d'enregistrer une commande sans frais.
  if ((livraison.mode as string) === "estimation") {
    return {
      ok: false,
      problemes: [{ code: "mode_livraison", message: "Choisissez comment recevoir votre commande." }],
    };
  }

  const cle = options.cleIdempotence?.trim().slice(0, 80) || null;

  // Une cle deja vue : on rend la commande existante, sans rien reecrire.
  if (cle) {
    const deja = un<{ id: number; reference: string; jeton_suivi: string }>(
      "SELECT id, reference, jeton_suivi FROM commandes WHERE boutique_id = ? AND cle_idempotence = ?",
      boutique.id, cle,
    );
    if (deja) {
      return { ok: true, commandeId: deja.id, reference: deja.reference, jeton: deja.jeton_suivi, deja: true };
    }
  }

  const devis = calculer(boutique, demandes, livraison);
  if (!devis.ok) return { ok: false, problemes: [...problemes, ...devis.problemes] };
  if (problemes.length > 0) return { ok: false, problemes };

  const moyenPaiement = options.moyenPaiement === "en_ligne" ? "en_ligne" : "livraison";
  if (moyenPaiement === "livraison" && !boutique.paiement_livraison) {
    return {
      ok: false,
      problemes: [{ code: "paiement", message: "Cette boutique n'accepte pas le paiement à la livraison." }],
    };
  }
  if (moyenPaiement === "en_ligne" && !boutique.paiement_en_ligne) {
    return {
      ok: false,
      problemes: [{ code: "paiement", message: "Le paiement en ligne n'est pas disponible sur cette boutique." }],
    };
  }

  try {
    return transaction(() => {
      // Re-verification du stock A L'INTERIEUR de la transaction. Le calcul
      // ci-dessus a pu etre fait il y a quelques millisecondes ; c'est ici que
      // la course entre deux acheteurs se tranche.
      for (const article of devis.devis.articles) {
        if (!article.suiviStock) continue;
        const restant = article.varianteId
          ? un<{ stock: number }>(
              "SELECT stock FROM variantes WHERE boutique_id = ? AND id = ?",
              boutique.id, article.varianteId)?.stock
          : un<{ stock: number }>(
              "SELECT stock FROM produits WHERE boutique_id = ? AND id = ?",
              boutique.id, article.produitId)?.stock;
        if (restant === undefined || restant < article.quantite) {
          throw new ErreurStock(article.nom, restant ?? 0);
        }
      }

      const reference = referenceLibre(boutique.id);
      const jeton = crypto.randomBytes(16).toString("hex");
      const d = devis.devis;

      const insertion = ecrire(
        `INSERT INTO commandes (
           boutique_id, reference, cle_idempotence, client_nom, client_telephone,
           client_ville, client_quartier, client_repere, client_adresse,
           mode_livraison, zone_id, zone_nom, sous_total, frais_livraison, total,
           devise, moyen_paiement, statut, statut_livraison, statut_paiement,
           montant_encaisse, note_client, jeton_suivi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 'nouvelle', 'a_preparer', 'en_attente', 0, ?, ?)`,
        boutique.id, reference, cle, nom, telephone,
        (client.ville ?? "").trim().slice(0, 80) || null,
        (client.quartier ?? "").trim().slice(0, 80) || null,
        (client.repere ?? "").trim().slice(0, 160) || null,
        (client.adresse ?? "").trim().slice(0, 240) || null,
        d.modeLivraison, d.zoneId, d.zoneNom, d.sousTotal, d.fraisLivraison, d.total,
        d.devise, moyenPaiement,
        (client.note ?? "").trim().slice(0, 500) || null,
        jeton,
      );
      const commandeId = Number(insertion.lastInsertRowid);

      for (const article of d.articles) {
        ecrire(
          `INSERT INTO lignes_commande (
             boutique_id, commande_id, produit_id, variante_id, nom, variante_texte,
             prix_unitaire, quantite, total_ligne)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          boutique.id, commandeId, article.produitId, article.varianteId,
          article.nom, article.varianteTexte, article.prixUnitaire,
          article.quantite, article.totalLigne,
        );

        if (!article.suiviStock) continue;
        // `AND stock >= ?` : meme si deux transactions arrivaient jusqu'ici,
        // la seconde ne modifierait aucune ligne et serait rejetee.
        const maj = article.varianteId
          ? ecrire(
              "UPDATE variantes SET stock = stock - ? WHERE boutique_id = ? AND id = ? AND stock >= ?",
              article.quantite, boutique.id, article.varianteId, article.quantite)
          : ecrire(
              "UPDATE produits SET stock = stock - ? WHERE boutique_id = ? AND id = ? AND stock >= ?",
              article.quantite, boutique.id, article.produitId, article.quantite);
        if (maj.changes !== 1) throw new ErreurStock(article.nom, 0);

        // Le stock d'un produit a variantes est la somme de ses variantes.
        if (article.varianteId) {
          ecrire(
            `UPDATE produits SET stock = (
               SELECT COALESCE(SUM(stock), 0) FROM variantes
                WHERE boutique_id = ? AND produit_id = ?)
             WHERE boutique_id = ? AND id = ?`,
            boutique.id, article.produitId, boutique.id, article.produitId,
          );
        }
      }

      inscrireClient(boutique.id, { nom, telephone: telephone!, ville: client.ville, quartier: client.quartier }, d.total);
      return { ok: true as const, commandeId, reference, jeton, deja: false };
    });
  } catch (e) {
    if (e instanceof ErreurStock) {
      return {
        ok: false,
        problemes: [{
          code: "stock_insuffisant",
          message: e.restant > 0
            ? `Il ne reste que ${e.restant} « ${e.produit} ». Ajustez la quantité.`
            : `« ${e.produit} » vient d'être épuisé.`,
        }],
      };
    }
    // Contrainte d'unicite sur la cle d'idempotence : deux envois vraiment
    // simultanes. Le premier a gagne ; on rend sa commande.
    if (cle && String((e as Error).message).includes("UNIQUE")) {
      const deja = un<{ id: number; reference: string; jeton_suivi: string }>(
        "SELECT id, reference, jeton_suivi FROM commandes WHERE boutique_id = ? AND cle_idempotence = ?",
        boutique.id, cle,
      );
      if (deja) {
        return { ok: true, commandeId: deja.id, reference: deja.reference, jeton: deja.jeton_suivi, deja: true };
      }
    }
    throw e;
  }
}

class ErreurStock extends Error {
  constructor(public produit: string, public restant: number) {
    super(`Stock insuffisant pour ${produit}`);
  }
}

/** Tient a jour la fiche client (une par numero et par boutique). */
function inscrireClient(
  boutiqueId: number,
  client: { nom: string; telephone: string; ville?: string | null; quartier?: string | null },
  montant: number,
) {
  ecrire(
    `INSERT INTO clients (boutique_id, nom, telephone, ville, quartier,
                          nb_commandes, total_commande, derniere_commande_le)
     VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))
     ON CONFLICT (boutique_id, telephone) DO UPDATE SET
       nom = excluded.nom,
       ville = COALESCE(excluded.ville, clients.ville),
       quartier = COALESCE(excluded.quartier, clients.quartier),
       nb_commandes = clients.nb_commandes + 1,
       total_commande = clients.total_commande + excluded.total_commande,
       derniere_commande_le = excluded.derniere_commande_le`,
    boutiqueId, client.nom, client.telephone,
    client.ville?.trim() || null, client.quartier?.trim() || null, montant,
  );
}

/**
 * Remet le stock en rayon quand une commande est annulee.
 * Idempotent : `annulee_le` empeche un second passage de recrediter deux fois.
 */
export function annuler(boutiqueId: number, commandeId: number, motif?: string): boolean {
  return transaction(() => {
    const commande = un<{ id: number; annulee_le: string | null; montant_encaisse: number }>(
      "SELECT id, annulee_le, montant_encaisse FROM commandes WHERE boutique_id = ? AND id = ?",
      boutiqueId, commandeId,
    );
    if (!commande || commande.annulee_le) return false;

    const lignes = tous<{ produit_id: number | null; variante_id: number | null; quantite: number }>(
      "SELECT produit_id, variante_id, quantite FROM lignes_commande WHERE boutique_id = ? AND commande_id = ?",
      boutiqueId, commandeId,
    );
    for (const ligne of lignes) {
      if (ligne.variante_id) {
        ecrire("UPDATE variantes SET stock = stock + ? WHERE boutique_id = ? AND id = ?",
          ligne.quantite, boutiqueId, ligne.variante_id);
      }
      if (ligne.produit_id) {
        ecrire(
          "UPDATE produits SET stock = stock + ? WHERE boutique_id = ? AND id = ? AND suivi_stock = 1",
          ligne.quantite, boutiqueId, ligne.produit_id);
      }
    }
    ecrire(
      `UPDATE commandes SET annulee_le = datetime('now'), statut = 'annulee',
              statut_livraison = 'annulee', note_client = COALESCE(note_client, '')
        WHERE boutique_id = ? AND id = ?`,
      boutiqueId, commandeId,
    );
    if (motif) {
      ecrire("INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'commande', ?, ?)",
        boutiqueId, `Commande ${commandeId} annulée`, motif.slice(0, 500));
    }
    return true;
  });
}

// Les libelles de statuts vivent dans statuts.ts, qui n'est pas « server-only » :
// les composants du navigateur en ont besoin pour afficher une pastille.
export {
  STATUTS_COMMANDE, STATUTS_LIVRAISON, STATUTS_PAIEMENT, libelle,
} from "./statuts";
