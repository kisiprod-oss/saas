import "server-only";
import crypto from "node:crypto";
import { un, ecrire, transaction } from "./db";
import { dechiffrer } from "./chiffrement";
import { fournisseurPar } from "./paiements";

/**
 * Le traitement des notifications de paiement.
 *
 * ============================================================================
 *  TROIS RÈGLES, DANS CET ORDRE
 * ============================================================================
 *
 *  1. LA SIGNATURE D'ABORD. Une notification non signée, ou mal signée, est
 *     rejetée sans être lue. N'importe qui peut appeler notre adresse
 *     publique en prétendant qu'une commande est payée ; seule la signature
 *     calculée avec le secret partagé prouve le contraire.
 *
 *  2. UN ÉVÉNEMENT NE COMPTE QU'UNE FOIS. Les prestataires rejouent leurs
 *     notifications (délai réseau, réponse perdue, reprise après panne). La
 *     table `evenements_paiement` porte une contrainte UNIQUE sur
 *     (fournisseur, identifiant) : un rejeu se heurte à la base, pas à un
 *     `if` qu'on peut oublier. Le second passage renvoie « déjà traité » et
 *     ne touche à aucun montant.
 *
 *  3. LA PAGE DE RETOUR NE PROUVE RIEN. Quand un client revient du site de
 *     paiement, son navigateur dit seulement qu'il est revenu — il peut avoir
 *     annulé, ou fabriqué l'adresse. Seule cette fonction, appelée de serveur
 *     à serveur, marque une commande payée.
 * ============================================================================
 */

export type Evenement = {
  /** Identifiant chez le prestataire. C'est lui qui porte l'idempotence. */
  identifiant: string;
  reference: string;
  statut: "paye" | "echoue" | "annule";
  montant: number;
  devise?: string;
};

export type Resultat =
  | { ok: true; deja: boolean; commande?: string }
  | { ok: false; code: number; erreur: string };

/**
 * Vérifie une signature HMAC-SHA256 à temps constant.
 *
 * `timingSafeEqual` plutôt que `===` : une comparaison ordinaire s'arrête au
 * premier octet différent, ce qui laisse deviner la signature attendue octet
 * par octet en mesurant le temps de réponse.
 */
