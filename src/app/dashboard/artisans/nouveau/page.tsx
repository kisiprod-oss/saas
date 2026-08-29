import Link from "next/link";
import { FormulaireArtisan } from "@/components/formulaire-artisan";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Ajouter un artisan" };

export default function PageNouvelArtisan() {
  return (
    <>
      <Link href="/dashboard/artisans" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux artisans
      </Link>
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-slate-900">Ajouter un artisan</h1>
      <FormulaireArtisan />
    </>
  );
}
