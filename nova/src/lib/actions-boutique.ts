"use server";

import { headers } from "next/headers";
import { un, ecrire } from "./db";
import { limiter, messageAttente } from "./limites";
import { calculer, enregistrer, type ArticleDemande, type Devis, type Probleme } from "./commandes";
import { zones } from "./requetes";
import type { Boutique } from "./auth";

/**
 * Les actions PUBLIQUES d'une boutique : chiffrer un panier, passer commande,
 * tracer une demande WhatsApp.
 *
 * Elles n'ont pas de session derrière elles : n'importe qui sur Internet peut
 * les appeler. Trois précautions, donc, à chaque entrée :
 *
 *   1. La boutique est retrouvée par son `slug` et doit être PUBLIÉE et non
 *      suspendue. Impossible de commander sur un brouillon.
 *   2. Limitation de débit par adresse IP et par boutique.
 *   3. Tous les montants sont recalculés côté serveur (voir commandes.ts).
 *      Rien de ce que le navigateur envoie sur les prix n'est lu.
 */

export type EtatDevis =
  | { ok: true; devis: Devis }
  | { ok: false; problemes: Probleme[] };

export type EtatCommande =
  | { ok: true; reference: string; jeton: string; deja: boolean }
  | { ok: false; problemes: Probleme[] };

async function adresse(): Promise<string> {
  const entetes = await headers();
  return entetes.get("x-forwarded-for")?.split(",")[0]?.trim()
    || entetes.get("x-real-ip")
    || "inconnue";
}

/** La boutique publiée derrière un slug, ou null. */
function boutiqueOuverte(slug: string): Boutique | null {
  return un<Boutique>(
    `SELECT * FROM boutiques
      WHERE slug = ? AND suspendue_le IS NULL AND publiee_le IS NOT NULL`,
    String(slug ?? "").slice(0, 80),
  ) ?? null;
}

const INTROUVABLE: Probleme = {
  code: "boutique",
  message: "Cette boutique n'est pas disponible.",
};

/**
 * Chiffre un panier. Utilisé par la page panier et la page de commande.
 *
 * C'est une lecture : elle n'écrit rien, ne réserve rien, ne bloque aucun
 * stock. Le seul moment où le stock bouge est l'enregistrement de la commande.
 */
export async function actionChiffrer(
  slug: string,
  articles: ArticleDemande[],
  livraison: { mode: "livraison" | "retrait" | "estimation"; zoneId?: number | null },
): Promise<EtatDevis> {
  const boutique = boutiqueOuverte(slug);
  if (!boutique) return { ok: false, problemes: [INTROUVABLE] };

  const verdict = limiter(`devis:${await adresse()}`, 120, 60);
  if (!verdict.permis) {
    return { ok: false, problemes: [{ code: "debit", message: messageAttente(verdict.secondes) }] };
  }

  const resultat = calculer(boutique, articles, livraison);
  return resultat.ok ? { ok: true, devis: resultat.devis } : { ok: false, problemes: resultat.problemes };
}

/** Les modes de livraison réellement proposés par cette boutique. */
export async function actionOptionsLivraison(slug: string): Promise<{
  retrait: boolean;
  retraitAdresse: string | null;
  retraitHoraires: string | null;
  livraison: boolean;
  paiementLivraison: boolean;
  paiementEnLigne: boolean;
  paiementMode: string;
  zones: { id: number; nom: string; frais: number; delai: string | null }[];
  villes: string[];
  indicatif: string;
  devise: string;
  decimales: number;
}> {
  const boutique = boutiqueOuverte(slug);
  if (!boutique) {
    return {
      retrait: false, retraitAdresse: null, retraitHoraires: null, livraison: false,
      paiementLivraison: false, paiementEnLigne: false, paiementMode: "test",
      zones: [], villes: [], indicatif: "+221", devise: "FCFA", decimales: 0,
    };
  }
  const { paysDe } = await import("./pays");
  const pays = paysDe(boutique.pays);

  return {
    retrait: boutique.retrait_actif === 1,
    retraitAdresse: boutique.retrait_adresse,
    retraitHoraires: boutique.retrait_horaires,
    livraison: boutique.livraison_active === 1,
    paiementLivraison: boutique.paiement_livraison === 1,
    // Le paiement en ligne n'est proposé que s'il est actif ET en mode réel :
    // une boutique en mode test ne doit pas encaisser un vrai client.
    paiementEnLigne: boutique.paiement_en_ligne === 1 && boutique.paiement_mode === "reel",
    paiementMode: boutique.paiement_mode,
    zones: zones(boutique.id, true).map((z) => ({
      id: z.id, nom: z.nom, frais: z.frais, delai: z.delai,
    })),
    villes: pays.villes,
    indicatif: pays.indicatif,
    devise: pays.devise_libelle,
    decimales: pays.decimales,
  };
}