export function signatureValide(corps: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const attendue = crypto.createHmac("sha256", secret).update(corps, "utf8").digest("hex");
  const a = Buffer.from(attendue, "utf8");
  const b = Buffer.from(signature.trim().replace(/^sha256=/, ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Fabrique une signature — utilisée par le simulateur du mode test. */
export function signer(corps: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(corps, "utf8").digest("hex");
}

/**
 * Traite une notification vérifiée.
 *
 * Toute l'écriture tient dans une transaction qui commence par
 * l'enregistrement de l'événement : si l'insertion échoue pour cause de
 * doublon, rien d'autre n'est écrit.
 */
export function traiter(
  boutiqueId: number, fournisseur: string, evenement: Evenement, chargeUtile: string,
): Resultat {
  if (!evenement.identifiant || !evenement.reference) {
    return { ok: false, code: 400, erreur: "Notification incomplète." };
  }

  const commande = un<{
    id: number; total: number; montant_encaisse: number; devise: string;
    client_telephone: string; annulee_le: string | null;
  }>(
    `SELECT id, total, montant_encaisse, devise, client_telephone, annulee_le
       FROM commandes WHERE boutique_id = ? AND reference = ?`,
    boutiqueId, evenement.reference,
  );
  if (!commande) {
    // On enregistre quand même l'événement : un prestataire qui notifie une
    // référence inconnue est un incident à voir dans l'administration, pas un
    // silence.
    ecrire(
      `INSERT OR IGNORE INTO evenements_paiement
         (fournisseur, identifiant, boutique_id, resultat, charge_utile)
       VALUES (?, ?, ?, 'commande_inconnue', ?)`,
      fournisseur, evenement.identifiant, boutiqueId, chargeUtile.slice(0, 4000),
    );
    return { ok: false, code: 404, erreur: "Commande inconnue." };
  }

  try {
    return transaction(() => {
      // Première écriture : si l'événement a déjà été vu, la contrainte
      // UNIQUE lève et toute la transaction est annulée.
      ecrire(
        `INSERT INTO evenements_paiement
           (fournisseur, identifiant, boutique_id, resultat, charge_utile)
         VALUES (?, ?, ?, ?, ?)`,
        fournisseur, evenement.identifiant, boutiqueId, evenement.statut,
        chargeUtile.slice(0, 4000),
      );

      if (commande.annulee_le) {
        ecrire(
          `INSERT INTO journal_erreurs (boutique_id, source, message, details)
           VALUES (?, 'paiement', ?, ?)`,
          boutiqueId, `Paiement reçu sur une commande annulée`,
          `Commande ${evenement.reference}, événement ${evenement.identifiant}`,
        );
        return { ok: true as const, deja: false, commande: evenement.reference };
      }

      if (evenement.statut === "paye") {
        // Le montant crédité est celui du prestataire, plafonné au total de
        // la commande : une notification qui annoncerait le double ne crée pas
        // une caisse fictive.
        const credit = Math.max(0, Math.min(
          Math.trunc(evenement.montant), commande.total - commande.montant_encaisse,
        ));
        const encaisse = commande.montant_encaisse + credit;

        ecrire(
          `UPDATE commandes
              SET montant_encaisse = ?, statut_paiement = ?,
                  statut = CASE WHEN statut = 'nouvelle' THEN 'confirmee' ELSE statut END
            WHERE boutique_id = ? AND id = ?`,
          encaisse, encaisse >= commande.total ? "paye" : "partiel", boutiqueId, commande.id,
        );
        ecrire(
          `INSERT INTO paiements (boutique_id, commande_id, fournisseur, mode,
                                  reference_externe, montant, devise, statut, maj_le)
           VALUES (?, ?, ?, 'reel', ?, ?, ?, 'paye', datetime('now'))`,
          boutiqueId, commande.id, fournisseur, evenement.identifiant, credit, commande.devise,
        );
        ecrire(
          `UPDATE clients SET total_encaisse = total_encaisse + ?
            WHERE boutique_id = ? AND telephone = ?`,
          credit, boutiqueId, commande.client_telephone,
        );
      } else {
        ecrire(
          "UPDATE commandes SET statut_paiement = 'echoue' WHERE boutique_id = ? AND id = ?",
          boutiqueId, commande.id,
        );
        ecrire(
          `INSERT INTO paiements (boutique_id, commande_id, fournisseur, mode,
                                  reference_externe, montant, devise, statut, maj_le)
           VALUES (?, ?, ?, 'reel', ?, ?, ?, 'echoue', datetime('now'))`,
          boutiqueId, commande.id, fournisseur, evenement.identifiant,
          Math.max(0, Math.trunc(evenement.montant)), commande.devise,
        );
      }

      return { ok: true as const, deja: false, commande: evenement.reference };
    });
  } catch (e) {
    if (String((e as Error).message).includes("UNIQUE")) {
      // Rejeu : c'est le fonctionnement normal d'un prestataire, pas une
      // erreur. On répond 200 pour qu'il arrête de réessayer.
      return { ok: true, deja: true, commande: evenement.reference };
    }
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'paiement', ?, ?)",
      boutiqueId, "Traitement de notification impossible",
      String((e as Error).message).slice(0, 500),
    );
    return { ok: false, code: 500, erreur: "Erreur interne." };
  }
}

/** Le secret de notification d'une boutique, déchiffré. */
export function secretDe(boutiqueId: number): string | null {
  const ligne = un<{ paiement_secret_webhook: string | null; paiement_mode: string }>(
    "SELECT paiement_secret_webhook, paiement_mode FROM boutiques WHERE id = ?", boutiqueId,
  );
  if (!ligne) return null;
  return dechiffrer(ligne.paiement_secret_webhook);
}

/**
 * Lit la notification d'un prestataire et la ramène à notre forme commune.
 *
 * Chaque prestataire a son vocabulaire. Cette fonction est le seul endroit à
 * modifier pour en brancher un nouveau — le reste du traitement ne change pas.
 */
export function lireEvenement(fournisseur: string, corps: unknown): Evenement | null {
  const donnees = (corps ?? {}) as Record<string, unknown>;
  const chaine = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
  const nombre = (v: unknown) => Math.max(0, Math.trunc(Number(v) || 0));

  switch (fournisseur) {
    case "test": {
      const statut = chaine(donnees.statut);
      return {
        identifiant: chaine(donnees.identifiant),
        reference: chaine(donnees.reference).toUpperCase(),
        statut: statut === "paye" ? "paye" : statut === "annule" ? "annule" : "echoue",
        montant: nombre(donnees.montant),
      };
    }

    case "paydunya": {
      // Forme documentée à la date d'écriture ; À REVÉRIFIER avant mise en
      // service réelle (voir src/lib/paiements.ts).
      const facture = (donnees.invoice ?? {}) as Record<string, unknown>;
      const statut = chaine(donnees.status);
      return {
        identifiant: chaine(donnees.token) || chaine(facture.token),
        reference: chaine((facture.custom_data as Record<string, unknown>)?.reference).toUpperCase(),
        statut: statut === "completed" ? "paye" : statut === "cancelled" ? "annule" : "echoue",
        montant: nombre(facture.total_amount),
      };
    }

    default:
      return null;
  }
}

/** Le fournisseur accepte-t-il des notifications ? */
export function fournisseurAccepte(code: string): boolean {
  const fournisseur = fournisseurPar(code);
  return Boolean(fournisseur && fournisseur.etat !== "etudie");
}
