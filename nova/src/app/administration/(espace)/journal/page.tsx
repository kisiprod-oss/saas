import { exigerAdmin, journal } from "@/lib/admin";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Journal" };

/**
 * Le journal des actions d'administration.
 *
 * Il n'est pas la pour surveiller l'equipe : il est la pour qu'on puisse
 * repondre, six mois plus tard, a « pourquoi cette boutique a-t-elle ete
 * suspendue ? ». Chaque suspension y figure avec son motif.
 */
export default async function PageJournal() {
  await exigerAdmin();
  const entrees = journal(200);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Journal des actions</h1>
        <p className="mt-1 text-sm text-encre-600">
          Toute action d&apos;administration y figure, avec son motif quand il y en a un.
        </p>
      </header>

      <div className="carte overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-ivoire text-left text-xs uppercase tracking-wide text-encre-500">
            <tr>
              <th className="px-4 py-3 font-medium">Quand</th>
              <th className="px-4 py-3 font-medium">Qui</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Cible</th>
              <th className="px-4 py-3 font-medium">Motif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-encre-100">
            {entrees.map((entree) => (
              <tr key={entree.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-encre-500">
                  {dateHeureFr(entree.cree_le)}
                </td>
                <td className="px-4 py-2.5">{entree.admin ?? "—"}</td>
                <td className="px-4 py-2.5 font-medium">{entree.action}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-encre-600">
                  {entree.cible ?? "—"}
                  {entree.details ? (
                    <span className="block font-sans text-encre-400">{entree.details}</span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5 text-encre-600">{entree.motif ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
