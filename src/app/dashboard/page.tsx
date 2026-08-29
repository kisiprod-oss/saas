import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { statistiques } from "@/lib/requetes";
import { actionGenererFactures } from "@/lib/actions";
import { fcfa, moisCourant, moisCourt, periodeLisible } from "@/lib/format";
import { etatQuota } from "@/lib/quota";
import { facturesEmisesCeMois } from "@/lib/requetes";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { IconeAlerte, IconeFacture, IconeMaison, IconeUtilisateurs } from "@/components/icones";

export const metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

function Indicateur({
  titre, valeur, detail, accent = "brand", icone,
}: {
  titre: string; valeur: string; detail?: string;
  accent?: "brand" | "sable" | "rose" | "slate"; icone?: React.ReactNode;
}) {
  const couleurs = {
    brand: "bg-brand-50 text-brand-700",
    sable: "bg-sable-100 text-sable-700",
    rose:  "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  }[accent];

  return (
    <Carte className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{titre}</p>
        {icone && <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${couleurs}`}>{icone}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </Carte>
  );
}

export default async function PageTableauBord({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence, utilisateur } = await exigerSession();
  const params = await searchParams;
  const s = statistiques(agence.id);
  const quota = etatQuota(agence, facturesEmisesCeMois(agence.id));
  const periode = moisCourant();
  const maximum = Math.max(1, ...s.historique.flatMap((h) => [h.attendu, h.encaisse]));
  const tauxRecouvrement = s.loyersAttendusMois > 0
    ? Math.round((s.encaisseMois / s.loyersAttendusMois) * 100)
    : 0;

  return (
    <>
      <EnTetePage
        titre={`Bonjour ${utilisateur.nom.split(" ")[0]} 👋`}
        sousTitre={`Voici l'activité de ${agence.nom} pour ${periodeLisible(periode)}.`}
      >
        <form action={actionGenererFactures}>
          <input type="hidden" name="periode" value={periode} />
          <button type="submit" className="btn-primaire">
            <IconeFacture className="h-4 w-4" /> Générer les factures du mois
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={params} />

      {/* Quota de factures : on ne previent qu'a l'approche de la limite.
          Un compteur permanent transformerait chaque visite en rappel de
          paiement. */}
      {!quota.illimite && quota.atteint && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="font-semibold text-rose-900">
            Vos {quota.quota} factures de ce mois sont émises
          </p>
          <p className="mt-0.5 text-sm text-rose-800">
            {quota.quota === 0
              ? "Cette adresse e-mail a déjà un compte gratuit. Choisissez une formule pour émettre des factures depuis ce compte."
              : "Vous continuez à gérer vos biens, vos locataires et vos loyers, et vos factures déjà émises restent imprimables. Pour en émettre d'autres ce mois-ci, choisissez une formule."}
          </p>
          <Link href="/dashboard/agence" className="btn-primaire mt-3">
            Voir les formules
          </Link>
        </div>
      )}

      {!quota.illimite && !quota.atteint && quota.restantes <= 2 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>
              {quota.restantes === 1
                ? "Il vous reste une facture ce mois-ci."
                : `Il vous reste ${quota.restantes} factures ce mois-ci.`}
            </strong>{" "}
            La formule gratuite en permet {quota.quota} par mois.
          </p>
          <Link href="/dashboard/agence" className="btn-sable shrink-0">Voir les formules</Link>
        </div>
      )}

      {/* Le logo figure en tete de chaque quittance : son absence se voit
          par tous les locataires, pas seulement par l'agence. */}
      {!agence.logo_url && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <IconeAlerte className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-amber-900">Votre logo manque</p>
              <p className="text-sm text-amber-800">
                Il apparaît en haut de chaque quittance de loyer. Sans lui, vos
                documents arrivent chez vos locataires sans votre identité.
              </p>
            </div>
          </div>
          <Link href="/dashboard/agence" className="btn-sable shrink-0">Ajouter mon logo</Link>
        </div>
      )}

      {/* ------------------------------- Indicateurs ------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicateur
          titre="Encaissé ce mois"
          valeur={fcfa(s.encaisseMois)}
          detail={`${tauxRecouvrement}% des ${fcfa(s.loyersAttendusMois)} attendus`}
          icone={<span className="text-base">💰</span>}
        />
        <Indicateur
          titre="Impayés"
          valeur={fcfa(s.impayesTotal)}
          detail={`${s.facturesEnRetard} facture(s) en retard`}
          accent={s.impayesTotal > 0 ? "rose" : "brand"}
          icone={<IconeAlerte className="h-4 w-4" />}
        />
        <Indicateur
          titre="Taux d'occupation"
          valeur={`${s.tauxOccupation}%`}
          detail={`${s.biensLoues} loué(s) sur ${s.biensTotal} bien(s)`}
          accent="sable"
          icone={<IconeMaison className="h-4 w-4" />}
        />
        <Indicateur
          titre="Locataires actifs"
          valeur={String(s.locatairesActifs)}
          detail={`${s.contratsActifs} bail(s) en cours`}
          accent="slate"
          icone={<IconeUtilisateurs className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ----------------------------- Graphique 6 mois ----------------------------- */}
        <Carte className="flex flex-col p-5 lg:col-span-2">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Loyers des 6 derniers mois</h2>
              <p className="text-xs text-slate-500">Comparaison entre facturé et encaissé</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" /> Facturé
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Encaissé
              </span>
            </div>
          </div>

          <div className="flex min-h-52 flex-1 items-end gap-2 sm:gap-4">
            {s.historique.map((h) => (
              <div key={h.periode} className="flex h-full flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t bg-slate-200"
                    style={{ height: `${Math.max(2, (h.attendu / maximum) * 100)}%` }}
                    title={`Facturé : ${fcfa(h.attendu)}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-brand-500"
                    style={{ height: `${Math.max(2, (h.encaisse / maximum) * 100)}%` }}
                    title={`Encaissé : ${fcfa(h.encaisse)}`}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-500">
                  {moisCourt(h.periode)}
                </span>
              </div>
            ))}
          </div>
        </Carte>

        {/* ----------------------------- Prochains loyers ----------------------------- */}
        <Carte className="p-5">
          <h2 className="font-semibold text-slate-900">Échéances du mois</h2>
          <p className="text-xs text-slate-500">Loyers attendus en {periodeLisible(periode)}</p>

          {s.prochainesEcheances.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">Aucun bail actif pour le moment.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {s.prochainesEcheances.map((e) => (
                <li key={e.contrat_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{e.locataire}</p>
                    <p className="truncate text-xs text-slate-500">{e.bien}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-900">{fcfa(e.montant)}</p>
                    <p className="text-xs text-slate-400">le {e.date_echeance.slice(-2)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Link href="/dashboard/contrats" className="btn-secondaire mt-4 w-full">
            Voir tous les baux
          </Link>
        </Carte>
      </div>

      {/* --------------------------------- Impayés --------------------------------- */}
      <Carte className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Factures en retard</h2>
            <p className="text-xs text-slate-500">Les relances les plus urgentes</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/factures?etat=retard" className="text-sm font-semibold text-brand-700 hover:underline">
              Tout voir
            </Link>
            {s.facturesEnRetard > 0 && (
              <Link href="/dashboard/relances" className="btn-primaire px-3 py-2 text-xs">
                Relancer les locataires
              </Link>
            )}
          </div>
        </div>

        {s.topImpayes.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            🎉 Aucun impayé. Tous les loyers échus ont été réglés.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Locataire</th><th>Bien</th><th>Période</th>
                  <th className="text-right">Reste à payer</th><th className="text-right">Retard</th><th></th>
                </tr>
              </thead>
              <tbody>
                {s.topImpayes.map((f) => (
                  <tr key={f.facture_id}>
                    <td className="font-medium text-slate-900">{f.locataire}</td>
                    <td className="max-w-[16rem] truncate">{f.bien}</td>
                    <td>{periodeLisible(f.periode)}</td>
                    <td className="text-right font-semibold text-rose-600">{fcfa(f.reste)}</td>
                    <td className="text-right">
                      <span className="badge bg-rose-100 text-rose-800 ring-rose-600/20">
                        {f.jours_retard} j
                      </span>
                    </td>
                    <td className="text-right">
                      <Link href={`/dashboard/factures/${f.facture_id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
    </>
  );
}
