import Link from "next/link";
import { PLANS, economieAnnuelle } from "@/lib/tarifs";
import { fcfa, nombre } from "@/lib/format";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { IconeCheck } from "@/components/icones";

export const metadata = {
  title: "Tarifs",
  description:
    "Formules et tarifs de Sen Gestion : gratuit pour démarrer, puis 5 000 à 45 000 FCFA par mois. Sans engagement, paiement Orange Money et Wave.",
};

type Params = { [cle: string]: string | string[] | undefined };

const QUESTIONS = [
  {
    q: "Puis-je changer de formule à tout moment ?",
    r: "Oui. Vous passez à la formule supérieure quand votre portefeuille grandit, et vous redescendez si besoin. Aucun engagement de durée, aucun préavis.",
  },
  {
    q: "Comment se fait le paiement ?",
    r: "Par Orange Money, Wave, virement bancaire ou chèque. Le paiement à l'année vous fait économiser deux mois.",
  },
  {
    q: "Que se passe-t-il si je dépasse le nombre de biens ?",
    r: "Rien ne se perd. Le logiciel vous prévient au moment d'ajouter un bien de trop et vous propose la formule adaptée. Vos données restent accessibles.",
  },
  {
    q: "Que veut dire la mention « Bientôt » ?",
    r: "Que la fonction est prévue mais pas encore livrée. Nous l'affichons pour que vous sachiez où va le produit, sans jamais vous facturer quelque chose qui n'existe pas. Les fonctions sans cette mention sont disponibles aujourd'hui.",
  },
  {
    q: "Mes données m'appartiennent-elles ?",
    r: "Entièrement. Vous pouvez récupérer à tout moment l'ensemble de vos biens, locataires, baux et quittances. Aucune autre agence n'a accès à vos informations.",
  },
  {
    q: "Le premier mois est-il vraiment offert ?",
    r: "Oui, sur toutes les formules payantes, sans carte bancaire à l'inscription. Vous ne payez qu'après avoir vérifié que le logiciel vous convient.",
  },
];

export default async function PageTarifs({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const brut = params.facturation;
  const annuel = (Array.isArray(brut) ? brut[0] : brut) === "annuel";

  return (
    <div className="min-h-screen">
      <EntetePublic />

      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Un tarif qui tient dans votre commission
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-brand-50/90 sm:text-lg">
            Sur un loyer de 400 000 FCFA, une agence encaisse 20 000 à 40 000 FCFA de
            commission chaque mois. Sen Gestion coûte une fraction de ce montant.
          </p>

          {/* Choix mensuel / annuel, sans JavaScript */}
          <div className="mt-8 inline-flex rounded-xl bg-white/15 p-1 ring-1 ring-white/20">
            <Link
              href="/tarifs"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                annuel ? "text-brand-50 hover:text-white" : "bg-white text-brand-800"
              }`}
            >
              Mensuel
            </Link>
            <Link
              href="/tarifs?facturation=annuel"
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                annuel ? "bg-white text-brand-800" : "text-brand-50 hover:text-white"
              }`}
            >
              Annuel — 2 mois offerts
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------- Formules -------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 lg:grid-cols-4">
          {PLANS.map((p) => {
            const gratuit = p.prixMois === 0;
            const prix = annuel ? p.prixAn : p.prixMois;

            return (
              <div
                key={p.code}
                className={`carte relative flex flex-col p-6 ${
                  p.populaire ? "ring-2 ring-brand-600" : ""
                }`}
              >
                {p.populaire && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    Le plus choisi
                  </span>
                )}

                <h2 className="text-lg font-bold text-slate-900">{p.nom}</h2>
                <p className="mt-1 text-sm text-slate-500">{p.pour}</p>

                <div className="mt-5">
                  {gratuit ? (
                    <p className="text-3xl font-extrabold text-brand-700">Gratuit</p>
                  ) : (
                    <>
                      <p className="text-3xl font-extrabold text-slate-900">
                        {nombre(prix)}
                        <span className="ml-1 text-base font-semibold text-slate-500">FCFA</span>
                      </p>
                      <p className="text-sm text-slate-500">
                        par {annuel ? "an" : "mois"}
                        {annuel && (
                          <span className="ml-1 font-medium text-brand-700">
                            (soit {nombre(Math.round(p.prixAn / 12))} FCFA/mois)
                          </span>
                        )}
                      </p>
                      {annuel && (
                        <p className="mt-1 text-xs font-semibold text-sable-700">
                          Vous économisez {fcfa(economieAnnuelle(p))}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.atouts.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-slate-600">
                      <IconeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {a}
                    </li>
                  ))}
                  {p.bientot?.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        Bientôt
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/inscription"
                  className={`mt-6 w-full ${p.populaire ? "btn-primaire" : "btn-secondaire"}`}
                >
                  {gratuit ? "Commencer gratuitement" : "Premier mois offert"}
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Tous les prix sont en francs CFA, sans engagement de durée.
          Paiement par Orange Money, Wave, virement ou chèque.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
          Les fonctions marquées <strong className="text-slate-600">Bientôt</strong> sont en
          cours de développement et ne sont pas encore disponibles. Nous préférons vous le
          dire avant que vous payiez.
        </p>
      </section>

      {/* --------------------------- Ce qui est toujours inclus --------------------------- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Compris dans toutes les formules
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { e: "🧾", t: "Quittances officielles", d: "Avec votre NINEA, votre RCCM et le montant en toutes lettres." },
              { e: "🇸🇳", t: "Pensé pour le Sénégal", d: "FCFA, Orange Money, Wave, Free Money, quartiers de Dakar." },
              { e: "📱", t: "Depuis le téléphone", d: "Tout fonctionne sur mobile, y compris la prise de photos." },
              { e: "🔒", t: "Vos données isolées", d: "Aucune autre agence ne voit vos biens ni vos locataires." },
            ].map((c) => (
              <div key={c.t} className="carte p-6">
                <div className="mb-3 text-3xl">{c.e}</div>
                <h3 className="font-semibold text-slate-900">{c.t}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Comparaison ------------------------------ */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-center text-2xl font-bold text-slate-900">
          Ce que cela représente vraiment
        </h2>
        <p className="mt-3 text-center text-slate-600">
          Exemple d&apos;une agence qui gère 50 logements à 300 000 FCFA de loyer moyen.
        </p>

        <dl className="carte mt-8 divide-y divide-slate-100">
          {[
            ["Loyers encaissés chaque mois", fcfa(15_000_000)],
            ["Commission de l'agence (8 %)", fcfa(1_200_000)],
            ["Formule Agence", `${fcfa(20_000)} par mois`],
            ["Part de la commission", "1,7 %"],
          ].map(([k, v], i, tableau) => (
            <div
              key={k}
              className={`flex items-center justify-between gap-3 px-5 py-3.5 ${
                i === tableau.length - 1 ? "bg-brand-50" : ""
              }`}
            >
              <dt className="text-sm text-slate-600">{k}</dt>
              <dd className={`font-semibold ${i >= 2 ? "text-brand-700" : "text-slate-900"}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* --------------------------------- Questions --------------------------------- */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-slate-900">Questions fréquentes</h2>
          <div className="mt-8 space-y-3">
            {QUESTIONS.map((q) => (
              <details key={q.q} className="carte group p-5">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 group-open:text-brand-700">
                  {q.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{q.r}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/inscription" className="btn-primaire px-6 py-3 text-base">
              Créer mon agence gratuitement
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Aucune carte bancaire demandée. Prêt en deux minutes.
            </p>
          </div>
        </div>
      </section>

      <PiedPublic />
    </div>
  );
}
