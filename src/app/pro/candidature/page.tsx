import Link from "next/link";
import { redirect } from "next/navigation";
import { actionCandidature } from "@/lib/actions";
import { artisanCourant } from "@/lib/auth-artisan";
import { METIERS, VILLES } from "@/lib/constantes";
import { NOMBRE_MAX_DOCUMENTS } from "@/lib/documents";
import { NB_QUESTIONS, DUREE_MINUTES, SEUIL_REUSSITE } from "@/lib/quiz";
import { Alerte } from "@/components/ui";
import { ChampPhotoProfil } from "@/components/champ-photo-profil";
import { LogoSen } from "@/components/entete-public";
import { ChampMotDePasse } from "@/components/champ-mot-de-passe";

export const metadata = { title: "Devenir professionnel référencé" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageCandidature({ searchParams }: { searchParams: Promise<Params> }) {
  if (await artisanCourant()) redirect("/pro");

  const params = await searchParams;
  const erreur = Array.isArray(params.erreur) ? params.erreur[0] : params.erreur;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/"><LogoSen /></Link>
          <Link href="/pro/connexion" className="btn-secondaire">J&apos;ai déjà un compte</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Rejoindre les professionnels référencés
        </h1>
        <p className="mt-2 text-slate-600">
          Faites-vous connaître des agences immobilières et des locataires de tout le Sénégal.
        </p>

        {/* -------------------------- Comment ça se passe -------------------------- */}
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Vous postulez", "Votre parcours, vos références, votre CV."],
            ["Nous vérifions", "Un examen de votre dossier par la plateforme."],
            ["Vous passez le test", `${NB_QUESTIONS} questions sur votre métier, ${DUREE_MINUTES} minutes.`],
          ].map(([titre, texte], i) => (
            <li key={titre} className="carte p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2 font-semibold text-slate-900">{titre}</p>
              <p className="mt-0.5 text-sm text-slate-500">{texte}</p>
            </li>
          ))}
        </ol>

        {erreur && <div className="mt-6"><Alerte type="erreur">{erreur}</Alerte></div>}

        <form action={actionCandidature} className="mt-6 space-y-5">
          <fieldset className="carte p-5">
            <legend className="px-2 text-sm font-semibold text-brand-800">Qui êtes-vous ?</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="nom">Nom ou raison sociale <span className="text-rose-500">*</span></label>
                <input id="nom" name="nom" required placeholder="Moussa Diallo" className="champ" />
              </div>
              <div>
                <label className="etiquette" htmlFor="metier">Corps de métier <span className="text-rose-500">*</span></label>
                <select id="metier" name="metier" required defaultValue="" className="champ">
                  <option value="" disabled>Choisissez…</option>
                  {METIERS.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="telephone">Téléphone <span className="text-rose-500">*</span></label>
                <input id="telephone" name="telephone" required placeholder="77 123 45 67" className="champ" />
              </div>
              <div>
                <label className="etiquette" htmlFor="telephone2">Second téléphone</label>
                <input id="telephone2" name="telephone2" placeholder="76 123 45 67" className="champ" />
              </div>
              <div>
                <label className="etiquette" htmlFor="ville">Ville</label>
                <input id="ville" name="ville" list="villes-pro" defaultValue="Dakar" className="champ" />
                <datalist id="villes-pro">{VILLES.map((v) => <option key={v} value={v} />)}</datalist>
              </div>
              <div>
                <label className="etiquette" htmlFor="quartier">Quartier</label>
                <input id="quartier" name="quartier" placeholder="Sacré-Cœur" className="champ" />
              </div>
            </div>
          </fieldset>

          <fieldset className="carte p-5">
            <legend className="px-2 text-sm font-semibold text-brand-800">Votre photo</legend>
            <div className="mt-3">
              <ChampPhotoProfil
                obligatoire
                aide="Une photo nette de votre visage, en pleine lumière. C'est ce que voient d'abord les agences et les locataires — et c'est ce qui les décide à vous appeler."
              />
              <p className="mt-4 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-900">
                Confier ses clés ou laisser entrer quelqu&apos;un chez soi demande de la
                confiance. Un visage change tout : les fiches avec photo sont contactées
                bien plus souvent. Photo de vous, pas un logo.
              </p>
            </div>
          </fieldset>

          <fieldset className="carte p-5">
            <legend className="px-2 text-sm font-semibold text-brand-800">Votre parcours</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="experience_annees">Années d&apos;expérience</label>
                <input id="experience_annees" name="experience_annees" type="number" min={0} max={70}
                       defaultValue={0} className="champ" />
              </div>
              <div>
                <label className="etiquette" htmlFor="tarif_indicatif">Tarif indicatif</label>
                <input id="tarif_indicatif" name="tarif_indicatif"
                       placeholder="À partir de 5 000 FCFA le déplacement" className="champ" />
              </div>
              <div className="sm:col-span-2">
                <label className="etiquette" htmlFor="description">Présentez votre travail</label>
                <textarea id="description" name="description" rows={4} className="champ"
                          placeholder="Vos spécialités, les chantiers que vous avez réalisés, ce que vous savez faire de mieux…" />
                <p className="mt-1 text-xs text-slate-500">
                  Écrivez simplement, comme vous le diriez à un client. C&apos;est ce que
                  les agences liront en premier.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="carte p-5">
            <legend className="px-2 text-sm font-semibold text-brand-800">Vos pièces</legend>
            <div className="mt-2 space-y-4">
              <div>
                <label className="etiquette" htmlFor="cv">CV (facultatif)</label>
                <input id="cv" name="cv" type="file" accept=".pdf,.jpg,.jpeg,.png"
                       className="champ file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700" />
              </div>
              <div>
                <label className="etiquette" htmlFor="documents">
                  Diplômes, attestations, photos de chantiers (facultatif)
                </label>
                <input id="documents" name="documents" type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
                       className="champ file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700" />
                <p className="mt-1 text-xs text-slate-500">
                  Jusqu&apos;à {NOMBRE_MAX_DOCUMENTS} fichiers, 8 Mo chacun. PDF, JPEG ou PNG.
                </p>
              </div>
              <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                Ces documents ne sont lus que par l&apos;équipe qui examine votre dossier.
                Ils ne sont jamais publiés, ni transmis aux agences ou aux locataires.
              </p>
            </div>
          </fieldset>

          <fieldset className="carte p-5">
            <legend className="px-2 text-sm font-semibold text-brand-800">Votre accès</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="email">Adresse e-mail <span className="text-rose-500">*</span></label>
                <input id="email" name="email" type="email" required placeholder="vous@exemple.sn" className="champ" />
              </div>
              <ChampMotDePasse />
            </div>
          </fieldset>

          <div className="carte p-5">
            <p className="text-sm text-slate-600">
              <strong>Ce qui vous attend ensuite.</strong> Une fois votre dossier validé,
              vous passerez un test de {NB_QUESTIONS} questions sur votre métier, en
              {" "}{DUREE_MINUTES} minutes. À partir de {SEUIL_REUSSITE} bonnes réponses,
              le badge « Compétence vérifiée » s&apos;affiche sur votre fiche.
              Vos étoiles, elles, viendront uniquement de vos clients.
            </p>
            <button type="submit" className="btn-primaire mt-4 w-full py-3">
              Envoyer ma candidature
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
