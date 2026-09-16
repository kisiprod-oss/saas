"use client";

import { useState } from "react";
import { actionSimulerNotification } from "@/lib/actions-simulation";
import { Message, Rondelle, ChampMontant } from "./ui";
import { Etincelle } from "./icones";

/**
 * Le simulateur du mode test.
 *
 * Il envoie une VRAIE notification signee sur la VRAIE adresse de webhook,
 * exactement comme le ferait un prestataire. C'est le seul moyen honnete de
 * verifier trois choses avant de brancher de l'argent reel :
 *
 *   — la signature est bien controlee (une notification non signee est rejetee) ;
 *   — un evenement rejoue ne cree pas un second encaissement ;
 *   — la commande passe bien en « payee » et le tableau de bord suit.
 *
 * Le bouton « Rejouer » envoie le MEME identifiant d'evenement : le resultat
 * doit etre « deja traite », sans que le montant bouge.
 */
export function SimulateurPaiement({
  boutiqueId, devise,
}: { boutiqueId: number; devise: string }) {
  const [etat, setEtat] = useState<{ erreur?: string; message?: string }>({});
  const [enCours, setEnCours] = useState(false);
  const [dernier, setDernier] = useState<string | null>(null);

  async function envoyer(donnees: FormData) {
    setEnCours(true);
    setEtat({});
    try {
      const resultat = await actionSimulerNotification({
        reference: String(donnees.get("reference") ?? ""),
        montant: Number(String(donnees.get("montant") ?? "0").replace(/\D/g, "")),
        identifiant: String(donnees.get("identifiant") ?? "") || undefined,
        statut: String(donnees.get("statut") ?? "paye") === "echoue" ? "echoue" : "paye",
        signer: donnees.get("sans_signature") !== "1",
      });
      setEtat(resultat.erreur ? { erreur: resultat.erreur } : { message: resultat.message });
      if (resultat.identifiant) setDernier(resultat.identifiant);
    } catch {
      setEtat({ erreur: "La simulation a échoué." });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section className="carte p-5">
      <h2 className="titre-section flex items-center gap-2">
        <Etincelle className="size-5 text-vert-700" /> Vérifier le circuit
      </h2>
      <p className="mt-1 text-sm text-encre-600">
        Envoie une notification signée sur votre adresse de paiement, comme le
        ferait un prestataire. Aucun argent ne circule.
      </p>

      {etat.erreur ? <div className="mt-3"><Message ton="erreur">{etat.erreur}</Message></div> : null}
      {etat.message ? <div className="mt-3"><Message ton="succes">{etat.message}</Message></div> : null}

      <form action={envoyer} className="mt-4 space-y-3">
        <div>
          <label className="etiquette" htmlFor="reference">Référence de commande</label>
          <input id="reference" name="reference" className="champ font-mono uppercase"
            required maxLength={20} placeholder="CMD-7K2M9" />
          <p className="aide">Prenez une commande existante de votre boutique.</p>
        </div>
        <div>
          <label className="etiquette" htmlFor="montant">Montant notifié</label>
          <ChampMontant id="montant" nom="montant" devise={devise} requis />
        </div>
        <div>
          <label className="etiquette" htmlFor="statut">Résultat annoncé</label>
          <select id="statut" name="statut" className="champ">
            <option value="paye">Paiement réussi</option>
            <option value="echoue">Paiement échoué</option>
          </select>
        </div>

        {dernier ? (
          <label className="flex items-start gap-2.5 rounded-xl bg-ivoire p-3 text-sm">
            <input type="checkbox" name="identifiant" value={dernier}
              className="mt-0.5 size-4.5 accent-vert-700" />
            <span>
              Rejouer le dernier événement (<code className="font-mono text-xs">{dernier.slice(0, 16)}…</code>)
              <span className="block text-xs text-encre-500">
                Le montant ne doit pas bouger : c&apos;est le test d&apos;idempotence.
              </span>
            </span>
          </label>
        ) : null}

        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="sans_signature" value="1" className="mt-0.5 size-4.5 accent-vert-700" />
          <span>
            Envoyer SANS signature
            <span className="block text-xs text-encre-500">
              Doit être refusé. C&apos;est le test de sécurité.
            </span>
          </span>
        </label>

        <button type="submit" className="btn-secondaire" disabled={enCours}>
          {enCours ? <Rondelle className="size-4" /> : null}
          Envoyer la notification
        </button>
      </form>
    </section>
  );
}
