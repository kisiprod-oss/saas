import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/admin";
import { ficheAgence, membresAgence } from "@/lib/plateforme";
import { plan, planEffectif, PLANS } from "@/lib/tarifs";
import { dateFr, fcfa } from "@/lib/format";
import { actionFormuleAgence, actionProlongerFormule } from "@/lib/actions";
import { Alerte, Carte, EnTetePage, MessagesUrl, Selection } from "@/components/ui";
import { IconeRetour } from "@/components/icones";

export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

/** Une ligne « libellé : valeur » du bloc d'identité. */
function Ligne({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-sm text-slate-500">{titre}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function Compteur({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-bold text-slate-900">{valeur}</p>
      <p className="text-xs text-slate-500">{libelle}</p>
    </div>
  );
}

export default async function PageAdminAgence({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  await exigerAdmin();
  const { id } = await params;
  const requete = await searchParams;

  const agence = ficheAgence(Number(id));
  if (!agence) notFound();

  const membres = membresAgence(agence.id);
  const souscrit = plan(agence.plan);
  const applique = planEffectif(agence);
  const expiree = applique.code !== souscrit.code;

  return (
    <>
      <Link
        href="/admin/agences"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700"
      >
        <IconeRetour className="h-4 w-4" /> Retour aux agences
      </Link>

      <EnTetePage
        titre={agence.nom}
        sousTitre={`Inscrite le ${dateFr(agence.cree_le)}${agence.ville ? ` · ${agence.ville}` : ""}`}
      >
        <Link href={`/agence/${agence.slug}`} target="_blank" className="btn-secondaire">
          Voir sa vitrine ↗
        </Link>
      </EnTetePage>

      <MessagesUrl params={requete} />

      {expiree && (
        <div className="mb-4">
          <Alerte type="erreur">
            L&apos;abonnement <strong>{souscrit.nom}</strong> a pris fin le{" "}
            {dateFr(agence.plan_expire_le)}. Cette agence travaille aujourd&apos;hui avec les
            limites de la formule {applique.nom}. Prolongez son abonnement si elle a réglé.
          </Alerte>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ---------------------------------------------- Ce que porte le compte */}
        <Carte className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Ce que contient ce compte</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Compteur valeur={agence.nb_biens} libelle="biens" />
            <Compteur valeur={agence.nb_locataires} libelle="locataires" />
            <Compteur valeur={agence.nb_contrats_actifs} libelle="baux actifs" />
            <Compteur valeur={agence.nb_factures} libelle="factures" />
            <Compteur valeur={agence.nb_utilisateurs} libelle="utilisateurs" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Dernière facture émise&nbsp;: {dateFr(agence.derniere_activite)}.{" "}
            {agence.nb_factures === 0
              && "Ce compte n'a encore rien produit — un appel vaut mieux qu'une relance écrite."}
          </p>
        </Carte>

        {/* ------------------------------------------------------------ Identité */}
        <Carte className="p-5">
          <h2 className="font-semibold text-slate-900">Identité</h2>
          <dl className="mt-2">
            <Ligne titre="E-mail">{agence.email ?? "—"}</Ligne>
            <Ligne titre="Téléphone">{agence.telephone ?? "—"}</Ligne>
            <Ligne titre="NINEA">{agence.ninea ?? "—"}</Ligne>
            <Ligne titre="RCCM">{agence.rccm ?? "—"}</Ligne>
            <Ligne titre="Commission">{agence.commission_pct} %</Ligne>
            <Ligne titre="Encaissement en ligne">
              {agence.encaissement_actif
                ? `Actif (${agence.encaissement_mode === "reel" ? "réel" : "test"})`
                : "Non branché"}
            </Ligne>
          </dl>
        </Carte>
      </div>

      {/* ============================================ La formule et son échéance */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Carte className="p-5">
          <h2 className="font-semibold text-slate-900">Formule</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Une échéance vide vaut « accordée sans terme » : la formule reste acquise tant que
            vous ne posez pas de date.
          </p>

          <form action={actionFormuleAgence} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={agence.id} />
            <Selection
              label="Formule souscrite"
              nom="plan"
              valeur={agence.plan}
              options={PLANS.map((p) => ({
                valeur: p.code,
                libelle: p.prixMois === 0 ? `${p.nom} — gratuite` : `${p.nom} — ${fcfa(p.prixMois)} / mois`,
              }))}
            />
            <div>
              <label className="etiquette" htmlFor="plan_expire_le">Payée jusqu&apos;au</label>
              <input
                id="plan_expire_le" name="plan_expire_le" type="date"
                defaultValue={agence.plan_expire_le ?? ""} className="champ"
              />
              <p className="mt-1 text-xs text-slate-500">
                Laissez vide pour une formule sans terme.
              </p>
            </div>
            <button type="submit" className="btn-primaire">Enregistrer la formule</button>
          </form>
        </Carte>

        <Carte className="p-5">
          <h2 className="font-semibold text-slate-900">Prolonger l&apos;abonnement</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            À utiliser quand l&apos;agence a réglé. Le décompte part de l&apos;échéance en cours
            si elle est encore à venir, de la date du jour sinon : personne ne perd les jours
            qu&apos;il a payés, personne ne paie ceux qu&apos;il a attendus.
          </p>

          <dl className="mt-3">
            <Ligne titre="Échéance actuelle">
              {agence.plan_expire_le ? dateFr(agence.plan_expire_le) : "aucune"}
            </Ligne>
            <Ligne titre="Formule appliquée aujourd'hui">{applique.nom}</Ligne>
            <Ligne titre="Réglé à ce jour">
              {agence.nb_reglements > 0
                ? `${fcfa(agence.regle_total)} en ${agence.nb_reglements} règlement(s)`
                : "rien encore"}
            </Ligne>
          </dl>

          {souscrit.prixMois === 0 ? (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Cette agence est sur une formule gratuite. Choisissez d&apos;abord une formule
              payante à gauche.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {[1, 3, 6, 12].map((mois) => (
                <form key={mois} action={actionProlongerFormule}>
                  <input type="hidden" name="id" value={agence.id} />
                  <input type="hidden" name="mois" value={mois} />
                  <button type="submit" className="btn-secondaire">
                    + {mois} mois
                  </button>
                </form>
              ))}
            </div>
          )}
        </Carte>
      </div>

      {/* ================================================== Qui se connecte ici */}
      <Carte className="mt-4 p-5">
        <h2 className="font-semibold text-slate-900">Qui se connecte pour cette agence</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Personne</th>
                <th>Rôle</th>
                <th>Téléphone</th>
                <th>Inscrit le</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="font-medium text-slate-900">{m.nom}</span>
                    <span className="block text-xs text-slate-400">{m.email}</span>
                  </td>
                  <td className="text-slate-600">
                    {m.role === "proprietaire" ? "Titulaire" : "Agent"}
                  </td>
                  <td className="whitespace-nowrap text-slate-600">{m.telephone ?? "—"}</td>
                  <td className="whitespace-nowrap text-slate-600">{dateFr(m.cree_le)}</td>
                  <td>
                    <span
                      className={`badge ${m.actif
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                        : "bg-rose-100 text-rose-800 ring-rose-600/20"}`}
                    >
                      {m.actif ? "Actif" : "Coupé"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Un mot de passe ne se lit pas, même d&apos;ici : il est haché. Pour dépanner quelqu&apos;un,
          faites-lui utiliser « Mot de passe oublié » sur la page de connexion.
        </p>
      </Carte>
    </>
  );
}
