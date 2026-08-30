"use client";

import { useFormStatus } from "react-dom";
import { MAX_CARACTERES_DICTEE } from "@/lib/constantes";

/**
 * Champ de saisie en langage ordinaire, au-dessus d'un formulaire.
 *
 * L'agente ecrit sa phrase, le formulaire se pre-remplit, et elle relit
 * avant de valider : l'aide fait gagner la saisie, pas la decision.
 */

function BoutonPreparer() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primaire shrink-0" disabled={pending}>
      {pending ? "Analyse en cours…" : "Pré-remplir"}
    </button>
  );
}

export function DicteeDocument({
  action, placeholder, exemple,
}: {
  action: (fd: FormData) => Promise<void>;
  placeholder: string;
  exemple: string;
}) {
  return (
    <div className="mb-5 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          IA
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-brand-900">Décrivez-le en une phrase</h2>
          <p className="mt-0.5 text-sm text-brand-800">
            Écrivez comme vous le diriez à voix haute. Le formulaire se remplit tout
            seul — vous relisez et vous corrigez avant de valider.
          </p>

          <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <textarea
              name="description"
              rows={2}
              required
              maxLength={MAX_CARACTERES_DICTEE}
              placeholder={placeholder}
              className="champ flex-1 resize-y"
            />
            <BoutonPreparer />
          </form>

          <p className="mt-2 text-xs text-brand-800/80">
            Par exemple : « {exemple} »
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Ce que l'aide a compris, affiche au-dessus du formulaire pre-rempli.
 *
 * Le resume et les manques sont mis en avant volontairement : ils sont la
 * pour etre lus AVANT de cliquer sur « Créer », pas pour decorer.
 */
export function ResumePreparation({
  resume, manques,
}: { resume: string; manques: string[] }) {
  if (!resume && manques.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
      {resume && (
        <>
          <p className="text-sm font-semibold text-sky-900">Ce que j&apos;ai compris</p>
          <p className="mt-1 text-sm text-sky-900">{resume}</p>
        </>
      )}

      {manques.length > 0 && (
        <div className={resume ? "mt-3" : ""}>
          <p className="text-sm font-semibold text-sky-900">À compléter vous-même</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-sky-900">
            {manques.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-sky-800">
        Relisez chaque champ avant de valider : rien n&apos;est enregistré tant que
        vous n&apos;avez pas cliqué vous-même.
      </p>
    </div>
  );
}
