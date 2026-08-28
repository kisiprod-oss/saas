import { exigerSession } from "@/lib/auth";
import { actionChangerPlan, actionEnregistrerAgence } from "@/lib/actions";
import { un } from "@/lib/db";
import { fcfa } from "@/lib/format";
import { plan, PLANS } from "@/lib/tarifs";
import Link from "next/link";
import { VILLES } from "@/lib/constantes";
import { Carte, Champ, EnTetePage, MessagesUrl, Section } from "@/components/ui";

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
            <Champ label="Téléphone" nom="telephone" valeur={agence.telephone} placeholder="77 123 45 67" />
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
            <Champ label="Logo (adresse web de l'image)" nom="logo_url" valeur={agence.logo_url}
                   placeholder="https://…/logo.png" aide="Affiché en haut de vos factures." />
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
