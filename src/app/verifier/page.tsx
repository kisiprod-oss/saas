import { actionRechercherVerification } from "@/lib/actions";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { Alerte } from "@/components/ui";

export const metadata = {
  title: "Vérifier une quittance ou un bail",
  description:
    "Saisissez le code figurant sur une quittance de loyer ou un contrat de bail "
    + "Sen Gestion pour confirmer qu'il a bien été émis par l'agence indiquée.",
  alternates: { canonical: "/verifier" },
};
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageVerifierIndex({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const lire = (c: string) => {
    const v = params[c];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const erreur = lire("erreur");

  return (
    <div className="min-h-screen">
      <EntetePublic />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vérifier un document</h1>
        <p className="mt-2 text-sm text-slate-600">
          Saisissez le code imprimé sur une quittance ou un bail pour confirmer
          qu&apos;il existe bien dans les registres de l&apos;agence qui l&apos;a émis.
        </p>

        {erreur && <div className="mt-5"><Alerte type="erreur">{erreur}</Alerte></div>}

        <form action={actionRechercherVerification} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            name="code" required autoFocus maxLength={20}
            className="champ font-mono uppercase tracking-wider"
            placeholder="XXXX-XXXX-XXXX"
          />
          <button type="submit" className="btn-primaire shrink-0">Vérifier</button>
        </form>
      </main>
      <PiedPublic />
    </div>
  );
}
