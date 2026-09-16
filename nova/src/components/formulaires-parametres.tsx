"use client";

import { useActionState } from "react";
import { actionChangerMotDePasse, type Etat } from "@/lib/actions-compte";
import { actionDemanderAssistance, type Etat as EtatReglage } from "@/lib/actions-reglages";
import { BoutonEnvoi, Message } from "./ui";

export function FormulaireMotDePasse() {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionChangerMotDePasse, {});

  return (
    <form action={envoyer} className="space-y-3">
      <p className="etiquette mb-0">Changer mon mot de passe</p>
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <input name="actuel" type="password" className="champ" required
        autoComplete="current-password" placeholder="Mot de passe actuel"
        aria-label="Mot de passe actuel" />
      <input name="nouveau" type="password" className="champ" required minLength={8}
        autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères minimum)"
        aria-label="Nouveau mot de passe" />
      <input name="confirmation" type="password" className="champ" required minLength={8}
        autoComplete="new-password" placeholder="Répétez le nouveau mot de passe"
        aria-label="Confirmation du nouveau mot de passe" />

      <BoutonEnvoi className="btn-secondaire" enCours="Changement…">
        Changer mon mot de passe
      </BoutonEnvoi>
      <p className="aide">
        Toutes vos sessions ouvertes ailleurs seront fermées.
      </p>
    </form>
  );
}

export function FormulaireAssistance() {
  const [etat, envoyer] = useActionState<EtatReglage, FormData>(actionDemanderAssistance, {});

  return (
    <form action={envoyer} className="space-y-3">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <input name="sujet" className="champ" required maxLength={120}
        placeholder="Sujet" aria-label="Sujet de votre demande" />
      <textarea name="message" className="zone-texte" rows={4} required maxLength={3000}
        placeholder="Décrivez votre problème : ce que vous vouliez faire, ce qui s'est passé."
        aria-label="Votre message" />

      <BoutonEnvoi className="btn-secondaire" enCours="Envoi…">Envoyer ma demande</BoutonEnvoi>
    </form>
  );
}
