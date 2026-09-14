import type { Metadata } from "next";
import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { EspacesOnglets, type Espace } from "@/components/espaces-onglets";

/**
 * « Le projet » : la page qui explique Sen Gestion a quelqu'un qui ne le
 * connait pas encore.
 *
 * ELLE NE REMPLACE PAS L'ACCUEIL, et c'est deliberе. La page « / » porte la
 * recherche et la liste des annonces : c'est elle que Google indexe, et
 * c'est par elle qu'un locataire trouve un logement. La remplacer par une
 * page de presentation ferait disparaitre les annonces des resultats de
 * recherche. Celle-ci s'adresse a l'autre visiteur — l'agence, le
 * proprietaire, l'artisan a qui on envoie un lien pour expliquer ce qu'est
 * Sen Gestion.
 *
 * Toutes les fonctions citees ici ont ete verifiees dans le code : rien
 * n'est annonce qui ne soit deja construit (voir src/lib/tarifs.ts et
 * l'arborescence de src/app).
 */

export const metadata: Metadata = {
  title: "Le projet Sen Gestion — agences, locataires et artisans au Sénégal",
  description:
    "Sen Gestion rapproche les agences immobilières, les locataires et les artisans "
    + "du bâtiment au Sénégal : gestion des biens et des loyers, espace locataire, "
    + "annuaire des professionnels.",
  alternates: { canonical: "/decouvrir" },
};

const ESPACES: Espace[] = [
  {
    cle: "agences",
    onglet: "Agences",
    titre: "Plus de visibilité sur votre gestion.",
    texte:
      "Sen Gestion rassemble au même endroit ce qu'une agence suit aujourd'hui dans "
      + "des cahiers et des fichiers séparés : les biens, les propriétaires, les "
      + "locataires, les baux et les loyers.",
    points: [
      { titre: "Biens, propriétaires et locataires", texte: "Tout le portefeuille de l'agence dans un seul écran." },
      { titre: "Baux et quittances", texte: "Contrats et quittances à l'en-tête de l'agence, numérotés automatiquement." },
      { titre: "Loyers et relances", texte: "Les impayés remontent seuls, et le message de relance WhatsApp est déjà écrit." },
    ],
    action: { libelle: "Créer mon espace agence", href: "/inscription" },
    secondaire: { libelle: "Voir les tarifs", href: "/tarifs" },
    image: {
      src: "/apercu/biens-detail.webp",
      alt: "Écran « Mes biens » de Sen Gestion : la liste du portefeuille de l'agence, "
        + "avec pour chaque logement sa localisation, son type, son loyer et son état.",
      largeur: 1424, hauteur: 1000, ajustement: "couvrir",
    },
  },
  {
    cle: "locataires",
    onglet: "Locataires",
    titre: "Votre location, plus facile à suivre.",
    texte:
      "Un espace où retrouver vos quittances et signaler vos règlements de loyer, "
      + "sans avoir à rappeler votre agence pour chaque document.",
    points: [
      // Verifie dans src/app/espace-locataire/connexion : numero + mot de passe.
      // Il n'y a pas de code a usage unique, ne pas l'annoncer.
      { titre: "Connexion par téléphone", texte: "Votre numéro, et le mot de passe que votre agence vous remet." },
      { titre: "Quittances et factures", texte: "À consulter et à imprimer quand vous en avez besoin." },
      { titre: "Déclarer un paiement", texte: "Orange Money, Wave ou espèces : vous le signalez, l'agence le valide." },
    ],
    action: { libelle: "Accéder à mon espace locataire", href: "/espace-locataire/connexion" },
    secondaire: { libelle: "Chercher un logement", href: "/#annonces" },
    image: {
      src: "/apercu/quittance-detail.webp",
      alt: "Quittance de loyer éditée par Sen Gestion : en-tête de l'agence, locataire, "
        + "bien loué, période, loyer et charges, total réglé.",
      largeur: 1050, hauteur: 1075, ajustement: "contenir",
    },
  },
  {
    cle: "artisans",
    onglet: "Artisans",
    titre: "Votre savoir-faire mérite d'être vu.",
    texte:
      "Plombiers, électriciens, maçons, menuisiers : une fiche publique qui présente "
      + "votre métier aux agences et aux particuliers qui cherchent quelqu'un de sûr.",
    points: [
      { titre: "Fiche publique", texte: "Votre métier, votre zone d'intervention et les avis de vos clients." },
      { titre: "Demandes de devis", texte: "Les agences et les particuliers vous écrivent depuis votre fiche." },
      { titre: "Badge de compétence", texte: "Un questionnaire par métier atteste votre niveau sur votre fiche." },
    ],
    action: { libelle: "Proposer mes services", href: "/pro/candidature" },
    secondaire: { libelle: "Voir l'annuaire", href: "/professionnels" },
    image: {
      src: "/photos/artisan-electricien.webp",
      alt: "Illustration : un électricien intervient sur un tableau électrique, "
        + "ses outils posés à côté de lui.",
      largeur: 760, hauteur: 510, ajustement: "couvrir",
    },
  },
];

