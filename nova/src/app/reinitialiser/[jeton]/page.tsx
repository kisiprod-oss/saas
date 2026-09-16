import type { Metadata } from "next";
import { CadreCompte } from "@/components/cadre-compte";
import { FormulaireReinitialisation } from "@/components/formulaires-compte";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function PageReinitialisation({
  params,
}: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;

  return (
    <CadreCompte
      titre="Choisir un nouveau mot de passe"
      sous_titre="Ce lien est valable deux heures et ne sert qu'une fois."
    >
      <FormulaireReinitialisation jeton={jeton} />
    </CadreCompte>
  );
}
