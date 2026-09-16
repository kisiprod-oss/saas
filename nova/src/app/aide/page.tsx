import Link from "next/link";
import { EntetePublic, PiedPublic } from "@/components/coque-publique";

export const metadata = {
  title: "Questions fréquentes",
  description: "Ce qu'il faut savoir avant de créer sa boutique avec NOVA Boutique.",
};

/**
 * La FAQ.
 *
 * Elle repond aux questions qu'un commercant pose REELLEMENT avant de
 * s'engager : combien ca coute, ou va l'argent, qu'est-ce qui se passe si
 * j'arrete. Elle ne cache pas ce qui n'est pas encore pret.
 *
 * `<details>` natif : ca fonctionne sans JavaScript, c'est accessible au
 * clavier, et le navigateur gere l'ouverture. Aucune raison de reecrire ca.
 */
const QUESTIONS: { question: string; reponse: React.ReactNode }[] = [
  {
    question: "Faut-il savoir se servir d'un ordinateur ?",
    reponse: <>
      Non. Tout se fait depuis un téléphone : vous décrivez votre activité, vous
      photographiez vos produits, vous publiez. L&apos;application est conçue pour
      être utilisée au pouce, avec quatre onglets en bas de l&apos;écran.
    </>,
  },
  {
    question: "Combien ça coûte pour commencer ?",
    reponse: <>
      Rien. Vous créez votre boutique, vous la personnalisez et vous la regardez
      gratuitement. La formule Découverte ne permet pas de la publier : c&apos;est
      au moment de la mettre en ligne que vous choisissez une formule payante.
      Le détail est sur la <Link href="/tarifs" className="lien">page des tarifs</Link>.
    </>,
  },
  {
    question: "Où va l'argent de mes ventes ?",
    reponse: <>
      Chez vous. Si vous vendez au paiement à la livraison, vous encaissez en
      main propre et vous l&apos;enregistrez dans l&apos;application. Si vous
      branchez un paiement en ligne, c&apos;est VOTRE compte marchand qui reçoit
      les fonds, avec vos propres clés. NOVA Boutique ne prend aucune commission
      sur vos ventes : nous facturons un abonnement, c&apos;est tout.
    </>,
  },
  {
    question: "Le paiement Mobile Money fonctionne-t-il ?",
    reponse: <>
      Pas encore de bout en bout. L&apos;ossature technique est écrite (réception
      des notifications, vérification de signature, protection contre les
      doublons), et un mode test permet de vérifier le circuit. Mais aucune
      intégration n&apos;a fait de transaction réelle à ce jour : nous préférons
      le dire plutôt que de vous laisser annoncer à vos clients un moyen de
      paiement qui ne marche pas. Le paiement à la livraison, lui, fonctionne
      dès le premier jour.
    </>,
  },
  {
    question: "Qu'est-ce que l'IA fait exactement ?",
    reponse: <>
      Elle propose la mise en page de votre accueil, écrit vos descriptions à
      partir des caractéristiques que VOUS saisissez, suggère des couleurs, et
      comprend des demandes comme « ajoute une section présentation ». Ce
      qu&apos;elle ne fait jamais : inventer une matière, une garantie, un délai
      ou un avis client ; toucher à vos prix, à vos stocks ou à vos réglages de
      paiement ; publier quoi que ce soit. Chaque proposition vous est montrée
      avant d&apos;être appliquée, et vous pouvez revenir en arrière.
    </>,
  },
  {
    question: "Si je modifie ma boutique, mes clients voient-ils les changements tout de suite ?",
    reponse: <>
      Non, et c&apos;est voulu. Vos modifications vont dans un brouillon que vous
      seul voyez. Vos clients continuent de voir la version publiée jusqu&apos;à
      ce que vous cliquiez sur « Publier ». Vous pouvez donc laisser une page à
      moitié réécrite pendant trois jours sans conséquence.
    </>,
  },
  {
    question: "Mes clients doivent-ils créer un compte pour commander ?",
    reponse: <>
      Non. Ils choisissent, donnent leur nom, leur téléphone, leur quartier et un
      repère, et c&apos;est fini. Pas de mot de passe, pas d&apos;e-mail
      obligatoire. Chaque champ en plus est un panier abandonné.
    </>,
  },
  {
    question: "Comment suis-je prévenu d'une commande ?",
    reponse: <>
      Elle apparaît dans votre tableau de bord, dans l&apos;onglet Commandes, avec
      une pastille sur le nombre à traiter. L&apos;envoi automatique de SMS ou
      d&apos;e-mails n&apos;est pas encore branché : prenez l&apos;habitude
      d&apos;ouvrir l&apos;application le matin, comme vous ouvrez votre boutique.
    </>,
  },
  {
    question: "Puis-je utiliser mon propre nom de domaine ?",
    reponse: <>
      Oui, à partir de la formule Business. Vous prouvez que le domaine est à
      vous en ajoutant un enregistrement TXT, puis vous le faites pointer vers
      nous. L&apos;émission du certificat HTTPS n&apos;est pas encore automatique
      et demande une intervention de notre part : c&apos;est indiqué dans vos
      paramètres.
    </>,
  },
  {
    question: "Et si j'arrête de payer ?",
    reponse: <>
      Vous ne perdez rien. Votre boutique, vos produits et vos commandes restent.
      Ce sont les AJOUTS qui s&apos;arrêtent : plus de nouveau produit au-delà de
      la limite gratuite, plus de génération IA au-delà du quota. Vous pouvez
      exporter vos commandes en CSV à tout moment.
    </>,
  },
  {
    question: "Dans quels pays le service fonctionne-t-il ?",
    reponse: <>
      Le Sénégal aujourd&apos;hui. L&apos;application est construite pour qu&apos;un
      pays supplémentaire soit une ligne de configuration — devise, indicatif
      téléphonique, villes, moyens de paiement — et non une réécriture. Les pays
      voisins sont préparés mais fermés tant que les moyens de paiement et la
      livraison n&apos;y ont pas été vérifiés.
    </>,
  },
  {
    question: "Puis-je vendre des services ou des fichiers numériques ?",
    reponse: <>
      Pas encore. La première version couvre les produits physiques : stock,
      livraison, retrait. La base de données prévoit déjà les autres types, mais
      aucune interface ne les propose — nous ne les afficherons pas tant
      qu&apos;ils ne fonctionneront pas.
    </>,
  },
];

export default function PageAide() {
  return (
    <>
      <EntetePublic />
      <main id="contenu" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="titre-page">Questions fréquentes</h1>
        <p className="mt-3 text-encre-600">
          Les réponses sont à jour de ce que fait réellement l&apos;application
          aujourd&apos;hui.
        </p>

        <div className="mt-10 divide-y divide-encre-200 border-y border-encre-200">
          {QUESTIONS.map((entree, i) => (
            <details key={i} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-encre-900 marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  {entree.question}
                  <span aria-hidden className="mt-0.5 shrink-0 text-xl leading-none text-encre-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <div className="mt-3 leading-relaxed text-encre-700">{entree.reponse}</div>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-vert-50 p-6">
          <h2 className="font-semibold text-vert-900">Une autre question ?</h2>
          <p className="mt-1.5 text-sm text-vert-800">
            Créez votre boutique — c&apos;est gratuit — puis écrivez-nous depuis vos
            paramètres. Nous répondons sous deux jours ouvrés.
          </p>
          <Link href="/inscription" className="btn-principal mt-4">Créer ma boutique</Link>
        </div>
      </main>
      <PiedPublic />
    </>
  );
}
