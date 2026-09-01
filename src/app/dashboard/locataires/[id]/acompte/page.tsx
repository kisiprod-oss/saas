import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { arrieresLocataire, lireLocataire } from "@/lib/requetes";
import { actionEncaisserAcompte } from "@/lib/actions";
import { aujourdhui, fcfa } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/constantes";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { RepartitionAcompte } from "@/components/repartition-acompte";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Encaisser un acompte" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAcompte({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const locataire = lireLocataire(agence.id, Number(id));
  if (!locataire) notFound();

  const arrieres = arrieresLocataire(agence.id, locataire.id);
  const total = arrieres.reduce((s, f) => s + f.reste, 0);

  const jours = (echeance: string) => {
    const ecart = Date.now() - new Date(echeance).getTime();
    return Math.max(0, Math.floor(ecart / 86400000));
  };

  return (
    <>
      <Link
        href={`/dashboard/locataires/${locataire.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
      >
        <IconeRetour className="h-4 w-4" /> Retour à la fiche
      </Link>

      <EnTetePage
        titre="Encaisser un acompte"
        sousTitre={`${locataire.prenom} ${locataire.nom} — ${fcfa(total)} d'arriérés sur ${arrieres.length} facture(s)`}
      />

      <MessagesUrl params={requete} />

      {arrieres.length === 0 ? (
        <Carte className="p-6">
          <p className="text-sm text-slate-600">
            Ce locataire n&apos;a aucune facture en attente de règlement. Il n&apos;y a
            donc pas d&apos;acompte à imputer.
          </p>
        </Carte>
      ) : (
        <form action={actionEncaisserAcompte}>
          <input type="hidden" name="locataire_id" value={locataire.id} />

          <RepartitionAcompte
            lignes={arrieres.map((f) => ({
              id: f.id,
              numero: f.numero,
              periode: f.periode,
              reste: f.reste,
              joursRetard: jours(f.date_echeance),
            }))}
          />

          <Carte className="mt-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="etiquette" htmlFor="date_paiement">Date du versement</label>
                <input
                  id="date_paiement" name="date_paiement" type="date"
                  defaultValue={aujourdhui()} className="champ"
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="mode">Moyen de paiement</label>
                <select id="mode" name="mode" className="champ" defaultValue="especes">
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="reference">Référence (facultatif)</label>
                <input id="reference" name="reference" className="champ" placeholder="N° de transaction" />
              </div>
            </div>

            <div className="mt-4">
              <label className="etiquette" htmlFor="note">Note (facultatif)</label>
              <input id="note" name="note" className="champ" placeholder="Ex. arrangement convenu le 12/09" />
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Un règlement distinct est enregistré pour chaque facture concernée,
              avec la même date et le même moyen de paiement. Chaque facture
              soldée devient imprimable en quittance.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="submit" className="btn-primaire">Enregistrer l&apos;acompte</button>
              <Link href={`/dashboard/locataires/${locataire.id}`} className="btn-secondaire">Annuler</Link>
            </div>
          </Carte>
        </form>
      )}
    </>
  );
}
