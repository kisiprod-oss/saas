import Link from "next/link";
import { dateLongue, fcfa } from "@/lib/format";
import { codeLisible, verifierDocument } from "@/lib/verification";
import { EntetePublic, PiedPublic } from "@/components/entete-public";

export const metadata = { title: "Vérifier un document" };
export const dynamic = "force-dynamic";

/**
 * Page publique de verification.
 *
 * Volontairement accessible sans compte : celui qui doit verifier un
 * document — un locataire, un proprietaire, un tribunal — n'a aucune raison
 * d'avoir un acces a l'application.
 *
 * Elle n'affiche que ce qui permet de confronter le papier a la base :
 * agence, numero, date, montant, et le nom du locataire abrege. Quiconque
 * ramasse un code sur une photo n'apprend pas l'identite complete de
 * quelqu'un.
 */
export default async function PageVerification({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const doc = verifierDocument(code);

  return (
    <>
      <EntetePublic />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Vérification d&apos;un document
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Code saisi : <span className="font-mono font-semibold">{codeLisible(code.toUpperCase())}</span>
        </p>

        {doc ? (
          <div className="carte mt-6 overflow-hidden">
            <div className={`px-6 py-4 impression-couleurs ${doc.annule ? "bg-amber-50" : "bg-brand-50"}`}>
              <p className={`text-lg font-bold ${doc.annule ? "text-amber-900" : "text-brand-900"}`}>
                {doc.annule
                  ? "Ce document existe, mais il a été annulé"
                  : "Ce document est authentique"}
              </p>
              <p className={`mt-0.5 text-sm ${doc.annule ? "text-amber-800" : "text-brand-800"}`}>
                {doc.annule
                  ? "Il figure bien dans les registres de l'agence, mais n'est plus valable. Rapprochez-vous d'elle."
                  : "Il figure dans les registres de l'agence qui l'a émis, avec les informations ci-dessous."}
              </p>
            </div>

            <dl className="divide-y divide-slate-100 px-6 py-2 text-sm">
              {[
                ["Type", doc.type === "quittance" ? "Quittance de loyer" : "Contrat de bail"],
                ["Numéro", doc.numero],
                ["Émis par", [doc.agence, doc.agenceVille].filter(Boolean).join(" — ")],
                ["Locataire", doc.locataire],
                ["Date", dateLongue(doc.date)],
                [doc.type === "quittance" ? "Montant" : "Loyer et charges",
                 doc.montant === null ? "—" : fcfa(doc.montant)],
                [doc.type === "quittance" ? "Période" : "Logement", doc.detail],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="border-t border-slate-100 px-6 py-4 text-xs leading-relaxed text-slate-500">
              Comparez ces informations avec celles imprimées sur votre document. Si un montant,
              une date ou un nom diffère, le papier que vous avez en main n&apos;est pas celui
              qui a été émis : contactez l&apos;agence.
            </p>
          </div>
        ) : (
          <div className="carte mt-6 overflow-hidden">
            <div className="bg-rose-50 px-6 py-4 impression-couleurs">
              <p className="text-lg font-bold text-rose-900">Aucun document ne porte ce code</p>
              <p className="mt-0.5 text-sm text-rose-800">
                Ce code ne correspond à rien dans nos registres.
              </p>
            </div>
            <div className="px-6 py-4 text-sm text-slate-600">
              <p>Deux explications possibles :</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>le code a été mal recopié — vérifiez chaque caractère ;</li>
                <li>
                  le document n&apos;a pas été émis par une agence utilisant Sen Gestion, ou
                  n&apos;a pas été émis du tout.
                </li>
              </ul>
              <p className="mt-3">
                Dans le doute, demandez à l&apos;agence de vous renvoyer le document depuis son
                espace : elle seule peut le rééditer.
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-brand-700 hover:underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </main>
      <PiedPublic />
    </>
  );
}
