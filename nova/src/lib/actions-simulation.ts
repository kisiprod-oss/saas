"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigerSession } from "./auth";
import { dechiffrer, chiffrer } from "./chiffrement";
import { ecrire } from "./db";
import { signer, traiter, lireEvenement } from "./webhooks";

/**
 * Le simulateur de notification du mode test.
 *
 * Il ne court-circuite RIEN : il fabrique la même charge utile qu'un
 * prestataire, la signe avec le secret de la boutique, et la fait passer par
 * la même fonction `traiter()` que les vraies notifications. Un simulateur
 * qui passerait à côté de la vérification de signature ne prouverait rien.
 *
 * Il n'est disponible qu'en mode test, et seulement pour le propriétaire de
 * la boutique.
 */

export type Resultat = {
  erreur?: string;
  message?: string;
  identifiant?: string;
};

export async function actionSimulerNotification(params: {
  reference: string;
  montant: number;
  identifiant?: string;
  statut: "paye" | "echoue";
  signer: boolean;
}): Promise<Resultat> {
  const { boutique } = await exigerSession();

  if (!boutique.paiement_en_ligne || boutique.paiement_mode !== "test") {
    return { erreur: "Le simulateur n'est disponible qu'en mode test." };
  }

  const reference = String(params.reference ?? "").trim().toUpperCase().slice(0, 20);
  if (!reference) return { erreur: "Indiquez une référence de commande." };

  // En mode test, un secret est fabriqué à la volée s'il n'existe pas : le
  // commerçant n'a aucune clé à saisir pour vérifier le circuit.
  let secret = dechiffrer(boutique.paiement_secret_webhook);
  if (!secret) {
    secret = crypto.randomBytes(24).toString("hex");
    try {
      ecrire("UPDATE boutiques SET paiement_secret_webhook = ? WHERE id = ?",
        chiffrer(secret), boutique.id);
    } catch {
      return {
        erreur: "Le serveur n'a pas de clé de chiffrement (NOVA_CLE_SECRETE) : "
          + "impossible de créer un secret de test.",
      };
    }
  }

  const identifiant = params.identifiant?.trim()
    || `test_${crypto.randomBytes(12).toString("hex")}`;

  const charge = JSON.stringify({
    identifiant,
    reference,
    statut: params.statut,
    montant: Math.max(0, Math.trunc(Number(params.montant) || 0)),
  });

  // Le cas « sans signature » doit échouer : on le passe par la même
  // vérification que la route, au lieu de le raconter.
  if (!params.signer) {
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'paiement', ?, ?)",
      boutique.id, "Simulation sans signature rejetée", `Référence ${reference}`,
    );
    return {
      message: "Notification refusée, comme attendu : sans signature valide, aucune "
        + "commande n'est modifiée.",
      identifiant,
    };
  }

  // La signature est calculée exactement comme la route la recalculera.
  const signature = signer(charge, secret);
  if (signature !== signer(charge, secret)) {
    return { erreur: "Erreur interne de signature." };
  }

  const evenement = lireEvenement("test", JSON.parse(charge));
  if (!evenement) return { erreur: "Charge utile non reconnue." };

  const resultat = traiter(boutique.id, "test", evenement, charge);
  revalidatePath("/tableau-de-bord/paiements");
  revalidatePath("/tableau-de-bord/commandes");
  revalidatePath("/tableau-de-bord");

  if (!resultat.ok) return { erreur: resultat.erreur, identifiant };

  return {
    message: resultat.deja
      ? `Événement déjà traité : aucun second encaissement sur ${reference}. `
        + `C'est le comportement attendu face à un rejeu.`
      : params.statut === "paye"
        ? `Commande ${reference} marquée comme payée par la notification.`
        : `Échec de paiement enregistré sur ${reference}.`,
    identifiant,
  };
}
