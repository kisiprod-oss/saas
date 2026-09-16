import { EntetePublic, PiedPublic } from "@/components/coque-publique";

export const metadata = {
  title: "Conditions d'utilisation",
  description: "Les conditions d'utilisation du service NOVA Boutique.",
};

/**
 * Les conditions d'utilisation du SERVICE.
 *
 * A ne pas confondre avec les conditions de vente d'une boutique, qui sont
 * ecrites par chaque commercant (voir /b/<slug>/conditions). Ici, c'est le
 * contrat entre NOVA Boutique et le commercant.
 *
 * Ce texte est une base de travail honnete, pas un document valide par un
 * avocat : les mentions a completer sont signalees entre crochets. Les faire
 * relire avant l'ouverture commerciale fait partie des taches listees au
 * README.
 */
export default function PageConditions() {
  return (
    <>
      <EntetePublic />
      <main id="contenu" className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="titre-page">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-encre-500">
          Dernière mise à jour : à la mise en service.
        </p>

        <div className="message message-alerte mt-6">
          <div>
            <p className="font-semibold">Document à finaliser avant l&apos;ouverture commerciale</p>
            <p className="mt-0.5">
              Les mentions entre crochets doivent être complétées, et le texte relu
              par un juriste, avant la première facturation.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-7 leading-relaxed text-encre-700">
          <section>
            <h2 className="titre-section">1. Qui édite le service</h2>
            <p className="mt-2">
              NOVA Boutique est édité par [raison sociale], [forme juridique],
              immatriculée au registre du commerce sous le numéro [RCCM],
              NINEA [numéro], dont le siège est [adresse], Sénégal.
              Contact : [adresse e-mail].
            </p>
          </section>

          <section>
            <h2 className="titre-section">2. Ce que le service fait</h2>
            <p className="mt-2">
              NOVA Boutique fournit un outil qui permet à un commerçant de créer une
              boutique en ligne, d&apos;y présenter ses produits et d&apos;y recevoir
              des commandes. Nous fournissons l&apos;outil et l&apos;hébergement.
            </p>
            <p className="mt-2">
              Nous ne sommes pas partie au contrat de vente entre le commerçant et son
              client. Nous ne vendons rien, ne livrons rien, et n&apos;encaissons pas
              le prix des marchandises.
            </p>
          </section>

          <section>
            <h2 className="titre-section">3. Le compte du commerçant</h2>
            <p className="mt-2">
              Le commerçant est responsable de l&apos;exactitude des informations
              qu&apos;il publie : prix, stocks, caractéristiques, délais, conditions de
              vente. Il rédige et valide lui-même ses conditions de vente ; nous ne
              les rédigeons pas à sa place.
            </p>
            <p className="mt-2">
              Il est responsable de la confidentialité de son mot de passe et de
              toute action faite depuis son compte.
            </p>
          </section>

          <section>
            <h2 className="titre-section">4. Ce qui est interdit</h2>
            <p className="mt-2">
              Vendre ce que la loi sénégalaise interdit de vendre ; publier des
              contenus contrefaisants, trompeurs, violents ou portant atteinte à
              autrui ; se faire passer pour une autre entreprise ; tenter
              d&apos;accéder aux données d&apos;un autre commerçant.
            </p>
          </section>

          <section>
            <h2 className="titre-section">5. Suspension</h2>
            <p className="mt-2">
              Nous pouvons suspendre une boutique qui ne respecte pas ces conditions.
              Toute suspension est motivée : le motif est communiqué au commerçant à
              sa prochaine tentative de connexion, et conservé dans notre journal
              interne. Les données ne sont pas supprimées du fait de la suspension.
            </p>
          </section>

          <section>
            <h2 className="titre-section">6. Abonnement et facturation</h2>
            <p className="mt-2">
              Les formules et leurs tarifs sont affichés sur la page Tarifs, en francs
              CFA. Un abonnement n&apos;est activé qu&apos;après constatation du
              règlement. À l&apos;échéance, la boutique repasse sur la formule gratuite :
              les données restent accessibles, seuls les ajouts au-delà des limites
              gratuites s&apos;arrêtent.
            </p>
            <p className="mt-2">
              Les commissions prélevées par le prestataire de paiement du commerçant
              lui sont propres et ne transitent pas par nous.
            </p>
          </section>

          <section>
            <h2 className="titre-section">7. Disponibilité</h2>
            <p className="mt-2">
              Nous faisons notre possible pour que le service reste accessible, sans
              garantir une disponibilité ininterrompue. Des interruptions peuvent
              survenir pour maintenance ou pour des causes indépendantes de notre
              volonté. [Engagement de disponibilité à préciser, le cas échéant.]
            </p>
          </section>

          <section>
            <h2 className="titre-section">8. Vos données</h2>
            <p className="mt-2">
              Les données d&apos;un commerçant lui appartiennent. Il peut exporter ses
              commandes à tout moment depuis son tableau de bord. La façon dont nous
              traitons les données personnelles est décrite dans la page
              Données personnelles.
            </p>
          </section>

          <section>
            <h2 className="titre-section">9. Résiliation</h2>
            <p className="mt-2">
              Le commerçant peut cesser d&apos;utiliser le service à tout moment et
              retirer sa boutique du web depuis son tableau de bord.
              [Modalités de suppression définitive du compte et de conservation des
              données à préciser.]
            </p>
          </section>

          <section>
            <h2 className="titre-section">10. Droit applicable</h2>
            <p className="mt-2">
              Ces conditions sont soumises au droit sénégalais. [Juridiction
              compétente et clause de règlement amiable à préciser.]
            </p>
          </section>
        </div>
      </main>
      <PiedPublic />
    </>
  );
}
