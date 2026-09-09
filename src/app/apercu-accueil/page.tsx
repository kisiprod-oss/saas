import type { Metadata } from "next";
import Link from "next/link";
import { LogoSen } from "@/components/entete-public";
import { IconeMenu } from "@/components/icones";
import { TexteManuscrit } from "@/components/texte-manuscrit";

/**
 * Nouvelle direction artistique de la page d'accueil — APERCU, PAS PUBLIE.
 *
 * La page d'accueil reelle (src/app/page.tsx) n'est pas touchee : elle
 * continue de servir la vitrine des annonces. Cette route-ci existe pour
 * qu'Isidore regarde la proposition sur le vrai site avant de decider si
 * elle remplace l'accueil — et ce qu'on fait alors des annonces, qui n'ont
 * pas leur place sur une page qui s'adresse aux agences.
 *
 * Palette : fond creme, encre marine, et le VERT FONCE de la gamme officielle
 * (succes-900, derive du vert du logo) comme unique couleur d'action. C'est
 * un ecart assume avec la regle ecrite dans globals.css, qui reserve le vert
 * a l'argent et donne l'action a l'or : la maquette de reference demande ce
 * vert. L'ecart est signale dans le rapport, il n'est pas passe sous silence.
 *
 * `noindex` : sans cela, Google verrait deux pages d'accueil concurrentes.
 */
export const metadata: Metadata = {
  title: "Aperçu — nouvelle page d'accueil",
  robots: { index: false, follow: false },
};

/**
 * Pose `data-anim` avant que le navigateur ne peigne quoi que ce soit, puis
 * installe l'observateur d'apparition. Tout est enveloppe : si une seule
 * ligne echoue, l'attribut saute et la page s'affiche entierement, sans
 * animation. Le contenu ne depend jamais du script.
 */
const SCRIPT_ANIMATIONS = `
(function () {
  var racine = document.documentElement;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    racine.setAttribute('data-anim', '1');
    var demarrer = function () {
      try {
        var obs = new IntersectionObserver(function (entrees) {
          for (var i = 0; i < entrees.length; i++) {
            if (entrees[i].isIntersecting) {
              entrees[i].target.classList.add('vu');
              obs.unobserve(entrees[i].target);
            }
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
        var cibles = document.querySelectorAll('.revele');
        for (var j = 0; j < cibles.length; j++) obs.observe(cibles[j]);
      } catch (e) { racine.removeAttribute('data-anim'); }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', demarrer);
    } else { demarrer(); }
  } catch (e) { racine.removeAttribute('data-anim'); }
})();
`;

const LIENS_NAV = [
  { href: "#fonctionnalites", libelle: "Fonctionnalités" },
  { href: "#la-plateforme", libelle: "La plateforme" },
  { href: "#faq", libelle: "FAQ" },
];

/** Chaque reponse est verifiable dans l'application : voir le rapport. */
const QUESTIONS = [
  {
    q: "Combien coûte Sen Gestion ?",
    r: "La formule Découverte est gratuite : 3 biens, 5 factures par mois, sans carte "
      + "bancaire et sans limite de durée. Au-delà, les formules payantes commencent à "
      + "5 000 FCFA par mois.",
  },
  {
    q: "Faut-il une carte bancaire pour commencer ?",
    r: "Non. La création de l'espace ne demande aucun moyen de paiement : le nom de "
      + "l'agence, votre nom, un numéro de téléphone, une adresse e-mail et un mot de passe.",
  },
  {
    q: "Que deviennent mes données si j'arrête de payer ?",
    r: "Vous revenez à la formule gratuite. Vos baux, vos loyers et les quittances déjà "
      + "émises restent consultables et réimprimables : seule l'émission de nouvelles "
      + "factures est limitée, et le compteur repart le 1er du mois.",
  },
  {
    q: "Une autre agence peut-elle voir mes biens ou mes locataires ?",
    r: "Non. Chaque écran de votre espace ne lit que les données rattachées à votre "
      + "agence, et les documents partagés s'ouvrent par un lien à usage unique.",
  },
  {
    q: "Je vis à l'étranger. Puis-je gérer mes biens au Sénégal ?",
    r: "Oui. L'inscription accepte un numéro de téléphone de n'importe quel pays, et "
      + "tout se fait depuis un navigateur, sans rien installer.",
  },
  {
    q: "Sen Gestion encaisse-t-il les loyers à ma place ?",
    r: "Non, et c'est voulu. Vous enregistrez chaque règlement avec son mode et sa "
      + "référence — Orange Money, Wave, Free Money, espèces, chèque, virement. Si vous "
      + "branchez votre propre compte marchand, le locataire paie en ligne directement "
      + "sur votre compte : l'argent ne transite jamais par Sen Gestion.",
  },
];

