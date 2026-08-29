import { exigerAdmin } from "@/lib/admin";
import { actionGenererQuestions } from "@/lib/actions";
import { assistantConfigure } from "@/lib/assistant";
import { etatBanque, NB_QUESTIONS } from "@/lib/quiz";
import { Alerte, Carte, EnTetePage, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Banque de questions" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAdminQuiz({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin();
  const params = await searchParams;
  const lire = (c: string) => {
    const v = params[c];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const ajoutees = lire("ajoutees");

  const banque = etatBanque();
  const iaPrete = assistantConfigure();

  return (
    <>
      <EnTetePage
        titre="Banque de questions"
        sousTitre="Les tests sont tirés au hasard dans cette banque. Un métier n'est testable qu'à partir de 10 questions."
      />

      <div className="mt-5 space-y-4">
        <MessagesUrl params={params} />
        {ajoutees && (
          <Alerte type="succes">{ajoutees} question(s) ajoutée(s) à la banque.</Alerte>
        )}
        {!iaPrete && (
          <Alerte type="erreur">
            La clé <strong>ANTHROPIC_API_KEY</strong> n&apos;est pas configurée :
            impossible de générer des questions.
          </Alerte>
        )}
      </div>

      <Carte className="mt-5 p-5">
        <p className="text-sm text-slate-600">
          Les questions sont écrites à l&apos;avance, métier par métier, puis tirées
          au hasard au moment du test. Deux raisons : le coût — une génération sert
          des centaines de candidats — et la fiabilité : si l&apos;IA est indisponible,
          les tests fonctionnent quand même.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <strong>Relisez ce qui est produit.</strong> Une question fausse fausserait
          durablement la note de tous les candidats de ce métier. Générez, puis passez
          vous-même le test une fois avant d&apos;ouvrir un métier.
        </p>
      </Carte>

      <Carte className="mt-5 overflow-x-auto">
        <table className="tableau">
          <thead>
            <tr><th>Métier</th><th>Questions</th><th>État</th><th></th></tr>
          </thead>
          <tbody>
            {banque.map((m) => (
              <tr key={m.metier}>
                <td className="font-medium text-slate-900">{m.libelle}</td>
                <td className="tabular-nums">{m.nombre}</td>
                <td>
                  {m.nombre >= NB_QUESTIONS ? (
                    <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Testable</span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600 ring-slate-500/20">
                      {NB_QUESTIONS - m.nombre} manquante(s)
                    </span>
                  )}
                </td>
                <td className="text-right">
                  <form action={actionGenererQuestions} className="flex items-center justify-end gap-2">
                    <input type="hidden" name="metier" value={m.metier} />
                    {m.nombre > 0 && (
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                        <input type="checkbox" name="remplacer"
                               className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                        Remplacer
                      </label>
                    )}
                    <button type="submit" disabled={!iaPrete} className="btn-secondaire px-3 py-1.5 text-xs">
                      Générer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Carte>

      <p className="mt-4 text-xs text-slate-500">
        Chaque génération est un appel facturé à l&apos;IA. Sans la case
        « Remplacer », les nouvelles questions s&apos;ajoutent aux anciennes.
      </p>
    </>
  );
}
