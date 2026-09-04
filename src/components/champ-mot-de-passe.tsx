"use client";

import { useState } from "react";
import { REGLES } from "@/lib/mot-de-passe";
import { IconeCheck } from "./icones";

/**
 * Champ de mot de passe : ses exigences cochées en direct, un bouton pour
 * relire ce qu'on tape, et la confirmation juste en dessous.
 *
 * Afficher les règles AVANT la validation, et les voir se cocher en tapant,
 * évite le va-et-vient « je soumets, on me refuse, je devine pourquoi ».
 * C'est d'autant plus utile ici que l'utilisateur crée son compte depuis un
 * téléphone, où relire un message d'erreur en haut de page coûte un
 * défilement.
 *
 * LE BOUTON EST ENTRE LES DEUX CHAMPS, et les révèle tous les deux à la
 * fois : c'est le moment où l'on doute (« ai-je tapé la même chose ? ») et
 * l'endroit où la réponse est utile. Un bouton par champ obligerait à
 * dévoiler deux fois pour comparer.
 *
 * Rien n'est bloqué côté navigateur : le bouton d'envoi reste cliquable et
 * c'est le serveur qui refuse. Un formulaire désactivé sans explication est
 * plus déroutant qu'un refus qui dit ce qui manque. Le serveur revérifie
 * TOUT, y compris la concordance des deux saisies — le navigateur peut
 * mentir, et une confirmation vérifiée seulement ici ne vaudrait rien.
 */
export function ChampMotDePasse({
  nom = "motDePasse",
  nomConfirmation = "confirmation",
  label = "Mot de passe",
  autoComplete = "new-password",
}: {
  nom?: string;
  nomConfirmation?: string;
  label?: string;
  autoComplete?: string;
}) {
  const [valeur, setValeur] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);

  const commence = valeur.length > 0;
  const confirmee = confirmation.length > 0;
  const identiques = commence && valeur === confirmation;

  return (
    <div className="space-y-3">
      {/* ------------------------------ Mot de passe ------------------------------ */}
      <div>
        <label className="etiquette" htmlFor={nom}>{label}</label>
        <input
          id={nom}
          name={nom}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          className="champ"
          placeholder="••••••••"
        />

        <ul className="mt-2 space-y-1">
          {REGLES.map((r) => {
            const ok = r.respectee(valeur);
            return (
              <li
                key={r.cle}
                className={`flex items-center gap-1.5 text-xs ${
                  ok ? "text-succes-700" : commence ? "text-slate-500" : "text-slate-400"
                }`}
              >
                <span aria-hidden className="w-3 shrink-0 text-center">{ok ? "✓" : "•"}</span>
                <span>{r.texte}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ------------- Le bouton, entre les deux saisies qu'il révèle ------------- */}
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        className="btn-secondaire w-full py-2 text-xs"
      >
        {visible ? "Masquer les deux saisies" : "Afficher les deux saisies"}
      </button>

      {/* ------------------------------ Confirmation ------------------------------ */}
      <div>
        <label className="etiquette" htmlFor={nomConfirmation}>
          Confirmez le mot de passe
        </label>
        <input
          id={nomConfirmation}
          name={nomConfirmation}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className={`champ ${confirmee && !identiques ? "border-rose-400" : ""}`}
          placeholder="Saisissez-le une seconde fois"
        />

        {/* On ne crie pas « ça ne correspond pas » dès la première lettre :
            tant que la confirmation est plus courte, elle est simplement en
            cours de frappe. */}
        {confirmee && (
          identiques ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-succes-700">
              <IconeCheck className="h-3.5 w-3.5 shrink-0" /> Les deux saisies sont identiques.
            </p>
          ) : confirmation.length >= valeur.length ? (
            <p className="mt-1.5 text-xs text-rose-700">
              Les deux saisies sont différentes.
            </p>
          ) : null
        )}
      </div>
    </div>
  );
}
