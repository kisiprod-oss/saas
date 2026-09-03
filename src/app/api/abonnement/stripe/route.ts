import type { NextRequest } from "next/server";
import { confirmerAbonnementStripe } from "@/lib/abonnement";
import { verifierEvenementStripe } from "@/lib/stripe-abonnement";

/**
 * Notification Stripe pour un reglement d'ABONNEMENT (agence vers editeur).
 * Le pendant, cote Stripe, de /api/abonnement/paydunya.
 *
 * A la difference de PayDunya, Stripe SIGNE chaque notification : on verifie
 * cette signature avant toute chose (elle prouve que Stripe est bien
 * l'expediteur), PUIS on redemande la session directement a l'API Stripe
 * (elle protege d'un evenement rejoue ou perime). Les deux verifications
 * sont necessaires, aucune ne remplace l'autre.
 *
 * Le corps doit rester BRUT (texte, non reanalyse) : la signature porte sur
 * les octets exacts envoyes par Stripe.
 */

const QUOTA = 120;
const FENETRE_MS = 60_000;
let fenetre = { debut: Date.now(), nombre: 0 };

function tropDAppels(): boolean {
  const maintenant = Date.now();
  if (maintenant - fenetre.debut > FENETRE_MS) fenetre = { debut: maintenant, nombre: 0 };
  fenetre.nombre += 1;
  return fenetre.nombre > QUOTA;
}

/** Seuls ces evenements font avancer un reglement ; le reste est ignore. */
const EVENEMENTS_UTILES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function POST(requete: NextRequest) {
  if (tropDAppels()) return new Response("trop d'appels", { status: 429 });

  const signature = requete.headers.get("stripe-signature");
  const corpsBrut = await requete.text();

  const evenement = verifierEvenementStripe(corpsBrut, signature);
  if (!evenement.ok) {
    console.error("Abonnement Stripe — signature invalide : %s", evenement.erreur);
    return new Response("signature invalide", { status: 400 });
  }

  if (!EVENEMENTS_UTILES.has(evenement.type) || !evenement.sessionId) {
    return new Response("ignoré", { status: 200 });
  }

  const resultat = await confirmerAbonnementStripe(evenement.sessionId);

  // Toujours 200 une fois la signature verifiee et le jeton identifie : un
  // code d'erreur ferait renvoyer la notification en boucle, y compris pour
  // un probleme qui ne se resoudra pas tout seul.
  if (!resultat.ok) {
    console.error("Abonnement Stripe — session %s : %s", evenement.sessionId, resultat.erreur);
    return new Response("non traité", { status: 200 });
  }
  return new Response(resultat.statut, { status: 200 });
}

export function GET() {
  return new Response("Point de notification Stripe des abonnements Sen Gestion", { status: 200 });
}
