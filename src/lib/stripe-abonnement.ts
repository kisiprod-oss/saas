import "server-only";
import Stripe from "stripe";

/**
 * Paiement des abonnements par carte internationale, via Stripe.
 *
 * A COTE de PayDunya, pas a sa place : PayDunya reste le seul moyen pour une
 * agence qui ne paie qu'en Orange Money, Wave ou Free Money. Stripe sert aux
 * agences (ou a leur titulaire) qui disposent d'une carte bancaire
 * internationale et d'une entite dans un pays que Stripe couvre pour ENCAISSER
 * - le Senegal n'en fait pas partie a ce jour.
 *
 * DEVISE. Stripe ne facture pas en franc CFA (XOF absent de sa liste de
 * devises). Les paiements Stripe sont donc factures en EUROS. Le franc CFA
 * ouest-africain est arrime a un taux FIXE et invariable a l'euro
 * (655,957 XOF = 1 EUR, traite de cooperation monetaire) : la conversion
 * utilisee ici n'est donc jamais une estimation qui pourrait se demoder.
 *
 * SECURITE. Meme principe que PayDunya, en mieux outille : Stripe signe
 * cryptographiquement chaque notification (Stripe-Signature). On verifie
 * cette signature ET on redemande la session directement a l'API Stripe
 * avant de valider quoi que ce soit - la signature prouve que Stripe est bien
 * l'expediteur, la relecture protege d'un evenement rejoue ou perime.
 */

const TAUX_XOF_PAR_EUR = 655.957;

function cle(): string | null {
  const v = process.env.ABONNEMENT_STRIPE_CLE_SECRETE?.trim();
  return v || null;
}

function secretWebhook(): string | null {
  const v = process.env.ABONNEMENT_STRIPE_CLE_WEBHOOK?.trim();
  return v || null;
}

export function stripeConfigure(): boolean {
  return Boolean(cle() && secretWebhook());
}

let client: Stripe | null = null;
function stripe(): Stripe {
  const k = cle();
  if (!k) throw new Error("Clé secrète Stripe absente.");
  client ??= new Stripe(k);
  return client;
}

/** FCFA -> centimes d'euro, au taux fixe. Toujours le même calcul, partout. */
export function versCentimesEuro(montantFcfa: number): number {
  return Math.round((montantFcfa / TAUX_XOF_PAR_EUR) * 100);
}

/** Euros lisibles, pour l'affichage (ex. « 30,49 € »). */
export function fcfaEnEuros(montantFcfa: number): string {
  const euros = versCentimesEuro(montantFcfa) / 100;
  return `${euros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/**
 * Traduit une erreur du SDK Stripe en phrase comprehensible.
 *
 * Sans cela, l'agence recevrait le message brut de Stripe — en anglais, et
 * ecrit pour un developpeur (« Invalid JSON received from the Stripe API »).
 * Le detail technique part dans les journaux du serveur, pas a l'ecran.
 */
function messageErreurStripe(e: unknown): string {
  const erreur = e as { type?: string; message?: string };
  console.error("Stripe — %s : %s", erreur.type ?? "erreur", erreur.message ?? String(e));

  switch (erreur.type) {
    case "StripeAuthenticationError":
      return "Stripe refuse la clé du compte : vérifiez ABONNEMENT_STRIPE_CLE_SECRETE.";
    case "StripeConnectionError":
      return "Impossible de joindre Stripe. Réessayez dans un instant.";
    case "StripeRateLimitError":
      return "Trop de demandes envoyées à Stripe coup sur coup. Réessayez dans un instant.";
    case "StripeInvalidRequestError":
      return "Stripe a refusé la demande de paiement.";
    default:
      return "Le paiement par carte est momentanément indisponible. "
        + "Réessayez, ou utilisez Orange Money / Wave.";
  }
}

export type OuvertureStripe =
  | { ok: true; url: string; jeton: string }
  | { ok: false; erreur: string };

export async function ouvrirSessionStripe(params: {
  montantFcfa: number;
  description: string;
  urlRetour: string;
  urlAnnulation: string;
  reference: Record<string, string>;
}): Promise<OuvertureStripe> {
  if (!stripeConfigure()) return { ok: false, erreur: "Stripe n'est pas configuré." };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          unit_amount: versCentimesEuro(params.montantFcfa),
          product_data: { name: params.description },
        },
        quantity: 1,
      }],
      success_url: params.urlRetour,
      cancel_url: params.urlAnnulation,
      metadata: params.reference,
    });

    if (!session.url) return { ok: false, erreur: "Stripe n'a renvoyé aucune adresse de paiement." };
    return { ok: true, url: session.url, jeton: session.id };
  } catch (e) {
    return { ok: false, erreur: messageErreurStripe(e) };
  }
}

export type EvenementStripe =
  | { ok: true; type: string; sessionId: string | null }
  | { ok: false; erreur: string };

/**
 * Verifie la signature d'un webhook Stripe et en extrait l'identifiant de
 * session. Le corps DOIT être le texte brut de la requête, non ré-encodé :
 * la signature porte sur les octets exacts envoyés par Stripe.
 */
export function verifierEvenementStripe(corpsBrut: string, signature: string | null): EvenementStripe {
  const secret = secretWebhook();
  if (!secret) return { ok: false, erreur: "Secret webhook Stripe absent." };
  if (!signature) return { ok: false, erreur: "Signature Stripe absente." };

  try {
    const evenement = stripe().webhooks.constructEvent(corpsBrut, signature, secret);
    const objet = evenement.data.object as { id?: string };
    return { ok: true, type: evenement.type, sessionId: objet.id ?? null };
  } catch (e) {
    return { ok: false, erreur: `Signature invalide : ${(e as Error).message}` };
  }
}

export type SessionStripe = {
  statutPaiement: "paye" | "non_paye" | "expire";
  montantCentimes: number | null;
  metadata: Record<string, string>;
};

/**
 * Redemande la session directement a Stripe - c'est ELLE, et seulement elle,
 * qui autorise a accorder une formule. Jamais le contenu du webhook.
 */
export async function relireSessionStripe(
  sessionId: string,
): Promise<{ ok: true; session: SessionStripe } | { ok: false; erreur: string }> {
  try {
    const s = await stripe().checkout.sessions.retrieve(sessionId);
    return {
      ok: true,
      session: {
        statutPaiement: s.payment_status === "paid" ? "paye"
          : s.status === "expired" ? "expire" : "non_paye",
        montantCentimes: s.amount_total,
        metadata: (s.metadata as Record<string, string>) ?? {},
      },
    };
  } catch (e) {
    return { ok: false, erreur: messageErreurStripe(e) };
  }
}
