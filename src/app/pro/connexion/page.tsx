import Link from "next/link";
import { redirect } from "next/navigation";
import { actionConnexionArtisan } from "@/lib/actions";
import { artisanCourant } from "@/lib/auth-artisan";
import { Alerte } from "@/components/ui";
import { LogoSen } from "@/components/entete-public";

export const metadata = { title: "Espace professionnel" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageConnexionArtisan({ searchParams }: { searchParams: Promise<Params> }) {
  if (await artisanCourant()) redirect("/pro");

  const params = await searchParams;
  const erreur = Array.isArray(params.erreur) ? params.erreur[0] : params.erreur;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-800 via-brand-800 to-brand-700 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-lg bg-white px-4 py-2.5 shadow-sm"><LogoSen /></Link>
        </div>

        <div className="carte p-7">
          <h1 className="text-2xl font-bold text-slate-900">Espace professionnel</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suivez votre candidature et passez votre test de compétence.
          </p>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          <form action={actionConnexionArtisan} className="mt-6 space-y-4">
            <div>
              <label className="etiquette" htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email"
                     placeholder="vous@exemple.sn" className="champ" />
            </div>
            <div>
              <label className="etiquette" htmlFor="motDePasse">Mot de passe</label>
              <input id="motDePasse" name="motDePasse" type="password" required
                     autoComplete="current-password" className="champ" />
            </div>
            <button type="submit" className="btn-primaire w-full py-3">Se connecter</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Pas encore inscrit ?{" "}
            <Link href="/pro/candidature" className="font-semibold text-brand-700 hover:underline">
              Déposer ma candidature
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
