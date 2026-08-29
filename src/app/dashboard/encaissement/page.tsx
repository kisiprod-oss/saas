import { exigerSession } from "@/lib/auth";
import { adresseDuSite } from "@/lib/email";
import { etatEncaissement, FOURNISSEURS } from "@/lib/encaissement";
import { listerTransactions, totalEncaisseEnLigne } from "@/lib/requetes";
import {
  actionEnregistrerEncaissement, actionTesterEncaissement,
} from "@/lib/actions";
import { dateFr, fcfa, periodeLisible } from "@/lib/format";
import { Alerte, Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { NumeroPaiement } from "@/components/numero-paiement";

export const metadata = { title: "Encaissement en ligne" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

function BadgeTransaction({ statut }: { statut: string }) {
  const style = statut === "payee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
    : statut === "initiee" ? "bg-sky-100 text-sky-800 ring-sky-600/20"
    : statut === "annulee" ? "bg-slate-100 text-slate-700 ring-slate-500/20"
    : "bg-rose-100 text-rose-800 ring-rose-600/20";
  const texte = statut === "payee" ? "Encaissé"
    : statut === "initiee" ? "En cours"
    : statut === "annulee" ? "Abandonné" : "Échoué";
  return <span className={`badge ${style}`}>{texte}</span>;
}

export default async function PageEncaissement({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const teste = (Array.isArray(params.teste) ? params.teste[0] : params.teste) === "1";

  const etat = etatEncaissement(agence.id);
  const transactions = listerTransactions(agence.id);
  const bilan = totalEncaisseEnLigne(agence.id);
  const site = await adresseDuSite();
  const urlNotification = `${site}/api/encaissement/paydunya`;

  return (
    <>
      <EnTetePage
        titre="Encaissement en ligne"
        sousTitre="Vos locataires paient depuis l'application. L'argent arrive directement sur votre compte marchand."
      />

      <div className="mt-5 space-y-4">
        <MessagesUrl params={params} />
        {teste && (
          <Alerte type="succes">
            Vos clés fonctionnent : le fournisseur a bien accepté une facture d&apos;essai.
          </Alerte>
        )}
      </div>

      {/* ------------------------------ État actuel ------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Encaissement</p>
          <p className={`mt-1 text-xl font-bold ${etat.actif ? "text-brand-700" : "text-slate-400"}`}>
            {etat.actif ? "Actif" : "Inactif"}
          </p>
          {etat.actif && (
            <p className="mt-1 text-xs text-slate-500">
              Mode {etat.mode === "reel" ? "réel — argent véritable" : "test — aucun argent réel"}
            </p>
          )}
        </Carte>
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Encaissé en ligne</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{fcfa(bilan.total)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {bilan.nombre} paiement{bilan.nombre > 1 ? "s" : ""} confirmé{bilan.nombre > 1 ? "s" : ""}
          </p>
        </Carte>
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Clés enregistrées</p>
          <p className={`mt-1 text-xl font-bold ${etat.clesPresentes ? "text-brand-700" : "text-slate-400"}`}>
            {etat.clesPresentes ? "Oui" : "Non"}
          </p>
          {etat.clesPresentes && (
            <form action={actionTesterEncaissement} className="mt-2">
              <button type="submit" className="btn-secondaire px-3 py-1.5 text-xs">
                Tester mes clés
              </button>
            </form>
          )}
        </Carte>
      </div>

      {!etat.chiffrementPret && (
        <div className="mt-5">
          <Alerte type="erreur">
            La clé de chiffrement du serveur (<strong>CLE_CHIFFREMENT</strong>) n&apos;est pas
            configurée. Vos clés marchandes ne peuvent pas être stockées en sécurité, donc
            l&apos;encaissement ne peut pas être activé. Contactez votre hébergeur ou
            l&apos;éditeur.
          </Alerte>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* --------------------------- Configuration --------------------------- */}
        <div className="lg:col-span-2">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Votre compte marchand</h2>
            <p className="mt-1 text-sm text-slate-500">
              C&apos;est <strong>votre</strong> compte, à votre nom. L&apos;argent de vos
              locataires y arrive directement : Sen Gestion ne le détient à aucun moment.
            </p>

            <form action={actionEnregistrerEncaissement} className="mt-5 space-y-4">
              <div>
                <label className="etiquette" htmlFor="fournisseur">Fournisseur</label>
                <select
                  id="fournisseur" name="fournisseur"
                  defaultValue={etat.fournisseur ?? "paydunya"} className="champ"
                >
                  {FOURNISSEURS.map((f) => (
                    <option key={f.code} value={f.code}>{f.nom} — {f.moyens}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Vos clés se trouvent dans {FOURNISSEURS[0].ou}.
                </p>
              </div>

              <div>
                <label className="etiquette" htmlFor="mode">Mode</label>
                <select id="mode" name="mode" defaultValue={etat.mode} className="champ">
                  <option value="test">Test — pour essayer, aucun argent réel</option>
                  <option value="reel">Réel — les paiements sont véritables</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Commencez toujours en mode test. Les clés de test et les clés réelles
                  sont différentes : pensez à les remplacer en changeant de mode.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Vos trois clés</p>
                <p className="mt-1 text-xs text-slate-500">
                  Elles sont chiffrées avant d&apos;être enregistrées et ne sont jamais
                  réaffichées. {etat.clesPresentes && "Laissez un champ vide pour conserver la clé actuelle."}
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="etiquette" htmlFor="cle_maitre">Clé maître</label>
                    <input
                      id="cle_maitre" name="cle_maitre" type="password" autoComplete="off"
                      placeholder={etat.clesPresentes ? "•••••••• (déjà enregistrée)" : "Master Key"}
                      className="champ"
                    />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="cle_privee">Clé privée</label>
                    <input
                      id="cle_privee" name="cle_privee" type="password" autoComplete="off"
                      placeholder={etat.clesPresentes ? "•••••••• (déjà enregistrée)" : "Private Key"}
                      className="champ"
                    />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="jeton">Jeton</label>
                    <input
                      id="jeton" name="jeton" type="password" autoComplete="off"
                      placeholder={etat.clesPresentes ? "•••••••• (déjà enregistré)" : "Token"}
                      className="champ"
                    />
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
                <input
                  type="checkbox" name="actif" defaultChecked={etat.actif}
                  disabled={!etat.chiffrementPret}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  <strong>Activer l&apos;encaissement en ligne.</strong> Un bouton
                  « Payer en ligne » apparaît alors dans l&apos;espace de vos locataires,
                  et leurs règlements se confirment tout seuls.
                </span>
              </label>

              <button type="submit" className="btn-primaire" disabled={!etat.chiffrementPret}>
                Enregistrer
              </button>
            </form>
          </Carte>
        </div>

        {/* ------------------------------ Marche à suivre ------------------------------ */}
        <aside className="space-y-5">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Marche à suivre</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-600">
              {[
                <>Ouvrez un compte marchand sur <strong>paydunya.com</strong>, au nom de votre agence.</>,
                <>Créez une application, puis relevez vos trois clés de <strong>test</strong>.</>,
                <>Collez-les ci-contre, choisissez le mode Test, enregistrez, puis cliquez sur <strong>Tester mes clés</strong>.</>,
                <>Collez l&apos;adresse de notification ci-dessous dans la configuration de votre application PayDunya.</>,
                <>Faites un essai depuis un compte locataire. Quand tout fonctionne, passez en mode <strong>Réel</strong> avec vos clés réelles.</>,
              ].map((texte, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{texte}</span>
                </li>
              ))}
            </ol>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Adresse de notification</h2>
            <p className="mt-1 text-sm text-slate-500">
              À coller chez votre fournisseur, dans le champ « URL de notification » (IPN).
              C&apos;est ce qui permet aux paiements de se confirmer tout seuls.
            </p>
            <div className="mt-3">
              <NumeroPaiement operateur="IPN" numero={urlNotification} couleur="text-brand-700" />
            </div>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Ce qui vous protège</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li>
                Un paiement n&apos;est jamais soldé sur simple annonce : Sen Gestion
                rappelle le fournisseur pour vérifier lui-même.
              </li>
              <li>
                Le montant crédité est celui <strong>réellement encaissé</strong>,
                pas celui qui avait été demandé.
              </li>
              <li>Une même transaction ne peut pas créditer deux fois la même facture.</li>
              <li>Vos clés sont chiffrées en base et ne sont jamais réaffichées.</li>
            </ul>
          </Carte>
        </aside>
      </div>

      {/* ------------------------------ Journal ------------------------------ */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Journal des paiements en ligne</h2>

      {transactions.length === 0 ? (
        <Carte className="px-6 py-10 text-center">
          <p className="text-sm text-slate-500">
            Aucune tentative de paiement pour l&apos;instant. Les règlements de vos
            locataires apparaîtront ici, avec leur statut.
          </p>
        </Carte>
      ) : (
        <Carte className="overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Date</th><th>Locataire</th><th>Quittance</th>
                <th className="text-right">Montant</th><th>État</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap text-slate-500">{dateFr(t.cree_le)}</td>
                  <td>
                    {t.locataire_prenom
                      ? `${t.locataire_prenom} ${t.locataire_nom}`
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="whitespace-nowrap text-slate-500">
                    {t.facture_periode ? periodeLisible(t.facture_periode) : "—"}
                  </td>
                  <td className="whitespace-nowrap text-right font-semibold text-slate-900">
                    {fcfa(t.montant)}
                  </td>
                  <td><BadgeTransaction statut={t.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Carte>
      )}
    </>
  );
}