const ETAPES = [
  {
    titre: "Créez votre espace",
    texte: "Le nom de votre agence, votre nom, votre numéro et un mot de passe. "
      + "Aucun moyen de paiement n'est demandé.",
  },
  {
    titre: "Ajoutez vos biens",
    texte: "Puis vos locataires, et le bail qui les relie : loyer, charges, caution, "
      + "jour d'échéance.",
  },
  {
    titre: "Éditez vos quittances",
    texte: "Elles sortent prêtes à imprimer, à votre en-tête, avec leur code de "
      + "vérification.",
  },
];

const REPERES = [
  {
    titre: "Retrouvez vos biens",
    texte: "Chaque bien avec son loyer, son quartier et son statut : loué, disponible, réservé.",
  },
  {
    titre: "Suivez vos loyers",
    texte: "Ce qui a été facturé, ce qui est rentré, et ce qu'il reste à percevoir.",
  },
  {
    titre: "Organisez vos documents",
    texte: "Baux et quittances édités, chacun avec son code de vérification.",
  },
];

/** Petit lien souligné avec sa flèche, repris de la maquette. */
function LienFleche({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
       className="group inline-flex items-center gap-1.5 text-[0.95rem] font-medium text-brand-950 underline decoration-slate-400 underline-offset-[6px] transition-colors hover:decoration-succes-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-succes-900">
      {children}
      <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

export default function PageApercuAccueil() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANIMATIONS }} />

      {/* Bandeau d'aperçu : ne fait pas partie de la proposition graphique.
          Il est là pour qu'on ne confonde pas cette page avec le site en
          ligne, et il disparaîtra le jour où la page sera publiée. */}
      <div className="bg-brand-950 px-4 py-2 text-center text-xs text-brand-100">
        Aperçu — cette page n&apos;est pas publiée.{" "}
        <Link href="/" className="font-semibold text-white underline underline-offset-2">
          La page d&apos;accueil actuelle
        </Link>{" "}
        reste en ligne, inchangée.
      </div>

      <div className="accueil-corps bg-creme">
        {/* ------------------------------ Navigation ------------------------------ */}
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-creme/90 backdrop-blur">
          <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-4 px-6 py-4">
            <Link href="/apercu-accueil" aria-label="Sen Gestion, accueil"><LogoSen /></Link>

            <nav className="hidden items-center gap-8 md:flex">
              {LIENS_NAV.map((l) => (
                <a key={l.href} href={l.href}
                   className="text-sm text-slate-600 transition-colors hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-succes-900">
                  {l.libelle}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-5">
              <Link href="/connexion"
                    className="hidden text-sm text-slate-600 underline decoration-slate-400 underline-offset-4 transition-colors hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-succes-900 sm:block">
                Se connecter
              </Link>
              {/* Sous sm, ce bouton faisait deux lignes et écrasait l'en-tête :
                  il passe dans le menu, et l'appel à l'action du premier écran
                  est de toute façon juste en dessous. */}
              <Link href="/inscription"
                    className="hidden rounded-md bg-succes-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-succes-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-succes-900 sm:inline-flex">
                Démarrer gratuitement
              </Link>

              <details className="relative md:hidden">
                <summary
                  className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
                  aria-label="Menu"
                >
                  <IconeMenu className="h-5 w-5" />
                </summary>
                <nav className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {LIENS_NAV.map((l) => (
                    <a key={l.href} href={l.href}
                       className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {l.libelle}
                    </a>
                  ))}
                  <Link href="/connexion" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Se connecter
                  </Link>
                  <Link href="/inscription" className="block rounded-lg px-3 py-2 text-sm font-semibold text-succes-900 hover:bg-slate-50 sm:hidden">
                    Démarrer gratuitement
                  </Link>
                </nav>
              </details>
            </div>
          </div>
        </header>

        {/* ------------------------------ Premier écran ---------------------------- */}
        <section className="mx-auto max-w-[84rem] px-6 pb-16 pt-12 sm:pt-16">
          <p className="entree text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
             style={{ "--retard": "0ms" } as React.CSSProperties}>
            Gestion locative · Sénégal
          </p>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:items-end lg:gap-16">
            {/* 2,1rem sur téléphone : au-delà, « Tout simplement. » passe à la
                ligne et casse le rythme en trois temps du titre. */}
            <h1 className="text-[2.1rem] font-bold leading-[1.03] tracking-[-0.025em] text-brand-950 sm:text-6xl lg:text-[4.6rem]">
              <span className="entree block" style={{ "--retard": "80ms" } as React.CSSProperties}>Vos biens.</span>
              <span className="entree block" style={{ "--retard": "160ms" } as React.CSSProperties}>Vos locataires.</span>
              {/* La troisième ligne s'écrit au stylo. Tracés statiques, aucune
                  police ni bibliothèque chargée chez le visiteur — voir
                  texte-manuscrit.tsx. */}
              <span className="entree block text-succes-900" style={{ "--retard": "240ms" } as React.CSSProperties}>
                <TexteManuscrit retard={0.9} duree={1.8} />
              </span>
            </h1>

            <div className="entree lg:pb-3" style={{ "--retard": "340ms" } as React.CSSProperties}>
              <span aria-hidden="true" className="mb-6 block h-px w-14 bg-slate-400" />
              <p className="max-w-sm text-[1.05rem] leading-relaxed text-slate-700">
                Retrouvez l&apos;essentiel de votre gestion locative dans un espace
                pensé pour votre agence.
              </p>
              <div className="mt-7">
                <Link href="/inscription"
                      className="inline-flex rounded-md bg-succes-900 px-6 py-3.5 text-[0.95rem] font-semibold text-white transition-colors hover:bg-succes-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-succes-900">
                  Démarrer gratuitement
                </Link>
              </div>
              <div className="mt-5">
                <LienFleche href="#la-plateforme">Découvrir la plateforme</LienFleche>
              </div>
              <p className="mt-6 text-sm text-slate-600">
                Gratuit jusqu&apos;à 3 biens et 5 factures par mois — sans carte
                bancaire, sans limite de durée.
              </p>
            </div>
          </div>
        </section>

        {/* --------------------------- Bande photographique -------------------------
            La maquette pose ici une photographie d'immeuble en pleine largeur.
            Le projet n'en contient aucune en haute définition : celle-ci fait
            760 px de large et deviendrait floue étirée sur un écran d'ordinateur.
            Elle est donc posée à une taille où elle reste nette, et la légende
            garde la place que la maquette lui donne. Voir le rapport : il faut
            une vraie photographie de bien à Dakar, libre de droits. */}
        <section className="mx-auto max-w-[84rem] px-6 pb-20">
          <div className="revele grid items-end gap-8 sm:grid-cols-[minmax(0,760px)_1fr] sm:gap-14">
            {/* Plafonnee a sa largeur native (760 px) : au-dela, elle devient
                floue, et une page qui veut passer pour soignee ne peut pas se
                permettre une image etiree. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/photos/confiance-quittance.webp"
              alt="Illustration : une locataire compare sa quittance imprimée et son téléphone."
              width={760} height={506}
              className="w-full rounded-lg object-cover"
            />
            <p className="max-w-[15rem] text-sm leading-relaxed text-slate-600 sm:justify-self-end sm:pb-2 sm:text-right">
              <span aria-hidden="true" className="mb-4 block h-px w-10 bg-slate-400 sm:ml-auto" />
              L&apos;immobilier, mieux organisé.
            </p>
          </div>
        </section>

        {/* ------------------- 01 · Une vue d'ensemble (la plateforme) -------------- */}
        <section id="la-plateforme" className="border-t border-slate-200 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-[84rem] px-6">
            <div className="revele flex items-center gap-5">
              <span className="text-sm font-medium tabular-nums text-slate-600">01</span>
              <span aria-hidden="true" className="h-px w-16 bg-slate-300" />
            </div>

            <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:items-center lg:gap-16">
              <div>
                <h2 className="revele text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-brand-950 sm:text-5xl">
                  Une vue d&apos;ensemble.
                  <span className="block text-succes-900">Enfin.</span>
                </h2>

                <ul className="revele mt-10 space-y-7">
                  {REPERES.map((r) => (
                    <li key={r.titre} className="border-l-2 border-slate-200 pl-5">
                      <h3 className="font-semibold text-brand-950">{r.titre}</h3>
                      <p className="mt-1.5 max-w-sm text-[0.95rem] leading-relaxed text-slate-600">
                        {r.texte}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* `min-w-0` : element de grille, donc largeur minimale = celle de
                  son contenu par defaut. Sans lui, le cadre glissant ne defile
                  pas, il pousse la page (370 px de debordement, mesure). */}
              <figure className="revele min-w-0">
                <div className="capture-glissante rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/apercu/biens.webp"
                    alt="Capture de Sen Gestion : la liste des biens d'une agence, avec la localisation, le type, le loyer et le statut de chacun."
                    width={1680} height={1000}
                    className="w-full rounded-xl border border-slate-200"
                  />
                </div>
                <figcaption className="mt-3 text-right text-xs text-slate-600">
                  Capture réelle du logiciel — données de démonstration.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ------------------ 02 · Démonstration : trois onglets -------------------- */}
        <section id="fonctionnalites" className="border-t border-slate-200 py-20 sm:py-28">
          <div className="mx-auto max-w-[84rem] px-6">
            <div className="revele flex items-center gap-5">
              <span className="text-sm font-medium tabular-nums text-slate-600">02</span>
              <span aria-hidden="true" className="h-px w-16 bg-slate-300" />
            </div>

            <h2 className="revele mt-8 max-w-2xl text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-brand-950 sm:text-5xl">
              Trois écrans, et votre mois
              <span className="block text-succes-900">est tenu.</span>
            </h2>

            <fieldset className="demo-produit revele mt-12">
              <legend className="sr-only">Choisir l&apos;écran à afficher</legend>

              {/* Les boutons radio portent le clavier et l'annonce vocale ;
                  le CSS s'occupe de l'apparence et du panneau affiché. */}
              <input className="demo-choix sr-only" type="radio" name="demo" id="demo-1" defaultChecked />
              <input className="demo-choix sr-only" type="radio" name="demo" id="demo-2" />
              <input className="demo-choix sr-only" type="radio" name="demo" id="demo-3" />

              <div className="demo-onglets flex flex-wrap gap-2">
                {["Biens et locataires", "Loyers", "Documents"].map((t, i) => (
                  <label key={t} htmlFor={`demo-${i + 1}`}
                         className="cursor-pointer rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-500">
                    {t}
                  </label>
                ))}
              </div>

              <div className="demo-panneaux mt-8">
                {[
                  {
                    src: "/apercu/biens.webp",
                    alt: "Capture : la liste des biens d'une agence, avec la localisation, le type, le loyer et le statut de chacun.",
                    texte: "Chaque bien avec son loyer, son quartier et son statut — loué, "
                      + "disponible, réservé, en travaux. Le locataire et le bail se rattachent dessus.",
                  },
                  {
                    src: "/apercu/loyers.webp",
                    alt: "Capture : les factures et quittances du mois, avec le total facturé, le total encaissé et le reste à percevoir.",
                    texte: "Les factures du mois se génèrent en une fois. En haut, ce qui a été "
                      + "facturé, ce qui est rentré, et ce qu'il reste à percevoir.",
                  },
                  {
                    src: "/apercu/documents.webp",
                    alt: "Capture : le registre des documents émis, chaque quittance et chaque bail avec son code de vérification.",
                    texte: "Chaque quittance et chaque bail que vous éditez est inscrit ici, "
                      + "avec son destinataire et son code de vérification.",
                  },
                ].map((p) => (
                  <div key={p.src} className="demo-panneau">
                    <figure className="capture-glissante rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt={p.alt} width={1680} height={1000}
                           className="w-full rounded-xl border border-slate-200" />
                    </figure>
                    <p className="mt-5 max-w-2xl leading-relaxed text-slate-600">{p.texte}</p>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        {/* --------------------- 03 · Votre agence en trois étapes ------------------ */}
        <section id="comment-ca-marche" className="border-t border-slate-200 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-[84rem] px-6">
            <div className="revele flex items-center gap-5">
              <span className="text-sm font-medium tabular-nums text-slate-600">03</span>
              <span aria-hidden="true" className="h-px w-16 bg-slate-300" />
            </div>

            <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
              <h2 className="revele text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-brand-950 sm:text-5xl">
                Votre agence,
                <span className="block text-succes-900">en trois étapes.</span>
              </h2>

              <ol className="revele grid gap-10 sm:grid-cols-3 sm:gap-0">
                {ETAPES.map((e, i) => (
                  <li key={e.titre} className="sm:border-l sm:border-slate-200 sm:px-7 sm:first:pl-0 sm:first:border-l-0">
                    <p className="text-sm font-medium tabular-nums text-slate-600">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-brand-950">
                      {e.titre}
                    </h3>
                    <p className="mt-2.5 text-[0.95rem] leading-relaxed text-slate-600">{e.texte}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------ 04 · Vos documents, à votre nom ----------------------- */}
        <section className="border-t border-slate-200 py-20 sm:py-28">
          <div className="mx-auto max-w-[84rem] px-6">
            <div className="revele flex items-center gap-5">
              <span className="text-sm font-medium tabular-nums text-slate-600">04</span>
              <span aria-hidden="true" className="h-px w-16 bg-slate-300" />
            </div>

            <div className="mt-8 grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <div className="revele">
                <h2 className="text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-brand-950 sm:text-5xl">
                  Vos documents,
                  <span className="block text-succes-900">à votre nom.</span>
                </h2>
                <p className="mt-7 max-w-lg leading-relaxed text-slate-700">
                  La quittance et le bail sortent avec l&apos;en-tête de votre agence,
                  votre logo, votre NINEA et votre RCCM. Les articles du bail se
                  modifient un par un : vous partez d&apos;un modèle, vous l&apos;ajustez
                  à votre pratique, et il s&apos;applique à tous vos contrats.
                </p>
                <ul className="mt-9 space-y-6">
                  {[
                    ["Votre en-tête", "Logo et mentions légales sur chaque document édité."],
                    ["Vos articles", "Le modèle de bail se modifie article par article."],
                    ["Vérifiable", "Un code unique et un QR code sur chaque édition."],
                  ].map(([t, d]) => (
                    <li key={t} className="border-l-2 border-slate-200 pl-5">
                      <h3 className="font-semibold text-brand-950">{t}</h3>
                      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-slate-600">{d}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <figure className="revele justify-self-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/apercu/quittance.webp"
                  alt="Une quittance de loyer éditée par Sen Gestion : en-tête de l'agence, détail du loyer et des charges, cachet, QR code et code de vérification."
                  width={1050} height={1667}
                  className="w-full max-w-sm rounded-lg border border-slate-200 transition-transform duration-500 hover:scale-[1.02]"
                />
                <figcaption className="mt-3 text-center text-xs text-slate-600">
                  Quittance réelle produite par le logiciel — données de démonstration.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* ---------------------------------- FAQ ---------------------------------- */}
        <section id="faq" className="faq border-t border-slate-200 bg-white py-20 sm:py-28">
          <div className="mx-auto grid max-w-[84rem] gap-12 px-6 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div className="revele">
              <div className="flex items-center gap-5">
                <span className="text-sm font-medium tabular-nums text-slate-600">05</span>
                <span aria-hidden="true" className="h-px w-16 bg-slate-300" />
              </div>
              <h2 className="mt-8 text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-brand-950 sm:text-4xl">
                Vos questions,
                <span className="block text-succes-900">nos réponses.</span>
              </h2>
            </div>

            <div className="revele divide-y divide-slate-200 border-y border-slate-200">
              {QUESTIONS.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-succes-900">
                    <span className="text-[1.05rem] font-medium tracking-tight text-brand-950">
                      {item.q}
                    </span>
                    <span aria-hidden="true"
                          className="faq-croix shrink-0 text-2xl font-light leading-none text-slate-600 transition-transform duration-300">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 leading-relaxed text-slate-600">{item.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------- Dernier appel ------------------------------- */}
        <section className="bg-succes-900 py-20 text-white sm:py-28">
          <div className="mx-auto max-w-[84rem] px-6">
            <p className="revele text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-succes-200">
              Gestion locative · Sénégal
            </p>
            <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16">
              <h2 className="revele text-3xl font-bold leading-[1.06] tracking-[-0.02em] sm:text-5xl lg:text-[3.6rem]">
                Faites place à une
                <span className="block">gestion plus simple.</span>
              </h2>
              <div className="revele">
                <Link href="/inscription"
                      className="inline-flex items-center gap-2 rounded-md bg-white px-7 py-3.5 text-[0.95rem] font-semibold text-succes-900 transition-colors hover:bg-succes-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Démarrer gratuitement
                  <span aria-hidden="true">↗</span>
                </Link>
                <p className="mt-6 max-w-xs text-sm leading-relaxed text-succes-100">
                  Gratuit jusqu&apos;à 3 biens. Sans carte bancaire,
                  sans limite de durée.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* -------------------------------- Pied de page --------------------------- */}
      <footer className="accueil-pied w-full bg-creme">
        <div className="mx-auto w-full max-w-[84rem] px-6 py-10">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <LogoSen />
            <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
              <Link href="/tarifs" className="hover:text-brand-950">Tarifs</Link>
              <Link href="/verifier" className="hover:text-brand-950">Vérifier un document</Link>
              <Link href="/espace-locataire/connexion" className="hover:text-brand-950">Espace locataire</Link>
              <Link href="/mentions-legales" className="hover:text-brand-950">Mentions légales</Link>
              <Link href="/confidentialite" className="hover:text-brand-950">Confidentialité</Link>
              <Link href="/cgu" className="hover:text-brand-950">Conditions d&apos;utilisation</Link>
            </nav>
          </div>
          <p className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-600">
            © {new Date().getFullYear()} Sen Gestion — Dakar, Sénégal. Montants en francs CFA (XOF).
          </p>
        </div>
      </footer>
    </>
  );
}
