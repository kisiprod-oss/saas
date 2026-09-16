"use client";

import { useState } from "react";
import { actionSuivreCommande } from "@/lib/actions-boutique";
import { montant, dateHeureFr } from "@/lib/format";
import { libelle, STATUTS_COMMANDE, STATUTS_LIVRAISON, STATUTS_PAIEMENT } from "@/lib/statuts";
import { Message, Rondelle } from "./ui";

type Trouvee = {
  reference: string; statut: string; statut_livraison: string;
  statut_paiement: string; total: number; cree_le: string; devise: string;
};

/**
 * Suivi sans compte client.
 *
 * Deux informations sont exigees : la reference ET le numero de telephone.
 * La reference seule fait cinq caracteres — quelqu'un pourrait en essayer
 * beaucoup. Le couple des deux, avec la limitation de debit cote serveur
 * (20 essais par quart d'heure), ferme la porte.
 */
export function FormulaireSuivi({ slug }: { slug: string }) {
  const [etat, setEtat] = useState<{ erreur?: string; commande?: Trouvee }>({});
  const [enCours, setEnCours] = useState(false);

  async function chercher(donnees: FormData) {
    setEnCours(true);
    setEtat({});
    try {
      const resultat = await actionSuivreCommande(
        slug,
        String(donnees.get("reference") ?? ""),
        String(donnees.get("telephone") ?? ""),
      );
      setEtat(resultat.ok ? { commande: resultat.commande } : { erreur: resultat.erreur });
    } catch {
      setEtat({ erreur: "La recherche a échoué. Vérifiez votre connexion." });
    } finally {
      setEnCours(false);
    }
  }

  const devise = etat.commande
    ? (etat.commande.devise === "XOF" || etat.commande.devise === "XAF" ? "FCFA" : etat.commande.devise)
    : "FCFA";

  return (
    <div className="space-y-5">
      <form action={chercher} className="space-y-4">
        <div>
          <label className="etiquette" htmlFor="reference">Référence de commande</label>
          <input id="reference" name="reference" className="champ font-mono uppercase"
            required maxLength={20} placeholder="CMD-7K2M9" />
        </div>
        <div>
          <label className="etiquette" htmlFor="telephone">Votre téléphone</label>
          <input id="telephone" name="telephone" className="champ" required
            type="tel" inputMode="tel" placeholder="77 123 45 67" />
        </div>
        <button type="submit" className="btn-principal w-full" disabled={enCours}>
          {enCours ? <><Rondelle className="size-4" /> Recherche…</> : "Voir ma commande"}
        </button>
      </form>

      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      {etat.commande ? (
        <div className="carte apparait p-5">
          <p className="font-mono text-lg font-bold">{etat.commande.reference}</p>
          <p className="mt-0.5 text-xs text-encre-500">
            Passée le {dateHeureFr(etat.commande.cree_le)}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <Ligne titre="Commande" valeur={libelle(STATUTS_COMMANDE, etat.commande.statut)} />
            <Ligne titre="Livraison" valeur={libelle(STATUTS_LIVRAISON, etat.commande.statut_livraison)} />
            <Ligne titre="Paiement" valeur={libelle(STATUTS_PAIEMENT, etat.commande.statut_paiement)} />
            <Ligne titre="Total" valeur={montant(etat.commande.total, devise)} />
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function Ligne({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-encre-600">{titre}</dt>
      <dd className="font-medium text-encre-900">{valeur}</dd>
    </div>
  );
}
