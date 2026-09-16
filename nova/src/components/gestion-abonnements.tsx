"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  actionActiverAbonnement, actionRefuserAbonnement, type Etat,
} from "@/lib/actions-admin";
import { BoutonEnvoi, Message } from "./ui";

/**
 * L'activation manuelle d'un abonnement.
 *
 * Elle est manuelle parce que l'encaissement l'est : aucun prestataire de
 * facturation n'est branche. Activer sans avoir constate le reglement, c'est
 * offrir la formule — autant que ce soit un geste conscient.
 */
export function GestionAbonnements({
  demandes,
}: {
  demandes: {
    id: number; boutique: string; boutiqueId: number; offre: string;
    montant: string; email: string | null; quand: string;
  }[];
}) {
  const [etat, activer] = useActionState<Etat, FormData>(actionActiverAbonnement, {});

  return (
    <div className="space-y-3">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      {demandes.map((demande) => (
        <div key={demande.id} className="carte p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-encre-900">
                <Link href={`/administration/boutiques/${demande.boutiqueId}`} className="hover:text-vert-700">
                  {demande.boutique}
                </Link>
              </h2>
              <p className="mt-0.5 text-sm text-encre-600">
                Formule {demande.offre} · {demande.montant} · demandée le {demande.quand}
              </p>
              {demande.email ? (
                <p className="mt-0.5 text-xs text-encre-500">{demande.email}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <form action={activer} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={demande.id} />
              <div>
                <label className="etiquette" htmlFor={`mois-${demande.id}`}>Mois réglés</label>
                <input id={`mois-${demande.id}`} name="mois" type="number" min={1} max={24}
                  className="champ w-24" defaultValue={1} />
              </div>
              <input name="motif" className="champ w-56" maxLength={500}
                placeholder="Référence du règlement" aria-label="Référence du règlement" />
              <BoutonEnvoi className="btn-principal" enCours="Activation…">
                Activer
              </BoutonEnvoi>
            </form>

            <form action={actionRefuserAbonnement}>
              <input type="hidden" name="id" value={demande.id} />
              <button type="submit" className="btn-secondaire">Classer sans suite</button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
