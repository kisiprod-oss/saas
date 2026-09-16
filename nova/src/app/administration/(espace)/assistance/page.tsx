import Link from "next/link";
import { exigerAdmin, demandesAssistance } from "@/lib/admin";
import { GestionAssistance } from "@/components/gestion-assistance";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Assistance" };

export default async function PageAssistance() {
  await exigerAdmin();
  const demandes = demandesAssistance();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Demandes d&apos;assistance</h1>
        <p className="mt-1 text-sm text-encre-600">
          La réponse s&apos;affiche directement dans les paramètres du commerçant.
        </p>
      </header>

      {demandes.length === 0 ? (
        <div className="carte px-6 py-12 text-center text-encre-500">
          Aucune demande.
        </div>
      ) : (
        <ul className="space-y-3">
          {demandes.map((demande) => (
            <li key={demande.id} className="carte p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-encre-900">{demande.sujet}</h2>
                  <p className="mt-0.5 text-xs text-encre-500">
                    <Link href={`/administration/boutiques/${demande.boutique_id}`} className="lien">
                      {demande.boutique}
                    </Link>
                    {" · "}{dateHeureFr(demande.cree_le)}
                  </p>
                </div>
                <span className={`puce ${demande.statut === "ouverte" ? "puce-terre" : demande.statut === "repondue" ? "puce-vert" : "puce-neutre"}`}>
                  {demande.statut}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-ivoire p-3.5 text-sm text-encre-700">
                {demande.message}
              </p>

              <div className="mt-3">
                <GestionAssistance
                  id={demande.id}
                  reponse={demande.reponse}
                  close={demande.statut === "close"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
