import { EntetePublic, PiedPublic } from "@/components/coque-publique";

export const metadata = {
  title: "Données personnelles",
  description: "Quelles données NOVA Boutique collecte, pourquoi, et pour combien de temps.",
};

/**
 * La page sur les donnees personnelles.
 *
 * Elle est ecrite a partir de ce que le code fait REELLEMENT : chaque
 * affirmation ici correspond a une table ou a une absence de table. Rien n'y
 * est promis qui ne soit verifiable en lisant db/schema.sql.
 */
export default function PageConfidentialite() {
  return (
    <>
      <EntetePublic />
      <main id="contenu" className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="titre-page">Données personnelles</h1>

        <div className="message message-alerte mt-6">
          <div>
            <p className="font-semibold">Document à finaliser avant l&apos;ouverture commerciale</p>
            <p className="mt-0.5">
              Les mentions entre crochets restent à compléter, et le texte à faire
              relire au regard de la loi sénégalaise n° 2008-12 sur la protection des
              données à caractère personnel.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-7 leading-relaxed text-encre-700">
          <section>
            <h2 className="titre-section">Ce que nous collectons sur un commerçant</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Son nom, son adresse e-mail et son téléphone, pour créer son compte.</li>
              <li>Les informations de sa boutique : nom, activité, ville, adresse.</li>
              <li>Ses produits, ses commandes, ses clients, ses encaissements.</li>
              <li>Les clés de son prestataire de paiement, chiffrées avant stockage.</li>
              <li>Un journal des générations faites par l&apos;assistant, pour le quota.</li>
            </ul>
          </section>

          <section>
            <h2 className="titre-section">Ce que nous collectons sur un client de boutique</h2>
            <p className="mt-2">
              Uniquement ce qu&apos;il saisit pour commander : nom, téléphone, ville,
              quartier, repère, et l&apos;adresse s&apos;il en donne une. Pas de compte,
              pas de mot de passe, pas d&apos;e-mail obligatoire.
            </p>
            <p className="mt-2">
              Ces informations appartiennent au commerçant chez qui la commande a été
              passée. Elles ne sont jamais partagées avec un autre commerçant, ni
              utilisées par nous à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="titre-section">Ce que nous ne faisons pas</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Aucun traceur publicitaire, aucun pixel de réseau social.</li>
              <li>Aucune revente ni location de données.</li>
              <li>
                Aucun cookie autre que celui de session, indispensable pour rester
                connecté. Le panier d&apos;un client reste dans son navigateur et ne
                nous est envoyé qu&apos;au moment de la commande.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="titre-section">L&apos;assistant intelligent</h2>
            <p className="mt-2">
              Quand un commerçant demande une génération, le texte envoyé au modèle
              contient le nom de sa boutique, son activité, ses catégories et les
              caractéristiques du produit concerné. Aucune donnée de client, aucune
              commande, aucun montant encaissé n&apos;est transmis.
            </p>
            <p className="mt-2">
              [Nom du prestataire du modèle et pays d&apos;hébergement à préciser, ainsi
              que la durée de conservation des requêtes de son côté.]
            </p>
          </section>

          <section>
            <h2 className="titre-section">Combien de temps</h2>
            <p className="mt-2">
              Les données d&apos;une boutique sont conservées tant que le compte
              existe. Les sessions expirent au bout de trente jours, les liens de
              réinitialisation de mot de passe au bout de deux heures.
              [Durée de conservation après fermeture d&apos;un compte à préciser.]
            </p>
          </section>

          <section>
            <h2 className="titre-section">Vos droits</h2>
            <p className="mt-2">
              Vous pouvez demander l&apos;accès, la correction ou la suppression de vos
              données à [adresse e-mail]. Un commerçant peut exporter ses commandes en
              CSV depuis son tableau de bord, sans rien demander à personne.
            </p>
          </section>

          <section>
            <h2 className="titre-section">Sécurité</h2>
            <p className="mt-2">
              Les mots de passe sont stockés sous forme d&apos;empreinte scrypt, jamais
              en clair. Les clés de paiement sont chiffrées. Les données de chaque
              boutique sont isolées, y compris le stockage des photos. Les montants et
              les stocks sont calculés sur le serveur.
            </p>
          </section>
        </div>
      </main>
      <PiedPublic />
    </>
  );
}
