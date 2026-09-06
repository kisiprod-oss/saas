import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { biensDuProprietaire, lireProprietaire } from "@/lib/requetes";
import { actionSupprimerProprietaire } from "@/lib/actions";
import { fcfa, telephoneBrut } from "@/lib/format";
import { pourAffichage } from "@/lib/telephone";
import { Carte, EnTetePage, MessagesUrl } from "@/components/ui";
import { BoutonConfirmation } from "@/components/bouton-confirmation";
import { FormulaireProprietaire } from "@/components/formulaire-proprietaire";
import { IconeCorbeille, IconeRetour } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageProprietaire({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const { id } = await params;
  const requete = await searchParams;
  const proprietaire = lireProprietaire(Number(id), agence.id);
  if (!proprietaire) notFound();

  const biens = biensDuProprietaire(proprietaire.id);

  return (
    <>
      <Link href="/dashboard/proprietaires" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux propriétaires
      </Link>

      <EnTetePage titre={proprietaire.nom} sousTitre="Fiche propriétaire">
        {proprietaire.telephone && (
          <a href={`https://wa.me/${telephoneBrut(proprietaire.telephone)}`} target="_blank" rel="noopener noreferrer" className="btn-sable">
            WhatsApp
          </a>
        )}
        <form action={actionSupprimerProprietaire}>
          <input type="hidden" name="id" value={proprietaire.id} />
          <BoutonConfirmation
            message={`Supprimer ${proprietaire.nom} ? Cette action est définitive.`}
            className="btn-danger"
          >
            <IconeCorbeille className="h-4 w-4" /> Supprimer
          </BoutonConfirmation>
        </form>
      </EnTetePage>

      <MessagesUrl params={requete} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormulaireProprietaire proprietaire={proprietaire} />
        </div>

        <aside>
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Biens rattachés</h2>
            {biens.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                Aucun bien ne pointe encore vers cette fiche. Ouvrez un bien et
                indiquez ce propriétaire pour l&apos;y rattacher.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {biens.map((b) => (
                  <li key={b.id} className="py-2.5">
                    <Link href={`/dashboard/biens/${b.id}`} className="block hover:text-brand-700">
                      <p className="truncate text-sm font-medium text-slate-900">{b.titre}</p>
                      <p className="text-xs text-slate-500">
                        {b.courte_duree === 1 ? `${fcfa(b.prix_nuit)}/nuit` : `${fcfa(b.loyer + b.charges)}/mois`}
                        {" · "}{b.statut}
                      </p>
                    </Link>
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
