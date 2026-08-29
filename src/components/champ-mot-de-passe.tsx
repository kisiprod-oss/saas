"use client";

import { useState } from "react";
import { REGLES } from "@/lib/mot-de-passe";

/**
 * Champ de mot de passe avec ses exigences cochées au fur et à mesure.
 *
 * Afficher les règles AVANT la validation, et les voir se cocher en tapant,
 * évite le va-et-vient « je soumets, on me refuse, je devine pourquoi ».
 * C'est d'autant plus utile ici que l'utilisateur crée son compte depuis un
 * téléphone, où relire un message d'erreur en haut de page coûte un
 * défilement.
 *
 * Rien n'est bloqué côté navigateur : le bouton reste cliquable et c'est le
 * serveur qui refuse. Un formulaire désactivé sans explication est plus
 * déroutant qu'un refus qui dit ce qui manque.
 */
export function ChampMotDePasse({
  nom = "motDePasse",
  label = "Mot de passe",
  autoComplete = "new-password",
}: {
  nom?: string;
  label?: string;
  autoComplete?: string;
}) {
  const [valeur, setValeur] = useState("");
  const [visible, setVisible] = useState(false);
  const commence = valeur.length > 0;

  return (
    <div>
      <label className="etiquette" htmlFor={nom}>{label}</label>
      <div className="relative">
        <input
          id={nom}
          name={nom}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          className="champ pr-20"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-500 hover:text-brand-700"
        >
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>

      <ul className="mt-2 space-y-1">
        {REGLES.map((r) => {
          const ok = r.respectee(valeur);
          return (
            <li
              key={r.cle}
              className={`flex items-center gap-1.5 text-xs ${
                ok ? "text-brand-700" : commence ? "text-slate-500" : "text-slate-400"
              }`}
            >
              <span aria-hidden className="w-3 shrink-0 text-center">{ok ? "✓" : "•"}</span>
              <span>{r.texte}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
