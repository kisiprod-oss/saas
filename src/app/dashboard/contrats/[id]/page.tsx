import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { tous } from "@/lib/db";
import { lireContrat, listerFactures } from "@/lib/requetes";
import { actionSupprimerContrat, actionTerminerContrat } from "@/lib/actions";
import { dateFr, fcfa, moisCourant, periodeLisible, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireContrat } from "@/components/formulaire-contrat";
import { IconeCorbeille, IconeFacture, IconeRetour } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageContrat({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const contrat = lireContrat(agence.id, Number(id));
  if (!contrat) notFound();

  const factures = listerFactures(agence.id, { contratId: contrat.id });
  const totalDu = factures
    .filter((f) => f.etat !== "annulee")
    .reduce((s, f) => s + f.reste, 0);

  const biens = tous<{ id: number; titre: string; reference: string; loyer: number; charges: number; caution_mois: number }>(
    `SELECT id, titre, reference, loyer, charges, caution_mois
       FROM biens
      WHERE agence_id = ?
        AND (id = ? OR id NOT IN (SELECT bien_id FROM contrats WHERE statut = 'actif'))
      ORDER BY titre`,
    agence.id, contrat.bien_id,
  );

  const locataires = tous<{ id: number; prenom: string; nom: string; telephone: string }>(
    "SELECT id, prenom, nom, telephone FROM locataires WHERE agence_id = ? ORDER BY nom, prenom",
    agence.id,
  );

  return (
    <>
      <Link href="/dashboard/contrats" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux baux
      </Link>

      <EnTetePage
        titre={`Bail ${contrat.reference}`}
        sousTitre={`${contrat.locataire_prenom} ${contrat.locataire_nom} · ${contrat.bien_titre}`}
      >
        <Link href={`/contrats/${contrat.id}/imprimer`} className="btn-secondaire">
          <IconeFacture className="h-4 w-4" /> Imprimer le bail
        </Link>
        <Link href={`/dashboard/factures/nouvelle?contrat=${contrat.id}`} className="btn-secondaire">
          <IconeFacture className="h-4 w-4" /> Créer une facture
        </Link>
        {contrat.statut === "actif" && (
          <form action={actionTerminerContrat}>
            <input type="hidden" name="id" value={contrat.id} />
            <input type="hidden" name="statut" value="termine" />
            <button type="submit" className="btn-secondaire">Terminer le bail</button>
          </form>
        )}
        <form action={actionSupprimerContrat}>
          <input type="hidden" name="id" value={contrat.id} />
          <button type="submit" className="btn-danger">
            <IconeCorbeille className="h-4 w-4" /> Supprimer
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={requete} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Loyer mensuel", v: fcfa(contrat.loyer + contrat.charges), d: contrat.charges > 0 ? `dont ${fcfa(contrat.charges)} de charges` : "charges comprises" },
          { t: "Caution versée", v: fcfa(contrat.caution), d: contrat.caution_rendue ? "Restituée" : "Conservée par l'agence" },
          { t: "Solde dû", v: fcfa(totalDu), d: `${factures.length} facture(s) émise(s)` },
          { t: "Échéance", v: `le ${contrat.jour_echeance} du mois`, d: `Depuis le ${dateFr(contrat.date_debut)}` },
        ].map((c) => (
          <Carte key={c.t} className="p-5">
            <p className="text-sm text-slate-500">{c.t}</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{c.v}</p>
            <p className="mt-1 text-xs text-slate-400">{c.d}</p>
          </Carte>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormulaireContrat contrat={contrat} biens={biens} locataires={locataires} />
        </div>

        <aside className="space-y-5">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Locataire</h2>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {contrat.locataire_prenom} {contrat.locataire_nom}
            </p>
            <p className="text-sm text-slate-500">{telephoneFr(contrat.locataire_telephone)}</p>
            <Link href={`/dashboard/locataires/${contrat.locataire_id}`} className="btn-secondaire mt-3 w-full">
              Voir la fiche
            </Link>
          </Carte>

          <Carte className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Factures</h2>
              <Link
                href={`/dashboard/factures/nouvelle?contrat=${contrat.id}&periode=${moisCourant()}`}
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                + Ajouter
              </Link>
            </div>

            {factures.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Aucune facture émise pour ce bail.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {factures.slice(0, 12).map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/dashboard/factures/${f.id}`} className="min-w-0 hover:text-brand-700">
                      <p className="text-sm font-medium text-slate-900">{periodeLisible(f.periode)}</p>
                      <p className="truncate text-xs text-slate-500">{f.numero} · {fcfa(f.montant_total)}</p>
                    </Link>
                    <span className={`badge shrink-0 ${
                      f.etat === "payee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                      : f.etat === "partielle" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
                      : f.etat === "annulee" ? "bg-slate-100 text-slate-500 ring-slate-500/20"
                      : "bg-rose-100 text-rose-800 ring-rose-600/20"}`}>
                      {f.etat === "payee" ? "Payée" : f.etat === "partielle" ? "Partielle"
                        : f.etat === "annulee" ? "Annulée" : "Impayée"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </aside>
      </div>
    </>
  );
}
