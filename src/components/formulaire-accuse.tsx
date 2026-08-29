import { actionAccuserReception } from "@/lib/actions";

/** Saisie du code de reception, sur la page du document partage. */
export function FormulaireAccuse({ jeton }: { jeton: string }) {
  return (
    <form action={actionAccuserReception} className="mt-4 flex flex-wrap items-end gap-3">
      <input type="hidden" name="jeton" value={jeton} />
      <div>
        <label className="etiquette" htmlFor="code">Code reçu sur WhatsApp</label>
        <input
          id="code"
          name="code"
          required
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          placeholder="Ex : K7M2PQ"
          className="champ w-44 font-mono uppercase tracking-widest"
        />
      </div>
      <button type="submit" className="btn-primaire">Confirmer la réception</button>
    </form>
  );
}
