import Link from "next/link";
import { actionReinitialiser } from "@/lib/actions";
import { lireDemandeReinitialisation } from "@/lib/auth";
import { Alerte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";
import { ChampMotDePasse } from "@/components/champ-mot-de-passe";

export const metadata = { title: "Nouveau mot de passe" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageReinitialiser({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<Params> }) {
  const { token } = await params;
  const requete = await searchParams;
  const erreur = Array.isArray(requete.erreur) ? requete.erreur[0] : requete.erreur;
  const demande = lireDemandeReinitialisation(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></Link>
        </div>

        <div className="carte p-7">
          {!demande ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Lien expiré</h1>
              <div className="mt-5">
                <Alerte type="erreur">
                  Ce lien n&apos;est plus valable : il a déjà servi, ou il a plus d&apos;une heure.
                </Alerte>
              </div>
              <Link href="/mot-de-passe-oublie" className="btn-primaire mt-3 w-full py-3">
                Demander un nouveau lien
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Nouveau mot de passe</h1>
              <p className="mt-1 text-sm text-slate-500">
                Bonjour {demande.nom}, choisissez le mot de passe de votre compte
                <strong className="text-slate-700"> {demande.email}</strong>.
              </p>

              {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

              <form action={actionReinitialiser} className="mt-6 space-y-4">
                <input type="hidden" name="token" value={token} />
                <ChampMotDePasse label="Nouveau mot de passe" />
                <div>
                  <label className="etiquette" htmlFor="confirmation">Confirmez le mot de passe</label>
                  <input id="confirmation" name="confirmation" type="password" required
                         autoComplete="new-password" placeholder="Saisissez-le une seconde fois" className="champ" />
                </div>
                <button type="submit" className="btn-primaire w-full py-3">
                  Enregistrer et se connecter
                </button>
              </form>

              <p className="mt-4 text-xs text-slate-500">
                Par sécurité, toutes les sessions ouvertes sur ce compte seront fermées.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
