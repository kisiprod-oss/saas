import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerFactures } from "@/lib/requetes";
import { actionGenererFactures } from "@/lib/actions";
import { dateFr, decalerMois, fcfa, moisCourant, periodeLisible } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { IconeFacture, IconePlus } from "@/components/icones";

export const metadata = { title: "Factures" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

const ETATS = [
  { valeur: "",          libelle: "Toutes" },
  { valeur: "impayee",   libelle: "Non soldées" },
  { valeur: "retard",    libelle: "En retard" },
  { valeur: "payee",     libelle: "Payées" },
];

function BadgeEtat({ etat, enRetard }: { etat: string; enRetard: boolean }) {
  const style = etat === "payee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
    : etat === "partielle" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
    : etat === "annulee" ? "bg-slate-100 text-slate-500 ring-slate-500/20"
    : enRetard ? "bg-rose-100 text-rose-800 ring-rose-600/20"
    : "bg-sky-100 text-sky-800 ring-sky-600/20";

  const texte = etat === "payee" ? "Payée"
    : etat === "partielle" ? "Partielle"
    : etat === "annulee" ? "Annulée"
    : enRetard ? "En retard" : "À payer";

  return <span className={`badge ${style}`}>{texte}</span>;
}

export default async function PageFactures({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const periode = lire(params, "periode");
  const etat = lire(params, "etat");
  const recherche = lire(params, "q");

  const factures = listerFactures(agence.id, { periode, etat, recherche });
  const totalFacture = factures.reduce((s, f) => s + (f.etat === "annulee" ? 0 : f.montant_total), 0);
  const totalPaye = factures.reduce((s, f) => s + f.montant_paye, 0);
  const totalDu = totalFacture - totalPaye;

  const courant = moisCourant();
  const periodes = Array.from({ length: 12 }, (_, i) => decalerMois(courant, -i));

  return (
    <>
      <EnTetePage titre="Factures et quittances" sousTitre={`${factures.length} facture(s) affichée(s)`}>
        <Link href="/dashboard/factures/nouvelle" className="btn-secondaire">
          <IconePlus className="h-4 w-4" /> Facture manuelle
        </Link>
        <form action={actionGenererFactures}>
          <input type="hidden" name="periode" value={periode || courant} />
          <button type="submit" className="btn-primaire">
            <IconeFacture className="h-4 w-4" />
            Générer {periodeLisible(periode || courant)}
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={params} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Total facturé", v: fcfa(totalFacture), c: "text-slate-900" },
          { t: "Total encaissé", v: fcfa(totalPaye), c: "text-brand-700" },
          { t: "Reste à percevoir", v: fcfa(totalDu), c: totalDu > 0 ? "text-rose-600" : "text-slate-900" },
        ].map((k) => (
          <Carte key={k.t} className="p-4">
            <p className="text-sm text-slate-500">{k.t}</p>
            <p className={`mt-1.5 text-xl font-bold ${k.c}`}>{k.v}</p>
          </Carte>
        ))}
      </div>

      {/* -------------------------------- Filtres -------------------------------- */}
      <form action="/dashboard/factures" method="get" className="mb-5 flex flex-wrap gap-3">
        <input name="q" defaultValue={recherche} className="champ min-w-[12rem] flex-1"
               placeholder="N° de facture, locataire, bien…" />
        <select name="periode" defaultValue={periode} className="champ w-auto">
          <option value="">Toutes les périodes</option>
          {periodes.map((p) => <option key={p} value={p}>{periodeLisible(p)}</option>)}
        </select>
        <select name="etat" defaultValue={etat} className="champ w-auto">
          {ETATS.map((e) => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}
        </select>
        <button type="submit" className="btn-secondaire">Filtrer</button>
        {(periode || etat || recherche) && (
          <Link href="/dashboard/factures" className="btn-secondaire">Réinitialiser</Link>
        )}
      </form>

      {factures.length === 0 ? (
        <EtatVide
          titre="Aucune facture"
          description="Cliquez sur « Générer » pour créer automatiquement les quittances de loyer de tous vos baux actifs."
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>N°</th><th>Période</th><th>Locataire</th><th>Bien</th><th>Échéance</th>
                  <th className="text-right">Montant</th><th className="text-right">Reste</th>
                  <th>État</th><th></th>
                </tr>
              </thead>
              <tbody>
                {factures.map((f) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap font-medium text-slate-900">{f.numero}</td>
                    <td className="whitespace-nowrap">{periodeLisible(f.periode)}</td>
                    <td className="whitespace-nowrap">{f.locataire_prenom} {f.locataire_nom}</td>
                    <td className="max-w-[14rem] truncate">{f.bien_titre}</td>
                    <td className="whitespace-nowrap text-slate-500">{dateFr(f.date_echeance)}</td>
                    <td className="whitespace-nowrap text-right font-semibold text-slate-900">{fcfa(f.montant_total)}</td>
                    <td className="whitespace-nowrap text-right">
                      <span className={f.reste > 0 && f.etat !== "annulee" ? "font-semibold text-rose-600" : "text-slate-400"}>
                        {f.etat === "annulee" ? "—" : fcfa(f.reste)}
                      </span>
                    </td>
                    <td><BadgeEtat etat={f.etat} enRetard={Boolean(f.en_retard)} /></td>
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/dashboard/factures/${f.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Ouvrir
                      </Link>
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
