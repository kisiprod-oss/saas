import type { Metadata } from "next";
import { CadreCompte } from "@/components/cadre-compte";
import { FormulaireInscription } from "@/components/formulaires-compte";
import { Coche } from "@/components/icones";
import { sessionEventuelle } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Créer ma boutique" };

const PROMESSES = [
  "La création et l'aperçu sont gratuits.",
  "Vous reprenez plus tard là où vous vous êtes arrêté.",
  "Vous voyez votre boutique avant de décider de la publier.",
  "Vos prix, vos stocks et vos paiements : personne d'autre n'y touche.",
];

export default async function PageInscription() {
  // Un commerçant déjà connecté n'a rien à faire ici.
  if (await sessionEventuelle()) redirect("/tableau-de-bord");

  return (
    <CadreCompte
      titre="Créer ma boutique"
      sous_titre="Trois minutes, et vous avez une boutique à personnaliser."
      aside={
        <>
          <p className="text-2xl font-bold leading-tight">
            Vos photos de produits deviennent une boutique.
          </p>
          <ul className="mt-8 space-y-3.5">
            {PROMESSES.map((texte) => (
              <li key={texte} className="flex gap-3 text-vert-50">
                <Coche className="mt-0.5 size-5 shrink-0" />
                <span>{texte}</span>
              </li>
            ))}
          </ul>
        </>
      }
    >
      <FormulaireInscription />
    </CadreCompte>
  );
}
