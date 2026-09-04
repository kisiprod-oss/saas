import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { tous } from "@/lib/db";
import { actionPreparerBail } from "@/lib/actions";
import { aideDocumentsConfiguree } from "@/lib/assistant-documents";
import { EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { FormulaireContrat, type PreRemplissageBail } from "@/components/formulaire-contrat";
import { DicteeDocument, ResumePreparation } from "@/components/dictee-document";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Nouveau bail" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageNouveauContrat({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const modeleBail = agence.modele_bail_url;

  const lire = (c: string) => {
    const v = params[c];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const lireNombre = (c: string) => {
    const n = Number(lire(c));
    return Number.isFinite(n) && lire(c) !== "" ? n : undefined;
  };
  const lireListe = (c: string) => {
    const v = params[c];
    return Array.isArray(v) ? v : v ? [v] : [];
  };

  // Le formulaire reste maitre : ces valeurs ne sont qu'un point de depart,
  // et les identifiants ont deja ete verifies contre les donnees de l'agence.
  const prerempli: PreRemplissageBail = {
    bien_id: lireNombre("bien_id"),
    locataire_id: lireNombre("locataire_id"),
    date_debut: lire("date_debut") || undefined,
    date_fin: lire("date_fin") || undefined,
    duree_mois: lireNombre("duree_mois"),
    loyer: lireNombre("loyer"),
    charges: lireNombre("charges"),
    caution: lireNombre("caution"),
    jour_echeance: lireNombre("jour_echeance"),
    commission_pct: lireNombre("commission_pct"),
    notes: lire("notes") || undefined,
  };

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

      {modeleBail && (
        <p className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          Vous avez votre propre modèle de bail.{" "}
          <a href={modeleBail} className="font-semibold hover:underline">Le télécharger ↓</a>
          {" "}pour le remplir directement, plutôt que le bail standard ci-dessous.
        </p>
      )}

      {biens.length > 0 && locataires.length > 0 && aideDocumentsConfiguree() && (
        <DicteeDocument
          action={actionPreparerBail}
          placeholder="Ex : bail de 2 ans pour Modou Faye sur la villa Almadies, 450 000 par mois, 2 mois de caution, échéance le 5"
          exemple="bail d'un an pour Awa Ndiaye sur l'appartement Mermoz à 300 000, charges 20 000"
        />
      )}
      <ResumePreparation resume={lire("resume")} manques={lireListe("manque")} />

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
        <FormulaireContrat biens={biens} locataires={locataires} prerempli={prerempli} />
      )}
    </>
  );
}
