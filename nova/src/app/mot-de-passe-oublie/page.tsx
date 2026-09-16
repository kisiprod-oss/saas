import type { Metadata } from "next";
import { CadreCompte } from "@/components/cadre-compte";
import { FormulaireOubli } from "@/components/formulaires-compte";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function PageOubli() {
  return (
    <CadreCompte
      titre="Mot de passe oublié"
      sous_titre="Indiquez votre adresse e-mail : nous vous envoyons un lien pour en choisir un nouveau."
    >
      <FormulaireOubli />
    </CadreCompte>
  );
}
