import { exigerSession } from "@/lib/auth";
import { actionEnregistrerAgence } from "@/lib/actions";
import { VILLES } from "@/lib/constantes";
import { Carte, Champ, EnTetePage, MessagesUrl, Section } from "@/components/ui";

export const metadata = { title: "Mon agence" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageAgence({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence, utilisateur } = await exigerSession();
  const params = await searchParams;

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
