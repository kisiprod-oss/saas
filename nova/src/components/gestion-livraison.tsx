"use client";

import { useActionState, useState } from "react";
import { actionEnregistrerLivraison, type Etat } from "@/lib/actions-reglages";
import {
  actionEnregistrerZone, actionSupprimerZone, actionBasculerZone,
  type Etat as EtatZone,
} from "@/lib/actions-catalogue";
import { BoutonEnvoi, Message, ChampMontant } from "./ui";
import { Plus, Crayon, Corbeille, Camion } from "./icones";
import { montant } from "@/lib/format";
import type { Zone } from "@/lib/requetes";

/**
 * Les modes de reception et les zones.
 *
 * Une zone, ce n'est pas une adresse : c'est un tarif. « Dakar centre :
 * 1 000 F », « Banlieue : 2 500 F ». Le client choisit la sienne a la
 * commande, et le serveur applique le tarif — jamais celui que le navigateur
 * enverrait.
 */
export function GestionLivraison({
  devise, reglages, zones,
}: {
  devise: string;
  reglages: {
    retraitActif: boolean; retraitAdresse: string | null; retraitHoraires: string | null;
    livraisonActive: boolean; paiementLivraison: boolean;
  };
  zones: Zone[];
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerLivraison, {});
  const [etatZone, envoyerZone] = useActionState<EtatZone, FormData>(actionEnregistrerZone, {});
  const [retrait, setRetrait] = useState(reglages.retraitActif);
  const [livraison, setLivraison] = useState(reglages.livraisonActive);
  const [edition, setEdition] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <form action={envoyer} className="carte space-y-4 p-5">
        <h2 className="titre-section">Modes de réception</h2>
        {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
        {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

        <label className="flex items-start gap-3">
          <input type="checkbox" name="livraison_active" value="1" className="mt-0.5 size-5 accent-vert-700"
            checked={livraison} onChange={(e) => setLivraison(e.target.checked)} />
          <span>
            <span className="font-medium text-encre-900">Je livre</span>
            <span className="block text-sm text-encre-600">
              Vos clients choisissent une zone, et les frais s&apos;ajoutent au total.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input type="checkbox" name="retrait_actif" value="1" className="mt-0.5 size-5 accent-vert-700"
            checked={retrait} onChange={(e) => setRetrait(e.target.checked)} />
          <span>
            <span className="font-medium text-encre-900">Retrait sur place</span>
            <span className="block text-sm text-encre-600">
              Le client vient chercher sa commande. Aucun frais.
            </span>
          </span>
        </label>

        {retrait ? (
          <div className="ml-8 space-y-3 border-l-2 border-encre-100 pl-4">
            <div>
              <label className="etiquette" htmlFor="retrait_adresse">Où venir</label>
              <input id="retrait_adresse" name="retrait_adresse" className="champ" maxLength={200}
                defaultValue={reglages.retraitAdresse ?? ""}
                placeholder="Marché HLM, allée 4, boutique 12" />
            </div>
            <div>
              <label className="etiquette" htmlFor="retrait_horaires">Quand</label>
              <input id="retrait_horaires" name="retrait_horaires" className="champ" maxLength={120}
                defaultValue={reglages.retraitHoraires ?? ""}
                placeholder="Lundi au samedi, 9h – 19h" />
            </div>
          </div>
        ) : null}

        <div className="border-t border-encre-100 pt-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="paiement_livraison" value="1" className="mt-0.5 size-5 accent-vert-700"
              defaultChecked={reglages.paiementLivraison} />
            <span>
              <span className="font-medium text-encre-900">Paiement à la réception</span>
              <span className="block text-sm text-encre-600">
                Le client paie en recevant. C&apos;est le mode le plus utilisé — le
                désactiver réduit fortement les commandes.
              </span>
            </span>
          </label>
        </div>

        <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
      </form>

      {livraison ? (
        <section className="carte p-5">
          <h2 className="titre-section">Zones de livraison</h2>
          <p className="mt-1 text-sm text-encre-600">
            Un tarif par zone. Sans zone, vos clients ne peuvent pas choisir la livraison.
          </p>

          {etatZone.erreur ? <div className="mt-3"><Message ton="erreur">{etatZone.erreur}</Message></div> : null}
          {etatZone.message ? <div className="mt-3"><Message ton="succes">{etatZone.message}</Message></div> : null}

          {zones.length === 0 ? (
            <div className="mt-4 rounded-xl bg-terre-50 p-3.5 text-sm text-terre-700">
              <Camion className="mb-1.5 size-5" />
              Aucune zone : la livraison est proposée mais impossible à choisir.
              Ajoutez-en au moins une.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {zones.map((zone) => (
                <li key={zone.id} className="rounded-xl border border-encre-200 p-3">
                  {edition === zone.id ? (
                    <form action={envoyerZone} className="space-y-2.5">
                      <input type="hidden" name="id" value={zone.id} />
                      <input name="nom" className="champ" required maxLength={60}
                        defaultValue={zone.nom} aria-label="Nom de la zone" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <ChampMontant nom="frais" defaut={zone.frais} devise={devise}
                          etiquette="Frais de livraison de cette zone" />
                        <input name="delai" className="champ" maxLength={60}
                          defaultValue={zone.delai ?? ""} placeholder="24 à 48 h"
                          aria-label="Délai indicatif" />
                      </div>
                      <div className="flex gap-2">
                        <BoutonEnvoi className="btn-principal btn-petit">Enregistrer</BoutonEnvoi>
                        <button type="button" className="btn-secondaire btn-petit"
                          onClick={() => setEdition(null)}>Annuler</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-encre-900">
                          {zone.nom}
                          {!zone.actif ? <span className="ml-2 puce puce-neutre">Désactivée</span> : null}
                        </p>
                        <p className="mt-0.5 text-xs text-encre-500">
                          {zone.frais === 0 ? "Livraison offerte" : montant(zone.frais, devise)}
                          {zone.delai ? ` · ${zone.delai}` : ""}
                        </p>
                      </div>
                      <form action={actionBasculerZone}>
                        <input type="hidden" name="id" value={zone.id} />
                        <button type="submit" className="text-xs font-medium text-encre-600 hover:text-vert-700">
                          {zone.actif ? "Désactiver" : "Réactiver"}
                        </button>
                      </form>
                      <button type="button" className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
                        aria-label={`Modifier ${zone.nom}`} onClick={() => setEdition(zone.id)}>
                        <Crayon className="size-4" />
                      </button>
                      <form action={actionSupprimerZone}>
                        <input type="hidden" name="id" value={zone.id} />
                        <button type="submit" className="rounded-lg p-2 text-encre-500 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Supprimer ${zone.nom}`}>
                          <Corbeille className="size-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form action={envoyerZone} className="mt-4 space-y-2.5 border-t border-encre-100 pt-4">
            <p className="etiquette">Ajouter une zone</p>
            <input name="nom" className="champ" required maxLength={60}
              placeholder="Dakar centre" aria-label="Nom de la nouvelle zone" />
            <div className="grid gap-2 sm:grid-cols-2">
              <ChampMontant nom="frais" devise={devise}
                etiquette="Frais de livraison de la nouvelle zone" />
              <input name="delai" className="champ" maxLength={60} placeholder="24 à 48 h"
                aria-label="Délai indicatif" />
            </div>
            <BoutonEnvoi className="btn-secondaire" enCours="Ajout…">
              <Plus className="size-4" /> Ajouter cette zone
            </BoutonEnvoi>
          </form>
        </section>
      ) : null}
    </div>
  );
}
