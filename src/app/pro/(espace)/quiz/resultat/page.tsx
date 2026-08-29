import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import { un } from "@/lib/db";
import { SEUIL_REUSSITE, type SessionQuiz } from "@/lib/quiz";
import { Alerte, Carte } from "@/components/ui";

export const metadata = { title: "Résultat du test" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageResultatQuiz({ searchParams }: { searchParams: Promise<Params> }) {
  const artisan = await exigerSessionArtisan();
  const params = await searchParams;
  const id = Number(Array.isArray(params.s) ? params.s[0] : params.s);

  // On ne montre que SES propres résultats, jamais ceux d'un autre.
  const session = un<SessionQuiz>(
    "SELECT * FROM quiz_sessions WHERE id = ? AND artisan_id = ? AND termine_le IS NOT NULL",
    id, artisan.id,
  );
  if (!session) notFound();

  const score = session.score ?? 0;
  const reussi = session.reussi === 1;
  const proportion = session.total > 0 ? score / session.total : 0;

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Résultat de votre test</h1>

      <Carte className="mt-5 p-6 text-center">
        <p className="text-sm text-slate-500">Votre score</p>
        <p className={`mt-1 text-5xl font-extrabold ${reussi ? "text-brand-700" : "text-slate-900"}`}>
          {score}<span className="text-2xl text-slate-400">/{session.total}</span>
        </p>

        <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${reussi ? "bg-brand-600" : "bg-amber-400"}`}
            style={{ width: `${Math.round(proportion * 100)}%` }}
          />
        </div>

        <div className="mt-6">
          {reussi ? (
            <Alerte type="succes">
              <strong>Bravo, badge obtenu.</strong> La mention « Compétence vérifiée »
              s&apos;affiche désormais sur votre fiche publique.
            </Alerte>
          ) : (
            <Alerte type="info">
              Il fallait {SEUIL_REUSSITE} bonnes réponses pour obtenir le badge.
              Vous pouvez repasser le test — de nouvelles questions seront tirées,
              et votre meilleur score est toujours celui qui compte.
            </Alerte>
          )}
        </div>
      </Carte>

      <Carte className="mt-5 p-5">
        <p className="text-sm text-slate-600">
          <strong>Ce que dit ce test, et ce qu&apos;il ne dit pas.</strong> Il vérifie
          que vous connaissez les bases de votre métier. Il ne remplace pas
          l&apos;avis de vos clients : ce sont eux qui vous donnent vos étoiles,
          après un vrai chantier.
        </p>
      </Carte>

      <Link href="/pro" className="btn-primaire mt-5 w-full py-3">
        Retour à mon espace
      </Link>
    </>
  );
}
