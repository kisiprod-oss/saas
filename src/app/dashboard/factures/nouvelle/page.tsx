import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { tous } from "@/lib/db";
import { actionCreerFacture } from "@/lib/actions";
import { decalerMois, moisCourant, periodeLisible, fcfa } from "@/lib/format";
import { Champ, EnTetePage, EtatVide, MessagesUrl, Section, Selection } from "@/components/ui";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouvelle facture" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageNouvelleFacture({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const contratChoisi = lire(params, "contrat");
  const periodeChoisie = lire(params, "periode") || moisCourant();

  const contrats = tous<{
    id: number; reference: string; loyer: number; charges: number;
    prenom: string; nom: string; titre: string;
  }>(
    `SELECT c.id, c.reference, c.loyer, c.charges, l.prenom, l.nom, b.titre
       FROM contrats c
       JOIN locataires l ON l.id = c.locataire_id
       JOIN biens b      ON b.id = c.bien_id
      WHERE c.agence_id = ? AND c.statut = 'actif'
      ORDER BY l.nom`,
    agence.id,
  );

  const courant = moisCourant();
  const periodes = Array.from({ length: 15 }, (_, i) => decalerMois(courant, 2 - i));

  return (
    <>
      <Link href="/dashboard/factures" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux factures
      </Link>

      <EnTetePage
        titre="Créer une facture"
        sousTitre="Pour un loyer hors cycle, un rappel de charges ou une régularisation."
      />
      <MessagesUrl params={params} />

      {contrats.length === 0 ? (
        <EtatVide
          titre="Aucun bail actif"
          description="Créez d'abord un contrat de bail : la facture s'appuie sur le loyer qui y est défini."
          action={{ href: "/dashboard/contrats/nouveau", libelle: "Créer un bail" }}
        />
      ) : (
        <form action={actionCreerFacture} className="space-y-5">
          <Section titre="Bail concerné">
            <Selection
              label="Contrat de bail" nom="contrat_id" obligatoire vide="— Choisir un bail —"
              valeur={contratChoisi}
              options={contrats.map((c) => ({
                valeur: c.id,
                libelle: `${c.prenom} ${c.nom} — ${c.titre} (${fcfa(c.loyer + c.charges)}/mois)`,
              }))}
            />
            <Selection
              label="Période facturée" nom="periode" obligatoire valeur={periodeChoisie}
              options={periodes.map((p) => ({ valeur: p, libelle: periodeLisible(p) }))}
            />
          </Section>

          <Section titre="Montants">
            <Champ label="Loyer (FCFA)" nom="montant_loyer" inputMode="numeric" placeholder="450000"
                   aide="Laissez vide pour reprendre le loyer du bail." />
            <Champ label="Charges (FCFA)" nom="montant_charges" inputMode="numeric" placeholder="25000"
                   aide="Laissez vide pour reprendre les charges du bail." />
            <Champ label="Autre montant (FCFA)" nom="montant_autres" inputMode="numeric" placeholder="0" />
            <Champ label="Libellé de l'autre montant" nom="libelle_autres"
                   placeholder="Régularisation d'eau, réparation…" />
          </Section>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primaire">Créer la facture</button>
            <Link href="/dashboard/factures" className="btn-secondaire">Annuler</Link>
          </div>
        </form>
      )}
    </>
  );
}
