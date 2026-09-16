import type { Metadata } from "next";
import { CadreCompte } from "@/components/cadre-compte";
import { FormulaireConnexion } from "@/components/formulaires-compte";

export const metadata: Metadata = { title: "Se connecter" };

export default async function PageConnexion({
  searchParams,
}: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;

  return (
    <CadreCompte
      titre="Se connecter"
      sous_titre="Retrouvez vos commandes et votre boutique."
      aside={
        <>
          <p className="text-2xl font-bold leading-tight">Bon retour.</p>
          <p className="mt-4 text-vert-50">
            Vos commandes vous attendent dans votre tableau de bord.
          </p>
        </>
      }
    >
      <FormulaireConnexion message={message} />
    </CadreCompte>
  );
}
