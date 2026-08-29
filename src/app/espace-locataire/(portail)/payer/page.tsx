import Link from "next/link";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import {
  contratActifLocataire, coordonneesPaiementLocataire,
  listerFacturesLocataire, paiementsEnAttenteLocataire,
} from "@/lib/requetes";
import { actionDeclarerPaiement, actionPayerEnLigne } from "@/lib/actions";
import { etatEncaissement } from "@/lib/encaissement";
import { aujourdhui, fcfa, periodeLisible } from "@/lib/format";
import { MODES_PAIEMENT } from "@/lib/constantes";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { NumeroPaiement } from "@/components/numero-paiement";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Payer mon loyer" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PagePayerLoyer({ searchParams }: { searchParams: Promise<Params> }) {
  const locataire = await exigerSessionLocataire();
  const params = await searchParams;

  const contrat = contratActifLocataire(locataire.id);
  const coordonnees = coordonneesPaiementLocataire(locataire.id);
  const factures = listerFacturesLocataire(locataire.id);
  const enAttente = paiementsEnAttenteLocataire(locataire.id);

  // La plus ancienne facture non soldée : c'est celle qu'il faut régler d'abord.
  const impayees = factures.filter((f) => f.reste > 0 && f.etat !== "annulee");
  const aRegler = impayees[impayees.length - 1];
  const soldeDu = impayees.reduce((s, f) => s + f.reste, 0);

  const aDesNumeros = Boolean(
    coordonnees?.paiement_orange_money
    || coordonnees?.paiement_wave
    || coordonnees?.paiement_free_money,
  );

  // L'agence encaisse-t-elle directement dans l'application ?
  const enLigne = etatEncaissement(locataire.agence_id);
  const paiementEnLigne = enLigne.actif && enLigne.clesPresentes;

  return (
    <>
      <Link href="/espace-locataire" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour à mon espace
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payer mon loyer</h1>
      <p className="mt-1 text-sm text-slate-500">
        Payez depuis votre téléphone, puis signalez-le ici pour que votre agence le vérifie.
      </p>

      <div className="mt-5 space-y-4"><MessagesUrl params={params} /></div>

      {/* ------------------------------ Ce qu'il reste à payer ------------------------------ */}
      <Carte className="mt-5 p-5">
        <p className="text-sm text-slate-500">Total restant dû</p>
        <p className={`mt-1 text-3xl font-bold ${soldeDu > 0 ? "text-rose-600" : "text-brand-700"}`}>
          {fcfa(soldeDu)}
        </p>
        {soldeDu === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Votre loyer est à jour. Rien à régler pour le moment.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Sur {impayees.length} quittance{impayees.length > 1 ? "s" : ""}
            {aRegler && <> — la plus ancienne est celle de <strong>{periodeLisible(aRegler.periode)}</strong>.</>}
          </p>
        )}
      </Carte>

      {enAttente.length > 0 && (
        <div className="mt-4">
          <Alerte type="info">
            {enAttente.length === 1 ? "Un règlement est" : `${enAttente.length} règlements sont`} déjà
            en attente de vérification par votre agence. Inutile de le déclarer une seconde fois.
          </Alerte>
        </div>
      )}

      {soldeDu > 0 && paiementEnLigne && aRegler && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Payer en ligne</h2>
          <Carte className="border-brand-300 p-5 ring-1 ring-brand-500">
            <p className="text-sm text-slate-600">
              Réglez directement depuis cette page avec Orange Money, Wave, Free Money
              ou votre carte. <strong>Votre quittance est mise à jour toute seule</strong> —
              rien à déclarer, rien à attendre.
            </p>

            <form action={actionPayerEnLigne} className="mt-4 space-y-3">
              <input type="hidden" name="facture_id" value={aRegler.id} />
              <div>
                <label className="etiquette" htmlFor="montant_ligne">Montant à régler</label>
                <input
                  id="montant_ligne" name="montant" inputMode="numeric"
                  defaultValue={aRegler.reste} className="champ"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Quittance de {periodeLisible(aRegler.periode)} — reste {fcfa(aRegler.reste)}.
                </p>
              </div>
              <button type="submit" className="btn-primaire w-full py-3">
                Payer {fcfa(aRegler.reste)} en ligne
              </button>
            </form>

            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              Vous serez redirigé vers la page sécurisée de paiement de
              {" "}{coordonnees?.agence_nom}. Sen Gestion ne voit jamais votre code secret.
            </p>
          </Carte>

          <div className="mt-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              ou payer par vous-même
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      {soldeDu > 0 && (
        <>
          {/* ------------------------------ Étape 1 : payer ------------------------------ */}
          <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">1</span>
            Envoyez l&apos;argent
          </h2>

          {aDesNumeros ? (
            <Carte className="p-5">
              <p className="text-sm text-slate-600">
                Depuis votre application Orange Money, Wave ou Free Money, envoyez le montant
                à {coordonnees?.agence_nom} sur l&apos;un de ces numéros :
              </p>

              <div className="mt-4 space-y-2.5">
                {coordonnees?.paiement_orange_money && (
                  <NumeroPaiement operateur="Orange Money" numero={coordonnees.paiement_orange_money} couleur="text-orange-600" />
                )}
                {coordonnees?.paiement_wave && (
                  <NumeroPaiement operateur="Wave" numero={coordonnees.paiement_wave} couleur="text-sky-600" />
                )}
                {coordonnees?.paiement_free_money && (
                  <NumeroPaiement operateur="Free Money" numero={coordonnees.paiement_free_money} couleur="text-rose-600" />
                )}
              </div>

              {coordonnees?.paiement_consignes && (
                <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {coordonnees.paiement_consignes}
                </p>
              )}

              <p className="mt-4 text-xs text-slate-500">
                <strong>Gardez le SMS de confirmation :</strong> il contient la référence de
                transaction que vous devrez recopier à l&apos;étape 2.
              </p>
            </Carte>
          ) : (
            <Alerte type="info">
              {coordonnees?.agence_nom} n&apos;a pas encore renseigné ses numéros de paiement.
              Contactez votre agence pour savoir comment régler votre loyer, puis revenez
              déclarer le règlement ici.
            </Alerte>
          )}

          {/* ------------------------------ Étape 2 : déclarer ------------------------------ */}
          <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">2</span>
            Signalez votre règlement
          </h2>

          {aRegler ? (
            <Carte className="p-5">
              <form action={actionDeclarerPaiement} className="space-y-4">
                <input type="hidden" name="facture_id" value={aRegler.id} />

                <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-900">
                  Quittance de <strong>{periodeLisible(aRegler.periode)}</strong> —
                  reste à payer <strong>{fcfa(aRegler.reste)}</strong>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="etiquette" htmlFor="montant">Montant envoyé <span className="text-rose-500">*</span></label>
                    <input
                      id="montant" name="montant" required inputMode="numeric"
                      defaultValue={aRegler.reste} className="champ"
                    />
                    <p className="mt-1 text-xs text-slate-500">En FCFA, sans espace.</p>
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="date_paiement">Date du paiement</label>
                    <input
                      id="date_paiement" name="date_paiement" type="date"
                      defaultValue={aujourdhui()} max={aujourdhui()} className="champ"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="etiquette" htmlFor="mode">Moyen utilisé</label>
                    <select id="mode" name="mode" defaultValue="orange_money" className="champ">
                      {MODES_PAIEMENT.map((m) => (
                        <option key={m.valeur} value={m.valeur}>{m.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="reference">Référence de la transaction</label>
                    <input
                      id="reference" name="reference" placeholder="Ex : PP240815.1423.A12345"
                      className="champ"
                    />
                    <p className="mt-1 text-xs text-slate-500">Recopiée du SMS de confirmation.</p>
                  </div>
                </div>

                <div>
                  <label className="etiquette" htmlFor="note">Précision (facultatif)</label>
                  <input id="note" name="note" placeholder="Ex : versement partiel, je complète en fin de mois" className="champ" />
                </div>

                <button type="submit" className="btn-primaire w-full py-3">
                  J&apos;ai payé — prévenir mon agence
                </button>

                <p className="text-center text-xs leading-relaxed text-slate-500">
                  Votre déclaration est transmise à {coordonnees?.agence_nom}, qui vérifie que
                  l&apos;argent est bien arrivé avant de la valider. Tant qu&apos;elle n&apos;est
                  pas confirmée, votre solde reste inchangé.
                </p>
              </form>
            </Carte>
          ) : (
            <Alerte type="info">Aucune quittance à régler pour le moment.</Alerte>
          )}
        </>
      )}

      {impayees.length > 1 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Mes autres quittances à régler</h2>
          <Carte className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {impayees.filter((f) => f.id !== aRegler?.id).map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/espace-locataire/factures/${f.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{periodeLisible(f.periode)}</span>
                    <span className="text-sm font-semibold text-rose-600">{fcfa(f.reste)} dû</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Carte>
        </>
      )}
    </>
  );
}
