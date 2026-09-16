import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/coque-publique";
import { ApercuProduit } from "@/components/apercu-produit";
import { Devanture, Livraison, Etoffes } from "@/components/illustrations";
import {
  Etincelle, Panier, Camion, Carte, Boite, Graphique, Whatsapp, Bouclier,
  Fleche, Coche,
} from "@/components/icones";
import { offresPubliques } from "@/lib/offres";
import { boutiquesDemonstration } from "@/lib/requetes";
import { montant } from "@/lib/format";

/**
 * La page d'accueil commerciale.
 *
 * Une règle a guidé chaque phrase : ne rien promettre que le produit ne fasse
 * aujourd'hui. Pas de témoignage, pas de « 2 000 commerçants nous font
 * confiance », pas de logo de partenaire, pas de revenu annoncé. Ce qui est
 * écrit ici est vérifiable en ouvrant l'application.
 *
 * Les tarifs affichés sont lus en base : ils suivent ce que l'administration
 * a réglé, et ne peuvent pas diverger de ce qui sera facturé.
 */

export const dynamic = "force-dynamic";

const ETAPES = [
  {
    numero: "1",
    titre: "Décrivez votre activité",
    texte: "Votre nom de boutique, ce que vous vendez, votre ville. Quelques phrases suffisent.",
  },
  {
    numero: "2",
    titre: "Personnalisez",
    texte: "L'assistant propose une mise en page, des textes et des couleurs. Vous gardez, vous changez, vous réécrivez.",
  },
  {
    numero: "3",
    titre: "Publiez et vendez",
    texte: "Votre boutique reçoit une adresse. Vous la partagez, les commandes arrivent dans votre tableau de bord.",
  },
];

const FONCTIONS = [
  {
    icone: Etincelle,
    titre: "L'assistant écrit avec vous",
    texte: "Il propose la structure de vos pages et rédige vos descriptions à partir des "
      + "caractéristiques que vous saisissez. Vous voyez la proposition avant qu'elle "
      + "s'applique, et vous pouvez revenir en arrière.",
  },
  {
    icone: Boite,
    titre: "Un catalogue, pas une liste",
    texte: "Photos, prix, stock, catégories, variantes simples (taille, couleur). Le stock "
      + "descend tout seul à chaque commande, et vous prévient avant la rupture.",
  },
  {
    icone: Panier,
    titre: "Commander sans créer de compte",
    texte: "Votre client choisit, donne son nom, son téléphone, son quartier et un repère. "
      + "Rien de plus. C'est ce qui fait la différence entre un panier rempli et un panier "
      + "abandonné.",
  },
  {
    icone: Camion,
    titre: "Livraison à votre main",
    texte: "Retrait en boutique, ou livraison avec des frais différents par zone. "
      + "Vous fixez les zones, le total se calcule tout seul.",
  },
  {
    icone: Carte,
    titre: "Paiement à la livraison, et en ligne",
    texte: "Le paiement à la livraison fonctionne dès le premier jour. Le paiement en ligne "
      + "s'active quand vous connectez votre compte marchand — l'argent va chez vous, "
      + "pas chez nous.",
  },
  {
    icone: Whatsapp,
    titre: "WhatsApp, sans mentir sur le résultat",
    texte: "Un bouton ouvre WhatsApp avec le récapitulatif et une référence. Nous comptons "
      + "les demandes ouvertes séparément des commandes confirmées : ouvrir WhatsApp n'est "
      + "ni un envoi, ni une vente.",
  },
  {
    icone: Graphique,
    titre: "Des chiffres qui ne mentent pas",
    texte: "Ce qui est encaissé d'un côté, ce qui reste dû de l'autre. Une commande reçue "
      + "n'est jamais comptée comme payée tant que vous ne l'avez pas dit.",
  },
  {
    icone: Bouclier,
    titre: "Vos données restent les vôtres",
    texte: "Chaque boutique est isolée des autres, jusque dans le stockage des photos. "
      + "Les montants et les stocks sont calculés sur le serveur, jamais dans le navigateur "
      + "du client.",
  },
];

