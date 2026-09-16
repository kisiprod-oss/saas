"use client";

import { useActionState, useState } from "react";
import {
  actionEncaisser, actionAnnulerEncaissement, actionAnnulerCommande,
  actionMessageClient, type Etat,
} from "@/lib/actions-commandes";
import { BoutonEnvoi, Message, ChampMontant, Rondelle } from "./ui";
import { Whatsapp } from "./icones";
import { montant } from "@/lib/format";

/**
 * L'encaissement, le message au client, l'annulation.
 *
 * L'encaissement est le seul geste de cette application qui fasse bouger un
 * chiffre d'affaires. Il est donc explicite, chiffre, et reversible : une
 * erreur de saisie s'annule sans passer par le support.
 */
export function GestionCommande({
  commandeId, total, encaisse, devise,
}: { commandeId: number; total: number; encaisse: number; devise: string }) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEncaisser, {});
  const [message, setMessage] = useState<{ lien: string | null; message: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [confirmeAnnulation, setConfirmeAnnulation] = useState(false);

  const reste = total - encaisse;

  async function preparerMessage() {
    setEnCours(true);
    try { setMessage(await actionMessageClient(commandeId)); }
    finally { setEnCours(false); }
  }

  return (
    <div className="space-y-5">
      <section className="carte p-5">
        <h2 className="titre-section">Encaissement</h2>
        <p className="mt-1 text-sm text-encre-600">
          À déclarer quand l&apos;argent est réellement reçu — pas quand la commande
          part.
        </p>

        {etat.erreur ? <div className="mt-3"><Message ton="erreur">{etat.erreur}</Message></div> : null}
        {etat.message ? <div className="mt-3"><Message ton="succes">{etat.message}</Message></div> : null}

        {reste > 0 ? (
          <form action={envoyer} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={commandeId} />
            <div>
              <label className="etiquette" htmlFor="montant">Montant reçu</label>
              <ChampMontant id="montant" nom="montant" defaut={reste} devise={devise} requis />
              <p className="aide">
                Reste à encaisser : {montant(reste, devise)}. Un montant inférieur
                enregistre un acompte.
              </p>
            </div>
            <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">
              Enregistrer l&apos;encaissement
            </BoutonEnvoi>
          </form>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium text-vert-700">
              Réglée : {montant(encaisse, devise)} encaissés.
            </p>
            <form action={actionAnnulerEncaissement} className="mt-3">
              <input type="hidden" name="id" value={commandeId} />
              <button type="submit" className="text-sm text-encre-500 hover:text-red-700">
                Annuler cet encaissement (erreur de saisie)
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="carte p-5">
        <h2 className="titre-section">Prévenir le client</h2>
        <p className="mt-1 text-sm text-encre-600">
          Un message tout prêt avec la référence et le montant.
        </p>

        {message ? (
          <div className="mt-3 space-y-3">
            <pre className="whitespace-pre-wrap rounded-xl bg-ivoire p-3.5 text-sm text-encre-700">
              {message.message}
            </pre>
            {message.lien ? (
              <>
                <a href={message.lien} target="_blank" rel="noopener" className="btn-principal">
                  <Whatsapp className="size-4" /> Ouvrir WhatsApp
                </a>
                <p className="text-xs text-encre-500">
                  Ouvrir WhatsApp ne prouve pas l&apos;envoi : vérifiez dans
                  l&apos;application que le message est bien parti.
                </p>
              </>
            ) : (
              <p className="text-sm text-encre-500">
                Le numéro du client ne permet pas d&apos;ouvrir WhatsApp. Copiez le
                message ci-dessus.
              </p>
            )}
          </div>
        ) : (
          <button type="button" className="btn-secondaire mt-3" onClick={preparerMessage}
            disabled={enCours}>
            {enCours ? <Rondelle className="size-4" /> : <Whatsapp className="size-4" />}
            Préparer le message
          </button>
        )}
      </section>

      <section className="carte border-red-200 p-5">
        <h2 className="titre-section text-red-800">Annuler la commande</h2>
        <p className="mt-1 text-sm text-encre-600">
          Le stock retourne en rayon. La commande reste dans votre historique,
          marquée annulée.
        </p>
        {confirmeAnnulation ? (
          <form action={actionAnnulerCommande} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={commandeId} />
            <div>
              <label className="etiquette" htmlFor="motif">Pourquoi ?</label>
              <input id="motif" name="motif" className="champ" maxLength={300}
                placeholder="Client injoignable" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-danger">Confirmer l&apos;annulation</button>
              <button type="button" className="btn-secondaire"
                onClick={() => setConfirmeAnnulation(false)}>Revenir</button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn-danger mt-4"
            onClick={() => setConfirmeAnnulation(true)}>
            Annuler cette commande
          </button>
        )}
      </section>
    </div>
  );
}