const ETAPES = [
  {
    numero: "01",
    titre: "Rendre les biens visibles",
    texte: "Les annonces publiées par les agences sont consultables par tout le monde, sans compte.",
  },
  {
    numero: "02",
    titre: "Rapprocher les interlocuteurs",
    texte: "L'agence et son locataire partagent les mêmes documents, au lieu de se les renvoyer.",
  },
  {
    numero: "03",
    titre: "Faire connaître les artisans",
    texte: "Les professionnels du bâtiment ont une fiche, des avis et des demandes de devis.",
  },
];

export default function PageDecouvrir() {
  return (
    <div className="min-h-screen bg-creme">
      <EntetePublic />

      {/* ================================ Premier écran ================================ */}
      <section className="bg-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-or-400">
              Pensé pour le Sénégal
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              L&apos;immobilier,<br />plus proche.<br />
              <span className="accent-serif text-or-400">Plus simple.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg text-brand-100">
              Un projet qui rapproche les agences, les locataires et les artisans pour
              simplifier la location et l&apos;entretien des logements.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#espaces" className="btn-or px-6 py-3.5 text-base">
                Découvrir les espaces
              </Link>
              <Link
                href="/#annonces"
                className="rounded-lg border border-white/40 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10"
              >
                Voir les annonces
              </Link>
            </div>

            <p className="mt-6 text-sm text-brand-200">
              Agences immobilières · Locataires · Artisans du bâtiment
            </p>
          </div>

          {/* Une VRAIE capture du logiciel, avec des données d'exemple. La
              maquette d'origine montrait des chiffres inventés dans une
              fenêtre dessinée ; une agence reconnaît tout de suite la
              différence, et c'est précisément ce qu'on lui demande de croire. */}
          <div className="relative">
            <figure className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
              <figcaption className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
                <span className="text-sm font-bold text-brand-900">Sen Gestion</span>
                <span className="text-xs text-slate-500">Capture réelle · données d&apos;exemple</span>
              </figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/apercu/loyers.webp"
                alt="Écran « Factures et quittances » de Sen Gestion : total facturé, total encaissé, reste à percevoir, et la liste des factures du mois avec leur état."
                width={1680}
                height={1000}
                className="block w-full"
              />
            </figure>

            <div className="relative mx-4 -mt-6 rounded-xl bg-or-400 px-5 py-4 text-brand-900 shadow-xl sm:mx-8">
              <p className="font-bold">Un logement. Plusieurs acteurs.</p>
              <p className="text-sm">Une même ambition : mieux se retrouver.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20">
          <ul className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-brand-100">
            <li>Gérer les locations</li>
            <li>Faciliter les échanges</li>
            <li>Valoriser les savoir-faire</li>
          </ul>
        </div>
      </section>

      {/* ================================ Les espaces ================================ */}
      <section id="espaces" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:py-24">
        <div className="apparait">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            À chacun son espace
          </p>
          <h2 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.13] tracking-tight text-slate-900 sm:text-5xl">
            Trois besoins.<br />Un projet commun.
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Gérer un bien, suivre sa location ou proposer son savoir-faire : voici la
            place de chacun dans Sen Gestion.
          </p>
        </div>

        <EspacesOnglets espaces={ESPACES} />
      </section>

      {/* ================================ L'ambition ================================ */}
      <section id="projet" className="scroll-mt-24 bg-brand-950 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="apparait">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-or-400">
              Notre ambition
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.13] tracking-tight sm:text-5xl">
              Moins de démarches dispersées.<br />Plus de liens utiles.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-brand-100">
              Sen Gestion part des besoins du quotidien au Sénégal : trouver un logement,
              gérer une location, et identifier un professionnel pour les travaux.
            </p>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-3">
            {ETAPES.map((e) => (
              <article key={e.numero} className="apparait">
                <span className="accent-serif text-4xl text-or-400">{e.numero}</span>
                <h3 className="mt-4 text-xl font-bold">{e.titre}</h3>
                <p className="mt-2 text-brand-100">{e.texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================================ Dernier appel ================================ */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-24">
        <div className="apparait">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
            sengestion.net
          </p>
          <h2 className="mt-5 text-3xl font-extrabold leading-[1.13] tracking-tight text-slate-900 sm:text-5xl">
            Et si l&apos;immobilier devenait<br />plus simple pour vous ?
          </h2>
          <p className="mt-5 text-lg text-slate-600">
            L&apos;essai est gratuit jusqu&apos;à 3 biens, sans carte bancaire et sans
            limite de durée.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/inscription" className="btn-primaire px-6 py-3.5 text-base">
              Créer mon espace agence
            </Link>
            <Link href="/tarifs" className="btn-secondaire px-6 py-3.5 text-base">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      <PiedPublic />
    </div>
  );
}
