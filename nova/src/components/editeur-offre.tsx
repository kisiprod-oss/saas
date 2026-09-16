"use client";

import { useActionState } from "react";
import { actionEnregistrerOffre, type Etat } from "@/lib/actions-admin";
import { BoutonEnvoi, Message } from "./ui";

export function EditeurOffre({
  offre,
}: {
  offre: {
    code: string; nom: string; prix: number; maxProduits: number; quotaIa: number;
    maxMembres: number; domaine: boolean; publication: boolean;
    accroche: string | null; actif: boolean;
  };
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerOffre, {});

  return (
    <form action={envoyer} className="carte space-y-3 p-5">
      <input type="hidden" name="code" value={offre.code} />

      <div className="flex items-center justify-between gap-2">
        <h2 className="titre-section">{offre.nom}</h2>
        <code className="font-mono text-xs text-encre-400">{offre.code}</code>
      </div>

      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor={`nom-${offre.code}`}>Nom affiché</label>
          <input id={`nom-${offre.code}`} name="nom" className="champ" required maxLength={60}
            defaultValue={offre.nom} />
        </div>
        <div>
          <label className="etiquette" htmlFor={`prix-${offre.code}`}>Prix mensuel (FCFA)</label>
          <input id={`prix-${offre.code}`} name="prix_mensuel" type="number" min={0}
            className="champ" defaultValue={offre.prix} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="etiquette" htmlFor={`produits-${offre.code}`}>Produits</label>
          <input id={`produits-${offre.code}`} name="max_produits" type="number" min={0}
            className="champ" defaultValue={offre.maxProduits} />
        </div>
        <div>
          <label className="etiquette" htmlFor={`ia-${offre.code}`}>IA / mois</label>
          <input id={`ia-${offre.code}`} name="quota_ia" type="number" min={0}
            className="champ" defaultValue={offre.quotaIa} />
        </div>
        <div>
          <label className="etiquette" htmlFor={`membres-${offre.code}`}>Personnes</label>
          <input id={`membres-${offre.code}`} name="max_membres" type="number" min={1}
            className="champ" defaultValue={offre.maxMembres} />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor={`accroche-${offre.code}`}>Accroche</label>
        <input id={`accroche-${offre.code}`} name="accroche" className="champ" maxLength={200}
          defaultValue={offre.accroche ?? ""} />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publication" value="1" className="size-4.5 accent-vert-700"
            defaultChecked={offre.publication} />
          Publication autorisée
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="domaine_personnalise" value="1" className="size-4.5 accent-vert-700"
            defaultChecked={offre.domaine} />
          Domaine personnalisé
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="actif" value="1" className="size-4.5 accent-vert-700"
            defaultChecked={offre.actif} />
          Proposée publiquement
        </label>
      </div>

      <BoutonEnvoi className="btn-secondaire" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
    </form>
  );
}
