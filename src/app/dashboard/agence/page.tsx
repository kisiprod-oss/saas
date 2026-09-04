import { exigerSession } from "@/lib/auth";
import {
  actionChangerPlan, actionEnregistrerAgence, actionEnregistrerModeleBail, actionSupprimerModeleBail,
} from "@/lib/actions";
import { un } from "@/lib/db";
import { dateFr, fcfa } from "@/lib/format";
import { TAILLE_MAX_MODELE } from "@/lib/modele-bail";
import { BoutonConfirmation } from "@/components/bouton-confirmation";
import { plan, PLANS } from "@/lib/tarifs";
import { adresseDuSite, adresseSiteDeclaree, smtpConfigure } from "@/lib/email";
import Link from "next/link";
import { VILLES } from "@/lib/constantes";
import { Carte, Champ, EnTetePage, MessagesUrl, Section } from "@/components/ui";
import { ChampLogo } from "@/components/champ-logo";
import { ChampTelephone } from "@/components/champ-telephone";

export const metadata = { title: "Mon agence" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAgence({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence, utilisateur } = await exigerSession();
  const params = await searchParams;

  const formule = plan(agence.plan);
  const biens = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM biens WHERE agence_id = ?", agence.id,
  )?.n ?? 0;
  const quota = formule.maxBiens;
  const remplissage = quota === null ? 0 : Math.min(100, Math.round((biens / quota) * 100));
  const satureBientot = quota !== null && biens >= quota * 0.8;
  const emailsActifs = smtpConfigure();
  const adresse = await adresseDuSite();
  const adresseDeclaree = adresseSiteDeclaree();

  return (
    <>
      <EnTetePage
        titre="Mon agence"
        sousTitre="Ces informations apparaissent sur vos factures et vos quittances de loyer."
      />

      <MessagesUrl params={params} />

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={actionEnregistrerAgence} className="space-y-5 lg:col-span-2">
          <Section titre="Identité de l'agence">
            <div className="sm:col-span-2">
              <Champ label="Nom de l'agence" nom="nom" obligatoire valeur={agence.nom} />
            </div>
            <Champ label="NINEA" nom="ninea" valeur={agence.ninea}
                   placeholder="005812345 2V2" aide="Numéro d'identification national des entreprises." />
            <Champ label="RCCM" nom="rccm" valeur={agence.rccm} placeholder="SN DKR 2024 B 12345" />
          </Section>

          <Section titre="Coordonnées">
            <ChampTelephone valeur={agence.telephone}
                            aide="Le numéro qui vous joint, même depuis l'étranger." />
            <Champ label="Adresse e-mail" nom="email" type="email" valeur={agence.email} />
            <div className="sm:col-span-2">
              <Champ label="Adresse" nom="adresse" valeur={agence.adresse}
                     placeholder="Rue 10 x Avenue Bourguiba, Immeuble Teranga" />
            </div>
            <div>
              <label className="etiquette" htmlFor="ville">Ville</label>
              <input id="ville" name="ville" list="villes-agence" defaultValue={agence.ville ?? "Dakar"} className="champ" />
              <datalist id="villes-agence">{VILLES.map((v) => <option key={v} value={v} />)}</datalist>
            </div>
            <div className="sm:col-span-2">
              <p className="etiquette">Logo de l&apos;agence</p>
              <ChampLogo logoActuel={agence.logo_url} />
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-brand-700">
                  Ou indiquer l&apos;adresse web d&apos;une image
                </summary>
                <input name="logo_url" defaultValue={agence.logo_url ?? ""}
                       placeholder="https://…/logo.png" className="champ mt-2" />
              </details>
            </div>
          </Section>

          <Section titre="Encaissement des loyers">
            <p className="text-sm text-slate-500 sm:col-span-2">
              Ces numéros s&apos;affichent dans l&apos;espace locataire, sur la page
              « Payer mon loyer ». Sans eux, vos locataires ne savent pas où envoyer l&apos;argent.
            </p>
            <Champ label="Numéro Orange Money" nom="paiement_orange_money"
                   valeur={agence.paiement_orange_money} placeholder="77 123 45 67" />
            <Champ label="Numéro Wave" nom="paiement_wave"
                   valeur={agence.paiement_wave} placeholder="77 123 45 67" />
            <Champ label="Numéro Free Money" nom="paiement_free_money"
                   valeur={agence.paiement_free_money} placeholder="76 123 45 67" />
            <div className="sm:col-span-2">
              <label className="etiquette" htmlFor="paiement_consignes">Précisions pour vos locataires</label>
              <textarea
                id="paiement_consignes" name="paiement_consignes" rows={3}
                defaultValue={agence.paiement_consignes ?? ""}
                placeholder={"Ex : mettez votre nom et le mois en objet du transfert.\nCaisse ouverte du lundi au vendredi, 9h–17h."}
                className="champ"
              />
              <p className="mt-1 text-xs text-slate-500">
                Coordonnées bancaires, horaires de caisse, consignes de référence…
              </p>
            </div>
          </Section>

          <Section titre="Paramètres de gestion">
            <Champ
              label="Honoraires de gestion par défaut (%)" nom="commission_pct" type="number" min={0} max={100}
              valeur={Math.round(agence.commission_pct)}
              aide="Appliqué par défaut aux nouveaux baux. Au Sénégal, souvent entre 5 % et 10 % du loyer."
            />
          </Section>

          <button type="submit" className="btn-primaire">Enregistrer</button>
        </form>

        <aside className="space-y-5">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Votre compte</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Nom</dt>
                <dd className="font-medium text-slate-900">{utilisateur.nom}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">E-mail</dt>
                <dd className="truncate font-medium text-slate-900">{utilisateur.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Rôle</dt>
                <dd className="font-medium text-slate-900">
                  {utilisateur.role === "proprietaire" ? "Propriétaire du compte" : "Agent"}
                </dd>
              </div>
            </dl>
          </Carte>

          <Carte className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Ma formule</h2>
                <p className="text-sm text-slate-500">{formule.pour}</p>
              </div>
              <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">
                {formule.nom}
              </span>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {formule.prixMois === 0 ? "Gratuit" : `${fcfa(formule.prixMois)} / mois`}
            </p>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Biens utilisés</span>
                <span className={`font-semibold ${satureBientot ? "text-rose-600" : "text-slate-900"}`}>
                  {biens} / {quota === null ? "illimité" : quota}
                </span>
              </div>
              {quota !== null && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${satureBientot ? "bg-rose-500" : "bg-brand-500"}`}
                    style={{ width: `${Math.max(4, remplissage)}%` }}
                  />
                </div>
              )}
              {satureBientot && (
                <p className="mt-2 text-xs text-rose-700">
                  Vous approchez de la limite de votre formule.
                </p>
              )}
            </div>

            <form action={actionChangerPlan} className="mt-4 space-y-2">
              <label className="etiquette" htmlFor="plan">Changer de formule</label>
              <select id="plan" name="plan" defaultValue={formule.code} className="champ">
                {PLANS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.nom} — {p.prixMois === 0 ? "gratuit" : `${fcfa(p.prixMois)}/mois`}
                    {p.maxBiens === null ? " · biens illimités" : ` · ${p.maxBiens} biens`}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-secondaire w-full">Appliquer</button>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Le paiement n&apos;est pas encore branché : le changement prend effet
              immédiatement. <Link href="/tarifs" target="_blank" className="font-medium text-brand-700 hover:underline">
              Voir le détail des formules ↗</Link>
            </p>
          </Carte>

          <Carte className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Envoi des e-mails</h2>
              <span className={`badge ${emailsActifs
                ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                : "bg-rose-100 text-rose-800 ring-rose-600/20"}`}>
                {emailsActifs ? "Actif" : "Inactif"}
              </span>
            </div>

            {emailsActifs ? (
              <>
                <p className="mt-2 text-sm text-slate-500">
                  Les liens de réinitialisation de mot de passe partent bien par e-mail.
                  Pour vérifier l&apos;acheminement :{" "}
                  <code className="rounded bg-slate-100 px-1">npm run tester-email</code>.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Les liens envoyés pointent vers{" "}
                  <code className="rounded bg-slate-100 px-1">{adresse}</code>.
                </p>
                {!adresseDeclaree && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Cette adresse est déduite de votre navigation. Renseignez{" "}
                    <code className="rounded bg-amber-100 px-1">ADRESSE_SITE</code> pour
                    la fixer une bonne fois : c&apos;est plus sûr, et les liens resteront
                    corrects quel que soit le chemin d&apos;accès au site.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-rose-800">
                  Aucun serveur d&apos;e-mail n&apos;est configuré :{" "}
                  <strong>personne ne peut récupérer un mot de passe oublié.</strong>
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Les messages sont écrits dans{" "}
                  <code className="rounded bg-slate-100 px-1">data/emails/</code> au lieu
                  d&apos;être envoyés. Renseignez le fichier{" "}
                  <code className="rounded bg-slate-100 px-1">.env.local</code>, puis lancez{" "}
                  <code className="rounded bg-slate-100 px-1">npm run tester-email</code>.
                </p>
              </>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Sauvegarde</h2>
            <p className="mt-1 text-sm text-slate-500">
              Téléchargez une copie complète de vos données : agences, biens,
              locataires, baux, factures et paiements.
            </p>
            <a href="/api/sauvegarde" className="btn-secondaire mt-3 w-full">
              ⬇ Télécharger mes données
            </a>
            <p className="mt-2 text-xs text-slate-500">
              Sur le serveur, <code className="rounded bg-slate-100 px-1">npm run sauvegarde</code> crée
              une archive avec les photos. À programmer chaque nuit.
            </p>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Mon modèle de bail</h2>
            <p className="mt-1 text-sm text-slate-500">
              Le bail que le logiciel génère est un modèle courant. Si votre statut
              juridique ou social exige d&apos;autres clauses, envoyez ici votre propre
              exemplaire : vous le retrouverez à tout moment pour le remplir ou le modifier.
            </p>

            {agence.modele_bail_url ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="break-all text-sm font-medium text-slate-900">
                  📄 {agence.modele_bail_nom ?? "Modèle envoyé"}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Envoyé le {dateFr(agence.modele_bail_le)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <a href={agence.modele_bail_url} className="btn-secondaire py-1.5 text-xs">
                    ⬇ Télécharger
                  </a>
                  <form action={actionSupprimerModeleBail}>
                    <BoutonConfirmation
                      message="Retirer ce modèle de bail ? Vous pourrez en renvoyer un autre à tout moment."
                      className="btn-secondaire py-1.5 text-xs text-rose-700"
                    >
                      Retirer
                    </BoutonConfirmation>
                  </form>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">Aucun modèle envoyé pour l&apos;instant.</p>
            )}

            <form action={actionEnregistrerModeleBail} className="mt-3 space-y-2">
              <input
                name="modele_bail" type="file" required accept=".pdf,.doc,.docx"
                className="champ file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700"
              />
              <p className="text-xs text-slate-500">
                PDF, DOC ou DOCX, {Math.round(TAILLE_MAX_MODELE / 1024 / 1024)} Mo maximum.
                {agence.modele_bail_url && " L'envoi d'un nouveau fichier remplace l'ancien."}
              </p>
              <button type="submit" className="btn-secondaire w-full">
                {agence.modele_bail_url ? "Remplacer le modèle" : "Envoyer mon modèle"}
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              Ce fichier est privé : seule votre agence peut le télécharger.
            </p>
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Bon à savoir</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li>💡 Le NINEA et le RCCM renseignés ici s&apos;impriment sur chaque quittance.</li>
              <li>💡 Les montants sont exprimés en francs CFA, sans centimes.</li>
              <li>💡 Vos données sont isolées : aucune autre agence n&apos;y a accès.</li>
            </ul>
          </Carte>
        </aside>
      </div>
    </>
  );
}
