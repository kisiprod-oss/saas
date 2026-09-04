import { dateLongue, enLettres, fcfa, telephoneFr } from "@/lib/format";
import { clausesDeLAgence, remplir } from "@/lib/bail-clauses";
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

  // Les clauses de l'agence (ou celles du logiciel), et les valeurs qui
  // viennent s'y glisser. C'est ici que le bail devient celui DE CE
  // locataire : meme texte juridique, donnees propres a son dossier.
  const clauses = clausesDeLAgence(agence.modele_bail_clauses);

  const moyens = [
    agence.paiement_orange_money && `Orange Money (${telephoneFr(agence.paiement_orange_money)})`,
    agence.paiement_wave && `Wave (${telephoneFr(agence.paiement_wave)})`,
    agence.paiement_free_money && `Free Money (${telephoneFr(agence.paiement_free_money)})`,
  ].filter(Boolean) as string[];

  const valeurs: Record<string, string> = {
    bailleur: agence.nom,
    locataire: `${contrat.locataire_prenom} ${contrat.locataire_nom}`,
    bien: contrat.bien_titre,
    adresseBien: adresseBien ? `, situé à ${adresseBien}` : "",
    description: description ? `, composé de : ${description}` : "",
    duree: `${contrat.duree_mois} mois`,
    dateDebut: dateLongue(contrat.date_debut),
    phraseFin: contrat.date_fin
      ? ` Il prendra fin le ${dateLongue(contrat.date_fin)}.`
      : " Il est renouvelable par tacite reconduction.",
    loyer: fcfa(contrat.loyer),
    loyerLettres: enLettres(contrat.loyer),
    jourEcheance: String(contrat.jour_echeance),
    phrasePaiement: moyens.length > 0
      ? `, auprès des services indiqués ${moyens.join(" ou ")}`
      : "",
    phraseCharges: contrat.charges > 0
      ? ` S'y ajoutent des charges locatives de ${fcfa(contrat.charges)} par mois, soit un total mensuel de ${fcfa(loyerTotal)}.`
      : "",
    phraseCaution: contrat.caution > 0
      ? `Le preneur verse à la signature un dépôt de garantie de ${fcfa(contrat.caution)}`
        + `${moisCaution > 0 ? `, soit ${moisCaution} mois de loyer` : ""}.`
      : "Aucun dépôt de garantie n'est exigé au titre du présent bail.",
    ville: agence.ville ?? "Dakar",
  };

  const Article = ({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) => (
    <div className="mt-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-900">
        Article {n} — {titre}
      </p>
      <div className="mt-1 space-y-1 text-[11px] leading-relaxed text-slate-700">{children}</div>
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

        {clauses.map((c, i) => (
          <Article key={c.cle} n={i + 1} titre={c.titre}>
            {/* Chaque ligne du texte devient un paragraphe : les clauses en
                comportent plusieurs, et les tirets doivent se detacher. */}
            {remplir(c.texte, valeurs)
              .split("\n")
              .map((ligne) => ligne.trim())
              .filter((ligne) => ligne !== "")
              .map((ligne, j) => <p key={j}>{ligne}</p>)}
          </Article>
        ))}

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
