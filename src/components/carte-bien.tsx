import Link from "next/link";
import { fcfa } from "@/lib/format";
import { libelle, TYPES_BIEN } from "@/lib/constantes";
import { IconeDouche, IconeLieu, IconeLit, IconeSurface } from "./icones";

export function premierePhoto(photos: string | null): string | null {
  const liste = (photos ?? "").split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
  return liste[0] ?? null;
}

export function toutesPhotos(photos: string | null): string[] {
  return (photos ?? "").split(/[\n,]/).map((p) => p.trim()).filter(Boolean);
}

type Props = {
  bien: {
    id: number; titre: string; type: string; ville: string; quartier: string | null;
    chambres: number; salles_bain: number; surface: number | null; loyer: number;
    charges: number; photos: string | null; statut: string; meuble: number;
    courte_duree?: number; prix_nuit?: number;
  };
  agenceNom?: string;
};

export function CarteBien({ bien, agenceNom }: Props) {
  const photo = premierePhoto(bien.photos);
  const courteDuree = bien.courte_duree === 1;

  return (
    <Link
      href={`/biens/${bien.id}`}
      className="group carte overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 via-sable-100 to-brand-50">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={bien.titre}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl opacity-40">🏠</div>
        )}

        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm">
            {libelle(TYPES_BIEN, bien.type)}
          </span>
          {courteDuree ? (
            <span className="rounded-full bg-brand-600/95 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Courte durée
            </span>
          ) : bien.meuble === 1 && (
            <span className="rounded-full bg-sable-500/95 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              Meublé
            </span>
          )}
        </div>

        {bien.statut === "reserve" && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            Réservé
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 title={bien.titre} className="line-clamp-1 font-semibold text-slate-900 group-hover:text-brand-700">
          {bien.titre}
        </h3>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <IconeLieu className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">
            {[bien.quartier, bien.ville].filter(Boolean).join(", ")}
          </span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {bien.chambres > 0 && (
            <span className="flex items-center gap-1"><IconeLit className="h-4 w-4" />{bien.chambres} ch.</span>
          )}
          {bien.salles_bain > 0 && (
            <span className="flex items-center gap-1"><IconeDouche className="h-4 w-4" />{bien.salles_bain} sdb</span>
          )}
          {bien.surface ? (
            <span className="flex items-center gap-1"><IconeSurface className="h-4 w-4" />{bien.surface} m²</span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-lg font-bold text-brand-700">
              {fcfa(courteDuree ? (bien.prix_nuit ?? 0) : bien.loyer)}
            </p>
            <p className="text-xs text-slate-400">
              {courteDuree ? "par nuit" : `par mois${bien.charges > 0 ? " + charges" : ""}`}
            </p>
          </div>
          {agenceNom && (
            <p className="max-w-[45%] truncate text-right text-xs text-slate-400">{agenceNom}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
