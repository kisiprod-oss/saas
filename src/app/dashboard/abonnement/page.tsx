import { exigerSession } from "@/lib/auth";
import {
  abonnementAgence, abonnementConfigure, modeAbonnement, obstacleAbonnement,
  paydunyaDisponible, plansPayants, prixDe, prixEurDe, reglementsAgence, stripeDisponible,
} from "@/lib/abonnement";
import { actionPayerAbonnement, actionPayerAbonnementStripe } from "@/lib/actions";
import { dateFr, fcfa } from "@/lib/format";
import { economieAnnuelle, plan } from "@/lib/tarifs";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Mon abonnement" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAbonnement({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const requete = await searchParams;
  const courant = abonnementAgence(agence.id);
  const reglements = reglementsAgence(agence.id);
  const ouvert = abonnementConfigure();
  const obstacle = obstacleAbonnement();
  const mode = modeAbonnement();
  const paydunyaOk = paydunyaDisponible();
  const stripeOk = stripeDisponible();

  const lire = (c: string) => {
    const v = requete[c];
    return Array.isArray(v) ? v[0] : v;
  };

  return (
    <>
      <EnTetePage
        titre="Mon abonnement"
        sousTitre="Votre formule, et le règlement de votre abonnement à Sen Gestion."
      />

      <MessagesUrl params={requete} />

      {lire("retour") && (
        <Carte className="mb-4 border-sky-200 bg-sky-50 p-4">
          <p className="text-sm text-sky-900">
            Merci. Si le règlement a abouti, votre formule est mise à jour dès que
            l&apos;opérateur nous le confirme — c&apos;est généralement immédiat, parfois
            quelques minutes. Rechargez cette page pour voir l&apos;échéance.
          </p>
        </Carte>
      )}
      {lire("annule") && (
        <Carte className="mb-4 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Règlement annulé. Rien n&apos;a été débité et votre formule n&apos;a pas changé.
          </p>
        </Carte>
      )}

      {/* ----------------------------- Formule en cours ----------------------------- */}
      <Carte className="p-5">
        <p className="text-sm text-slate-500">Formule en cours</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{courant.formule.nom}</p>
        {courant.expire ? (
          <p className={`mt-1 text-sm ${courant.echu ? "font-semibold text-rose-700" : "text-slate-600"}`}>
            {courant.echu
              ? `Échue depuis le ${dateFr(courant.expire)}.`
              : `Valable jusqu'au ${dateFr(courant.expire)}.`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Aucun règlement enregistré à ce jour.
          </p>
        )}
      </Carte>

      {/* -------------------------- Encaissement indisponible ------------------------- */}
      {!ouvert && (
        <Carte className="mt-4 border-amber-200 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">Le règlement en ligne n&apos;est pas ouvert</h2>
          <p className="mt-2 text-sm text-amber-900">{obstacle}</p>
          <p className="mt-3 text-sm text-amber-900">
            Vous n&apos;avez donc rien à payer : continuez à utiliser le logiciel
            normalement. Vous serez prévenu avant tout changement.
          </p>
        </Carte>
      )}

      {/* -------------------------------- Les formules -------------------------------- */}
      {ouvert && (
        <>
          {paydunyaOk && mode === "test" && (
            <Carte className="mt-4 border-slate-300 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>Mode essai (PayDunya).</strong> Les paiements Orange Money, Wave
                et Free Money passent par le bac à sable de l&apos;opérateur : aucun
                argent réel n&apos;est débité.
              </p>
            </Carte>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {plansPayants().map((p) => {
              const actuelle = plan(agence.plan).code === p.code;
              return (
                <Carte key={p.code} className={`p-5 ${actuelle ? "border-brand-300 bg-brand-50/40" : ""}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">{p.nom}</h2>
                    {actuelle && (
                      <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">en cours</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{p.pour}</p>

                  <p className="mt-3 text-xl font-bold text-slate-900">
                    {fcfa(p.prixMois)}<span className="text-sm font-medium text-slate-500"> / mois</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    ou {fcfa(p.prixAn)} par an — {fcfa(economieAnnuelle(p))} économisés
                  </p>

                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {p.atouts.slice(0, 4).map((a) => <li key={a}>• {a}</li>)}
                  </ul>

                  {paydunyaOk && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Orange Money, Wave, Free Money, carte locale
                      </p>
                      {(["mois", "an"] as const).map((periodicite) => (
                        <form key={`pd-${periodicite}`} action={actionPayerAbonnement}>
                          <input type="hidden" name="plan" value={p.code} />
                          <input type="hidden" name="periodicite" value={periodicite} />
                          <button
                            type="submit"
                            className={periodicite === "an" ? "btn-primaire w-full" : "btn-secondaire w-full"}
                          >
                            Payer {fcfa(prixDe(p, periodicite))} — {periodicite === "an" ? "1 an" : "1 mois"}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}

                  {stripeOk && (
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Carte bancaire internationale
                      </p>
                      {(["mois", "an"] as const).map((periodicite) => (
                        <form key={`st-${periodicite}`} action={actionPayerAbonnementStripe}>
                          <input type="hidden" name="plan" value={p.code} />
                          <input type="hidden" name="periodicite" value={periodicite} />
                          <button type="submit" className="btn-secondaire w-full">
                            Carte (Stripe) — {prixEurDe(p, periodicite)} — {periodicite === "an" ? "1 an" : "1 mois"}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </Carte>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Le paiement se fait toujours sur la page sécurisée du fournisseur choisi
            {paydunyaOk && stripeOk ? " (PayDunya ou Stripe)" : paydunyaOk ? " (PayDunya)" : " (Stripe)"}.
            Sen Gestion ne voit jamais votre numéro ni votre code.
            {stripeOk && (
              <> Les montants en euros correspondent aux prix FCFA ci-dessus, convertis
              au taux fixe du franc CFA (655,957 XOF = 1 €).</>
            )}
          </p>
        </>
      )}

      {/* ------------------------------- Historique ------------------------------- */}
      {reglements.length > 0 && (
        <Carte className="mt-6 p-5">
          <h2 className="font-semibold text-slate-900">Vos règlements</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Formule</th>
                  <th>Durée</th>
                  <th className="text-right">Montant</th>
                  <th>Moyen</th>
                  <th>État</th>
                  <th>Période couverte</th>
                </tr>
              </thead>
              <tbody>
                {reglements.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap text-slate-600">{dateFr(r.cree_le)}</td>
                    <td>{plan(r.plan).nom}</td>
                    <td className="text-slate-600">{r.periodicite === "an" ? "1 an" : "1 mois"}</td>
                    <td className="text-right tabular-nums">
                      {/* Ce qui a réellement été débité : en euros pour un paiement
                          par carte, en FCFA sinon. L'équivalent FCFA reste dessous
                          pour que l'agence retrouve le prix annoncé. */}
                      {r.devise === "EUR" && r.montant_devise !== null ? (
                        <>
                          {(r.montant_devise / 100).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2, maximumFractionDigits: 2,
                          })} €
                          <span className="block text-xs font-normal text-slate-400">
                            soit {fcfa(r.montant)}
                          </span>
                        </>
                      ) : fcfa(r.montant)}
                    </td>
                    <td className="text-slate-600">
                      {r.fournisseur === "stripe" ? "Carte (Stripe)" : "PayDunya"}
                    </td>
                    <td>
                      {r.statut === "payee" ? (
                        <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Réglé</span>
                      ) : r.statut === "initiee" ? (
                        <span className="badge bg-amber-100 text-amber-800 ring-amber-600/20">En attente</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600 ring-slate-500/20">
                          {r.statut === "annulee" ? "Annulé" : "Échoué"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-slate-600">
                      {r.couvre_du && r.couvre_au ? `${dateFr(r.couvre_du)} → ${dateFr(r.couvre_au)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </>
  );
}
