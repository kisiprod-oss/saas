import Link from "next/link";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import { actionDemarrerQuiz } from "@/lib/actions";
import { listerAvis, noteArtisan } from "@/lib/requetes";
import { un } from "@/lib/db";
import { libelle, METIERS } from "@/lib/constantes";
import { dateFr } from "@/lib/format";
import {
  compterQuestions, DUREE_MINUTES, NB_QUESTIONS, SEUIL_REUSSITE, sessionEnCours,
} from "@/lib/quiz";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { Etoiles } from "@/components/etoiles";

export const metadata = { title: "Mon espace professionnel" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageEspacePro({ searchParams }: { searchParams: Promise<Params> }) {
  const artisan = await exigerSessionArtisan();
  const params = await searchParams;
  const envoye = (Array.isArray(params.envoye) ? params.envoye[0] : params.envoye) === "1";

  const fiche = un<{ motif_refus: string | null; publie: number }>(
    "SELECT motif_refus, publie FROM artisans WHERE id = ?", artisan.id,
  );
  const note = noteArtisan(artisan.id);
  const avis = listerAvis(artisan.id, 5);
  const enCours = sessionEnCours(artisan.id);
  const banquePrete = compterQuestions(artisan.metier) >= NB_QUESTIONS;

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Bonjour {artisan.nom.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{libelle(METIERS, artisan.metier)}</p>

      <div className="mt-5 space-y-4">
        <MessagesUrl params={params} />
        {envoye && (
          <Alerte type="succes">
            Votre candidature est bien enregistrée. Nous examinons votre dossier —
            vous recevrez une réponse ici même.
          </Alerte>
        )}
      </div>

      {/* ------------------------------ Où en est le dossier ------------------------------ */}
      <Carte className="mt-5 p-5">
        <h2 className="font-semibold text-slate-900">Ma candidature</h2>

        {artisan.statut_candidature === "en_attente" && (
          <div className="mt-3">
            <Alerte type="info">
              <strong>En cours d&apos;examen.</strong> Votre dossier est entre nos mains.
              Tant qu&apos;il n&apos;est pas validé, votre fiche n&apos;apparaît pas
              publiquement et vous ne pouvez pas encore passer le test.
            </Alerte>
          </div>
        )}

        {artisan.statut_candidature === "refuse" && (
          <div className="mt-3">
            <Alerte type="erreur">
              <strong>Dossier non retenu.</strong>
              {fiche?.motif_refus && <> {fiche.motif_refus}</>}
            </Alerte>
          </div>
        )}

        {artisan.statut_candidature === "valide" && (
          <div className="mt-3">
            <Alerte type="succes">
              <strong>Dossier validé.</strong> Votre fiche est visible par les agences
              et les locataires.
            </Alerte>
          </div>
        )}
      </Carte>

      {/* ------------------------------ Le test de compétence ------------------------------ */}
      {artisan.statut_candidature === "valide" && (
        <Carte className="mt-5 p-5">
          <h2 className="font-semibold text-slate-900">Test de compétence</h2>

          {artisan.quiz_reussi === 1 ? (
            <>
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-brand-50 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor"
                       strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-brand-900">Compétence vérifiée</p>
                  <p className="text-sm text-brand-800">
                    {artisan.quiz_score}/{artisan.quiz_total} bonnes réponses
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Ce badge s&apos;affiche sur votre fiche publique. Vous pouvez repasser
                le test pour améliorer votre score — il ne peut jamais baisser.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              {NB_QUESTIONS} questions tirées au hasard sur votre métier,
              en {DUREE_MINUTES} minutes. À partir de {SEUIL_REUSSITE} bonnes réponses,
              vous obtenez le badge « Compétence vérifiée ».
              {artisan.quiz_score !== null && (
                <> Votre meilleur résultat : <strong>{artisan.quiz_score}/{artisan.quiz_total}</strong>.</>
              )}
            </p>
          )}

          {!banquePrete ? (
            <div className="mt-4">
              <Alerte type="info">
                Le test de votre métier n&apos;est pas encore prêt. Revenez d&apos;ici
                quelques jours — nous vous préviendrons.
              </Alerte>
            </div>
          ) : enCours ? (
            <Link href="/pro/quiz" className="btn-primaire mt-4 w-full py-3">
              Reprendre mon test en cours
            </Link>
          ) : (
            <form action={actionDemarrerQuiz} className="mt-4">
              <button type="submit" className="btn-primaire w-full py-3">
                {artisan.quiz_passe_le ? "Repasser le test" : "Commencer le test"}
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Le minuteur démarre dès que vous cliquez. Installez-vous au calme.
              </p>
            </form>
          )}
        </Carte>
      )}

      {/* ------------------------------ Mes avis clients ------------------------------ */}
      <Carte className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Mes avis clients</h2>
          {note.nombre > 0 && <Etoiles note={note.moyenne} nombre={note.nombre} />}
        </div>

        {note.nombre === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Pas encore d&apos;avis. Ils viendront de vos clients après chaque
            intervention — c&apos;est ce qui donne vos étoiles, et personne ne peut
            en inventer.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {avis.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <Etoiles note={a.note} />
                  <span className="text-xs text-slate-400">{dateFr(a.cree_le)}</span>
                </div>
                {a.commentaire && <p className="mt-1.5 text-sm text-slate-600">{a.commentaire}</p>}
                {a.auteur && <p className="mt-1 text-xs text-slate-400">— {a.auteur}</p>}
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}
