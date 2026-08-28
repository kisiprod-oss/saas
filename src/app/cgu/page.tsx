import { avantImmatriculation, EDITEUR } from "@/lib/editeur";
import { Article, PageLegale } from "@/components/page-legale";
import { PLANS } from "@/lib/tarifs";
import { fcfa } from "@/lib/format";

export const metadata = { title: "Conditions d'utilisation" };

export default function PageCgu() {
  return (
    <PageLegale titre="Conditions générales d'utilisation et de vente" miseAJour="août 2026">
      <Article titre="1. Objet">
        <p>
          Les présentes conditions régissent l&apos;utilisation de {EDITEUR.service},
          logiciel de gestion locative en ligne édité par {EDITEUR.raisonSociale}.
          Créer un compte vaut acceptation de ces conditions.
        </p>
      </Article>

      <Article titre="2. Le compte">
        <p>
          Le compte est ouvert au nom d&apos;une agence ou d&apos;un propriétaire. Le
          titulaire est responsable de la confidentialité de son mot de passe et de
          toute activité effectuée depuis son compte.
        </p>
        <p>
          Les informations fournies à l&apos;inscription doivent être exactes. Un compte
          créé avec de fausses informations peut être fermé sans préavis.
        </p>
      </Article>

      {avantImmatriculation() && (
        <Article titre="2 bis. Phase gratuite">
          <p>
            Le service est actuellement en phase de mise au point, avec un nombre
            limité d&apos;agences partenaires. <strong>Il est fourni gratuitement :
            aucune somme n&apos;est due, et aucune facture n&apos;est émise.</strong>
          </p>
          <p>
            Les tarifs présentés sur la page « Tarifs » sont donnés à titre
            indicatif et n&apos;entreront en vigueur qu&apos;à l&apos;issue de cette
            phase, après information préalable des utilisateurs et immatriculation
            de la société éditrice.
          </p>
        </Article>
      )}

      <Article titre="3. Formules et paiement">
        <ul className="ml-5 list-disc space-y-1.5">
          {PLANS.map((p) => (
            <li key={p.code}>
              <strong>{p.nom}</strong> — {p.prixMois === 0 ? "gratuit" : `${fcfa(p.prixMois)} par mois`}
              {p.maxBiens === null ? ", biens illimités" : `, jusqu'à ${p.maxBiens} biens`}.
            </li>
          ))}
        </ul>
        <p>
          Les prix sont exprimés en francs CFA, toutes taxes comprises le cas échéant.
          Le paiement à l&apos;année donne droit à deux mois offerts. L&apos;abonnement est
          sans engagement de durée et peut être interrompu à tout moment ; il n&apos;est
          pas remboursé au prorata pour la période entamée.
        </p>
        <p>
          Les fonctions signalées « Bientôt » sur la page des tarifs ne sont pas encore
          disponibles et ne sont pas facturées comme telles. Leur absence ne peut
          fonder une demande de remboursement.
        </p>
      </Article>

      <Article titre="4. Obligations de l'utilisateur">
        <p>
          L&apos;utilisateur enregistre dans le logiciel des données concernant des tiers,
          notamment ses locataires. Il en est le responsable de traitement : il lui
          appartient d&apos;informer ces personnes, de disposer d&apos;un fondement légitime
          pour conserver ces informations, et d&apos;effectuer, si nécessaire, ses propres
          formalités auprès de la Commission de protection des données personnelles.
        </p>
        <p>
          Il est interdit d&apos;utiliser le service à des fins illicites, de tenter d&apos;accéder
          aux données d&apos;une autre agence, ou d&apos;en perturber le fonctionnement.
        </p>
      </Article>

      <Article titre="5. Disponibilité">
        <p>
          {EDITEUR.service} met en œuvre les moyens raisonnables pour assurer
          l&apos;accès au service, sans garantir une disponibilité ininterrompue. Des
          interruptions peuvent survenir pour maintenance, et seront annoncées dans la
          mesure du possible.
        </p>
      </Article>

      <Article titre="6. Données et sauvegardes">
        <p>
          Les données saisies appartiennent à l&apos;utilisateur, qui peut les télécharger
          à tout moment depuis la page « Mon agence ». Des sauvegardes régulières sont
          effectuées, sans que cela dispense l&apos;utilisateur de conserver ses propres
          copies.
        </p>
        <p>
          À la fermeture d&apos;un compte, les données sont conservées douze mois puis
          supprimées, à l&apos;exception des pièces comptables soumises à une durée légale
          de conservation.
        </p>
      </Article>

      <Article titre="7. Responsabilité">
        <p>
          {EDITEUR.service} est un outil de gestion. Il n&apos;intervient pas dans la
          relation entre le bailleur et le locataire, ne se substitue pas à un conseil
          juridique ou comptable, et ne garantit pas la conformité des documents
          générés à une situation particulière. L&apos;utilisateur reste seul responsable
          des documents qu&apos;il émet et des sommes qu&apos;il encaisse.
        </p>
        <p>
          La responsabilité de l&apos;éditeur ne peut excéder le montant des sommes
          effectivement versées par l&apos;utilisateur au titre des douze derniers mois.
        </p>
      </Article>

      <Article titre="8. Résiliation">
        <p>
          L&apos;utilisateur peut fermer son compte à tout moment en écrivant à
          {" "}{EDITEUR.email}. L&apos;éditeur peut suspendre un compte en cas de
          non-paiement ou de manquement grave aux présentes conditions, après mise en
          demeure restée sans effet pendant quinze jours.
        </p>
      </Article>

      <Article titre="9. Droit applicable">
        <p>
          Les présentes conditions sont soumises au droit sénégalais. En cas de litige,
          les parties rechercheront une solution amiable avant toute action devant les
          tribunaux compétents de {EDITEUR.ville}.
        </p>
      </Article>
    </PageLegale>
  );
}
