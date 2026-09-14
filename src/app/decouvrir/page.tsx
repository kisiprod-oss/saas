import type { Metadata } from "next";
import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import {
  IconeContrat, IconeGraphique, IconeMaison, IconeOutils, IconeRelance,
  IconeTelephone, IconeUtilisateurs,
} from "@/components/icones";

/**
 * « Le projet » : la page qui explique Sen Gestion a quelqu'un qui ne le
 * connait pas encore.
 *
 * ELLE NE REMPLACE PAS L'ACCUEIL, et c'est delibere. La page « / » porte la
 * recherche et la liste des annonces : c'est elle que Google indexe, et par
 * elle qu'un locataire trouve un logement. Celle-ci s'adresse a l'autre
 * visiteur — l'agence, le proprietaire, l'artisan a qui l'on envoie un lien.
 *
 * SA PALETTE N'EST PAS CELLE DU LOGICIEL : vert profond, or doux, papier
 * creme, sur une maquette validee. Les variables sont enfermees dans
 * `.page-projet` (voir globals.css) pour que cette exception reste ici.
 *
 * Toutes les fonctions citees ont ete verifiees dans le code : rien n'est
 * annonce qui ne soit deja construit.
 */

export const metadata: Metadata = {
  title: "Le projet Sen Gestion — agences, locataires et artisans au Sénégal",
  description:
    "Sen Gestion rapproche les agences immobilières, les locataires et les artisans "
    + "du bâtiment au Sénégal : gestion des biens et des loyers, espace locataire, "
    + "annuaire des professionnels.",
  alternates: { canonical: "/decouvrir" },
};

type Atout = { Icone: typeof IconeMaison; titre: string; texte: string };

type Espace = {
  cle: string;
  eyebrow: string;
  titre: React.ReactNode;
  accroche: string;
  atouts: Atout[];
  action: { libelle: string; href: string };
  image: {
    src: string; alt: string; largeur: number; hauteur: number;
    /**
     * « plein » : la photo occupe toute la colonne, bord a bord.
     * « encadre » : la capture du logiciel est POSEE dans la colonne, sur un
     *   fond teinte. Recadrer une capture bord a bord lui couperait ses
     *   lignes ; et une capture qui deborde de son cadre ne se lit plus comme
     *   un ecran. Deux natures d'image, deux traitements.
     */
    traitement: "plein" | "encadre";
  };
  /** Vrai quand l'image passe a droite : une section sur deux s'inverse. */
  inverse?: boolean;
  fond: "papier" | "vert-pale";
};

const ESPACES: Espace[] = [
  {
    cle: "agences",
    eyebrow: "Agences immobilières",
    titre: <>Votre gestion,<br />en un regard.</>,
    accroche: "Biens, locataires, baux et quittances.",
    atouts: [
      { Icone: IconeMaison, titre: "Centralisez vos biens",
        texte: "Tout le portefeuille de l'agence dans un seul écran." },
      { Icone: IconeUtilisateurs, titre: "Suivez vos locataires",
        texte: "Baux, échéances et paiements à jour, sans cahier ni fichier séparé." },
      { Icone: IconeContrat, titre: "Éditez vos documents",
        texte: "Quittances et factures à l'en-tête de votre agence, numérotées automatiquement." },
    ],
    action: { libelle: "Créer mon espace agence", href: "/inscription" },
    image: {
      src: "/apercu/biens-detail.webp",
      alt: "Écran « Mes biens » de Sen Gestion : la liste du portefeuille de l'agence, "
        + "avec pour chaque logement sa localisation, son type, son loyer et son état.",
      largeur: 1424, hauteur: 1000, traitement: "encadre",
    },
    fond: "papier",
  },
  {
    cle: "locataires",
    eyebrow: "Locataires",
    titre: <>Votre logement,<br />l&apos;esprit tranquille.</>,
    accroche: "Un espace pour suivre votre location.",
    atouts: [
      { Icone: IconeContrat, titre: "Accédez à vos quittances",
        texte: "À consulter et à imprimer quand vous en avez besoin." },
      // Verifie dans src/app/espace-locataire/connexion : numero + mot de passe.
      // Il n'y a pas de code a usage unique, ne pas l'annoncer.
      { Icone: IconeTelephone, titre: "Connectez-vous par téléphone",
        texte: "Votre numéro, et le mot de passe que votre agence vous remet." },
      { Icone: IconeRelance, titre: "Déclarez un paiement",
        texte: "Orange Money, Wave ou espèces : vous le signalez, l'agence le valide." },
    ],
    action: { libelle: "Accéder à mon espace locataire", href: "/espace-locataire/connexion" },
    image: {
      src: "/photos/confiance-quittance.webp",
      alt: "Illustration : une locataire compare sa quittance papier et son téléphone, chez elle.",
      largeur: 760, hauteur: 510, traitement: "plein",
    },
    inverse: true,
    fond: "vert-pale",
  },
  {
    cle: "artisans",
    eyebrow: "Artisans",
    titre: <>Votre savoir-faire<br />mérite d&apos;être vu.</>,
    accroche: "Présentez votre métier. Recevez des demandes.",
    atouts: [
      { Icone: IconeOutils, titre: "Créez votre fiche",
        texte: "Votre métier, votre zone d'intervention et les avis de vos clients." },
      { Icone: IconeUtilisateurs, titre: "Soyez visible",
        texte: "Les agences et les particuliers vous trouvent dans l'annuaire public." },
      { Icone: IconeGraphique, titre: "Recevez des devis",
        texte: "Les demandes arrivent directement depuis votre fiche." },
    ],
    action: { libelle: "Proposer mes services", href: "/pro/candidature" },
    image: {
      src: "/photos/artisan-electricien.webp",
      alt: "Illustration : un électricien intervient sur un tableau électrique, "
        + "ses outils posés à côté de lui.",
      largeur: 760, hauteur: 510, traitement: "plein",
    },
    fond: "papier",
  },
];

