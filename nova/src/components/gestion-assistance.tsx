"use client";

import { useActionState, useState } from "react";
import {
  actionRepondreAssistance, actionCloreAssistance, type Etat,
} from "@/lib/actions-admin";
import { BoutonEnvoi, Message } from "./ui";

export function GestionAssistance({
  id, reponse, close,
}: { id: number; reponse: string | null; close: boolean }) {
  const [etat, repondre] = useActionState<Etat, FormData>(actionRepondreAssistance, {});
  const [ouvert, setOuvert] = useState(false);

  if (close) {
    return <p className="text-sm text-encre-500">Demande close.</p>;
  }

  return (
    <div className="space-y-3">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      {reponse && !ouvert ? (
        <div>
          <p className="text-xs font-medium text-encre-500">Réponse envoyée</p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl bg-vert-50 p-3.5 text-sm text-vert-900">
            {reponse}
          </p>
          <button type="button" className="mt-2 text-sm text-encre-600 hover:text-vert-700"
            onClick={() => setOuvert(true)}>
            Modifier la réponse
          </button>
        </div>
      ) : (
        <form action={repondre} className="space-y-2.5">
          <input type="hidden" name="id" value={id} />
          <textarea name="reponse" className="zone-texte" rows={3} required maxLength={4000}
            defaultValue={reponse ?? ""} placeholder="Votre réponse au commerçant"
            aria-label="Réponse" />
          <div className="flex flex-wrap gap-2">
            <BoutonEnvoi className="btn-principal btn-petit" enCours="Envoi…">Répondre</BoutonEnvoi>
            {ouvert ? (
              <button type="button" className="btn-secondaire btn-petit"
                onClick={() => setOuvert(false)}>Annuler</button>
            ) : null}
          </div>
        </form>
      )}

      <form action={actionCloreAssistance}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="text-sm text-encre-500 hover:text-encre-800">
          Clore cette demande
        </button>
      </form>
    </div>
  );
}
