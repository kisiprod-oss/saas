import Link from "next/link";
import { redirect } from "next/navigation";
import { actionInscription } from "@/lib/actions";
import { utilisateurCourant } from "@/lib/auth";
import { Alerte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";
import { ChampMotDePasse } from "@/components/champ-mot-de-passe";
import { BoutonGoogle } from "@/components/bouton-google";

export const metadata = { title: "Créer mon agence" };

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageInscription({ searchParams }: { searchParams: Promise<Params> }) {
  if (await utilisateurCourant()) redirect("/dashboard");

  const params = await searchParams;
  const erreur = Array.isArray(params.erreur) ? params.erreur[0] : params.erreur;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></Link>
        </div>

        <div className="carte p-7">
          <h1 className="text-2xl font-bold text-slate-900">Créer mon espace agence</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gratuit pour démarrer. Vos données restent privées et séparées des autres agences.
          </p>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          <BoutonGoogle libelle="S’inscrire avec Google" />

          <form action={actionInscription} className="mt-6 space-y-4">
            <div>
              <label className="etiquette" htmlFor="nomAgence">Nom de l&apos;agence <span className="text-rose-500">*</span></label>
              <input id="nomAgence" name="nomAgence" required placeholder="Ex : Teranga Immobilier" className="champ" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="nom">Votre nom <span className="text-rose-500">*</span></label>
                <input id="nom" name="nom" required placeholder="Awa Diop" className="champ" />
              </div>
              <div>
                <label className="etiquette" htmlFor="telephone">Téléphone</label>
                <input id="telephone" name="telephone" placeholder="77 123 45 67" className="champ" />
              </div>
            </div>

            <div>
              <label className="etiquette" htmlFor="email">Adresse e-mail <span className="text-rose-500">*</span></label>
              <input id="email" name="email" type="email" required placeholder="vous@agence.sn" className="champ" />
            </div>

            <ChampMotDePasse />

            <button type="submit" className="btn-primaire w-full py-3">Créer mon agence</button>

            <p className="text-center text-xs leading-relaxed text-slate-500">
              En créant un compte, vous acceptez les{" "}
              <Link href="/cgu" className="font-medium text-brand-700 hover:underline">
                conditions d&apos;utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/confidentialite" className="font-medium text-brand-700 hover:underline">
                politique de confidentialité
              </Link>. Vous restez responsable des données de locataires que vous
              enregistrez.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