/** Le bouton doré. Texte vert nuit imposé : le blanc y tomberait sous 2:1. */
function BoutonOr({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--or-doux)] px-6 py-3.5
                 text-[15px] font-semibold text-[var(--vert-nuit)] transition-colors
                 hover:bg-[#f6d492]"
    >
      {children} <span aria-hidden>→</span>
    </Link>
  );
}

function Eyebrow({ ton, children }: { ton: "or" | "vert"; children: React.ReactNode }) {
  return (
    <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${
      // Le bronze plutôt que l'or clair de la maquette : mesuré sur les
      // pixels, l'or ne tenait pas sur le crème, et encore moins sur le vert
      // pâle de la section « Locataires » (4,18:1). Celui-ci passe partout —
      // 5,5:1 sur crème, 5,2:1 sur vert pâle — et reste un accent chaud.
      ton === "or" ? "text-[var(--or-doux)]" : "text-[#7a5f26]"
    }`}>
      {children}
    </p>
  );
}

export default function PageDecouvrir() {
  return (
    <div className="page-projet min-h-screen bg-[var(--papier)] text-[var(--encre)]">
      <EntetePublic />

      {/* ================================ Premier écran ================================ */}
      <section className="grid lg:grid-cols-2">
        <div className="bg-[var(--vert-profond)] px-6 py-16 sm:px-10 lg:py-28 lg:pl-16 lg:pr-14">
          <div className="mx-auto max-w-xl lg:mx-0 lg:ml-auto lg:max-w-lg">
            <Eyebrow ton="or">Pensé pour le Sénégal</Eyebrow>
            <h1 className="titre-projet mt-7 text-[2.75rem] leading-[1.04] text-white sm:text-6xl">
              L&apos;immobilier,<br />plus proche.<br />
              {/* L'italique est decorative, pas une emphase : un <span>, pas un
                  <em>, pour qu'un lecteur d'ecran ne force pas le ton. */}
              <span className="italic text-[var(--or-doux)]">Plus simple.</span>
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-[#d4e2dc]">
              Agences, locataires et artisans réunis pour simplifier l&apos;immobilier
              au Sénégal.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <BoutonOr href="#agences">Découvrir le projet</BoutonOr>
              <Link
                href="/#annonces"
                className="inline-flex items-center rounded-lg border border-white/45 px-6 py-3.5
                           text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explorer Sen Gestion
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[26rem] lg:min-h-[34rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/photos/hero-agence.webp"
            alt="Illustration : une gérante d'agence consulte Sen Gestion sur son téléphone."
            width={640}
            height={794}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Vignette chiffrée : elle donne à voir la forme du logiciel sans
              prétendre montrer les données de quiconque. D'où la mention, qui
              n'est pas une précaution de style mais la vérité. */}
          <div /* Sur téléphone la vignette se pose EN BAS et sur toute la largeur :
                 posée en haut à droite d'une photo de 26 rem, elle couvrait le
                 visage et il ne restait presque rien de l'image. */
              className="absolute inset-x-4 bottom-4 rounded-xl bg-white/95 p-4 shadow-xl backdrop-blur
                         sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:w-[16.5rem]">
            <p className="text-sm font-semibold text-[var(--encre)]">Votre gestion, en un regard</p>
            <dl className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
              {[
                { Icone: IconeMaison, libelle: "Biens", valeur: "12" },
                { Icone: IconeUtilisateurs, libelle: "Locataires", valeur: "28" },
              ].map(({ Icone, libelle, valeur }) => (
                <div key={libelle} className="flex items-center gap-3 px-3 py-2.5">
                  <Icone className="h-4 w-4 shrink-0 text-[var(--vert-profond)]" />
                  <dt className="text-sm text-[var(--encre)]">{libelle}</dt>
                  <dd className="ml-auto text-sm font-semibold text-[var(--encre)]">{valeur}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-right text-[11px] text-[var(--encre-douce)]">Exemple illustratif</p>
          </div>
        </div>
      </section>

      {/* ============================ Les trois espaces ============================ */}
      {ESPACES.map((e) => (
        <section
          key={e.cle}
          id={e.cle}
          className={`scroll-mt-20 ${
            e.fond === "vert-pale" ? "bg-[var(--vert-pale)]" : "bg-[var(--papier)]"
          }`}
        >
          {/* Pas de `items-center` sur la grille : les deux colonnes doivent
              s'etirer a la meme hauteur pour que l'image remplisse la sienne.
              C'est le texte qui se centre, a l'interieur de la sienne. */}
          <div className="grid lg:grid-cols-2">
            {/* L'image passe toujours EN PREMIER sur téléphone : c'est elle qui
                dit de quel public on parle, avant même le titre. */}
            <div className={`${e.inverse ? "lg:order-2" : ""} ${
              e.image.traitement === "encadre"
                ? "flex items-center bg-[var(--vert-pale)] px-6 py-12 sm:px-10 lg:px-14"
                : ""
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.image.src}
                alt={e.image.alt}
                width={e.image.largeur}
                height={e.image.hauteur}
                loading="lazy"
                decoding="async"
                className={e.image.traitement === "encadre"
                  ? "w-full rounded-xl object-contain shadow-xl ring-1 ring-black/10"
                  : "aspect-[4/3] w-full object-cover object-center lg:aspect-auto lg:h-full lg:min-h-[32rem]"}
              />
            </div>

            <div className={`flex items-center px-6 py-14 sm:px-10 lg:py-20 ${
              e.inverse ? "lg:order-1 lg:pl-16 lg:pr-14" : "lg:pl-14 lg:pr-16"
            }`}>
              <div className="mx-auto w-full max-w-xl lg:mx-0">
                <Eyebrow ton="vert">{e.eyebrow}</Eyebrow>
                <h2 className="titre-projet mt-5 text-4xl leading-[1.08] text-[var(--vert-profond)] sm:text-5xl">
                  {e.titre}
                </h2>
                <p className="mt-5 text-lg text-[var(--encre-douce)]">{e.accroche}</p>

                <ul className="mt-9 space-y-6">
                  {e.atouts.map(({ Icone, titre, texte }) => (
                    <li key={titre} className="flex gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--vert-pale)]">
                        <Icone className="h-5 w-5 text-[var(--vert-profond)]" />
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--encre)]">{titre}</p>
                        <p className="mt-0.5 text-[15px] leading-relaxed text-[var(--encre-douce)]">{texte}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <BoutonOr href={e.action.href}>{e.action.libelle}</BoutonOr>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* ================================ L'ambition ================================ */}
      <section className="bg-[var(--vert-profond)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
          <div className="max-w-2xl">
            <Eyebrow ton="or">Notre ambition</Eyebrow>
            <h2 className="titre-projet mt-6 text-4xl leading-[1.08] text-white sm:text-5xl">
              L&apos;immobilier<br />avance avec vous.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-[#d4e2dc]">
              Des outils simples pour des gens et des lieux : trouver un logement,
              gérer une location, faire appel à un professionnel de confiance.
            </p>
            <p className="mt-6 text-[15px] text-[#b9cdc4]">
              L&apos;essai est gratuit jusqu&apos;à 3 biens, sans carte bancaire et sans
              limite de durée.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <BoutonOr href="/inscription">Créer mon espace agence</BoutonOr>
              <Link
                href="/tarifs"
                className="inline-flex items-center rounded-lg border border-white/45 px-6 py-3.5
                           text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PiedPublic />
    </div>
  );
}
