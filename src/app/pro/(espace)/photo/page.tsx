import Link from "next/link";
import { exigerSessionArtisan } from "@/lib/auth-artisan";
import { actionPhotoArtisan } from "@/lib/actions";
import { un } from "@/lib/db";
import { Carte, MessagesUrl } from "@/components/ui";
import { ChampPhotoProfil } from "@/components/champ-photo-profil";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Ma photo" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PagePhotoArtisan({ searchParams }: { searchParams: Promise<Params> }) {
  const artisan = await exigerSessionArtisan();
  const params = await searchParams;

  const fiche = un<{ photo_url: string | null }>(
    "SELECT photo_url FROM artisans WHERE id = ?", artisan.id,
  );

  return (
    <>
      <Link href="/pro" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour à mon espace
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ma photo</h1>
      <p className="mt-1 text-sm text-slate-500">
        C&apos;est la première chose que voient les agences et les locataires.
      </p>

      <div className="mt-5"><MessagesUrl params={params} /></div>

      <Carte className="mt-5 p-6">
        <form action={actionPhotoArtisan}>
          <ChampPhotoProfil
            photoActuelle={fiche?.photo_url ?? null}
            boutonEnregistrer
            aide="Une photo nette de votre visage, en pleine lumière. Depuis un téléphone, vous pouvez la prendre sur le moment."
          />
        </form>
      </Carte>

      <Carte className="mt-5 p-5">
        <h2 className="font-semibold text-slate-900">Une bonne photo, concrètement</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>• Votre visage, de face, sans lunettes de soleil ni casquette.</li>
          <li>• En pleine lumière, de préférence dehors à l&apos;ombre.</li>
          <li>• Une tenue de travail propre : cela montre votre métier.</li>
          <li>• Une photo de vous, pas un logo ni une image trouvée en ligne.</li>
        </ul>
      </Carte>
    </>
  );
}
