import Link from "next/link";
import { listerArtisansVitrine } from "@/lib/requetes";
import { libelle, METIERS, VILLES } from "@/lib/constantes";
import { telephoneBrut, telephoneFr } from "@/lib/format";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { IconeLieu, IconeOutils, IconeRecherche, IconeTelephone } from "@/components/icones";

export const metadata = { title: "Artisans et professionnels" };

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

export default async function PageProfessionnels({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filtres = {
    metier: lire(params, "metier"),
    ville: lire(params, "ville"),
    recherche: lire(params, "q"),
  };
  const artisans = listerArtisansVitrine(filtres);
  const aDesFiltres = Object.values(filtres).some(Boolean);

  return (
    <div className="min-h-screen">
      <EntetePublic />

      {/* ---------------------------- Bandeau ---------------------------- */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-50 ring-1 ring-white/20">
            <IconeOutils className="h-3.5 w-3.5" /> Recommandés par des agences du Sénégal
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Trouvez un artisan de confiance
          </h1>
          <p className="mt-4 max-w-xl text-base text-brand-50/90">
            Plombiers, électriciens, maçons, menuisiers… Chaque professionnel est recommandé
            par une agence utilisant Sen Gestion.
          </p>

          <form action="/professionnels" method="get" className="mt-8 rounded-2xl bg-white p-4 shadow-lg">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="etiquette" htmlFor="q">Rechercher</label>
                <input id="q" name="q" defaultValue={filtres.recherche} className="champ" placeholder="Nom, spécialité…" />
              </div>
              <div>
                <label className="etiquette" htmlFor="metier">Métier</label>
                <select id="metier" name="metier" defaultValue={filtres.metier} className="champ">
                  <option value="">Tous les métiers</option>
                  {METIERS.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="ville">Ville</label>
                <select id="ville" name="ville" defaultValue={filtres.ville} className="champ">
                  <option value="">Toutes les villes</option>
                  {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              {aDesFiltres && <Link href="/professionnels" className="btn-secondaire">Réinitialiser</Link>}
              <button type="submit" className="btn-primaire ml-auto">
                <IconeRecherche className="h-4 w-4" /> Rechercher
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ------------------------------- Résultats ------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          {artisans.length} professionnel{artisans.length > 1 ? "s" : ""} trouvé{artisans.length > 1 ? "s" : ""}
        </h2>

        {artisans.length === 0 ? (
          <div className="carte flex flex-col items-center px-6 py-16 text-center">
            <IconeOutils className="mb-3 h-10 w-10 text-slate-300" />
            <h3 className="font-semibold text-slate-900">Aucun professionnel ne correspond à votre recherche</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Essayez un autre métier ou une autre ville.
            </p>
            <Link href="/professionnels" className="btn-primaire mt-5">Voir tous les professionnels</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((a) => (
              <div key={a.id} className="carte overflow-hidden p-5">
                <div className="flex items-start gap-3">
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo_url} alt={a.nom} className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <IconeOutils className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{a.nom}</h3>
                    <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                      {libelle(METIERS, a.metier)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                  <IconeLieu className="h-4 w-4 shrink-0" />
                  {[a.quartier, a.ville].filter(Boolean).join(", ")}
                </p>

                {a.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{a.description}</p>
                )}

                {a.tarif_indicatif && (
                  <p className="mt-2 text-sm font-semibold text-brand-700">{a.tarif_indicatif}</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                  <a href={`tel:+${telephoneBrut(a.telephone)}`} className="btn-secondaire">
                    <IconeTelephone className="h-4 w-4" /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${telephoneBrut(a.telephone)}?text=${encodeURIComponent(`Bonjour ${a.nom}, je vous contacte via Sen Gestion.`)}`}
                    target="_blank" rel="noopener noreferrer" className="btn-sable"
                  >
                    WhatsApp
                  </a>
                </div>
                <p className="mt-2 text-center text-xs text-slate-400">
                  Recommandé par {a.agence_nom}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <PiedPublic />
    </div>
  );
}
