import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { tous } from "@/lib/db";
import { EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { FormulaireContrat } from "@/components/formulaire-contrat";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouveau bail" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageNouveauContrat({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;

  // Seuls les biens sans bail actif peuvent etre loues.
  const biens = tous<{ id: number; titre: string; reference: string; loyer: number; charges: number; caution_mois: number }>(
    `SELECT id, titre, reference, loyer, charges, caution_mois
       FROM biens
      WHERE agence_id = ?
        AND id NOT IN (SELECT bien_id FROM contrats WHERE statut = 'actif')
      ORDER BY titre`,
    agence.id,
  );

  const locataires = tous<{ id: number; prenom: string; nom: string; telephone: string }>(
    "SELECT id, prenom, nom, telephone FROM locataires WHERE agence_id = ? ORDER BY nom, prenom",
    agence.id,
  );

  return (
    <>
      <Link href="/dashboard/contrats" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux baux
      </Link>
      <EnTetePage titre="Nouveau contrat de bail" sousTitre="Reliez un bien disponible à un locataire." />
      <MessagesUrl params={params} />

      {biens.length === 0 || locataires.length === 0 ? (
        <EtatVide
          titre="Il manque des éléments"
          description={
            biens.length === 0
              ? "Tous vos biens sont déjà loués, ou vous n'en avez pas encore créé. Ajoutez un bien disponible pour continuer."
              : "Vous n'avez pas encore de locataire. Créez d'abord une fiche locataire."
          }
          action={
            biens.length === 0
              ? { href: "/dashboard/biens/nouveau", libelle: "Ajouter un bien" }
              : { href: "/dashboard/locataires/nouveau", libelle: "Ajouter un locataire" }
          }
        />
      ) : (
        <FormulaireContrat biens={biens} locataires={locataires} />
      )}
    </>
  );
}
