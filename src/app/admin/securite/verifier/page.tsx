import { redirect } from "next/navigation";
import { exigerAdminSansSecondeVerification, lireSecretTotp } from "@/lib/admin";
import { actionVerifierDoubleFacteur } from "@/lib/actions-admin";
import { NON_INDEXABLE } from "@/lib/seo";

export const metadata = { ...NON_INDEXABLE, title: "Vérification" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

/** Le code demandé à chaque entrée dans l'espace, et toutes les douze heures. */
export default async function PageVerifier({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdminSansSecondeVerification();
  const { secret, actif } = lireSecretTotp(admin.email);
  if (!secret || !actif) redirect("/admin/securite/activer");

  const erreur = lire(await searchParams, "erreur");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#083c32] px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-[#f8f7f2] p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5f26]">
          Administration
        </p>
        <h1 className="mt-4 text-2xl font-bold text-[#122f29]">Votre code</h1>
        <p className="mt-3 text-sm text-[#4f635c]">
          Ouvrez votre application d&apos;authentification et saisissez le code à six
          chiffres.
        </p>

        {erreur && (
          <p role="alert" className="mt-5 rounded-lg border border-[#b3261e]/30 bg-[#b3261e]/10 px-4 py-3 text-sm text-[#7d1a15]">
            {erreur}
          </p>
        )}

        <form action={actionVerifierDoubleFacteur} className="mt-6">
          <label className="sr-only" htmlFor="code">Code à six chiffres</label>
          <input
            id="code" name="code" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]{6}" maxLength={6} required autoFocus placeholder="000000"
            className="w-full rounded-lg border border-[#dfe3da] bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-[#122f29] outline-offset-2"
          />
          <button type="submit"
                  className="mt-4 w-full rounded-lg bg-[#eec477] px-6 py-3.5 text-[15px] font-semibold text-[#05271f] hover:bg-[#f6d492]">
            Entrer
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#4f635c]">{admin.email}</p>
      </div>
    </div>
  );
}
