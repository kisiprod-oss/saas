import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { actionDeconnexion, actionEntrerDansLEspace } from "@/lib/actions";
import { NOMBRE_DE_PAGES, poidsGuide } from "@/lib/guide";
import { plan } from "@/lib/tarifs";
import { dateHeureFr } from "@/lib/format";
import { Alerte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";
import { NON_INDEXABLE } from "@/lib/seo";

import type { Metadata } from "next";

/** Page derriere une session : rien a faire dans un moteur de recherche. */
export const metadata: Metadata = { ...NON_INDEXABLE, title: "Votre guide Sen Gestion" };

type Params = { [cle: string]: string | string[] | undefined };

/**
 * Le passage oblige : le guide, puis l'espace.
 *
 * Cette page vit VOLONTAIREMENT hors de `dashboard/`. Le gardien est pose
 * dans la mise en page du tableau de bord ; si la page d'accueil du guide y
 * etait rangee, elle se renverrait vers elle-meme sans fin.
 *
 * Elle ne redirige jamais, elle non plus : une agence qui revient ici apres
 * coup voit simplement l'etat « deja telecharge ». Un aller-retour
 * automatique entre deux pages est la chose la plus facile a casser et la
 * plus penible a diagnostiquer une fois en ligne.
 */
export default async function PageBienvenue({ searchParams }: { searchParams: Promise<Params> }) {
  const { utilisateur, agence } = await exigerSession();
  const params = await searchParams;
  const rappel = (Array.isArray(params.rappel) ? params.rappel[0] : params.rappel) === "1";

  const dejaFait = agence.guide_telecharge_le;
  const formule = plan(agence.plan);
  const poids = poidsGuide();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <span className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></span>
        </div>

        <div className="carte p-7 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            Inclus dans votre formule {formule.nom}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Bienvenue {utilisateur.nom.split(" ")[0]}, voici votre guide
          </h1>
          <p className="mt-3 text-slate-600">
            Le guide complet de Sen Gestion, {NOMBRE_DE_PAGES} pages, est offert avec toutes
            les formules. Téléchargez-le maintenant : vous l&apos;aurez sous la main même sans
            connexion, et vous pourrez l&apos;imprimer pour votre équipe.
          </p>

          {rappel && (
            <div className="mt-5">
              <Alerte type="erreur">
                Téléchargez d&apos;abord le guide : le bouton vert ci-dessous. Votre espace
                s&apos;ouvre juste après.
              </Alerte>
            </div>
          )}

          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            {[
              "Enregistrer vos biens, vos propriétaires et vos locataires",
              "Rédiger un contrat de bail et le faire signer",
              "Encaisser les loyers et éditer les quittances",
              "Relancer un impayé sans y passer la journée",
            ].map((ligne) => (
              <li key={ligne} className="flex gap-2">
                <span aria-hidden className="text-brand-600">✓</span>
                <span>{ligne}</span>
              </li>
            ))}
          </ul>

          {/* Un lien, pas un bouton de formulaire : le navigateur enregistre
              le PDF et laisse cette page affichee. L'agence enchaine alors
              avec « Accéder à mon espace » sans avoir rien perdu de vue. */}
          <a
            href="/api/guide"
            className="btn-primaire mt-7 w-full justify-center py-3.5 text-base"
          >
            Télécharger le guide {poids ? `(PDF, ${poids})` : "(PDF)"}
          </a>

          {dejaFait ? (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm text-slate-500">
                Guide téléchargé le {dateHeureFr(dejaFait)}.
              </p>
              <Link href="/dashboard" className="btn-secondaire mt-3 w-full justify-center py-3">
                Accéder à mon espace →
              </Link>
            </div>
          ) : (
            <form action={actionEntrerDansLEspace} className="mt-6 border-t border-slate-100 pt-6">
              <button type="submit" className="btn-secondaire w-full justify-center py-3">
                J&apos;ai téléchargé le guide, accéder à mon espace →
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-slate-500">
            Le guide restera disponible à tout moment, en bas du menu de votre espace.
          </p>
        </div>

        {/* Une porte de sortie. Sans elle, quelqu'un qui s'est trompe de
            compte n'a aucun moyen d'en changer depuis cette page. */}
        <form action={actionDeconnexion} className="mt-6 text-center">
          <button type="submit" className="text-sm font-medium text-brand-50/90 hover:text-white hover:underline">
            Ce n&apos;est pas votre compte ? Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
