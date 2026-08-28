import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { lireLocataire, listerContrats, listerFactures } from "@/lib/requetes";
import {
  actionActiverAccesLocataire, actionDesactiverAccesLocataire, actionSupprimerLocataire,
} from "@/lib/actions";
import { fcfa, periodeLisible, telephoneBrut, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { FormulaireLocataire } from "@/components/formulaire-locataire";
import { IconeCorbeille, IconeRetour } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageLocataire({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const locataire = lireLocataire(agence.id, Number(id));
  if (!locataire) notFound();

  const lire = (c: string) => {
    const v = requete[c];
    return Array.isArray(v) ? v[0] : v;
  };
  const nouveauMotDePasse = lire("acces");

  const baux = listerContrats(agence.id).filter((c) => c.locataire_id === locataire.id);
  const factures = listerFactures(agence.id)
    .filter((f) => baux.some((b) => b.id === f.contrat_id))
    .slice(0, 8);

  return (
    <>
      <Link href="/dashboard/locataires" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux locataires
      </Link>

      <EnTetePage titre={`${locataire.prenom} ${locataire.nom}`} sousTitre={locataire.profession ?? "Fiche locataire"}>
        <a href={`https://wa.me/${telephoneBrut(locataire.telephone)}`} target="_blank" rel="noopener noreferrer" className="btn-sable">
          WhatsApp
        </a>
        <form action={actionSupprimerLocataire}>
          <input type="hidden" name="id" value={locataire.id} />
          <button type="submit" className="btn-danger">
            <IconeCorbeille className="h-4 w-4" /> Supprimer
          </button>
        </form>
      </EnTetePage>

      <MessagesUrl params={requete} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormulaireLocataire locataire={locataire} />
        </div>

        <aside className="space-y-5">
          <Carte className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Espace locataire</h2>
              <span className={`badge ${locataire.acces_actif
                ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                {locataire.acces_actif ? "Actif" : "Inactif"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Permet à {locataire.prenom} de consulter ses quittances et de
              signaler ses règlements depuis son téléphone.
            </p>

            {nouveauMotDePasse && (
              <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm">
                <p className="font-semibold text-brand-900">Mot de passe généré :</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider text-brand-800">
                  {nouveauMotDePasse}
                </p>
                <p className="mt-1.5 text-xs text-brand-800">
                  Communiquez-le maintenant : il ne sera plus jamais affiché.
                </p>
                <a
                  href={`https://wa.me/${telephoneBrut(locataire.telephone)}?text=${encodeURIComponent(
                    `Bonjour ${locataire.prenom}, voici vos identifiants pour l'espace locataire : téléphone ${telephoneFr(locataire.telephone)}, mot de passe ${nouveauMotDePasse}.`,
                  )}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-sable mt-2.5 w-full py-2 text-sm"
                >
                  Envoyer par WhatsApp
                </a>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <form action={actionActiverAccesLocataire} className="flex-1">
                <input type="hidden" name="id" value={locataire.id} />
                <button type="submit" className="btn-secondaire w-full">
                  {locataire.acces_actif ? "Réinitialiser le mot de passe" : "Activer l'accès"}
                </button>
              </form>
              {locataire.acces_actif === 1 && (
                <form action={actionDesactiverAccesLocataire}>
                  <input type="hidden" name="id" value={locataire.id} />
                  <button type="submit" className="btn-danger">Couper</button>
                </form>
              )}
            </div>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Baux</h2>
            {baux.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Aucun bail pour ce locataire.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {baux.map((b) => (
                  <li key={b.id} className="py-2.5">
                    <Link href={`/dashboard/contrats/${b.id}`} className="block hover:text-brand-700">
                      <p className="truncate text-sm font-medium text-slate-900">{b.bien_titre}</p>
                      <p className="text-xs text-slate-500">
                        {fcfa(b.loyer + b.charges)}/mois · {b.statut}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Dernières factures</h2>
            {factures.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Aucune facture émise.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {factures.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-2.5">
                    <Link href={`/dashboard/factures/${f.id}`} className="min-w-0 hover:text-brand-700">
                      <p className="text-sm font-medium text-slate-900">{periodeLisible(f.periode)}</p>
                      <p className="truncate text-xs text-slate-500">{f.numero}</p>
                    </Link>
                    <span className={`badge shrink-0 ${
                      f.etat === "payee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                      : f.etat === "partielle" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
                      : "bg-rose-100 text-rose-800 ring-rose-600/20"}`}>
                      {fcfa(f.reste)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </aside>
      </div>
    </>
  );
}
