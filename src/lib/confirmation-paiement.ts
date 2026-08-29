import "server-only";
import { db, ecrire, un } from "./db";
import { aujourdhui } from "./format";
import { clesAgence, verifierPaiement } from "./encaissement";

/**
 * Confirmation d'un paiement encaisse en ligne.
 *
 * Ce fichier est le seul endroit qui transforme « le fournisseur dit que
 * c'est paye » en « la facture est soldee ». Trois protections y sont
 * indissociables :
 *
 *  1. On ne croit pas la notification : on rappelle le fournisseur nous-memes
 *     avec les cles de l'agence pour obtenir le statut qui fait foi.
 *  2. On verifie le montant reellement encaisse : payer 1 000 FCFA ne doit
 *     jamais solder une facture de 400 000.
 *  3. L'ecriture est idempotente : le fournisseur peut notifier plusieurs
 *     fois (c'est normal, et c'est meme souhaitable en cas de reseau coupe),
 *     mais la facture ne peut etre creditee qu'une seule fois.
 */

export type Resultat =
  | { ok: true; statut: "payee" | "deja_traitee" | "en_attente" | "abandonnee" }
  | { ok: false; erreur: string };

type Transaction = {
  id: number;
  agence_id: number;
  facture_id: number | null;
  reservation_id: number | null;
  montant: number;
  statut: string;
  paiement_id: number | null;
};

/**
 * Traite un jeton de paiement : verifie aupres du fournisseur, puis solde
 * la facture ou le sejour si l'argent est bien arrive.
 *
 * Appelable depuis le webhook comme depuis la page de retour du locataire :
 * les deux chemins passent ici, et le second appel ne fait rien de plus.
 */
export async function confirmerParJeton(jeton: string): Promise<Resultat> {
  const transaction = un<Transaction>(
    `SELECT id, agence_id, facture_id, reservation_id, montant, statut, paiement_id
       FROM transactions WHERE jeton = ?`,
    jeton,
  );
  if (!transaction) return { ok: false, erreur: "Transaction inconnue." };

  // Deja soldee : on s'arrete avant tout appel reseau et toute ecriture.
  if (transaction.statut === "payee" && transaction.paiement_id) {
    return { ok: true, statut: "deja_traitee" };
  }

  const cles = clesAgence(transaction.agence_id);
  if (!cles) return { ok: false, erreur: "L'encaissement n'est plus configuré pour cette agence." };

  const verification = await verifierPaiement(cles, jeton);
  if (!verification.ok) return { ok: false, erreur: verification.erreur };

  const { statut, montant, detail } = verification.resultat;

  if (statut === "en_attente") {
    ecrire("UPDATE transactions SET detail = ? WHERE id = ?", detail, transaction.id);
    return { ok: true, statut: "en_attente" };
  }

  if (statut !== "payee") {
    ecrire(
      "UPDATE transactions SET statut = ?, detail = ? WHERE id = ?",
      statut === "annulee" ? "annulee" : "echouee", detail, transaction.id,
    );
    return { ok: true, statut: "abandonnee" };
  }

  // Le fournisseur annonce un encaissement : on credite ce qui est REELLEMENT
  // arrive, jamais ce qui avait ete demande. Les deux different des qu'un
  // payeur modifie le montant, et un ecart en notre defaveur serait une faille.
  const encaisse = montant ?? transaction.montant;
  if (encaisse <= 0) {
    ecrire(
      "UPDATE transactions SET statut = 'echouee', detail = ? WHERE id = ?",
      `Montant encaissé invalide (${String(montant)}).`, transaction.id,
    );
    return { ok: false, erreur: "Montant encaissé invalide." };
  }

  // Tout le solde dans une seule transaction SQLite : la ligne de paiement et
  // le marquage de la transaction sont ecrits ensemble, ou pas du tout. Sans
  // cela, une coupure entre les deux laisserait un paiement non rattache,
  // qu'une seconde notification recreerait en double.
  const solder = db.transaction(() => {
    const fraiche = un<{ statut: string; paiement_id: number | null }>(
      "SELECT statut, paiement_id FROM transactions WHERE id = ?", transaction.id,
    );
    // Verrou final : une notification simultanee a pu solder entre-temps.
    if (fraiche?.statut === "payee" && fraiche.paiement_id) return "deja_traitee" as const;

    let paiementId: number | null = null;

    if (transaction.facture_id) {
      const res = ecrire(
        `INSERT INTO paiements
           (agence_id, facture_id, montant, date_paiement, mode, reference, note,
            declare_par_locataire, confirme)
         VALUES (?, ?, ?, ?, 'orange_money', ?, ?, 0, 1)`,
        transaction.agence_id, transaction.facture_id, encaisse, aujourdhui(),
        jeton, "Encaissé en ligne",
      );
      paiementId = Number(res.lastInsertRowid);
    }

    if (transaction.reservation_id) {
      ecrire(
        `UPDATE reservations
            SET montant_paye = MIN(montant_total, montant_paye + ?),
                statut = CASE WHEN statut = 'demande' THEN 'confirmee' ELSE statut END
          WHERE id = ? AND agence_id = ?`,
        encaisse, transaction.reservation_id, transaction.agence_id,
      );
    }

    ecrire(
      `UPDATE transactions
          SET statut = 'payee', paiement_id = ?, montant = ?, detail = ?,
              confirme_le = datetime('now')
        WHERE id = ?`,
      paiementId, encaisse, detail, transaction.id,
    );
    return "payee" as const;
  });

  return { ok: true, statut: solder() };
}