/**
 * Enregistre la commande.
 *
 * `cleIdempotence` est fabriquée par le navigateur à l'ouverture de la page et
 * renvoyée telle quelle. Deux envois avec la même clé donnent UNE commande,
 * et le second reçoit la référence du premier (`deja: true`).
 */
export async function actionCommander(
  slug: string,
  articles: ArticleDemande[],
  livraison: { mode: "livraison" | "retrait"; zoneId?: number | null },
  client: {
    nom: string; telephone: string; ville?: string; quartier?: string;
    repere?: string; adresse?: string; note?: string;
  },
  cleIdempotence: string,
  moyenPaiement: "livraison" | "en_ligne" = "livraison",
): Promise<EtatCommande> {
  const boutique = boutiqueOuverte(slug);
  if (!boutique) return { ok: false, problemes: [INTROUVABLE] };

  // 10 commandes par heure et par adresse : largement au-dessus de l'usage
  // normal, bien en dessous de ce qu'il faut pour noyer un commerçant.
  const verdict = limiter(`commande:${await adresse()}:${boutique.id}`, 10, 3600);
  if (!verdict.permis) {
    return {
      ok: false,
      problemes: [{
        code: "debit",
        message: "Trop de commandes depuis cet appareil. "
          + "Contactez directement la boutique si c'est une erreur.",
      }],
    };
  }

  try {
    const resultat = enregistrer(boutique, articles, livraison, client, {
      cleIdempotence, moyenPaiement,
    });
    if (!resultat.ok) return { ok: false, problemes: resultat.problemes };
    return { ok: true, reference: resultat.reference, jeton: resultat.jeton, deja: resultat.deja };
  } catch (e) {
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'commande', ?, ?)",
      boutique.id, "Enregistrement de commande impossible",
      String((e as Error).message).slice(0, 500),
    );
    return {
      ok: false,
      problemes: [{
        code: "serveur",
        message: "La commande n'a pas pu être enregistrée. Réessayez dans un instant — "
          + "votre panier est conservé.",
      }],
    };
  }
}

/**
 * Trace une ouverture de WhatsApp.
 *
 * Ce n'est ni une commande, ni une preuve d'envoi : la personne peut fermer
 * WhatsApp sans rien écrire. La ligne va dans `demandes_whatsapp`, comptée à
 * part du chiffre d'affaires, et le tableau de bord le dit en toutes lettres.
 */
export async function actionTracerDemandeWhatsapp(
  slug: string, produitId: number | null, recapitulatif: string, montant: number,
): Promise<{ reference: string } | null> {
  const boutique = boutiqueOuverte(slug);
  if (!boutique) return null;

  const verdict = limiter(`whatsapp:${await adresse()}:${boutique.id}`, 30, 3600);
  if (!verdict.permis) return null;

  const reference = `WA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  ecrire(
    `INSERT INTO demandes_whatsapp (boutique_id, reference, produit_id, recapitulatif, montant)
     VALUES (?, ?, ?, ?, ?)`,
    boutique.id, reference,
    produitId && un("SELECT id FROM produits WHERE boutique_id = ? AND id = ?", boutique.id, produitId)
      ? produitId : null,
    String(recapitulatif ?? "").slice(0, 1000),
    Math.max(0, Math.trunc(Number(montant) || 0)),
  );
  return { reference };
}

/** Suivi d'une commande par référence + jeton. Aucun compte client requis. */
export async function actionSuivreCommande(
  slug: string, reference: string, telephone: string,
): Promise<
  | { ok: true; commande: { reference: string; statut: string; statut_livraison: string; statut_paiement: string; total: number; cree_le: string; devise: string } }
  | { ok: false; erreur: string }
> {
  const boutique = boutiqueOuverte(slug);
  if (!boutique) return { ok: false, erreur: "Cette boutique n'est pas disponible." };

  const verdict = limiter(`suivi:${await adresse()}`, 20, 900);
  if (!verdict.permis) return { ok: false, erreur: messageAttente(verdict.secondes) };

  const { canonique } = await import("./telephone");
  const { paysDe } = await import("./pays");
  const pays = paysDe(boutique.pays);
  const numero = canonique(telephone, {
    indicatif: pays.indicatif, longueur: pays.longueur_nationale,
  });

  // La référence SEULE ne suffit pas : elle est courte et pourrait être
  // devinée. Il faut aussi le numéro donné à la commande.
  const commande = numero
    ? un<{
        reference: string; statut: string; statut_livraison: string;
        statut_paiement: string; total: number; cree_le: string; devise: string;
      }>(
        `SELECT reference, statut, statut_livraison, statut_paiement, total, cree_le, devise
           FROM commandes
          WHERE boutique_id = ? AND reference = ? AND client_telephone = ?`,
        boutique.id, String(reference ?? "").trim().toUpperCase().slice(0, 20), numero,
      )
    : undefined;

  if (!commande) {
    return {
      ok: false,
      erreur: "Aucune commande ne correspond à cette référence et à ce numéro.",
    };
  }
  return { ok: true, commande };
}
