import Link from "next/link";
import { redirect } from "next/navigation";
import { actionConnexionLocataire } from "@/lib/actions";
import { locataireCourant } from "@/lib/auth-locataire";
import { Alerte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";

export const metadata = { title: "Espace locataire" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageConnexionLocataire({ searchParams }: { searchParams: Promise<Params> }) {
  if (await locataireCourant()) redirect("/espace-locataire");

  const params = await searchParams;
  const erreur = Array.isArray(params.erreur) ? params.erreur[0] : params.erreur;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sable-600 via-sable-500 to-brand-700 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></Link>
        </div>

        <div className="carte p-7">
          <h1 className="text-2xl font-bold text-slate-900">Espace locataire</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consultez vos quittances et signalez vos règlements de loyer.
          </p>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          <form action={actionConnexionLocataire} className="mt-6 space-y-4">
            <div>
              <label className="etiquette" htmlFor="telephone">Numéro de téléphone</label>
              <input id="telephone" name="telephone" type="tel" required autoComplete="tel"
                     placeholder="77 123 45 67" className="champ" />
            </div>
            <div>
              <label className="etiquette" htmlFor="motDePasse">Mot de passe</label>
              <input id="motDePasse" name="motDePasse" type="password" required
                     autoComplete="current-password" placeholder="Fourni par votre agence" className="champ" />
            </div>
            <button type="submit" className="btn-sable w-full py-3">Se connecter</button>
          </form>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
            Votre agence vous a communiqué ce mot de passe. Vous ne l&apos;avez
            pas encore reçu ? Contactez-la directement.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-white/80">
          <Link href="/connexion" className="hover:underline">Vous gérez une agence ? Connectez-vous ici</Link>
        </p>
      </div>
    </div>
  );
}
