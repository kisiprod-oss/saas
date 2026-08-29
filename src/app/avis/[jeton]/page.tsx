import Link from "next/link";
import { notFound } from "next/navigation";
import { interventionParJeton } from "@/lib/requetes";
import { actionDonnerAvis } from "@/lib/actions";
import { libelle, METIERS } from "@/lib/constantes";
import { dateFr } from "@/lib/format";
import { Alerte, Carte } from "@/components/ui";
import { LogoSen } from "@/components/entete-public";
import { ChoixEtoiles } from "@/components/choix-etoiles";

export const metadata = { title: "Donner mon avis" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAvis({
  params, searchParams,
}: { params: Promise<{ jeton: string }>; searchParams: Promise<Params> }) {
  const { jeton } = await params;
  const requete = await searchParams;
  const lire = (c: string) => {
    const v = requete[c];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };

  const intervention = interventionParJeton(jeton);
  if (!intervention) notFound();

  const merci = lire("merci") === "1";
  const erreur = lire("erreur");
  const dejaDonne = intervention.avis_id !== null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-lg bg-white px-4 py-2.5 shadow-sm"><LogoSen /></Link>
        </div>

        <Carte className="p-7">
          {merci || dejaDonne ? (
            <>
              <h1 className="text-xl font-bold text-slate-900">
                {merci ? "Merci pour votre avis" : "Avis déjà donné"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {merci
                  ? `Votre note aide les prochains clients à choisir. Elle est désormais visible sur la fiche de ${intervention.artisan_nom}.`
                  : "Un avis a déjà été donné pour cette intervention. Chaque intervention n'en autorise qu'un seul."}
              </p>
              <Link href="/professionnels" className="btn-primaire mt-5 w-full py-3">
                Voir les professionnels
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-slate-900">Comment s&apos;est passée l&apos;intervention ?</h1>
              <p className="mt-2 text-sm text-slate-600">
                <strong>{intervention.artisan_nom}</strong> — {libelle(METIERS, intervention.artisan_metier)}
                <br />
                Le {dateFr(intervention.date_intervention)}
                {intervention.description && ` · ${intervention.description}`}
              </p>

              {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

              <form action={actionDonnerAvis} className="mt-6 space-y-5">
                <input type="hidden" name="jeton" value={jeton} />

                <ChoixEtoiles />

                <div>
                  <label className="etiquette" htmlFor="commentaire">Votre commentaire (facultatif)</label>
                  <textarea
                    id="commentaire" name="commentaire" rows={4} maxLength={1000}
                    placeholder="Ponctualité, qualité du travail, propreté du chantier, prix respecté…"
                    className="champ"
                  />
                </div>

                <div>
                  <label className="etiquette" htmlFor="auteur">Votre prénom (facultatif)</label>
                  <input id="auteur" name="auteur" maxLength={40} placeholder="Awa" className="champ" />
                </div>

                <button type="submit" className="btn-primaire w-full py-3">Publier mon avis</button>

                <p className="text-center text-xs leading-relaxed text-slate-500">
                  Ce lien ne fonctionne qu&apos;une fois, et seulement pour cette
                  intervention. C&apos;est ce qui garantit que tous les avis affichés
                  correspondent à un vrai chantier.
                </p>
              </form>
            </>
          )}
        </Carte>
      </div>
    </div>
  );
}
