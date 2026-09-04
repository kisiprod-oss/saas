import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerContrats } from "@/lib/requetes";
import { couleurStatut, libelle, STATUTS_CONTRAT } from "@/lib/constantes";
import { dateFr, fcfa } from "@/lib/format";
import { Badge, Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { IconePlus } from "@/components/icones";

export const metadata = { title: "Contrats de bail" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageContrats({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const statut = lire(params, "statut");
  const contrats = listerContrats(agence.id, statut);

  return (
    <>
      <EnTetePage titre="Contrats de bail" sousTitre={`${contrats.length} bail(s)`}>
        <Link href="/dashboard/contrats/modele" className="btn-secondaire">
          Mon modèle de bail
        </Link>
        <Link href="/dashboard/contrats/nouveau" className="btn-primaire">
          <IconePlus className="h-4 w-4" /> Nouveau bail
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/dashboard/contrats" className={`btn-secondaire ${!statut ? "border-brand-500 text-brand-700" : ""}`}>
          Tous
        </Link>
        {STATUTS_CONTRAT.map((s) => (
          <Link
            key={s.valeur}
            href={`/dashboard/contrats?statut=${s.valeur}`}
            className={`btn-secondaire ${statut === s.valeur ? "border-brand-500 text-brand-700" : ""}`}
          >
            {s.libelle}
          </Link>
        ))}
      </div>

      {contrats.length === 0 ? (
        <EtatVide
          titre="Aucun bail enregistré"
          description="Reliez un bien à un locataire pour démarrer la facturation automatique des loyers."
          action={{ href: "/dashboard/contrats/nouveau", libelle: "Créer un bail" }}
        />
      ) : (
        <Carte className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Référence</th><th>Locataire</th><th>Bien</th><th>Début</th>
                  <th className="text-right">Loyer + charges</th>
                  <th className="text-right">Solde dû</th><th>Statut</th><th></th>
                </tr>
              </thead>
              <tbody>
                {contrats.map((c) => (
                  <tr key={c.id}>
                    <td className="whitespace-nowrap font-medium text-slate-900">{c.reference}</td>
                    <td className="whitespace-nowrap">{c.locataire_prenom} {c.locataire_nom}</td>
                    <td className="max-w-[14rem] truncate">{c.bien_titre}</td>
                    <td className="whitespace-nowrap text-slate-500">{dateFr(c.date_debut)}</td>
                    <td className="whitespace-nowrap text-right font-semibold text-slate-900">
                      {fcfa(c.loyer + c.charges)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <span className={c.impayes > 0 ? "font-semibold text-rose-600" : "text-slate-400"}>
                        {c.impayes > 0 ? fcfa(c.impayes) : "à jour"}
                      </span>
                    </td>
                    <td>
                      <Badge couleur={couleurStatut(STATUTS_CONTRAT, c.statut)}>
                        {libelle(STATUTS_CONTRAT, c.statut)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <Link href={`/dashboard/contrats/${c.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Carte>
      )}
    </>
  );
}
