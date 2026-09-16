import { NextRequest } from "next/server";
import { un, ecrire } from "@/lib/db";
import { limiter } from "@/lib/limites";
import {
  signatureValide, traiter, secretDe, lireEvenement, fournisseurAccepte,
} from "@/lib/webhooks";

/**
 * L'adresse que le prestataire de paiement appelle.
 *
 *   POST /api/paiements/<fournisseur>/<boutique>
 *
 * Une adresse par boutique : chacune a son propre secret, et une fuite chez
 * un commercant ne permet pas de falsifier les paiements d'un autre.
 *
 * Le corps est lu en TEXTE BRUT avant d'etre analyse : la signature porte sur
 * les octets recus, et `await requete.json()` les aurait deja transformes.
 * Signer un objet re-serialise donnerait une signature differente de celle
 * calculee par le prestataire.
 */
export async function POST(
  requete: NextRequest,
  { params }: { params: Promise<{ fournisseur: string; boutique: string }> },
) {
  const { fournisseur, boutique } = await params;

  const boutiqueId = Number(boutique);
  if (!Number.isSafeInteger(boutiqueId) || boutiqueId <= 0) {
    return Response.json({ erreur: "Adresse invalide." }, { status: 400 });
  }
  if (!fournisseurAccepte(fournisseur)) {
    return Response.json({ erreur: "Fournisseur inconnu." }, { status: 404 });
  }

  // Limitation de debit : une adresse publique qui ecrit en base doit etre
  // protegee d'un envoi en boucle, meme signe.
  const verdict = limiter(`webhook:${boutiqueId}:${fournisseur}`, 300, 60);
  if (!verdict.permis) {
    return Response.json({ erreur: "Trop de notifications." }, { status: 429 });
  }

  const active = un<{ paiement_en_ligne: number; paiement_fournisseur: string | null }>(
    "SELECT paiement_en_ligne, paiement_fournisseur FROM boutiques WHERE id = ? AND suspendue_le IS NULL",
    boutiqueId,
  );
  if (!active || !active.paiement_en_ligne || active.paiement_fournisseur !== fournisseur) {
    return Response.json({ erreur: "Paiement non configuré." }, { status: 404 });
  }

  const corps = await requete.text();
  if (corps.length > 64_000) {
    return Response.json({ erreur: "Notification trop volumineuse." }, { status: 413 });
  }

  const secret = secretDe(boutiqueId);
  if (!secret) {
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message) VALUES (?, 'paiement', ?)",
      boutiqueId, "Notification reçue sans secret configuré",
    );
    return Response.json({ erreur: "Secret absent." }, { status: 503 });
  }

  const signature = requete.headers.get("x-nova-signature")
    ?? requete.headers.get("x-signature")
    ?? requete.headers.get("paydunya-signature")
    ?? "";

  if (!signatureValide(corps, signature, secret)) {
    ecrire(
      "INSERT INTO journal_erreurs (boutique_id, source, message, details) VALUES (?, 'paiement', ?, ?)",
      boutiqueId, "Notification à signature invalide rejetée",
      `Fournisseur ${fournisseur}`,
    );
    // 401 plutot que 400 : le prestataire doit savoir que c'est la signature
    // qui cloche, pas le format.
    return Response.json({ erreur: "Signature invalide." }, { status: 401 });
  }

  let analyse: unknown;
  try { analyse = JSON.parse(corps); }
  catch { return Response.json({ erreur: "Corps illisible." }, { status: 400 }); }

  const evenement = lireEvenement(fournisseur, analyse);
  if (!evenement) return Response.json({ erreur: "Événement non reconnu." }, { status: 400 });

  const resultat = traiter(boutiqueId, fournisseur, evenement, corps);
  if (!resultat.ok) {
    return Response.json({ erreur: resultat.erreur }, { status: resultat.code });
  }
  // `deja: true` renvoie 200 : le prestataire doit arreter de reessayer.
  return Response.json({ recu: true, deja: resultat.deja });
}

/** GET pour verifier que l'adresse repond, sans rien traiter. */
export async function GET() {
  return Response.json({
    service: "NOVA Boutique — notifications de paiement",
    methode: "POST avec en-tête x-nova-signature (HMAC-SHA256 du corps).",
  });
}
