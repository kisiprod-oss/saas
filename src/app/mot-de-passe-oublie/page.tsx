import Link from "next/link";
import { redirect } from "next/navigation";
import { actionDemanderReinitialisation } from "@/lib/actions";
import { utilisateurCourant } from "@/lib/auth";
import { smtpConfigure } from "@/lib/email";
import { Alerte } from "@/components/ui";
import { LogoSen } from "@/components/entete-public";

export const metadata = { title: "Mot de passe oublié" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageMotDePasseOublie({ searchParams }: { searchParams: Promise<Params> }) {
  if (await utilisateurCourant()) redirect("/dashboard");

  const params = await searchParams;
  const erreur = lire(params, "erreur");
  const envoye = lire(params, "envoye") === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-lg bg-white px-4 py-2.5 shadow-sm"><LogoSen /></Link>
        </div>

        <div className="carte p-7">
          <h1 className="text-2xl font-bold text-slate-900">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-slate-500">
            Indiquez l&apos;adresse e-mail de votre compte : nous vous envoyons un lien
            pour en choisir un nouveau.
          </p>

          {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

          {envoye ? (
            <>
              <div className="mt-5">
                <Alerte type="succes">
                  Si un compte existe avec cette adresse, un lien vient d&apos;être envoyé.
                  Vérifiez votre boîte de réception, et le dossier des indésirables.
                </Alerte>
              </div>

              {!smtpConfigure() && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <strong>Note pour l&apos;administrateur :</strong> aucun serveur d&apos;e-mail
                  n&apos;est configuré. Le message a été écrit dans le dossier
                  <code className="mx-1 rounded bg-amber-100 px-1">data/emails/</code>
                  au lieu d&apos;être envoyé.
                </div>
              )}

              <Link href="/connexion" className="btn-secondaire mt-5 w-full">
                Retour à la connexion
              </Link>
            </>
          ) : (
            <form action={actionDemanderReinitialisation} className="mt-6 space-y-4">
              <div>
                <label className="etiquette" htmlFor="email">Adresse e-mail</label>
                <input id="email" name="email" type="email" required autoComplete="email"
                       placeholder="vous@agence.sn" className="champ" />
              </div>
              <button type="submit" className="btn-primaire w-full py-3">
                Recevoir le lien
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/connexion" className="font-semibold text-brand-700 hover:underline">
              Je me souviens de mon mot de passe
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
