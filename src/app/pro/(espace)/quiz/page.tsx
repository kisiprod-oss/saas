import { redirect } from "next/navigation";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import { actionRendreQuiz } from "@/lib/actions";
import { libelle, METIERS } from "@/lib/constantes";
import {
  DUREE_MINUTES, questionsDeLaSession, SEUIL_REUSSITE, sessionEnCours,
} from "@/lib/quiz";
import { Carte } from "@/components/ui";
import { QuizMinuteur } from "@/components/quiz-minuteur";

export const metadata = { title: "Test de compétence" };
export const dynamic = "force-dynamic";

export default async function PageQuiz() {
  const artisan = await exigerSessionArtisan();
  const session = sessionEnCours(artisan.id);

  // Pas de session ouverte (ou déjà expirée) : on renvoie à l'accueil,
  // où l'artisan peut en démarrer une nouvelle.
  if (!session) redirect("/pro");

  const questions = questionsDeLaSession(session);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Test — {libelle(METIERS, session.metier)}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {questions.length} questions, {DUREE_MINUTES} minutes.
        {" "}{SEUIL_REUSSITE} bonnes réponses suffisent pour obtenir le badge.
      </p>

      <form action={actionRendreQuiz} id="copie-quiz" className="mt-5">
        <input type="hidden" name="session_id" value={session.id} />

        <QuizMinuteur expireLe={session.expire_le} />

        <ol className="mt-5 space-y-4">
          {questions.map((q, i) => (
            <li key={q.id}>
              <Carte className="p-5">
                <fieldset>
                  <legend className="font-semibold text-slate-900">
                    <span className="mr-2 text-brand-700">{i + 1}.</span>
                    {q.question}
                  </legend>
                  <div className="mt-3 space-y-2">
                    {q.propositions.map((p, index) => (
                      <label
                        key={index}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                      >
                        <input
                          type="radio"
                          name={`reponse_${q.id}`}
                          value={index}
                          className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>{p}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </Carte>
            </li>
          ))}
        </ol>

        <div className="mt-6">
          <button type="submit" className="btn-primaire w-full py-3">
            Rendre ma copie
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Une question sans réponse compte comme une erreur. À la fin du temps,
            votre copie est envoyée automatiquement.
          </p>
        </div>
      </form>
    </>
  );
}
