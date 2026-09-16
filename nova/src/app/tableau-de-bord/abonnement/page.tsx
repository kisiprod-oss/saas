import { exigerSession } from "@/lib/auth";
import { offresPubliques, offreEnVigueur, quotaIa } from "@/lib/offres";
import { nombreProduits } from "@/lib/requetes";
import { historiqueIa, libererOperationsBloquees } from "@/lib/ia";
import { tous } from "@/lib/db";
import { montant, dateFr, dateHeureFr } from "@/lib/format";
import { ChoixOffre } from "@/components/choix-offre";
import { Coche, Etincelle } from "@/components/icones";

export const metadata = { title: "Abonnement" };

/**
 * Formule, quotas et consommation.
 *
 * L'historique IA est affiche tel quel, echecs compris, avec la mention
 * « non decompte ». C'est la seule facon de rendre un quota verifiable : un
 * compteur qu'on ne peut pas auditer est un compteur qu'on soupconne.
 */
export default async function PageAbonnement() {
  const { boutique } = await exigerSession();

  // Au passage : on libere les operations restees bloquees, pour que le
  // compteur affiche ne soit pas fausse par une generation interrompue.
  libererOperationsBloquees(boutique.id);

  const offres = offresPubliques();
  const actuelle = offreEnVigueur(boutique);
  const quota = quotaIa(boutique);
  const produits = nombreProduits(boutique.id);
  const operations = historiqueIa(boutique.id, 30);

  const demandes = tous<{ offre: string; montant: number; statut: string; cree_le: string }>(
    `SELECT offre, montant, statut, cree_le FROM abonnements
      WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT 5`,
    boutique.id,
  );

  const reussies = operations.filter((o) => o.statut === "reussie").length;
  const echouees = operations.filter((o) => o.statut === "echouee").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="titre-page">Abonnement</h1>
        <p className="mt-1 text-sm text-encre-600">
          Votre formule actuelle : <strong>{actuelle.nom}</strong>
          {boutique.offre_expire_le
            ? ` · valable jusqu'au ${dateFr(boutique.offre_expire_le)}`
            : actuelle.prix_mensuel > 0 ? " · sans échéance enregistrée" : ""}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Jauge titre="Produits" valeur={produits} maximum={actuelle.max_produits} />
        <Jauge titre="Générations IA ce mois" valeur={quota.utilise} maximum={quota.maximum} />
        <div className="carte p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-encre-500">Publication</p>
          <p className="mt-1.5 text-lg font-bold text-encre-900">
            {actuelle.publication ? "Incluse" : "Non incluse"}
          </p>
          <p className="mt-1 text-xs text-encre-500">
            {actuelle.publication
              ? "Votre boutique peut être en ligne."
              : "Vous pouvez tout préparer, pas publier."}
          </p>
        </div>
      </section>

      <ChoixOffre
        offres={offres.map((o) => ({
          code: o.code, nom: o.nom, prix: o.prix_mensuel,
          maxProduits: o.max_produits, quotaIa: o.quota_ia, maxMembres: o.max_membres,
          domaine: o.domaine_personnalise === 1, publication: o.publication === 1,
          accroche: o.accroche,
        }))}
        actuelle={actuelle.code}
      />

      {demandes.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Vos demandes</h2>
          <ul className="mt-3 divide-y divide-encre-100 text-sm">
            {demandes.map((demande, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex-1">
                  Formule {demande.offre}
                  <span className="block text-xs text-encre-500">{dateFr(demande.cree_le)}</span>
                </span>
                <span className={`puce ${demande.statut === "regle" ? "puce-vert" : "puce-neutre"}`}>
                  {demande.statut === "en_attente" ? "En attente de règlement" : demande.statut}
                </span>
                <span className="font-semibold">{montant(demande.montant, "FCFA")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="carte p-5">
        <h2 className="titre-section flex items-center gap-2">
          <Etincelle className="size-5" /> Consommation de l&apos;assistant
        </h2>
        <p className="mt-1 text-sm text-encre-600">
          {reussies} génération{reussies > 1 ? "s" : ""} décomptée{reussies > 1 ? "s" : ""}
          {echouees > 0 ? `, ${echouees} échec${echouees > 1 ? "s" : ""} non décompté${echouees > 1 ? "s" : ""}` : ""}
          {" "}sur les 30 dernières opérations.
        </p>

        {operations.length === 0 ? (
          <p className="mt-3 text-sm text-encre-500">
            Vous n&apos;avez pas encore utilisé l&apos;assistant.
          </p>
        ) : (
          <ul className="mt-3 max-h-80 divide-y divide-encre-100 overflow-y-auto text-sm">
            {operations.map((operation) => (
              <li key={operation.id} className="flex flex-wrap items-start gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="font-medium capitalize">{operation.type}</span>
                  {operation.demande ? (
                    <span className="block truncate text-xs text-encre-500">{operation.demande}</span>
                  ) : null}
                  <span className="block text-xs text-encre-400">
                    {dateHeureFr(operation.cree_le)}
                    {operation.moteur === "local" ? " · sans assistant intelligent" : ""}
                  </span>
                </span>
                <span className={`puce ${
                  operation.statut === "reussie" ? "puce-vert"
                    : operation.statut === "echouee" ? "puce-neutre" : "puce-bleu"}`}>
                  {operation.statut === "reussie" ? "Décomptée"
                    : operation.statut === "echouee" ? "Échec, non décompté" : "En cours"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-encre-500">
          Une génération qui échoue ne consomme rien : votre quota ne paie pas nos
          pannes. Le compteur repart le 1er de chaque mois.
        </p>
      </section>
    </div>
  );
}

function Jauge({ titre, valeur, maximum }: { titre: string; valeur: number; maximum: number }) {
  const part = Math.min(100, (valeur / Math.max(1, maximum)) * 100);
  const tendu = part >= 85;
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-encre-500">{titre}</p>
      <p className={`mt-1.5 text-lg font-bold ${tendu ? "text-terre-600" : "text-encre-900"}`}>
        {valeur} <span className="text-sm font-normal text-encre-500">/ {maximum}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-encre-200">
        <div className={`h-full rounded-full ${tendu ? "bg-terre-500" : "bg-vert-600"}`}
          style={{ width: `${part}%` }} />
      </div>
    </div>
  );
}
