import Link from "next/link";
import { exigerAdmin, integrations } from "@/lib/admin";
import { FOURNISSEURS, ETATS_LIBELLES } from "@/lib/paiements";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Intégrations" };

/**
 * L'etat des integrations de paiement.
 *
 * Deux tableaux : ce que le CODE sait faire (source : src/lib/paiements.ts),
 * et ce que les boutiques ont REELLEMENT branche. Les deux doivent etre lus
 * ensemble : une boutique en mode test n'encaisse rien, meme si son
 * prestataire est marque « utilisable ».
 */
export default async function PageIntegrations() {
  await exigerAdmin();
  const branchees = integrations();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Intégrations de paiement</h1>
        <p className="mt-1 text-sm text-encre-600">
          L&apos;état déclaré de chaque prestataire, et les boutiques qui les utilisent.
        </p>
      </header>

      <section className="carte p-5">
        <h2 className="titre-section">Ce que le code sait faire</h2>
        <ul className="mt-4 space-y-4">
          {FOURNISSEURS.map((fournisseur) => (
            <li key={fournisseur.code} className="border-b border-encre-100 pb-4 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-encre-900">{fournisseur.nom}</span>
                <span className={`puce ${ETATS_LIBELLES[fournisseur.etat].ton}`}>
                  {ETATS_LIBELLES[fournisseur.etat].texte}
                </span>
                <span className="text-xs text-encre-500">{fournisseur.pays.join(", ")}</span>
              </div>
              <p className="mt-1.5 text-sm text-encre-600">{fournisseur.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-encre-500">
          Cette liste vient de <code className="font-mono">src/lib/paiements.ts</code>. Le
          passage d&apos;un prestataire à « utilisable » demande d&apos;avoir relu sa
          documentation officielle et fait une transaction réelle de bout en bout.
        </p>
      </section>

      <section className="carte overflow-x-auto">
        <div className="border-b border-encre-200 px-4 py-3">
          <h2 className="titre-section">Boutiques ayant branché un paiement</h2>
        </div>
        {branchees.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-encre-500">
            Aucune boutique n&apos;a activé le paiement en ligne.
          </p>
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-ivoire text-left text-xs uppercase tracking-wide text-encre-500">
              <tr>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Prestataire</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 text-right font-medium">Notifications</th>
                <th className="px-4 py-3 font-medium">Dernière</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-encre-100">
              {branchees.map((ligne) => (
                <tr key={ligne.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/administration/boutiques/${ligne.id}`} className="lien">
                      {ligne.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{ligne.fournisseur ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`puce ${ligne.mode === "reel" ? "puce-vert" : "puce-terre"}`}>
                      {ligne.mode === "reel" ? "Réel" : "Test"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{ligne.evenements}</td>
                  <td className="px-4 py-2.5 text-encre-500">
                    {ligne.dernier ? dateHeureFr(ligne.dernier) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
