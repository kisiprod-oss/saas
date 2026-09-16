import Link from "next/link";
import { exigerAdmin, boutiques } from "@/lib/admin";
import { montant, dateFr } from "@/lib/format";
import { Recherche } from "@/components/icones";

export const metadata = { title: "Boutiques" };

export default async function PageBoutiques({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  await exigerAdmin();
  const { q } = await searchParams;
  const liste = boutiques(q);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titre-page">Boutiques</h1>
        <form className="flex gap-2" role="search">
          <div className="relative">
            <Recherche className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-encre-400" />
            <input name="q" defaultValue={q} className="champ pl-9"
              placeholder="Nom, adresse ou e-mail" aria-label="Chercher une boutique" />
          </div>
          <button type="submit" className="btn-secondaire">Chercher</button>
        </form>
      </header>

      <p className="text-sm text-encre-600">{liste.length} boutique(s)</p>

      <div className="carte overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-ivoire text-left text-xs uppercase tracking-wide text-encre-500">
            <tr>
              <th className="px-4 py-3 font-medium">Boutique</th>
              <th className="px-4 py-3 font-medium">Propriétaire</th>
              <th className="px-4 py-3 font-medium">Formule</th>
              <th className="px-4 py-3 text-right font-medium">Produits</th>
              <th className="px-4 py-3 text-right font-medium">Commandes</th>
              <th className="px-4 py-3 text-right font-medium">Encaissé</th>
              <th className="px-4 py-3 text-right font-medium">IA / mois</th>
              <th className="px-4 py-3 font-medium">Créée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-encre-100">
            {liste.map((boutique) => (
              <tr key={boutique.id} className="hover:bg-encre-50">
                <td className="px-4 py-3">
                  <Link href={`/administration/boutiques/${boutique.id}`}
                    className="font-medium text-encre-900 hover:text-vert-700">
                    {boutique.nom}
                  </Link>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {boutique.demonstration ? <span className="puce puce-neutre">Démo</span> : null}
                    {boutique.suspendue_le ? <span className="puce puce-rouge">Suspendue</span> : null}
                    {!boutique.publiee_le ? <span className="puce puce-terre">Brouillon</span> : (
                      <span className="puce puce-vert">En ligne</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-encre-600">
                  {boutique.proprietaire ?? "—"}
                  <span className="block text-xs text-encre-400">{boutique.email ?? ""}</span>
                </td>
                <td className="px-4 py-3 text-encre-600">
                  {boutique.offre}
                  {boutique.offre_expire_le ? (
                    <span className="block text-xs text-encre-400">
                      jusqu&apos;au {dateFr(boutique.offre_expire_le)}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right">{boutique.produits}</td>
                <td className="px-4 py-3 text-right">{boutique.commandes}</td>
                <td className="px-4 py-3 text-right text-vert-700">
                  {montant(boutique.encaisse, "FCFA")}
                </td>
                <td className="px-4 py-3 text-right">{boutique.ia_mois}</td>
                <td className="px-4 py-3 text-encre-500">{dateFr(boutique.cree_le)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
