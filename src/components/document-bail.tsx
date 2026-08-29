import { dateLongue, enLettres, fcfa, telephoneFr } from "@/lib/format";
import { libelle, TYPES_BIEN } from "@/lib/constantes";
import type { Agence } from "@/lib/auth";
import type { ContratPourBail } from "@/lib/types";
import {
  BandeSecurite, BlocVerification, CachetAgence, EnTeteAgence, Filigrane,
} from "@/components/papier-agence";

/**
 * Le contrat de bail imprimable, sur le papier a en-tete de l'agence.
 *
 * Les articles reprennent les usages courants d'un bail d'habitation au
 * Senegal. Ils sont volontairement courts et lisibles : un bail que le
 * locataire ne comprend pas ne le protege pas.
 *
 * ATTENTION — ce modele n'est pas un acte redige par un juriste. Il met en
 * forme ce que l'agence a saisi ; il ne remplace ni un notaire ni un avocat,
 * et une agence qui a des clauses particulieres doit les faire ajouter par
 * un professionnel. C'est ecrit noir sur blanc en bas du document.
 */
export function DocumentBail({
  agence, contrat, verification,
}: {
  agence: Agence;
  contrat: ContratPourBail;
  verification?: { code: string; qr: string; lien: string };
}) {
  const loyerTotal = contrat.loyer + contrat.charges;
  const moisCaution = contrat.loyer > 0 ? Math.round(contrat.caution / contrat.loyer) : 0;

  const description = [
    libelle(TYPES_BIEN, contrat.bien_type),
    contrat.bien_chambres > 0 && `${contrat.bien_chambres} chambre(s)`,
    contrat.bien_salles_bain > 0 && `${contrat.bien_salles_bain} salle(s) d'eau`,
    contrat.bien_surface && `${contrat.bien_surface} m²`,
    contrat.bien_meuble === 1 ? "meublé" : null,
  ].filter(Boolean).join(", ");

  // L'adresse libre du bien contient souvent deja le quartier et la ville :
  // on ne rajoute que ce qui n'y figure pas, sinon le bail imprime
  // « Almadies, Dakar, Almadies, Dakar ».
  const dejaDit = (contrat.bien_adresse ?? "").toLowerCase();
  const adresseBien = [
    contrat.bien_adresse,
    !dejaDit.includes((contrat.bien_quartier ?? "").toLowerCase()) ? contrat.bien_quartier : null,
    !dejaDit.includes(contrat.bien_ville.toLowerCase()) ? contrat.bien_ville : null,
  ].filter(Boolean).join(", ");

  const Article = ({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) => (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-900">
        Article {n} — {titre}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{children}</p>
    </div>
  );

  return (
    <article className="relative mx-auto max-w-[210mm] overflow-hidden bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <Filigrane agence={agence} />
      <div className="relative">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand-600 pb-6">
          <EnTeteAgence agence={agence} />
          <div className="text-right">
            <p className="text-2xl font-extrabold uppercase tracking-tight text-brand-700">
              Contrat de bail
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">N° {contrat.reference}</p>
            <p className="text-xs text-slate-600">
              Établi le {dateLongue(new Date().toISOString().slice(0, 10))}
            </p>
            {contrat.statut === "resilie" && (
              <p className="mt-2 inline-block rounded border border-rose-300 px-2 py-0.5 text-xs font-bold uppercase text-rose-600">
                Résilié
              </p>
            )}
          </div>
        </header>

        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          Entre les soussignés
        </p>

        <section className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Le bailleur</p>
            <p className="mt-1.5 font-semibold text-slate-900">{agence.nom}</p>
            <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-600">
              {agence.adresse && <p>{agence.adresse}</p>}
              {agence.telephone && <p>Tél. {telephoneFr(agence.telephone)}</p>}
              {contrat.proprietaire_nom && (
                <p className="mt-1">Agissant pour le compte de {contrat.proprietaire_nom}.</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Le preneur</p>
            <p className="mt-1.5 font-semibold text-slate-900">
              {contrat.locataire_prenom} {contrat.locataire_nom}
            </p>
            <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-600">
              {contrat.locataire_cni && <p>CNI : {contrat.locataire_cni}</p>}
              {contrat.locataire_profession && <p>{contrat.locataire_profession}</p>}
              {contrat.locataire_adresse && <p>{contrat.locataire_adresse}</p>}
              <p>Tél. {telephoneFr(contrat.locataire_telephone)}</p>
            </div>
          </div>
        </section>

        <p className="mt-6 inline-block border border-slate-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800">
          Il a été convenu et arrêté ce qui suit
        </p>

        <Article n={1} titre="Objet du contrat">
          Le bailleur donne en location au preneur le bien désigné{" "}
          <strong>{contrat.bien_titre}</strong>
          {adresseBien && <>, situé à {adresseBien}</>}
          {description && <>, composé de : {description}</>}.
        </Article>

        <Article n={2} titre="Durée">
          Le présent bail est conclu pour une durée de <strong>{contrat.duree_mois} mois</strong>,
          à compter du {dateLongue(contrat.date_debut)}
          {contrat.date_fin
            ? <> et prenant fin le {dateLongue(contrat.date_fin)}.</>
            : <>, renouvelable par tacite reconduction.</>}
        </Article>

        <Article n={3} titre="Loyer">
          Le loyer mensuel est fixé à <strong>{fcfa(contrat.loyer)}</strong>{" "}
          ({enLettres(contrat.loyer)} francs CFA), payable d&apos;avance le{" "}
          {contrat.jour_echeance} de chaque mois.
          {contrat.charges > 0 && (
            <> S&apos;y ajoutent des charges locatives de {fcfa(contrat.charges)} par mois,
            soit un total mensuel de <strong>{fcfa(loyerTotal)}</strong>.</>
          )}
        </Article>

        <Article n={4} titre="Dépôt de garantie">
          {contrat.caution > 0 ? (
            <>
              Le preneur verse à la signature un dépôt de garantie de{" "}
              <strong>{fcfa(contrat.caution)}</strong>
              {moisCaution > 0 && <>, soit {moisCaution} mois de loyer</>}. Ce dépôt lui est
              restitué en fin de bail, déduction faite des sommes dues et des réparations
              locatives constatées.
            </>
          ) : (
            <>Aucun dépôt de garantie n&apos;est exigé au titre du présent bail.</>
          )}
        </Article>

        <Article n={5} titre="Charges et entretien">
          {contrat.charges > 0
            ? "Les charges mentionnées à l'article 3 couvrent les prestations convenues entre les parties."
            : "L'eau, l'électricité et les consommations personnelles sont à la charge du preneur."}
          {" "}Le preneur entretient le bien en bon père de famille et signale sans délai au
          bailleur toute dégradation nécessitant réparation.
        </Article>

        <Article n={6} titre="Clause résolutoire">
          À défaut de paiement du loyer à son échéance et un mois après une mise en demeure
          restée sans effet, le présent bail pourra être résilié de plein droit si bon semble
          au bailleur, sans préjudice de ses autres droits.
        </Article>

        <p className="mt-6 text-[11px] text-slate-700">
          Fait à {agence.ville ?? "Dakar"}, le{" "}
          {dateLongue(new Date().toISOString().slice(0, 10))}, en deux exemplaires originaux.
        </p>

        <footer className="mt-8 flex items-end justify-between gap-6">
          <div className="w-56 text-center">
            <p className="text-xs font-semibold text-slate-700">Le bailleur</p>
            <div className="mt-14 border-t border-slate-400 pt-1.5 text-[11px] text-slate-500">
              Signature
            </div>
          </div>
          <CachetAgence agence={agence} />
          <div className="w-56 text-center">
            <p className="text-xs font-semibold text-slate-700">Le preneur</p>
            <div className="mt-14 border-t border-slate-400 pt-1.5 text-[11px] text-slate-500">
              Signature, précédée de&nbsp;« lu et approuvé »
            </div>
          </div>
        </footer>

        <p className="mt-6 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] leading-snug text-amber-900 impression-couleurs">
          Ce modèle met en forme les informations saisies par l&apos;agence. Il ne constitue pas
          un acte rédigé par un juriste : pour une situation particulière, faites relire ou
          compléter ce bail par un professionnel du droit.
        </p>

        {verification && (
          <>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <BlocVerification {...verification} />
            </div>
            <BandeSecurite agence={agence} />
          </>
        )}
      </div>
    </article>
  );
}
