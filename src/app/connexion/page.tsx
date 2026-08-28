import Link from "next/link";
import { redirect } from "next/navigation";
import { actionConnexion } from "@/lib/actions";
import { utilisateurCourant } from "@/lib/auth";
import { Alerte } from "@/components/ui";
import { LogoKeur } from "@/components/entete-public";

export const metadata = { title: "Connexion" };

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageConnexion({ searchParams }: { searchParams: Promise<Params> }) {
  if (await utilisateurCourant()) redirect("/dashboard");

  const params = await searchParams;
  const erreur = Array.isArray(params.erreur) ? params.erreur[0] : params.erreur;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-lg bg-white px-4 py-2.5 shadow-sm"><LogoKeur /></Link>
        </div>

        <div className="carte p-7">
          <h1 className="text-2xl font-bold text-slate-900">Espace agence</h1>
          <p className="mt-1 text-sm text-slate-500">Connectez-vous pour gérer vos biens et vos loyers.</p>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          <form action={actionConnexion} className="mt-6 space-y-4">
            <div>
              <label className="etiquette" htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                     placeholder="vous@agence.sn" className="champ" />
            </div>
            <div>
              <label className="etiquette" htmlFor="motDePasse">Mot de passe</label>
              <input id="motDePasse" name="motDePasse" type="password" required
                     autoComplete="current-password" placeholder="••••••••" className="champ" />
            </div>
            <button type="submit" className="btn-primaire w-full py-3">Se connecter</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-semibold text-brand-700 hover:underline">
              Inscrire mon agence
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-brand-50/80">
          Compte de démonstration : <strong>demo@keurgestion.sn</strong> / <strong>demo1234</strong>
        </p>
      </div>
    </div>
  );
}