export default function Accueil() {
  const offres = offresPubliques();
  const demonstrations = boutiquesDemonstration();

  return (
    <>
      <EntetePublic />

      <main id="contenu">
        {/* ------------------------------ Promesse ------------------------------ */}
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-vert-200 bg-vert-50 px-3 py-1 text-xs font-semibold text-vert-800">
                <Etincelle className="size-3.5" /> Lancement au Sénégal
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-encre-900 sm:text-5xl xl:text-6xl">
                Votre boutique en ligne,
                <span className="block text-vert-700">créée avec l&apos;IA.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-encre-600">
                Vous avez des photos de vos produits et un téléphone. C&apos;est tout ce
                qu&apos;il faut pour ouvrir une boutique, la publier, et recevoir vos
                premières commandes.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/inscription" className="btn-principal px-6 text-base">
                  Créer ma boutique <Fleche className="size-4" />
                </Link>
                <Link href="/demonstration" className="btn-secondaire px-6 text-base">
                  Voir une démonstration
                </Link>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-encre-600">
                {[
                  "Aucune compétence technique",
                  "Prix en FCFA",
                  "Paiement à la livraison",
                ].map((point) => (
                  <li key={point} className="flex items-center gap-1.5">
                    <Coche className="size-4 text-vert-600" /> {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pb-8 lg:pb-0">
              <ApercuProduit />
            </div>
          </div>
        </section>

        {/* ------------------------------ Parcours ------------------------------ */}
        <section className="border-y border-encre-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="titre-page">Trois étapes, et votre boutique est en ligne</h2>
            <p className="mt-3 max-w-2xl text-encre-600">
              Vous pouvez vous arrêter à n&apos;importe quel moment : votre progression est
              enregistrée, vous reprenez plus tard, là où vous en étiez.
            </p>

            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {ETAPES.map((etape, i) => (
                <li key={etape.numero} className="relative carte p-6">
                  <span className="flex size-10 items-center justify-center rounded-full bg-vert-700 text-base font-bold text-white">
                    {etape.numero}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-encre-900">{etape.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-encre-600">{etape.texte}</p>
                  {i < ETAPES.length - 1 ? (
                    <Fleche className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 text-encre-300 md:block" />
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <Devanture className="w-full rounded-2xl border border-encre-200" />
              <Etoffes className="w-full rounded-2xl border border-encre-200" />
              <Livraison className="w-full rounded-2xl border border-encre-200" />
            </div>
          </div>
        </section>

        {/* --------------------------- Fonctionnalités --------------------------- */}
        <section id="fonctionnalites" className="scroll-mt-24 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="titre-page">Ce que NOVA Boutique fait aujourd&apos;hui</h2>
            <p className="mt-3 max-w-2xl text-encre-600">
              Cette liste décrit des fonctions déjà présentes dans l&apos;application.
              Ce qui demande un branchement de votre part est signalé comme tel.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FONCTIONS.map(({ icone: Icone, titre, texte }) => (
                <div key={titre} className="carte p-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-vert-50 text-vert-700">
                    <Icone className="size-5" />
                  </div>
                  <h3 className="mt-3.5 font-semibold text-encre-900">{titre}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-encre-600">{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------- Démonstrations --------------------------- */}
        <section className="border-y border-encre-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="titre-page">Des boutiques de démonstration</h2>
                <p className="mt-3 max-w-2xl text-encre-600">
                  Ces boutiques ont été créées par notre équipe pour montrer le résultat.
                  Ce ne sont pas de vrais commerces&nbsp;: les produits, les prix et les
                  commandes sont inventés pour l&apos;exemple.
                </p>
              </div>
              <Link href="/demonstration" className="btn-secondaire">Toutes les démonstrations</Link>
            </div>

            {demonstrations.length === 0 ? (
              <div className="mt-8 message message-info">
                Les boutiques de démonstration ne sont pas encore installées sur ce serveur.
                Lancez <code className="font-mono text-xs">npm run seed</code> pour les créer.
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {demonstrations.map((boutique) => (
                  <Link key={boutique.id} href={`/b/${boutique.slug}`}
                    className="carte group overflow-hidden transition-shadow hover:shadow-md">
                    <div className="h-28" style={{ backgroundColor: boutique.couleur }} />
                    <div className="p-5">
                      <span className="puce puce-neutre">Démonstration</span>
                      <h3 className="mt-2.5 font-semibold text-encre-900 group-hover:text-vert-700">
                        {boutique.nom}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-encre-600">
                        {boutique.description ?? "Boutique d'exemple."}
                      </p>
                      <p className="mt-3 font-mono text-xs text-encre-500">
                        {boutique.slug}.nova.shop
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------- Offres ------------------------------- */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="titre-page">Des formules simples</h2>
            <p className="mt-3 max-w-2xl text-encre-600">
              Vous construisez votre boutique gratuitement. Vous payez le jour où vous
              la mettez en ligne.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {offres.map((offre) => (
                <div key={offre.code}
                  className={`carte flex flex-col p-6 ${offre.code === "business" ? "ring-2 ring-vert-700" : ""}`}>
                  {offre.code === "business" ? (
                    <span className="mb-3 self-start puce puce-vert">Le plus complet</span>
                  ) : null}
                  <h3 className="font-semibold text-encre-900">{offre.nom}</h3>
                  <p className="mt-2 text-2xl font-bold text-encre-900">
                    {offre.prix_mensuel === 0
                      ? "Gratuit"
                      : <>{montant(offre.prix_mensuel, "FCFA")}<span className="text-sm font-normal text-encre-500"> / mois</span></>}
                  </p>
                  {offre.accroche ? (
                    <p className="mt-2 text-sm text-encre-600">{offre.accroche}</p>
                  ) : null}
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-encre-700">
                    <li className="flex gap-2">
                      <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                      {offre.max_produits} produits
                    </li>
                    <li className="flex gap-2">
                      <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                      {offre.quota_ia} générations IA par mois
                    </li>
                    <li className="flex gap-2">
                      <Coche className={`mt-0.5 size-4 shrink-0 ${offre.publication ? "text-vert-600" : "text-encre-300"}`} />
                      {offre.publication ? "Boutique en ligne" : "Brouillon seulement"}
                    </li>
                    {offre.domaine_personnalise ? (
                      <li className="flex gap-2">
                        <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                        Votre nom de domaine
                      </li>
                    ) : null}
                    {offre.max_membres > 1 ? (
                      <li className="flex gap-2">
                        <Coche className="mt-0.5 size-4 shrink-0 text-vert-600" />
                        Jusqu&apos;à {offre.max_membres} personnes
                      </li>
                    ) : null}
                  </ul>
                  <Link href="/inscription"
                    className={`mt-5 ${offre.code === "business" ? "btn-principal" : "btn-secondaire"}`}>
                    Commencer
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-encre-500">
              Prix en francs CFA, hors frais du prestataire de paiement. Voir la{" "}
              <Link href="/tarifs" className="lien">page des tarifs</Link> pour le détail
              de ce qui est inclus.
            </p>
          </div>
        </section>

        {/* ------------------------------- Appel -------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <div className="rounded-3xl bg-vert-700 px-6 py-14 text-center sm:px-12">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Commencez par une photo de vos produits
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-vert-100">
              La création est gratuite. Vous verrez votre boutique avant de décider
              de la publier.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/inscription"
                className="btn min-h-11 rounded-xl bg-white px-6 text-base font-semibold text-vert-800 hover:bg-vert-50">
                Créer ma boutique
              </Link>
              <Link href="/demonstration"
                className="btn min-h-11 rounded-xl border border-white/40 px-6 text-base font-semibold text-white hover:bg-white/10">
                Voir une démonstration
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PiedPublic />
    </>
  );
}
