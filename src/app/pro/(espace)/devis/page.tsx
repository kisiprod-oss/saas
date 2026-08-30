import Link from "next/link";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import {
  actionChangerPlanArtisan, actionDeclinerDevisArtisan, actionRepondreDevis, actionTerminerDevis,
} from "@/lib/actions";
import { devisReponduesCeMois, listerDevisArtisan } from "@/lib/requetes";
import { etatQuotaDevis } from "@/lib/quota";
import { planArtisan, PLANS_ARTISAN } from "@/lib/tarifs";
import { dateFr, fcfa, telephoneBrut, telephoneFr } from "@/lib/format";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { IconeCheck, IconeTelephone } from "@/components/icones";

export const metadata = { title: "Mes devis" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageDevisArtisan({ searchParams }: { searchParams: Promise<Params> }) {
  const artisan = await exigerSessionArtisan();
  const params = await searchParams;
  const termine = (Array.isArray(params.termine) ? params.termine[0] : params.termine) === "1";

  const tousLesDevis = listerDevisArtisan(artisan.id);
  const quota = etatQuotaDevis(artisan.plan_devis, devisReponduesCeMois(artisan.id));
  const formule = planArtisan(artisan.plan_devis);

  const enAttente = tousLesDevis.filter((d) => d.statut === "demande");
  const proposes = tousLesDevis.filter((d) => d.statut === "propose");
  const acceptes = tousLesDevis.filter((d) => d.statut === "accepte");
  const clos = tousLesDevis.filter((d) => d.statut === "termine" || d.statut === "refuse");

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mes devis</h1>
      <p className="mt-1 text-sm text-slate-500">
        Les particuliers vous trouvent depuis votre fiche publique et demandent un devis
        directement. Sen Gestion ne touche jamais à l&apos;argent du projet.
      </p>

      <div className="mt-5">
        <MessagesUrl params={params} />
        {termine && (
          <Alerte type="succes">
            Projet marqué terminé. Un lien d&apos;avis a été ouvert pour votre client.
          </Alerte>
        )}
      </div>

      {/* ------------------------------ Formule ------------------------------ */}
      <Carte className="mt-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Formule {formule.nom}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {quota.illimite
                ? "Devis répondus illimités."
                : `${quota.reponduesCeMois}/${quota.quota} devis répondus ce mois-ci.`}
            </p>
          </div>
          {quota.illimite ? (
            <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20 shrink-0">Actif</span>
          ) : null}
        </div>

        {!quota.illimite && quota.atteint && (
          <div className="mt-3">
            <Alerte type="info">
              Quota du mois atteint. Passez à la formule Devis Pro pour continuer à répondre.
            </Alerte>
          </div>
        )}

        {!quota.illimite && (
          <form action={actionChangerPlanArtisan} className="mt-4">
            <input type="hidden" name="plan_devis" value="pro" />
            <button type="submit" className="btn-primaire w-full py-2.5">
              Passer à {PLANS_ARTISAN.find((p) => p.code === "pro")!.nom}
              {" — "}{fcfa(PLANS_ARTISAN.find((p) => p.code === "pro")!.prixMois)}/mois
            </button>
          </form>
        )}
      </Carte>

      {/* ------------------------------ Nouvelles demandes ------------------------------ */}
      <Carte className="mt-5 p-5">
        <h2 className="font-semibold text-slate-900">
          Nouvelles demandes {enAttente.length > 0 && `(${enAttente.length})`}
        </h2>

        {enAttente.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune demande en attente de réponse.</p>
        ) : (
          <ul className="mt-4 space-y-5">
            {enAttente.map((d) => (
              <li key={d.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{d.nom_client}</p>
                  <span className="text-xs text-slate-400">{dateFr(d.cree_le)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {telephoneFr(d.telephone_client)}{d.ville && ` · ${d.ville}`}
                </p>
                <p className="mt-2 text-sm text-slate-600">{d.description}</p>

                <form action={actionRepondreDevis} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={d.id} />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      name="montant_propose" inputMode="numeric" required
                      className="champ" placeholder="Votre prix, en FCFA"
                      disabled={quota.atteint}
                    />
                    <button type="submit" className="btn-primaire" disabled={quota.atteint}>
                      Proposer
                    </button>
                  </div>
                  <input name="message_artisan" className="champ" placeholder="Message (facultatif)" disabled={quota.atteint} />
                </form>
                <form action={actionDeclinerDevisArtisan} className="mt-2">
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="text-xs text-slate-400 hover:text-slate-600">
                    Décliner ce projet
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      {/* ------------------------------ En attente du client ------------------------------ */}
      {proposes.length > 0 && (
        <Carte className="mt-5 p-5">
          <h2 className="font-semibold text-slate-900">En attente de réponse du client</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {proposes.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{d.nom_client}</p>
                  <span className="text-sm font-semibold text-brand-700">{fcfa(d.montant_propose)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{d.description}</p>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* ------------------------------ Acceptés, à réaliser ------------------------------ */}
      {acceptes.length > 0 && (
        <Carte className="mt-5 p-5">
          <h2 className="font-semibold text-slate-900">Acceptés — à réaliser</h2>
          <ul className="mt-4 space-y-4">
            {acceptes.map((d) => (
              <li key={d.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{d.nom_client}</p>
                  <span className="text-sm font-semibold text-brand-700">{fcfa(d.montant_propose)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{d.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a href={`tel:+${telephoneBrut(d.telephone_client)}`} className="btn-secondaire px-3 py-1.5 text-xs">
                    <IconeTelephone className="h-3.5 w-3.5" /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${telephoneBrut(d.telephone_client)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-sable px-3 py-1.5 text-xs"
                  >
                    WhatsApp
                  </a>
                  <form action={actionTerminerDevis} className="ml-auto">
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="btn-primaire px-3 py-1.5 text-xs">
                      <IconeCheck className="h-3.5 w-3.5" /> Marquer terminé
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {/* ------------------------------ Historique ------------------------------ */}
      {clos.length > 0 && (
        <Carte className="mt-5 p-5">
          <h2 className="font-semibold text-slate-900">Historique</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {clos.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{d.nom_client}</p>
                  <p className="text-xs text-slate-500">{d.description}</p>
                </div>
                <span className={`badge shrink-0 ${d.statut === "termine"
                  ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                  : "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
                  {d.statut === "termine" ? "Terminé" : "Refusé"}
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      {tousLesDevis.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Aucun devis pour l&apos;instant. Dès qu&apos;un particulier vous en demande un
          depuis votre fiche publique, il apparaît ici.{" "}
          <Link href="/professionnels" className="font-medium text-brand-700 hover:underline">
            Voir ma fiche
          </Link>
        </p>
      )}
    </>
  );
}
