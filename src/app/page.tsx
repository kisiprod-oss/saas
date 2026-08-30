import Link from "next/link";
import { listerVitrine } from "@/lib/requetes";
import { TYPES_BIEN, VILLES } from "@/lib/constantes";
import { CarteBien } from "@/components/carte-bien";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import {
  IconeArgent, IconeCheck, IconeFacture, IconeOutils, IconeRecherche, IconeRelance,
  IconeTableauBord,
} from "@/components/icones";

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

const ATOUTS = [
  "Gratuit jusqu'à 3 biens",
  "Orange Money & Wave",
  "Relances sur WhatsApp",
  "Assistant disponible 24h/24",
];

/**
 * Photo d'un agent pour l'accueil, hebergee ailleurs et renseignee par
 * l'agence elle-meme. Variable facultative : sans elle, l'illustration
 * generique ci-dessous est utilisee a la place (aucune photo n'est
 * presentee comme celle d'une personne reelle precise).
 */
const photoAgent = process.env.PHOTO_AGENT_URL;

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

      {/* ---------------------------------- Hero ---------------------------------- */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-brand-50 ring-1 ring-white/20">
                🇸🇳 Gestion locative au Sénégal
              </p>
              <h1 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                La location, sans tableur ni paperasse.
              </h1>
              <p className="mt-4 max-w-lg text-base text-brand-50/90 sm:text-lg">
                Biens, locataires, quittances et relances de loyer dans un seul outil.
                Trouvez un logement ou un artisan, ou gérez votre agence — tout est ici.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/inscription" className="btn-secondaire px-6 py-3 text-base">
                  Créer mon espace agence
                </Link>
                <Link href="#annonces" className="rounded-lg bg-white/12 px-6 py-3 text-base font-semibold text-white ring-1 ring-white/25 hover:bg-white/20">
                  Voir les annonces
                </Link>
              </div>

              <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:gap-5">
                {ATOUTS.map((a) => (
                  <li key={a} className="flex items-center gap-1.5 text-sm text-brand-50/90">
                    <IconeCheck className="h-4 w-4 shrink-0 text-brand-200" /> {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Photo d'un agent : la vôtre (PHOTO_AGENT_URL) ou une illustration générique */}
            <div className="hidden justify-self-center lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoAgent || "/photos/hero-agence.webp"}
                alt={photoAgent ? "Agent immobilier utilisant Sen Gestion" : "Illustration : une gérante d'agence consulte Sen Gestion sur son téléphone"}
                className="aspect-[4/5] w-80 rounded-2xl border-4 border-white/20 object-cover shadow-2xl"
              />
            </div>
          </div>

          {/* Formulaire de recherche */}
          <form action="/" method="get" className="mt-9 rounded-2xl bg-white p-4 shadow-lg">
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

          <div className="h-14" />
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
            <IconeRecherche className="mb-3 h-10 w-10 text-slate-300" />
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

      {/* ------------------------------ Professionnels ----------------------------- */}
      <section className="border-y border-slate-200 bg-sable-50">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sable-500 text-white">
              <IconeOutils className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Besoin d&apos;un artisan ?</h2>
              <p className="text-sm text-slate-600">
                Plombiers, électriciens, maçons… recommandés par des agences du Sénégal.
              </p>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photos/artisan-electricien.webp"
            alt="Illustration : un électricien intervient chez un particulier"
            className="hidden h-20 w-32 rounded-xl object-cover shadow-md sm:block"
          />
          <Link href="/professionnels" className="btn-sable shrink-0">Voir les professionnels</Link>
        </div>
      </section>

      {/* --------------------------- Confiance & vérification ----------------------- */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-bold text-slate-900">Chaque quittance peut être vérifiée</h2>
            <p className="mt-3 text-slate-600">
              Chaque quittance et chaque facture générée porte un code unique,
              imprimé sur le document. N&apos;importe qui — un locataire, un
              propriétaire, un tribunal — peut vérifier son authenticité sans
              avoir de compte, simplement en saisissant ce code sur le lien
              indiqué sur le document.
            </p>
          </div>
          <div className="order-1 justify-self-center lg:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/photos/confiance-quittance.webp"
              alt="Illustration : une locataire compare sa quittance papier et son téléphone"
              className="aspect-[3/2] w-full max-w-md rounded-2xl object-cover shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* ----------------------- Argumentaire pour les agences --------------------- */}
      <section className="bg-sable-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">Vous gérez des biens en location ?</h2>
            <p className="mt-3 text-slate-600">
              Publiez vos annonces, suivez vos baux et éditez vos quittances de loyer
              depuis un seul tableau de bord.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { Icone: IconeTableauBord, titre: "Tableau de bord", texte: "Loyers encaissés, impayés et taux d'occupation en un coup d'œil." },
              { Icone: IconeFacture, titre: "Factures automatiques", texte: "Générez toutes les quittances du mois en un clic, prêtes à imprimer." },
              { Icone: IconeArgent, titre: "Orange Money & Wave", texte: "Enregistrez chaque paiement avec sa référence de transaction." },
              { Icone: IconeRelance, titre: "Relances WhatsApp", texte: "Le ton du message s'adapte au retard ; il ne reste qu'à l'envoyer." },
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
            Gratuit jusqu&apos;à 3 biens et 5 factures par mois. Ensuite à partir de 5 000 FCFA par mois.
          </p>
        </div>
      </section>

      <PiedPublic />
    </div>
  );
}
