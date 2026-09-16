import { notFound } from "next/navigation";
import Link from "next/link";
import { chargerBoutique } from "@/lib/boutique-publique";
import { RenduSections } from "@/components/sections-rendu";
import { Oeil } from "@/components/icones";

/**
 * L'accueil d'une boutique : rien d'autre que le rendu des sections
 * enregistrees. Aucune section n'est ajoutee ici « pour faire joli » — ce que
 * le commercant a compose est exactement ce qui s'affiche.
 */
export default async function AccueilBoutique({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ apercu?: string }>;
}) {
  const { slug } = await params;
  const { apercu } = await searchParams;

  const chargee = await chargerBoutique(slug, { apercu: apercu === "1" });
  if (!chargee) notFound();

  const { contenu, contexte, enApercu, boutique } = chargee;

  return (
    <>
      {enApercu ? (
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 bg-terre-500 px-4 py-2 text-sm text-white">
          <span className="flex items-center gap-2">
            <Oeil className="size-4" />
            Aperçu de votre brouillon. {boutique.publiee_le
              ? "Vos clients voient encore la version publiée."
              : "Cette boutique n'est pas publiée."}
          </span>
          <Link href="/tableau-de-bord/boutique" className="font-semibold underline">
            Revenir à l&apos;éditeur
          </Link>
        </div>
      ) : null}

      <RenduSections contenu={contenu} contexte={contexte} />
    </>
  );
}
