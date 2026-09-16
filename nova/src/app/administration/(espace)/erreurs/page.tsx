import Link from "next/link";
import { exigerAdmin, erreurs } from "@/lib/admin";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Erreurs" };

/**
 * Le journal des incidents.
 *
 * Il recoit les echecs de generation IA, les notifications de paiement
 * rejetees, les commandes qui n'ont pas pu s'ecrire. C'est la premiere page a
 * ouvrir quand un commercant dit « ca ne marche pas ».
 */
export default async function PageErreurs() {
  await exigerAdmin();
  const liste = erreurs(200);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Incidents</h1>
        <p className="mt-1 text-sm text-encre-600">
          {liste.length} entrée(s). Les plus récentes d&apos;abord.
        </p>
      </header>

      {liste.length === 0 ? (
        <div className="carte px-6 py-12 text-center text-encre-500">
          Aucun incident enregistré.
        </div>
      ) : (
        <ul className="carte divide-y divide-encre-100">
          {liste.map((erreur) => (
            <li key={erreur.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="puce puce-neutre">{erreur.source}</span>
                <span className="flex-1 text-sm text-encre-900">{erreur.message}</span>
                <span className="text-xs text-encre-400">{dateHeureFr(erreur.cree_le)}</span>
              </div>
              {erreur.details ? (
                <p className="mt-1 break-all font-mono text-xs text-encre-500">{erreur.details}</p>
              ) : null}
              {erreur.boutique_id ? (
                <Link href={`/administration/boutiques/${erreur.boutique_id}`}
                  className="mt-1 inline-block text-xs text-vert-700 hover:underline">
                  {erreur.boutique ?? `Boutique ${erreur.boutique_id}`}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
