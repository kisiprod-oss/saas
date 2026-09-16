"use client";

import { useActionState } from "react";
import { actionConnexionAdmin, type Etat } from "@/lib/actions-admin";
import { BoutonEnvoi, Message } from "./ui";

export function FormulaireAdmin() {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionConnexionAdmin, {});

  return (
    <form action={envoyer} className="space-y-4">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" className="champ" required type="email"
          autoComplete="username" autoFocus />
      </div>
      <div>
        <label className="etiquette" htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" className="champ" required
          type="password" autoComplete="current-password" />
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Connexion…">Entrer</BoutonEnvoi>
    </form>
  );
}
