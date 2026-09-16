"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { actionEnregistrerConditions, type Etat } from "@/lib/actions-reglages";
import { BoutonEnvoi, Message } from "./ui";
import { dateFr } from "@/lib/format";

/**
 * Les conditions de vente.
 *
 * NOVA ne les redige pas : elles engagent le commercant, pas nous. Le
 * formulaire propose une TRAME de questions auxquelles repondre, ce qui aide
 * sans decider a sa place.
 */
const TRAME = `Délais de préparation :
Zones et délais de livraison :
Moyens de paiement acceptés :
Échange ou remboursement (sous quel délai, à quelles conditions) :
Comment nous joindre en cas de problème :`;

export function FormulaireConditions({
  conditions, slug,
}: {
  conditions: {
    vente: string | null; livraison: string | null; retour: string | null;
    valideesLe: string | null;
  };
  slug: string;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerConditions, {});
  const [vente, setVente] = useState(conditions.vente ?? "");

  return (
    <form action={envoyer} className="carte space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="titre-section">Conditions de vente</h2>
        {conditions.valideesLe ? (
          <span className="puce puce-vert">Validées le {dateFr(conditions.valideesLe)}</span>
        ) : (
          <span className="puce puce-terre">Non validées</span>
        )}
      </div>

      <p className="text-sm text-encre-600">
        Elles vous engagent, pas NOVA Boutique : c&apos;est vous qui les écrivez et
        qui les validez. Tant qu&apos;elles ne sont pas validées, votre boutique
        affiche qu&apos;elles ne sont pas publiées.
      </p>

      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="conditions_vente">Vos conditions</label>
        <textarea id="conditions_vente" name="conditions_vente" className="zone-texte"
          rows={8} maxLength={8000} value={vente} onChange={(e) => setVente(e.target.value)} />
        {vente.trim().length === 0 ? (
          <button type="button" className="btn-secondaire btn-petit mt-2"
            onClick={() => setVente(TRAME)}>
            Partir d&apos;une trame
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="conditions_livraison">
            Précisions sur la livraison
          </label>
          <textarea id="conditions_livraison" name="conditions_livraison" className="zone-texte"
            rows={3} maxLength={4000} defaultValue={conditions.livraison ?? ""} />
        </div>
        <div>
          <label className="etiquette" htmlFor="conditions_retour">
            Retours et échanges
          </label>
          <textarea id="conditions_retour" name="conditions_retour" className="zone-texte"
            rows={3} maxLength={4000} defaultValue={conditions.retour ?? ""} />
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-ivoire p-3.5">
        <input type="checkbox" name="valider" value="1" className="mt-0.5 size-5 accent-vert-700"
          defaultChecked={Boolean(conditions.valideesLe)} />
        <span className="text-sm">
          <span className="font-medium text-encre-900">
            Je valide ces conditions et j&apos;en assume le contenu
          </span>
          <span className="block text-encre-600">
            Elles seront publiées sur{" "}
            <Link href={`/b/${slug}/conditions`} className="lien" target="_blank">
              la page Informations
            </Link>{" "}
            de votre boutique, avec la date de validation.
          </span>
        </span>
      </label>

      <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
    </form>
  );
}
