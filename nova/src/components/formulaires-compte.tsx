"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  actionConnexion, actionInscription, actionMotDePasseOublie, actionReinitialiser,
  type Etat,
} from "@/lib/actions-compte";
import { BoutonEnvoi, Message } from "./ui";

/**
 * Les quatre formulaires de compte.
 *
 * Ils partagent `useActionState` : l'erreur revient du serveur et s'affiche
 * au-dessus du formulaire, sans que la page soit rechargee et sans que la
 * saisie soit perdue. `defaultValue` remet ce qui avait ete tape.
 */

const VIDE: Etat = {};

export function FormulaireInscription() {
  const [etat, envoyer] = useActionState(actionInscription, VIDE);

  return (
    <form action={envoyer} className="space-y-4">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="nom_boutique">Nom de votre boutique</label>
        <input id="nom_boutique" name="nom_boutique" className="champ" required
          maxLength={80} autoComplete="organization" placeholder="Chez Awa" />
        <p className="aide">C&apos;est le nom que verront vos clients. Vous pourrez le changer.</p>
      </div>

      <div>
        <label className="etiquette" htmlFor="nom">Votre nom</label>
        <input id="nom" name="nom" className="champ" required maxLength={80}
          autoComplete="name" placeholder="Awa Diop" />
      </div>

      <div>
        <label className="etiquette" htmlFor="telephone">Téléphone</label>
        <input id="telephone" name="telephone" className="champ" required
          type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" />
        <p className="aide">Le numéro sur lequel vos clients vous joindront.</p>
      </div>

      <div>
        <label className="etiquette" htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" className="champ" required type="email"
          autoComplete="email" placeholder="vous@exemple.com" />
        <p className="aide">Elle sert à vous connecter et à récupérer votre compte.</p>
      </div>

      <div>
        <label className="etiquette" htmlFor="mot_de_passe">Mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" className="champ" required
          type="password" minLength={8} autoComplete="new-password" />
        <p className="aide">8 caractères minimum.</p>
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Création de votre boutique…">
        Créer ma boutique
      </BoutonEnvoi>

      <p className="text-center text-sm text-encre-600">
        Déjà un compte ? <Link href="/connexion" className="lien">Se connecter</Link>
      </p>
    </form>
  );
}

export function FormulaireConnexion({ message }: { message?: string }) {
  const [etat, envoyer] = useActionState(actionConnexion, VIDE);

  return (
    <form action={envoyer} className="space-y-4">
      {message ? <Message ton="info">{message}</Message> : null}
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" className="champ" required type="email"
          autoComplete="email" autoFocus />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="etiquette" htmlFor="mot_de_passe">Mot de passe</label>
          <Link href="/mot-de-passe-oublie" className="text-xs text-encre-600 hover:text-vert-700">
            Oublié ?
          </Link>
        </div>
        <input id="mot_de_passe" name="mot_de_passe" className="champ" required
          type="password" autoComplete="current-password" />
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Connexion…">Se connecter</BoutonEnvoi>

      <p className="text-center text-sm text-encre-600">
        Pas encore de boutique ? <Link href="/inscription" className="lien">En créer une</Link>
      </p>
    </form>
  );
}

export function FormulaireOubli() {
  const [etat, envoyer] = useActionState(actionMotDePasseOublie, VIDE);

  return (
    <form action={envoyer} className="space-y-4">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="email">Votre adresse e-mail</label>
        <input id="email" name="email" className="champ" required type="email"
          autoComplete="email" autoFocus />
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Envoi…">
        Recevoir un lien
      </BoutonEnvoi>

      <p className="text-center text-sm text-encre-600">
        <Link href="/connexion" className="lien">Retour à la connexion</Link>
      </p>
    </form>
  );
}

export function FormulaireReinitialisation({ jeton }: { jeton: string }) {
  const [etat, envoyer] = useActionState(actionReinitialiser, VIDE);

  return (
    <form action={envoyer} className="space-y-4">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      <input type="hidden" name="jeton" value={jeton} />

      <div>
        <label className="etiquette" htmlFor="mot_de_passe">Nouveau mot de passe</label>
        <input id="mot_de_passe" name="mot_de_passe" className="champ" required
          type="password" minLength={8} autoComplete="new-password" autoFocus />
        <p className="aide">8 caractères minimum.</p>
      </div>

      <div>
        <label className="etiquette" htmlFor="confirmation">Répétez-le</label>
        <input id="confirmation" name="confirmation" className="champ" required
          type="password" minLength={8} autoComplete="new-password" />
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Enregistrement…">
        Changer mon mot de passe
      </BoutonEnvoi>
    </form>
  );
}
