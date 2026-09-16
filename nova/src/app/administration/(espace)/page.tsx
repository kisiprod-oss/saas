import Link from "next/link";
import { exigerAdmin, chiffres, boutiques, erreurs } from "@/lib/admin";
import { montant, dateHeureFr, depuis } from "@/lib/format";

export const metadata = { title: "Administration" };

export default async function PageAdmin() {
  await exigerAdmin();
  const c = chiffres();
  const dernieres = boutiques().slice(0, 8);
  const derniersIncidents = erreurs(6);

  return (
    <div className="space-y-6">
      <h1 className="titre-page">Vue d&apos;ensemble</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile titre="Boutiques" valeur={String(c.boutiques)}
          detail={`${c.publiees} publiées · ${c.suspendues} suspendues`} />
        <Tuile titre="Commandes" valeur={String(c.commandes)}
          detail={`${montant(c.encaisse, "FCFA")} encaissés au total`} />
        <Tuile titre="Générations IA ce mois" valeur={String(c.iaMois)}
          detail={`${c.iaEchecsMois} échec${c.iaEchecsMois > 1 ? "s" : ""}, non décompté${c.iaEchecsMois > 1 ? "s" : ""}`} />
        <Tuile titre="À traiter" valeur={String(c.abonnementsEnAttente + c.assistanceOuverte)}
          detail={`${c.abonnementsEnAttente} abonnement(s) · ${c.assistanceOuverte} demande(s)`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="carte overflow-hidden">
          <div className="flex items-center justify-between border-b border-encre-200 px-4 py-3">
            <h2 className="titre-section">Dernières boutiques</h2>
            <Link href="/administration/boutiques" className="text-sm font-medium text-vert-700 hover:underline">
              Toutes
            </Link>
          </div>
          <ul className="divide-y divide-encre-100">
            {dernieres.map((boutique) => (
              <li key={boutique.id}>
                <Link href={`/administration/boutiques/${boutique.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-encre-50">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-encre-900">
                      {boutique.nom}
                      {boutique.demonstration ? <span className="puce puce-neutre">Démo</span> : null}
                      {boutique.suspendue_le ? <span className="puce puce-rouge">Suspendue</span> : null}
                      {!boutique.publiee_le ? <span className="puce puce-terre">Brouillon</span> : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-encre-500">
                      {boutique.email ?? "sans propriétaire"} · {boutique.pays}
                      {boutique.ville ? `, ${boutique.ville}` : ""} · {depuis(boutique.cree_le)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-encre-600">
                    <p>{boutique.produits} produits · {boutique.commandes} commandes</p>
                    <p className="text-vert-700">{montant(boutique.encaisse, "FCFA")}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="carte overflow-hidden">
          <div className="flex items-center justify-between border-b border-encre-200 px-4 py-3">
            <h2 className="titre-section">Derniers incidents</h2>
            <Link href="/administration/erreurs" className="text-sm font-medium text-vert-700 hover:underline">
              Tous
            </Link>
          </div>
          {derniersIncidents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-encre-500">Aucun incident enregistré.</p>
          ) : (
            <ul className="divide-y divide-encre-100">
              {derniersIncidents.map((erreur) => (
                <li key={erreur.id} className="px-4 py-3">
                  <p className="text-sm text-encre-900">{erreur.message}</p>
                  <p className="mt-0.5 text-xs text-encre-500">
                    {erreur.source} · {erreur.boutique ?? "—"} · {dateHeureFr(erreur.cree_le)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Tuile({ titre, valeur, detail }: { titre: string; valeur: string; detail: string }) {
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-encre-500">{titre}</p>
      <p className="mt-1.5 text-2xl font-bold text-encre-900">{valeur}</p>
      <p className="mt-1 text-xs text-encre-500">{detail}</p>
    </div>
  );
}
