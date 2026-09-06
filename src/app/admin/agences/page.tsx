import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import { plateforme, type LigneAdherent } from "@/lib/plateforme";
import { plan, planEffectif } from "@/lib/tarifs";
import { dateFr, fcfa } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Agences" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

/**
 * Etat d'un abonnement, du point de vue de celui qui encaisse.
 *
 * La formule inscrite dans la fiche et la formule qui s'applique reellement
 * ne sont pas la meme chose : une formule payante dont l'echeance est passee
 * retombe en Decouverte sans que la ligne change en base. C'est exactement la
 * situation qu'il faut voir d'un coup d'œil — l'agence croit etre servie, et
 * elle ne l'est plus.
 */
function etatAbonnement(a: LigneAdherent) {
  const souscrit = plan(a.plan);
  const applique = planEffectif(a);

  if (souscrit.prixMois === 0) {
    return { libelle: "Gratuite", couleur: "bg-slate-100 text-slate-700 ring-slate-600/20" };
  }
  if (!a.plan_expire_le) {
    return { libelle: "Sans terme", couleur: "bg-sky-100 text-sky-800 ring-sky-600/20" };
  }
  if (applique.code !== souscrit.code) {
    return { libelle: "Expirée", couleur: "bg-rose-100 text-rose-800 ring-rose-600/20" };
  }

  // Trente jours : le temps qu'il faut pour appeler, relancer et encaisser.
  const joursRestants = Math.ceil(
    (new Date(`${a.plan_expire_le}T23:59:59Z`).getTime() - Date.now()) / 86_400_000,
  );
  if (joursRestants <= 30) {
    return {
      libelle: `Expire dans ${joursRestants} j`,
      couleur: "bg-amber-100 text-amber-800 ring-amber-600/20",
    };
  }
  return { libelle: "À jour", couleur: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" };
}

export default async function PageAdminAgences({
  searchParams,
}: { searchParams: Promise<Params> }) {
  await exigerAdmin();
  const params = await searchParams;
  const recherche = lire(params, "q").trim().toLowerCase();

  const { adherents } = plateforme();

  // La recherche se fait ici plutot qu'en base : quelques centaines de lignes
  // au plus, et cela permet de chercher dans la ville comme dans le nom sans
  // multiplier les requetes.
  const liste = recherche
    ? adherents.filter((a) =>
        [a.nom, a.ville, a.email, a.telephone]
          .filter(Boolean)
          .some((champ) => String(champ).toLowerCase().includes(recherche)))
    : adherents;

  const payantes = adherents.filter((a) => plan(a.plan).prixMois > 0);
  const expirees = payantes.filter((a) => planEffectif(a).code !== plan(a.plan).code);
  const aRelancer = payantes.filter((a) => {
    if (!a.plan_expire_le || planEffectif(a).code !== plan(a.plan).code) return false;
    const jours = Math.ceil(
      (new Date(`${a.plan_expire_le}T23:59:59Z`).getTime() - Date.now()) / 86_400_000,
    );
    return jours <= 30;
  });

  return (
    <>
      <EnTetePage
        titre="Agences"
        sousTitre="Ouvrez une agence pour changer sa formule ou prolonger son abonnement."
      />
      <MessagesUrl params={params} />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Carte className="p-4">
          <p className="text-xs font-medium text-slate-500">Comptes</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{adherents.length}</p>
          <p className="text-xs text-slate-500">dont {payantes.length} payantes</p>
        </Carte>
        <Carte className={`p-4 ${aRelancer.length > 0 ? "border-amber-300 bg-amber-50/50" : ""}`}>
          <p className="text-xs font-medium text-slate-500">À relancer sous 30 jours</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{aRelancer.length}</p>
          <p className="text-xs text-slate-500">abonnements qui arrivent à terme</p>
        </Carte>
        <Carte className={`p-4 ${expirees.length > 0 ? "border-rose-300 bg-rose-50/50" : ""}`}>
          <p className="text-xs font-medium text-slate-500">Expirées</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{expirees.length}</p>
          <p className="text-xs text-slate-500">retombées en Découverte</p>
        </Carte>
      </div>

      <Carte className="mt-4 p-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label className="etiquette" htmlFor="q">Chercher une agence</label>
            <input
              id="q" name="q" defaultValue={recherche} className="champ"
              placeholder="Nom, ville, e-mail ou téléphone…"
            />
          </div>
          <button type="submit" className="btn-secondaire">Chercher</button>
          {recherche && (
            <Link href="/admin/agences" className="text-sm text-slate-500 hover:text-brand-700">
              Tout afficher
            </Link>
          )}
        </form>

        {liste.length === 0 ? (
          <div className="mt-4">
            <EtatVide
              titre="Aucune agence ne correspond"
              description="Essayez avec le nom seul, ou une partie du numéro."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Agence</th>
                  <th>Formule</th>
                  <th>Échéance</th>
                  <th>État</th>
                  <th className="text-right">Biens</th>
                  <th className="text-right">Locataires</th>
                  <th>Dernière facture</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((a) => {
                  const etat = etatAbonnement(a);
                  const souscrit = plan(a.plan);
                  return (
                    <tr key={a.id}>
                      <td>
                        <Link
                          href={`/admin/agences/${a.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {a.nom}
                        </Link>
                        <span className="block text-xs text-slate-400">
                          {[a.ville, a.email].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-slate-600">
                        {souscrit.nom}
                        {souscrit.prixMois > 0 && (
                          <span className="block text-xs text-slate-400">
                            {fcfa(souscrit.prixMois)} / mois
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap text-slate-600">
                        {a.plan_expire_le ? dateFr(a.plan_expire_le) : "—"}
                      </td>
                      <td>
                        <span className={`badge ${etat.couleur}`}>{etat.libelle}</span>
                      </td>
                      <td className="text-right text-slate-600">{a.nb_biens}</td>
                      <td className="text-right text-slate-600">{a.nb_locataires}</td>
                      <td className="whitespace-nowrap text-slate-600">
                        {dateFr(a.derniere_activite)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Carte>
    </>
  );
}
