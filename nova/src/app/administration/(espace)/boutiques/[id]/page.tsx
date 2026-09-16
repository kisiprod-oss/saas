import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin, boutiqueDetail } from "@/lib/admin";
import { toutesLesOffres } from "@/lib/offres";
import { tous } from "@/lib/db";
import { montant, dateFr, dateHeureFr } from "@/lib/format";
import { GestionBoutiqueAdmin } from "@/components/gestion-boutique-admin";
import { FlecheGauche, Oeil } from "@/components/icones";

export const metadata = { title: "Boutique" };

export default async function PageBoutiqueAdmin({
  params,
}: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;

  const boutique = boutiqueDetail(Number(id)) as (ReturnType<typeof boutiqueDetail> & {
    suspendue_le?: string | null; motif_suspension?: string | null;
    notes_internes?: string | null; paiement_fournisseur?: string | null;
    paiement_mode?: string; domaine?: string | null; domaine_verifie_le?: string | null;
  }) | undefined;
  if (!boutique) notFound();

  const operations = tous<{ type: string; statut: string; cree_le: string; moteur: string }>(
    `SELECT type, statut, cree_le, moteur FROM operations_ia
      WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT 20`,
    boutique.id,
  );
  const incidents = tous<{ id: number; source: string; message: string; cree_le: string }>(
    `SELECT id, source, message, cree_le FROM journal_erreurs
      WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT 20`,
    boutique.id,
  );

  return (
    <div className="space-y-5">
      <Link href="/administration/boutiques"
        className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:text-vert-700">
        <FlecheGauche className="size-4" /> Boutiques
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titre-page">{boutique.nom}</h1>
          <p className="mt-1 text-sm text-encre-600">
            {boutique.proprietaire ?? "sans propriétaire"} · {boutique.email ?? "—"} ·
            créée le {dateFr(boutique.cree_le)}
          </p>
        </div>
        {boutique.publiee_le ? (
          <a href={`/b/${boutique.slug}`} target="_blank" rel="noopener" className="btn-secondaire btn-petit">
            <Oeil className="size-4" /> Voir la boutique
          </a>
        ) : null}
      </header>

      {boutique.suspendue_le ? (
        <div className="message message-erreur">
          <div>
            <p className="font-semibold">
              Suspendue le {dateHeureFr(boutique.suspendue_le)}
            </p>
            <p className="mt-0.5">Motif communiqué : {boutique.motif_suspension}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Tuile titre="Produits" valeur={String(boutique.produits)} />
        <Tuile titre="Commandes" valeur={String(boutique.commandes)} />
        <Tuile titre="Encaissé" valeur={montant(boutique.encaisse, "FCFA")} />
        <Tuile titre="Formule" valeur={boutique.offre}
          detail={boutique.offre_expire_le ? `jusqu'au ${dateFr(boutique.offre_expire_le)}` : "sans échéance"} />
      </div>

      <GestionBoutiqueAdmin
        boutique={{
          id: boutique.id,
          nom: boutique.nom,
          offre: boutique.offre,
          suspendue: Boolean(boutique.suspendue_le),
          notes: boutique.notes_internes ?? null,
        }}
        offres={toutesLesOffres().map((o) => ({ code: o.code, nom: o.nom, actif: o.actif === 1 }))}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="carte p-5">
          <h2 className="titre-section">Paiement en ligne</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-encre-600">Prestataire</dt>
              <dd className="font-medium">{boutique.paiement_fournisseur ?? "aucun"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-encre-600">Mode</dt>
              <dd className="font-medium">{boutique.paiement_mode ?? "test"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-encre-600">Domaine</dt>
              <dd className="font-medium">
                {boutique.domaine ?? "—"}
                {boutique.domaine && !boutique.domaine_verifie_le ? " (non vérifié)" : ""}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-encre-500">
            Les clés du commerçant ne sont jamais affichées ici, même à
            l&apos;administration : elles sont chiffrées et ne servent qu&apos;au
            traitement des paiements.
          </p>
        </section>

        <section className="carte p-5">
          <h2 className="titre-section">Consommation IA</h2>
          {operations.length === 0 ? (
            <p className="mt-3 text-sm text-encre-500">Aucune opération.</p>
          ) : (
            <ul className="mt-3 max-h-64 divide-y divide-encre-100 overflow-y-auto text-sm">
              {operations.map((operation, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className="flex-1 capitalize">{operation.type}</span>
                  <span className={`puce ${operation.statut === "reussie" ? "puce-vert" : "puce-neutre"}`}>
                    {operation.statut}
                  </span>
                  <span className="text-xs text-encre-400">{dateHeureFr(operation.cree_le)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {incidents.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Incidents de cette boutique</h2>
          <ul className="mt-3 divide-y divide-encre-100 text-sm">
            {incidents.map((incident) => (
              <li key={incident.id} className="py-2.5">
                <p>{incident.message}</p>
                <p className="mt-0.5 text-xs text-encre-500">
                  {incident.source} · {dateHeureFr(incident.cree_le)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Tuile({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-encre-500">{titre}</p>
      <p className="mt-1.5 text-lg font-bold text-encre-900">{valeur}</p>
      {detail ? <p className="mt-0.5 text-xs text-encre-500">{detail}</p> : null}
    </div>
  );
}
