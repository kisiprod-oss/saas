"use client";

import { useActionState } from "react";
import { actionDemanderOffre, type Etat } from "@/lib/actions-reglages";
import { BoutonEnvoi, Message } from "./ui";
import { Coche } from "./icones";
import { montant } from "@/lib/format";

/**
 * Le choix de formule.
 *
 * Aucun prestataire de facturation n'est branche : demander une formule
 * payante enregistre une DEMANDE, et l'equipe active a reception du reglement.
 * Le bouton le dit — promettre un paiement immediat qui n'existe pas serait
 * la pire facon de commencer une relation commerciale.
 */
export function ChoixOffre({
  offres, actuelle,
}: {
  offres: {
    code: string; nom: string; prix: number; maxProduits: number; quotaIa: number;
    maxMembres: number; domaine: boolean; publication: boolean; accroche: string | null;
  }[];
  actuelle: string;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionDemanderOffre, {});

  return (
    <section className="space-y-4">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {offres.map((offre) => {
          const active = offre.code === actuelle;
          return (
            <div key={offre.code}
              className={`carte flex flex-col p-5 ${active ? "ring-2 ring-vert-700" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-encre-900">{offre.nom}</h3>
                {active ? <span className="puce puce-vert">Votre formule</span> : null}
              </div>
              <p className="mt-1.5 text-xl font-bold text-encre-900">
                {offre.prix === 0 ? "Gratuit" : (
                  <>{montant(offre.prix, "FCFA")}
                    <span className="text-sm font-normal text-encre-500"> / mois</span></>
                )}
              </p>
              {offre.accroche ? (
                <p className="mt-1.5 text-sm text-encre-600">{offre.accroche}</p>
              ) : null}

              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-encre-700">
                <li className="flex gap-2">
                  <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                  {offre.maxProduits} produits
                </li>
                <li className="flex gap-2">
                  <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                  {offre.quotaIa} générations IA par mois
                </li>
                <li className="flex gap-2">
                  <Coche className={`mt-0.5 size-4 shrink-0 ${offre.publication ? "text-vert-600" : "text-encre-300"}`} />
                  {offre.publication ? "Boutique en ligne" : "Brouillon seulement"}
                </li>
                {offre.domaine ? (
                  <li className="flex gap-2">
                    <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                    Votre nom de domaine
                  </li>
                ) : null}
                {offre.maxMembres > 1 ? (
                  <li className="flex gap-2">
                    <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                    Jusqu&apos;à {offre.maxMembres} personnes
                  </li>
                ) : null}
              </ul>

              {!active ? (
                <form action={envoyer} className="mt-4">
                  <input type="hidden" name="offre" value={offre.code} />
                  <BoutonEnvoi
                    className={offre.prix === 0 ? "btn-secondaire w-full" : "btn-principal w-full"}
                    enCours="Enregistrement…">
                    {offre.prix === 0 ? "Repasser sur cette formule" : "Demander cette formule"}
                  </BoutonEnvoi>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-encre-500">
        Le paiement des abonnements n&apos;est pas encore automatisé : votre demande
        nous est transmise et nous vous contactons pour le règlement. Votre formule
        actuelle continue de fonctionner jusqu&apos;à l&apos;activation. Les frais du
        prestataire de paiement de VOS clients sont séparés et ne transitent pas
        par nous.
      </p>
    </section>
  );
}
