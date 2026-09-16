"use server";

import { revalidatePath } from "next/cache";
import { un, ecrire, transaction } from "./db";
import { exigerSession } from "./auth";
import { commande as lireCommande, commandes as listerCommandes, lignesDe } from "./requetes";
import { annuler } from "./commandes";
import { STATUTS_COMMANDE, STATUTS_LIVRAISON, STATUTS_PAIEMENT } from "./statuts";
import { montant, dateFr } from "./format";
import { paysDe } from "./pays";

/**
 * Le traitement des commandes par le commerçant.
 *
 * ============================================================================
 *  L'ENCAISSEMENT NE SE DÉDUIT JAMAIS
 * ============================================================================
 *  Marquer une commande « livrée » ne la marque pas « payée ». Les deux gestes
 *  sont séparés, volontairement, parce qu'ils le sont dans la vraie vie : un
 *  colis remis à un proche, une facture réglée en deux fois, un client qui
 *  paie trois jours plus tard.
 *
 *  `montant_encaisse` ne bouge que par `actionEncaisser`, sur un geste
 *  explicite, ou par une notification de paiement vérifiée (webhooks.ts).
 *  Rien d'autre n'y touche.
 * ============================================================================
 */

export type Etat = { erreur?: string; message?: string };

function entier(valeur: FormDataEntryValue | null, max = 1_000_000_000): number {
  const n = Math.trunc(Number(String(valeur ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

const CODES_COMMANDE = STATUTS_COMMANDE.map(([c]) => c) as readonly string[];
const CODES_LIVRAISON = STATUTS_LIVRAISON.map(([c]) => c) as readonly string[];
const CODES_PAIEMENT = STATUTS_PAIEMENT.map(([c]) => c) as readonly string[];

export async function actionStatutCommande(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const statut = String(donnees.get("statut") ?? "");
  if (!CODES_COMMANDE.includes(statut)) return;

  // « Annulée » passe par la fonction dédiée : elle remet le stock en rayon.
  if (statut === "annulee") {
    annuler(boutique.id, id, "Annulée depuis le tableau de bord");
  } else {
    ecrire(
      "UPDATE commandes SET statut = ? WHERE boutique_id = ? AND id = ? AND annulee_le IS NULL",
      statut, boutique.id, id,
    );
  }
  revalidatePath(`/tableau-de-bord/commandes/${id}`);
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath("/tableau-de-bord");
}

export async function actionStatutLivraison(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const statut = String(donnees.get("statut") ?? "");
  if (!CODES_LIVRAISON.includes(statut)) return;

  ecrire(
    "UPDATE commandes SET statut_livraison = ? WHERE boutique_id = ? AND id = ?",
    statut, boutique.id, id,
  );
  revalidatePath(`/tableau-de-bord/commandes/${id}`);
  revalidatePath("/tableau-de-bord/commandes");
}

/**
 * Enregistre un encaissement.
 *
 * Le montant est plafonné au total de la commande : un commerçant qui tape un
 * chiffre de trop ne doit pas créer une caisse fictive. Un encaissement
 * partiel est possible (acompte) et la commande passe alors en « partiel ».
 */
export async function actionEncaisser(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const commande = lireCommande(boutique.id, id);
  if (!commande) return { erreur: "Cette commande n'existe pas." };
  if (commande.annulee_le) return { erreur: "Cette commande est annulée." };

  const demande = entier(donnees.get("montant"));
  if (demande <= 0) return { erreur: "Indiquez le montant reçu." };

  const nouveau = Math.min(commande.total, commande.montant_encaisse + demande);
  if (nouveau === commande.montant_encaisse) {
    return { erreur: "Cette commande est déjà entièrement réglée." };
  }

  const statutPaiement = nouveau >= commande.total ? "paye" : "partiel";

  transaction(() => {
    ecrire(
      "UPDATE commandes SET montant_encaisse = ?, statut_paiement = ? WHERE boutique_id = ? AND id = ?",
      nouveau, statutPaiement, boutique.id, id,
    );
    ecrire(
      `INSERT INTO paiements (boutique_id, commande_id, fournisseur, mode, montant, devise, statut, maj_le)
       VALUES (?, ?, 'caisse', 'reel', ?, ?, 'paye', datetime('now'))`,
      boutique.id, id, nouveau - commande.montant_encaisse, commande.devise,
    );
    // La fiche client suit la caisse, pas les commandes reçues.
    ecrire(
      `UPDATE clients SET total_encaisse = total_encaisse + ?
        WHERE boutique_id = ? AND telephone = ?`,
      nouveau - commande.montant_encaisse, boutique.id, commande.client_telephone,
    );
  });

  revalidatePath(`/tableau-de-bord/commandes/${id}`);
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath("/tableau-de-bord");
  return {
    message: statutPaiement === "paye"
      ? "Commande marquée comme réglée."
      : "Acompte enregistré. Le reste apparaît toujours en impayé.",
  };
}

/** Corrige un encaissement saisi par erreur. */
export async function actionAnnulerEncaissement(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const commande = lireCommande(boutique.id, id);
  if (!commande || commande.montant_encaisse === 0) return;

  transaction(() => {
    ecrire(
      `UPDATE commandes SET montant_encaisse = 0, statut_paiement = 'en_attente'
        WHERE boutique_id = ? AND id = ?`,
      boutique.id, id,
    );
    ecrire(
      `UPDATE clients SET total_encaisse = MAX(0, total_encaisse - ?)
        WHERE boutique_id = ? AND telephone = ?`,
      commande.montant_encaisse, boutique.id, commande.client_telephone,
    );
    // La trace reste : on n'efface pas un mouvement de caisse, on l'annule.
    ecrire(
      `INSERT INTO paiements (boutique_id, commande_id, fournisseur, mode, montant, devise, statut, maj_le)
       VALUES (?, ?, 'caisse', 'reel', ?, ?, 'rembourse', datetime('now'))`,
      boutique.id, id, -commande.montant_encaisse, commande.devise,
    );
  });

  revalidatePath(`/tableau-de-bord/commandes/${id}`);
  revalidatePath("/tableau-de-bord");
}

export async function actionAnnulerCommande(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const motif = String(donnees.get("motif") ?? "").slice(0, 300);
  annuler(boutique.id, id, motif || "Annulée par le commerçant");
  revalidatePath(`/tableau-de-bord/commandes/${id}`);
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath("/tableau-de-bord");
}

// ---------------------------------------------------------------------------
//  Export
// ---------------------------------------------------------------------------

/**
 * Exporte les commandes filtrées en CSV.
 *
 * Séparateur point-virgule et BOM UTF-8 : c'est ce qu'attend Excel en
 * configuration française. Avec une virgule, tout atterrit dans une seule
 * colonne, et le commerçant conclut que l'export est cassé.
 *
 * Chaque champ est échappé, et un champ qui commence par =, +, - ou @ est
 * préfixé d'une apostrophe : sans cela, un nom de client malicieux devient
 * une formule exécutée à l'ouverture du fichier.
 */
export async function actionExporterCommandes(
  filtre: { statut?: string; paiement?: string; recherche?: string; depuis?: string; jusqua?: string },
): Promise<{ nom: string; contenu: string }> {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);

  const liste = listerCommandes(boutique.id, { ...filtre, limite: 1000 });

  const cellule = (valeur: unknown): string => {
    let texte = String(valeur ?? "");
    if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;
    return `"${texte.replace(/"/g, '""')}"`;
  };

  const lignes: string[] = [
    [
      "Référence", "Date", "Client", "Téléphone", "Ville", "Quartier", "Repère",
      "Mode", "Zone", "Articles", "Sous-total", "Livraison", "Total",
      `Encaissé (${pays.devise_libelle})`, "Reste dû", "Commande", "Livraison", "Paiement",
    ].map(cellule).join(";"),
  ];

  for (const commande of liste) {
    const articles = lignesDe(boutique.id, commande.id)
      .map((l) => `${l.quantite}x ${l.nom}${l.variante_texte ? ` (${l.variante_texte})` : ""}`)
      .join(" | ");

    lignes.push([
      commande.reference,
      dateFr(commande.cree_le),
      commande.client_nom,
      commande.client_telephone,
      commande.client_ville ?? "",
      commande.client_quartier ?? "",
      commande.client_repere ?? "",
      commande.mode_livraison === "retrait" ? "Retrait" : "Livraison",
      commande.zone_nom ?? "",
      articles,
      commande.sous_total,
      commande.frais_livraison,
      commande.total,
      commande.montant_encaisse,
      commande.total - commande.montant_encaisse,
      STATUTS_COMMANDE.find(([c]) => c === commande.statut)?.[1] ?? commande.statut,
      STATUTS_LIVRAISON.find(([c]) => c === commande.statut_livraison)?.[1] ?? commande.statut_livraison,
      STATUTS_PAIEMENT.find(([c]) => c === commande.statut_paiement)?.[1] ?? commande.statut_paiement,
    ].map(cellule).join(";"));
  }

  return {
    nom: `commandes-${boutique.slug}-${new Date().toISOString().slice(0, 10)}.csv`,
    // Le BOM (﻿) dit à Excel que le fichier est en UTF-8 : sans lui, les
    // accents deviennent illisibles.
    contenu: `﻿${lignes.join("\r\n")}`,
  };
}

/** Le message WhatsApp de suivi, prêt à envoyer au client. */
export async function actionMessageClient(commandeId: number): Promise<{
  lien: string | null; message: string;
} | null> {
  const { boutique } = await exigerSession();
  const commande = lireCommande(boutique.id, commandeId);
  if (!commande) return null;

  const pays = paysDe(boutique.pays);
  const etat = STATUTS_LIVRAISON.find(([c]) => c === commande.statut_livraison)?.[1] ?? "";

  const message = [
    `Bonjour ${commande.client_nom},`,
    "",
    `Votre commande ${commande.reference} chez ${boutique.nom} : ${etat.toLowerCase()}.`,
    `Montant : ${montant(commande.total, pays.devise_libelle, pays.decimales)}`,
    commande.total > commande.montant_encaisse
      ? `Reste à régler : ${montant(commande.total - commande.montant_encaisse, pays.devise_libelle, pays.decimales)}`
      : "Réglée. Merci !",
  ].join("\n");

  const chiffres = commande.client_telephone.replace(/\D/g, "");
  return {
    lien: chiffres.length >= 8 ? `https://wa.me/${chiffres}?text=${encodeURIComponent(message)}` : null,
    message,
  };
}

/** Rattache une demande WhatsApp à une commande, ou la classe sans suite. */
export async function actionClasserDemande(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const commandeId = entier(donnees.get("commande_id"));

  const valide = commandeId
    && un("SELECT id FROM commandes WHERE boutique_id = ? AND id = ?", boutique.id, commandeId);

  ecrire(
    "UPDATE demandes_whatsapp SET commande_id = ? WHERE boutique_id = ? AND id = ?",
    valide ? commandeId : null, boutique.id, id,
  );
  revalidatePath("/tableau-de-bord/commandes");
}
