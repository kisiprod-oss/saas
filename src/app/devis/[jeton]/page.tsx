import Link from "next/link";
import { notFound } from "next/navigation";
import { devisParJeton } from "@/lib/requetes";
import { actionAccepterDevis, actionRefuserDevis } from "@/lib/actions";
import { adresseDuSite } from "@/lib/email";
import { libelle, METIERS } from "@/lib/constantes";
import { fcfa, telephoneBrut, telephoneFr } from "@/lib/format";
import { Alerte, Carte } from "@/components/ui";
import { LogoSenComplet } from "@/components/entete-public";
import { BoutonCopier } from "@/components/bouton-copier";
import { IconeCheck, IconeTelephone } from "@/components/icones";

export const metadata = { title: "Suivi de mon devis" };
export const dynamic = "force-dynamic";

export default async function PageDevis({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const devis = devisParJeton(jeton);
  if (!devis) notFound();
  const lienDevis = `${await adresseDuSite()}/devis/${jeton}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="rounded-xl bg-white px-6 py-4 shadow-sm"><LogoSenComplet /></Link>
        </div>

        <Carte className="p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Votre demande de devis</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            {devis.artisan_nom} — {libelle(METIERS, devis.artisan_metier)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{devis.description}</p>

          <div className="mt-6 border-t border-slate-100 pt-6">
            {devis.statut === "demande" && (
              <>
                <Alerte type="info">
                  Votre demande a été transmise. {devis.artisan_nom} va vous répondre avec un
                  prix — revenez sur cette page pour suivre l&apos;échange.
                </Alerte>
                <p className="mt-3 text-xs text-slate-500">
                  Conservez ce lien : c&apos;est le seul moyen de suivre votre demande.
                </p>
                <BoutonCopier texte={lienDevis} className="btn-secondaire mt-3 w-full" />
              </>
            )}

            {devis.statut === "propose" && (
              <>
                <p className="text-sm font-semibold text-slate-900">Prix proposé</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">{fcfa(devis.montant_propose)}</p>
                {devis.message_artisan && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {devis.message_artisan}
                  </p>
                )}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <form action={actionAccepterDevis}>
                    <input type="hidden" name="jeton" value={jeton} />
                    <button type="submit" className="btn-primaire w-full">Accepter</button>
                  </form>
                  <form action={actionRefuserDevis}>
                    <input type="hidden" name="jeton" value={jeton} />
                    <button type="submit" className="btn-secondaire w-full">Refuser</button>
                  </form>
                </div>
                <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                  Sen Gestion ne touche pas à ce paiement : il se règle directement entre
                  vous et {devis.artisan_nom}.
                </p>
              </>
            )}

            {devis.statut === "accepte" && (
              <>
                <Alerte type="succes">
                  Devis accepté. Contactez {devis.artisan_nom} pour organiser la
                  réalisation du projet.
                </Alerte>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <a href={`tel:+${telephoneBrut(devis.artisan_telephone)}`} className="btn-secondaire">
                    <IconeTelephone className="h-4 w-4" /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${telephoneBrut(devis.artisan_telephone)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-sable"
                  >
                    WhatsApp
                  </a>
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  {telephoneFr(devis.artisan_telephone)}
                </p>
              </>
            )}

            {devis.statut === "refuse" && (
              <Alerte type="info">
                Ce devis a été refusé.{devis.motif_refus && ` ${devis.motif_refus}`}
              </Alerte>
            )}

            {devis.statut === "termine" && (
              <>
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <IconeCheck className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-emerald-900">Projet terminé</p>
                </div>
                {devis.intervention_jeton && (
                  <Link href={`/avis/${devis.intervention_jeton}`} className="btn-primaire mt-4 w-full py-3">
                    Laisser un avis à {devis.artisan_nom}
                  </Link>
                )}
              </>
            )}
          </div>
        </Carte>
      </div>
    </div>
  );
}
