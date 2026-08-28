import { EDITEUR } from "@/lib/editeur";
import { Article, PageLegale } from "@/components/page-legale";

export const metadata = { title: "Politique de confidentialité" };

export default function PageConfidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" miseAJour="août 2026">
      <Article titre="Qui traite vos données">
        <p>
          {EDITEUR.raisonSociale}, éditeur de {EDITEUR.service}, dont le siège est situé
          {" "}{EDITEUR.adresse}, {EDITEUR.ville}, {EDITEUR.pays}.
        </p>
        <p>
          Le traitement est déclaré auprès de la Commission de protection des données
          personnelles (CDP) du Sénégal, conformément à la loi n° 2008-12 du 25 janvier
          2008 : {EDITEUR.declarationCdp}.
        </p>
      </Article>

      <Article titre="Deux rôles bien distincts">
        <p>
          <strong>Pour les comptes agences</strong>, {EDITEUR.service} est responsable
          du traitement : nous décidons des données nécessaires à la création et au
          fonctionnement d&apos;un compte.
        </p>
        <p>
          <strong>Pour les données de locataires</strong> saisies par une agence,
          c&apos;est l&apos;agence qui est responsable du traitement : elle décide des
          informations qu&apos;elle enregistre et de leur usage. {EDITEUR.service}
          agit alors comme sous-traitant, et n&apos;utilise ces données que pour faire
          fonctionner le service.
        </p>
      </Article>

      <Article titre="Données collectées">
        <ul className="ml-5 list-disc space-y-1.5">
          <li><strong>Compte agence</strong> : nom de l&apos;agence, nom du titulaire, adresse e-mail, téléphone, NINEA, RCCM, adresse.</li>
          <li><strong>Locataires</strong> : prénom, nom, téléphones, adresse e-mail, numéro de pièce d&apos;identité, profession, employeur, adresse, coordonnées du garant.</li>
          <li><strong>Biens</strong> : description, adresse, photos, coordonnées du propriétaire.</li>
          <li><strong>Gestion</strong> : baux, factures, quittances, paiements et références de transaction, historique des relances.</li>
          <li><strong>Connexion</strong> : adresse e-mail et adresse IP des tentatives de connexion, conservées 24 heures pour bloquer les essais de mot de passe en rafale.</li>
        </ul>
        <p>
          Aucune donnée bancaire n&apos;est stockée : seules les références de transaction
          saisies par l&apos;agence figurent dans le logiciel.
        </p>
      </Article>

      <Article titre="À quoi servent ces données">
        <p>
          Uniquement à faire fonctionner le service : gérer les biens et les baux,
          émettre les factures et les quittances, suivre les paiements, envoyer les
          relances, et sécuriser l&apos;accès aux comptes.
        </p>
        <p>
          Vos données ne sont ni vendues, ni louées, ni utilisées à des fins
          publicitaires. Aucun outil de mesure d&apos;audience ni de traçage publicitaire
          n&apos;est installé.
        </p>
      </Article>

      <Article titre="Qui peut y accéder">
        <p>
          Chaque agence ne voit que ses propres données : les comptes sont
          techniquement cloisonnés. Aucune agence n&apos;a accès aux biens, locataires
          ou factures d&apos;une autre.
        </p>
        <p>
          En interne, l&apos;accès est limité aux personnes qui en ont besoin pour
          l&apos;assistance et la maintenance. Les données peuvent être communiquées à
          une autorité judiciaire sur réquisition légale.
        </p>
      </Article>

      <Article titre="Cookies">
        <p>
          Un seul cookie est déposé : le cookie de session, qui vous maintient connecté
          à votre espace. Il est strictement nécessaire au fonctionnement du service et
          expire au bout de trente jours. Aucun cookie publicitaire ni de mesure
          d&apos;audience n&apos;est utilisé.
        </p>
      </Article>

      <Article titre="Combien de temps sont-elles conservées">
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Données de compte : pendant toute la durée de l&apos;abonnement, puis douze mois.</li>
          <li>Documents comptables (factures, quittances, paiements) : dix ans, conformément aux obligations comptables.</li>
          <li>Traces de connexion : vingt-quatre heures.</li>
          <li>Liens de réinitialisation de mot de passe : une heure.</li>
        </ul>
      </Article>

      <Article titre="Sécurité">
        <p>
          Les mots de passe ne sont jamais stockés en clair : ils sont transformés par
          une fonction de dérivation (scrypt) avec un sel propre à chaque compte. Les
          échanges sont chiffrés en HTTPS. Le nombre de tentatives de connexion est
          limité. Les sauvegardes sont chiffrées au repos par l&apos;hébergeur.
        </p>
      </Article>

      <Article titre="Vos droits">
        <p>
          Conformément à la loi n° 2008-12, vous disposez d&apos;un droit d&apos;accès, de
          rectification, d&apos;opposition et de suppression de vos données.
        </p>
        <p>
          Une agence peut à tout moment télécharger l&apos;ensemble de ses données depuis
          la page « Mon agence ». Pour toute autre demande, écrivez à {EDITEUR.email}.
          Nous répondons sous trente jours.
        </p>
        <p>
          Un locataire qui souhaite exercer ses droits doit s&apos;adresser en priorité à
          l&apos;agence qui gère son bail, puisque c&apos;est elle qui décide des données
          enregistrées. Vous pouvez également saisir la CDP.
        </p>
      </Article>
    </PageLegale>
  );
}
