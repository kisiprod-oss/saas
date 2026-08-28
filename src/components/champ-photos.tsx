import { NOMBRE_MAX_PHOTOS } from "@/lib/photos";
import { ChampFichiers } from "./champ-fichiers";

/**
 * Gestion des photos d'un bien : celles deja enregistrees (que l'on peut
 * retirer ou promouvoir en photo principale) et l'envoi de nouvelles images
 * depuis l'ordinateur ou l'appareil photo du telephone.
 */
export function ChampPhotos({ photos }: { photos: string[] }) {
  return (
    <div className="sm:col-span-2">
      <p className="etiquette">Photos du bien</p>

      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((url, i) => (
              <div key={url} className="carte overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full bg-slate-100 object-cover" />
                <input type="hidden" name="photos_existantes" value={url} />

                <div className="space-y-1.5 p-2.5">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="radio" name="photo_principale" value={url} defaultChecked={i === 0}
                      className="h-3.5 w-3.5 border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Principale
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-rose-700">
                    <input
                      type="checkbox" name="photos_supprimees" value={url}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    Retirer
                  </label>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            La photo « principale » est celle qui apparaît en premier sur l&apos;annonce.
            Cochez « Retirer » puis enregistrez pour supprimer une photo.
          </p>
        </>
      )}

      <div className={`rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 ${photos.length > 0 ? "mt-4" : ""}`}>
        <ChampFichiers premiereFois={photos.length === 0} />
        <p className="mt-2 text-xs text-slate-500">
          Depuis un téléphone, vous pouvez prendre la photo sur le moment.
          Jusqu&apos;à {NOMBRE_MAX_PHOTOS} photos, 15 Mo chacune. Les images sont
          automatiquement redimensionnées et allégées.
        </p>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-brand-700">
          Ajouter une photo par son adresse web
        </summary>
        <textarea
          name="photos_url"
          rows={2}
          placeholder={"https://exemple.com/photo1.jpg\nhttps://exemple.com/photo2.jpg"}
          className="champ mt-2"
        />
        <p className="mt-1 text-xs text-slate-500">Une adresse par ligne.</p>
      </details>
    </div>
  );
}
