import Link from "next/link";
import { listerVitrine } from "@/lib/requetes";
import { TYPES_BIEN, VILLES } from "@/lib/constantes";
import { CarteBien } from "@/components/carte-bien";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { IconeArgent, IconeFacture, IconeRecherche, IconeTableauBord } from "@/components/icones";

type Params = { [cle: string]: string | string[] | undefined };

const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

const BUDGETS = [
  { valeur: "100000",  libelle: "Jusqu'à 100 000 FCFA" },
  { valeur: "200000",  libelle: "Jusqu'à 200 000 FCFA" },
  { valeur: "350000",  libelle: "Jusqu'à 350 000 FCFA" },
  { valeur: "500000",  libelle: "Jusqu'à 500 000 FCFA" },
  { valeur: "1000000", libelle: "Jusqu'à 1 000 000 FCFA" },
  { valeur: "3000000", libelle: "Plus de 1 000 000 FCFA" },
];

export default async function PageVitrine({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filtres = {
    ville: lire(params, "ville"),
    type: lire(params, "type"),
    chambres: lire(params, "chambres"),
    budgetMax: lire(params, "budget"),
    recherche: lire(params, "q"),
    duree: lire(params, "duree"),
  };

  const biens = listerVitrine(filtres);
  const aDesFiltres = Object.values(filtres).some(Boolean);

  return (
    <div className="min-h-screen">
      <EntetePublic />

      {/* ---------------------------- Bandeau d'accueil ---------------------------- */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-50 ring-1 ring-white/20">
            🇸🇳 Location au Sénégal
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Trouvez votre prochain logement, en toute confiance.
          </h1>
          <p className="mt-4 max-w-xl text-base text-brand-50/90 sm:text-lg">
            Appartements, villas, studios et locaux commerciaux proposés par des agences
            vérifiées à Dakar, Thiès, Saly et partout au Sénégal.
          </p>

          {/* Formulaire de recherche */}
          <form action="/" method="get" className="mt-8 rounded-2xl bg-white p-4 shadow-lg">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <label className="etiquette" htmlFor="q">Que cherchez-vous ?</label>
                <input
                  id="q" name="q" defaultValue={filtres.recherche} className="champ"
                  placeholder="Ex : appartement Mermoz, villa Almadies…"
                />
              </div>
              <div>
                <label className="etiquette" htmlFor="ville">Ville</label>
                <select id="ville" name="ville" defaultValue={filtres.ville} className="champ">
                  <option value="">Toutes les villes</option>
                  {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="type">Type de bien</label>
                <select id="type" name="type" defaultValue={filtres.type} className="champ">
                  <option value="">Tous les types</option>
                  {TYPES_BIEN.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="budget">Budget mensuel</label>
                <select id="budget" name="budget" defaultValue={filtres.budgetMax} className="champ">
                  <option value="">Tous les budgets</option>
                  {BUDGETS.map((b) => <option key={b.valeur} value={b.valeur}>{b.libelle}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600" htmlFor="duree">Durée</label>
                  <select id="duree" name="duree" defaultValue={filtres.duree} className="champ w-auto py-2">
                    <option value="">Toutes</option>
                    <option value="longue">Location au mois</option>
                    <option value="courte">Courte durée</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600" htmlFor="chambres">Chambres min.</label>
                <select id="chambres" name="chambres" defaultValue={filtres.chambres} className="champ w-24 py-2">
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
                </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {aDesFiltres && (
                  <Link href="/" className="btn-secondaire">Réinitialiser</Link>
                )}
                <button type="submit" className="btn-primaire">
                  <IconeRecherche className="h-4 w-4" /> Rechercher
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ------------------------------- Les annonces ------------------------------ */}
      <section id="annonces" className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {biens.length} bien{biens.length > 1 ? "s" : ""} disponible{biens.length > 1 ? "s" : ""}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {aDesFiltres ? "Résultats de votre recherche" : "Les dernières annonces publiées"}
            </p>
          </div>
        </div>

        {biens.length === 0 ? (
          <div className="carte flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <h3 className="font-semibold text-slate-900">Aucun bien ne correspond à votre recherche</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Essayez d&apos;élargir votre budget ou de retirer un filtre.
            </p>
            <Link href="/" className="btn-primaire mt-5">Voir toutes les annonces</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {biens.map((b) => <CarteBien key={b.id} bien={b} agenceNom={b.agence_nom} />)}
          </div>
        )}
      </section>

      {/* ----------------------- Argumentaire pour les agences --------------------- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">Vous gérez des biens en location ?</h2>
            <p className="mt-3 text-slate-600">
              Publiez vos annonces, suivez vos baux et éditez vos quittances de loyer
              depuis un seul tableau de bord.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { Icone: IconeTableauBord, titre: "Tableau de bord", texte: "Loyers encaissés, impayés et taux d'occupation en un coup d'œil." },
              { Icone: IconeFacture, titre: "Factures automatiques", texte: "Générez toutes les quittances du mois en un clic, prêtes à imprimer." },
              { Icone: IconeArgent, titre: "Orange Money & Wave", texte: "Enregistrez chaque paiement avec sa référence de transaction." },
            ].map((c) => (
              <div key={c.titre} className="carte p-6">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <c.Icone className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900">{c.titre}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{c.texte}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/inscription" className="btn-primaire px-6 py-3 text-base">
              Créer mon espace agence
            </Link>
            <Link href="/tarifs" className="btn-secondaire px-6 py-3 text-base">
              Voir les tarifs
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            Gratuit jusqu&apos;à 3 biens. Ensuite à partir de 5 000 FCFA par mois.
          </p>
        </div>
      </section>

      <PiedPublic />
    </div>
  );
}
