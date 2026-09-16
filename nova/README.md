# NOVA Boutique

**Votre boutique en ligne, créée avec l'IA.**

SaaS francophone qui permet à un commerçant sans compétence technique de créer,
personnaliser, publier et gérer une boutique en ligne depuis son téléphone.
Lancement au Sénégal ; l'architecture accueille d'autres pays sans réécriture.

---

## Lancer le projet

```bash
cd nova
npm install
npm run seed        # deux boutiques de démonstration + un compte d'essai
npm run dev         # http://localhost:3100
```

Aucune variable d'environnement n'est nécessaire pour démarrer. Sans clé d'API,
l'assistant bascule sur un moteur local qui compose les pages à partir des
seules informations saisies par le commerçant — et le dit à l'écran.

Pour l'espace d'administration, posez deux variables avant de lancer :

```bash
NOVA_ADMIN_EMAIL=vous@exemple.com \
NOVA_ADMIN_MOTDEPASSE=unMotDePasseDeDouzeCaracteresMinimum \
npm run dev
```

Puis ouvrez `/administration/connexion` : le compte est créé au premier
chargement.

### Comptes créés par `npm run seed`

| Compte | Mot de passe | Ce qu'il montre |
|---|---|---|
| `chez-awa@exemple.test` | `demonstration2026` | Boutique remplie, publiée, avec commandes |
| `epicerie-teranga@exemple.test` | `demonstration2026` | Autre modèle, retrait en boutique activé |
| `essai@exemple.test` | `essai2026nova` | Boutique vide : parcourir l'assistant depuis le début |

Boutiques publiques : `/b/chez-awa` et `/b/epicerie-teranga`.

### Les autres commandes

```bash
npm run essais      # 60 essais automatisés sur la couche métier
npm run verifier    # tsc --noEmit
npm run build       # compilation de production
npm start           # serveur de production, port 3100
npm run reset       # EFFACE la base et les photos (demande confirmation)
node scripts/sauvegarde.mjs   # sauvegarde cohérente base + photos
```

---

## Le choix de la pile, et pourquoi

| Brique | Choix | Raison |
|---|---|---|
| Cadre | **Next.js 15** (App Router) | Rendu serveur par défaut : les pages de boutique arrivent en HTML, ce qui compte sur une connexion mobile lente. Les actions serveur évitent d'écrire une API séparée pour chaque formulaire. |
| Base | **SQLite** (better-sqlite3, WAL) | Une boutique de lancement représente quelques milliers de lignes. La sauvegarde est un fichier, la restauration une copie, et il n'y a pas de serveur de base à administrer. Tout l'accès passe par `src/lib/db.ts` : passer à PostgreSQL sera un changement de pilote, pas une réécriture. |
| Style | **Tailwind 4** | Les jetons de couleur vivent dans `globals.css`, en un seul endroit, avec leurs contrastes vérifiés. |
| Images | **sharp** | Les photos prises au téléphone sont réduites et converties en WebP à la réception. Le public cible paie sa connexion au mégaoctet. |
| IA | **SDK Anthropic** | Sortie JSON validée contre un schéma maison. Voir plus bas. |
| Polices | **aucune** | Une police web coûte 80 à 200 Ko avant le premier mot lisible. La pile système est instantanée et propre partout. |

**Pas de police web, pas de bibliothèque d'icônes, pas de bibliothèque de
graphiques.** Les 35 icônes sont dessinées à la main en SVG, les graphiques
sont des `div` de hauteur calculée. Résultat : **103 Ko de JavaScript partagé**
pour toute l'application.

---

## Comment c'est organisé

```
nova/
├── db/schema.sql              Le schéma, commenté ligne à ligne
├── scripts/                   seed, reset, sauvegarde
├── essais/                    Essais automatisés (node --test)
└── src/
    ├── middleware.ts          Sous-domaines → /b/<slug>
    ├── lib/                   TOUTE la logique métier
    │   ├── db.ts              Connexion unique, migrations, données de référence
    │   ├── auth.ts            Sessions marchand · exigerSession()
    │   ├── admin.ts           Sessions administrateur (table et cookie séparés)
    │   ├── requetes.ts        Toutes les lectures, filtrées par boutique_id
    │   ├── commandes.ts       Calcul des montants, stock, idempotence
    │   ├── sections.ts        LE schéma du contenu, et sa validation
    │   ├── versions.ts        Brouillon / publié / historique
    │   ├── ia.ts              L'assistant, ses garde-fous, son quota
    │   ├── import-web.ts      Lecture d'une page distante : LE code dangereux
    │   ├── import-produit.ts  D'une page ou d'une photo à une fiche proposée
    │   ├── devises.ts         Conversion des prix, parité fixe de l'euro
    │   ├── webhooks.ts        Notifications de paiement (signature, idempotence)
    │   ├── paiements.ts       État RÉEL de chaque intégration
    │   ├── offres.ts          Limites d'offre, appliquées côté serveur
    │   └── actions-*.ts       Les écritures, une par domaine
    ├── components/            Interface
    └── app/
        ├── (site public)      /, /tarifs, /aide, /demonstration, légales
        ├── creer/             Assistant en 5 étapes
        ├── tableau-de-bord/   Espace marchand (11 rubriques)
        ├── b/[slug]/          Boutiques publiques
        ├── administration/    Espace d'équipe
        └── api/               Photos, notifications de paiement
```

---

## Les six décisions qui structurent tout

### 1. Aucune requête sans `boutique_id`

Chaque fonction de `src/lib/requetes.ts` prend `boutiqueId` en premier
argument, et chaque requête porte `WHERE boutique_id = ?` — y compris quand la
jointure suffirait. Cette monotonie est voulue : une omission se voit à l'œil
nu en relisant le fichier.

L'identifiant vient **toujours** de la session (`exigerSession()`), jamais
d'une URL ni d'un formulaire. Un identifiant deviné ne donne rien : la requête
ne renvoie aucune ligne.

Les photos suivent la même règle : `donnees/photos/<boutique_id>/`, avec le nom
de fichier validé contre un motif strict et le chemin vérifié comme restant
sous le dossier de la boutique.

### 2. Le navigateur dit ce qu'il veut, jamais ce que ça coûte

Le panier du client contient des identifiants de produit et des quantités.
**Aucun prix.** Prix unitaires, suppléments de variante, frais de livraison,
sous-total et total sont relus en base dans `calculer()`. Un panier trafiqué
qui annoncerait « total : 100 » n'a aucun effet : le champ n'est pas lu.

Le stock est vérifié **et** décrémenté dans la même transaction que l'écriture
de la commande, avec un `AND stock >= ?` sur l'UPDATE. Deux clients qui
achètent le dernier article à la même seconde : un seul passe.

### 3. L'IA produit des données, pas du code

L'assistant ne renvoie jamais de HTML, de CSS ni de JavaScript. Il renvoie un
objet JSON dont la forme est fixée par `src/lib/sections.ts` : une liste de
sections, chacune d'un type connu parmi huit, avec des champs connus.

`valider()` passe avant toute écriture. Un type inconnu n'est pas « affiché
bizarrement » : il disparaît. Les chevrons sont retirés des textes.
`dangerouslySetInnerHTML` n'existe nulle part dans le dépôt.

Ce que l'assistant ne fait pas : inventer une caractéristique, une garantie,
un délai, un avis client ; toucher à un prix, à un stock, à un réglage de
paiement ; publier quoi que ce soit.

### 4. Brouillon et publié sont deux colonnes

`boutiques.brouillon` est ce que le commerçant modifie.
`boutiques.publie` est ce que le visiteur voit.
Aucune écriture du brouillon ne touche `publie` — un seul endroit du code écrit
`publie`, la fonction `publier()` de `src/lib/versions.ts`.

Un instantané immuable est posé **avant** chaque modification et **à** chaque
publication. « Annuler » et « restaurer » existent donc réellement, et la
restauration est elle-même annulable.

### 5. Une commande reçue n'est pas de l'argent reçu

Trois statuts séparés, jamais un seul : `statut` (traitement),
`statut_livraison` (le colis), `statut_paiement` (l'argent).

`montant_encaisse` ne bouge que sur un geste explicite du commerçant ou sur une
notification de prestataire dont la **signature a été vérifiée**. Le tableau de
bord additionne `montant_encaisse`, jamais `total`. Ouvrir WhatsApp est compté
dans une table à part (`demandes_whatsapp`) : ce n'est ni un message envoyé,
ni une vente.

### 6. Ce qui revient du web n'est jamais cru sur parole

Un lien de fiche — AliExpress, Alibaba, Amazon, eBay, n'importe quel
fournisseur — ou une photo suffit à préparer un produit. Deux chemins, un seul
principe : **le serveur va chercher, puis propose ; le commerçant relit et
décide.**

**Le lien est l'entrée la plus dangereuse du produit** : quelqu'un dicte au
serveur une adresse à appeler. Quatre verrous, dans `src/lib/import-web.ts` :

1. `http` et `https` uniquement — `file:`, `gopher:`, `data:` sont refusés
   avant tout appel réseau.
2. **Nous résolvons le nom nous-mêmes** et refusons si *l'une* des adresses
   renvoyées est interne : boucle locale, réseaux privés, CGNAT, lien-local
   (`169.254.169.254`, l'adresse des métadonnées d'hébergeur), IPv4
   encapsulée en IPv6, plages réservées. Un nom qui pointe vers l'intérieur ne
   passe pas, quel que soit le nom.
3. Les redirections sont suivies **à la main**, quatre au maximum, et chaque
   saut repasse le contrôle complet. Une page qui redirige vers un réseau
   interne échoue au deuxième tour.
4. Plafonds de taille et de durée, aucun cookie, aucun en-tête
   d'authentification, agent identifié, et un type de contenu qui doit être du
   HTML.

**On ne lit que ce que la page publie pour être partagée** : les données
structurées `schema.org`, les balises Open Graph, le titre. Rien n'est
contourné. Quand un site refuse la lecture automatique — les grandes places de
marché le font souvent — l'écran le dit et propose la photo.

Ce qui revient est **une proposition**, jamais une écriture. Elle est
enregistrée dans `imports_produit`, affichée dans un formulaire, et rien
n'entre au catalogue avant l'envoi du commerçant. L'adresse de l'image n'est
**pas** renvoyée par le navigateur : le formulaire envoie un numéro, et le
serveur relit l'adresse dans la ligne d'import. Une adresse d'image glissée
par un tiers n'a donc rien à contourner.

**Le prix reste au commerçant.** Un prix trouvé chez un fournisseur est un
prix d'achat : il ne couvre ni le transport, ni la douane, ni la marge. Nous le
montrons tel quel, converti quand c'est possible, avec une proposition de prix
de vente arrondie — et un champ vide plutôt qu'un montant inventé quand le
taux manque. La parité euro / franc CFA est une **parité de droit**
(1 € = 655,957 FCFA) ; toutes les autres devises utilisent le taux que le
commerçant a lui-même saisi, celui de ses factures.

**Les photos appartiennent au vendeur d'origine.** Reprendre celle d'une fiche
demande une confirmation explicite, enregistrée avec sa date
(`droits_confirmes_le`). Sans photo, le produit est créé **retiré de la vente**
— il n'y a pas de fiche présentable sans image.

**L'assistant réécrit, il ne recopie pas et n'invente pas.** La description est
composée à partir des seules caractéristiques relevées. Il lui est interdit de
déduire une taille, une contenance, un poids ou une composition, et de citer le
fournisseur. Le nom du site n'est jamais pris pour une marque, et il est retiré
du nom du produit : la boutique du commerçant est la sienne.

---

## Ce qui a été vérifié, et comment

### Essais automatisés — `npm run essais`

60 essais, tous au vert. Ils exercent le **code de production**, compilé depuis
`src/lib` : un essai qui réimplémente ce qu'il vérifie ne vérifie rien.

| Ce qui est vérifié | Comment |
|---|---|
| Isolation entre commerçants | Lecture croisée de produits, commandes, lignes, clients, chiffres du tableau de bord ; achat d'un produit d'une autre boutique ; zone de livraison d'une autre boutique ; chemins de photos hostiles (`../../etc/passwd`, etc.) |
| Parcours création → publication → commande | Brouillon invisible du public, publication, modification du brouillon qui ne fuit pas, commande, montants, normalisation du numéro |
| Montants et stocks | Course sur le dernier article, annulation qui ne recrédite qu'une fois, stock d'un produit à variantes, fusion de deux lignes du même article, distinction encaissé / dû |
| Notification de paiement rejouée | Trois rejeux du même événement : aucun second encaissement, un seul mouvement de caisse ; notification annonçant dix fois le total : plafonnée ; signature invalide, corps modifié, préfixe `sha256=` |
| Échec IA récupérable | Un échec n'est pas décompté ; une génération interrompue est débloquée après trois minutes et redevient relançable ; quota épuisé refusé avec son message |
| Restauration de version | Remet le contenu sans rien publier, reste elle-même annulable, refuse une version vide ; dépublier conserve le contenu |
| Limites d'offre | Découverte interdit la publication ; une formule échue retombe sur Découverte ; la limite de produits est par boutique |
| Divers | Normalisation des numéros sénégalais (7 formes), chiffrement/déchiffrement, corps chiffré altéré rejeté, boutique suspendue retirée du web |
| Filtre d'adresses de l'import | Chaque plage interne nommément (boucle locale, privées, CGNAT, lien-local, réservées, multicast), IPv4 encapsulée en IPv6, schémas refusés, nom de domaine qui résout vers l'intérieur, redirection vers l'intérieur |
| Lecture d'une fiche distante | Pages enregistrées : `schema.org` en JSON-LD, `@graph`, bloc JSON cassé qui n'emporte pas les autres, Open Graph, microdonnées, titre seul, page vide ; apostrophe et chevron dans une valeur d'attribut ; nom du site retiré du nom, et nom légitime préservé |
| Prix et conversion | Formats français (1.299,90) et anglais (1,299.90), symboles, `AggregateOffer`, prix négatif refusé, parité fixe de l'euro, taux manquant annoncé, taux du commerçant, arrondi du prix de vente par paliers |

### Parcours complet dans un vrai navigateur

27 étapes vérifiées sur un téléphone simulé (390 × 844), de l'inscription à la
commande :

inscription → déconnexion/reconnexion (la progression est retrouvée) →
5 étapes de l'assistant → génération de la page → aperçu →
**la formule Découverte refuse la publication et l'explique** →
l'administration accorde une formule → publication → zone de livraison →
*(session client séparée)* boutique publique → panier → commande →
confirmation → rechargement sans doublon → **« À régler à la réception »** →
retour marchand : commande visible, encaissement séparé, stock décrémenté 4→3 →
administration : suivi de la boutique → **zéro erreur JavaScript**.

### Parcours d'import dans un vrai navigateur

22 étapes, sur le même téléphone simulé :

le bouton « Importer » depuis le catalogue → les trois chemins →
**une adresse de métadonnées d'hébergeur (`169.254.169.254`) est refusée** →
**`localhost` est refusé par la résolution du nom**, pas par une liste de noms
interdits → un site qui refuse la lecture automatique donne un message
utilisable → les limites des places de marché et la question des droits sur les
photos sont annoncées avant la saisie → taux de change et marge enregistrés →
la parité fixe de l'euro est expliquée et non demandée →
**une page réellement distante est lue** et produit une fiche →
aucun prix inventé quand la page n'en porte pas →
**la fiche refuse de partir sans la confirmation des droits sur la photo** →
produit créé, présent au catalogue, photo du fournisseur téléchargée,
ré-encodée et rangée dans le dossier de la boutique → import tracé →
une fiche abandonnée est notée « Abandonné » **côté serveur** →
zéro erreur JavaScript, zéro erreur de console.

#### Ce que cet environnement n'a pas permis de vérifier

**Les places de marché elles-mêmes sont injoignables depuis ce bac à sable** :
la sortie réseau est filtrée et répond `403` pour tout hôte non autorisé,
`fr.aliexpress.com`, `amazon.fr` et `ebay.com` compris. Deux conséquences,
dites sans détour :

- L'analyseur est éprouvé sur des **pages enregistrées** qui reproduisent les
  structures réelles. C'est la bonne façon de tester un analyseur, mais ce
  n'est pas une preuve que telle fiche AliExpress d'aujourd'hui sera lue.
- Le chemin réseau, lui, **a bien été exercé en vrai** sur les hôtes que ce bac
  à sable autorise (`pypi.org`, `jsr.io`) : résolution de nom, contrôle
  d'adresse, requête HTTP, redirections, lecture des balises, téléchargement de
  l'image et ré-encodage. C'est la même mécanique, sur d'autres hôtes.

À refaire sur un serveur à la sortie réseau ouverte, avec une dizaine de liens
réels de chaque site, avant d'annoncer l'import comme fiable au public.

### Mise en page

Aucun défilement horizontal sur **6 largeurs × 13 pages** (320, 360, 414, 768,
1024, 1440 px).

### Défauts trouvés et corrigés pendant ces vérifications

Quatorze, tous réels. Les essais et les parcours ne sont pas là pour décorer.

Sur le cœur du produit :

1. **Panier muet** — une boutique sans retrait en magasin ne pouvait chiffrer
   aucun panier. Corrigé par un mode `estimation` dans `calculer()`.
2. **Erreur d'hydratation** — l'adresse publique était calculée différemment
   côté serveur et côté client. Corrigé par un `useAdressePublique()`.
3. **Champ de montant sans nom accessible** — inutilisable au lecteur d'écran
   quand il n'avait pas de `<label>`. Corrigé par un `aria-label`.
4. **Débordement de l'en-tête à 768 px** — navigation étendue basculée à 1024.
5. **Maquette d'accueil illisible** — le téléphone masquait les chiffres.

Sur l'import, découverts par les essais :

6. **Photos perdues** — un `image` JSON-LD donné comme tableau de chaînes
   n'était pas lu : les fiches arrivaient sans aucune photo.
7. **Prix négatif accepté** — `"-19.99"` était lu `19,99`. Refusé désormais.
8. **Taux de change absurdes** — un tableau JSON dans le champ des taux
   donnait des taux indexés par « 0 », « 1 », « 2 ».
9. **Arrondi trop cher** — `200 000 × 1,10` vaut `220 000,00000000003` en
   virgule flottante, ce qui faisait franchir un palier et vendre 1 000 F de
   trop. Le calcul est passé en entiers.
10. **Un nom sur deux tronqué** — la valeur d'un attribut entre guillemets
    doubles était coupée au premier apostrophe : « Huile d'arachide » devenait
    « Huile d ». En français, c'est un nom sur deux. Le guillemet ouvrant est
    maintenant capturé, et c'est lui qui doit refermer.
11. **Le nom du site pris pour une marque** — `og:site_name` alimentait le
    champ « marque », la fiche annonçait « Marque : AliExpress », et
    l'assistant le reprenait dans la description. C'est une caractéristique
    produit inventée : exactement ce qu'on s'interdit.
12. **Le fournisseur dans le nom du produit** — « Robe wax | AliExpress »
    entrait tel quel au catalogue. Le nom du site est retiré, mais seulement
    quand c'est bien lui : « Foulard en wax - 180 cm » garde sa taille.

Sur l'import, découverts dans le navigateur :

13. **Abandon jamais enregistré** — le bouton portait un `formAction` avec
    `type="button"` : React l'ignorait en silence. La fiche disparaissait de
    l'écran mais restait « Proposé » dans l'historique. C'est un avertissement
    de console qui a mis ce défaut au jour.
14. **Historique illisible sur téléphone** — coincée entre deux pastilles et
    une date, l'adresse d'origine se réduisait à « h. » et ne disait donc plus
    d'où venait le produit. Elle a désormais sa propre ligne.

---

## L'état honnête du produit

### Ce qui fonctionne, vérifié de bout en bout

- Inscription, connexion, récupération de mot de passe, changement de mot de
  passe, isolation des données
- Assistant en 5 étapes avec progression sauvegardée en base
- Trois modèles de boutique (Épuré, Élégant, Coloré), couleur au choix, logo
- Catalogue : produits, catégories, variantes simples, photos (réduites,
  converties, orientées), stock avec seuil d'alerte
- Éditeur de page : 8 types de section, réordonnancement, aperçu avec le
  composant de la boutique publique, historique et restauration
- Publication et dépublication, brouillon étanche
- Boutique publique : accueil, catalogue, catégories, fiches produits, panier,
  commande sans compte, suivi par référence + téléphone, page de conditions
- Commande : calcul serveur, contrôle et décrément du stock, idempotence,
  paiement à la livraison, retrait en boutique, zones de livraison tarifées
- Tableau de bord : commandes (recherche, filtres, export CSV), encaissement
  explicite et annulable, clients, statistiques sur données réelles,
  livraison, abonnement avec historique de consommation IA, paramètres
- Assistant IA : structure de page, descriptions, couleurs, demandes en
  français ; aperçu avant application ; quota juste
- Import d'un produit depuis un lien ou une photo : lecture de la page,
  fiche proposée et relue, conversion du prix, confirmation des droits sur la
  photo, image du fournisseur téléchargée et ré-encodée, traçabilité complète
  dans `imports_produit` — avec les réserves de la section suivante
- Administration : vue d'ensemble, boutiques, suspension motivée et journalisée,
  offres modifiables, abonnements, intégrations, assistance, incidents, journal
- Notifications de paiement : signature HMAC vérifiée, idempotence garantie par
  la base, simulateur pour éprouver le circuit

### Ce qui est en mode test, et le dit

- **Paiement en ligne.** L'ossature est complète et éprouvée : réception,
  vérification de signature, idempotence, plafonnement du montant. Mais
  **aucune intégration n'a fait de transaction réelle**. `src/lib/paiements.ts`
  déclare l'état de chacune, et le serveur **refuse** le passage en mode réel
  pour tout ce qui n'est pas marqué `disponible`. Un commerçant en mode test ne
  voit pas le paiement en ligne proposé à ses clients.
- **Facturation des abonnements.** Demander une formule payante enregistre une
  demande ; l'équipe l'active à réception du règlement depuis
  `/administration/abonnements`. Aucun prélèvement automatique.
- **Import depuis un lien.** Le chemin réseau et l'analyseur fonctionnent, mais
  **aucune fiche AliExpress, Alibaba, Amazon ou eBay réelle n'a pu être lue
  depuis cet environnement** (sortie réseau filtrée). Ces sites bloquent par
  ailleurs souvent la lecture automatique : c'est annoncé à l'écran avant la
  saisie, et nous ne cherchons pas à contourner leur protection. Tant que la
  vérification sur serveur ouvert n'est pas faite, considérez ce chemin comme
  « au mieux » et la photo comme le chemin sûr.
- **Import depuis une photo.** Il demande la clé d'API de l'assistant. Sans
  elle, l'onglet reste visible mais explique le prérequis manquant et renvoie
  vers le lien ou la saisie à la main — il ne fait jamais semblant.

### Ce qui reste à brancher, et ce qu'il me faut de vous

| À brancher | Ce que vous devez fournir | Où ça se passe |
|---|---|---|
| **Assistant intelligent** | Une clé d'API Anthropic (console.anthropic.com) | `ANTHROPIC_API_KEY`. Sans elle, le moteur local prend le relais. |
| **Envoi d'e-mails** | Un compte chez un expéditeur (Brevo, Resend, Mailgun…) et son adresse d'API | `NOVA_SMTP_URL` + `NOVA_SMTP_CLE`. Adapter `envoyerLien()` dans `src/lib/actions-compte.ts` au format du fournisseur : ~15 lignes. |
| **PayDunya** | Un compte marchand validé, puis ses clés publique/privée/master | Chaque commerçant les saisit lui-même. De notre côté : relire la documentation officielle en vigueur, vérifier le format de notification dans `lireEvenement()`, faire une transaction réelle en bac à sable puis en production, et seulement alors passer `etat: "disponible"`. |
| **Wave / Orange Money** | Un accès API (demande auprès de l'opérateur, validation du compte marchand) | Rien n'est écrit à ce jour. À traiter pays par pays : l'API Orange diffère d'un pays à l'autre. |
| **Import fiable depuis les places de marché** | Un compte développeur (et sa validation) chez chaque place de marché dont vous voulez importer, ou un compte chez un service d'extraction | Ces sites publient des API pour leurs revendeurs et partenaires ; l'accès demande une inscription et une validation. **Je n'ai pas pu consulter leur documentation depuis cet environnement** : à vérifier avant de choisir, comme pour le Mobile Money. La lecture publique actuelle reste utile et gratuite, mais dépend du bon vouloir de chaque site. L'endroit à modifier est unique : `recuperer()` dans `src/lib/import-web.ts`. |
| **Sous-domaines** | Un enregistrement DNS générique `*.nova.shop` vers le serveur, et un certificat générique | `src/middleware.ts` réécrit déjà `<slug>.nova.shop` vers `/b/<slug>`. |
| **Domaines personnalisés** | Selon l'hébergeur : API de certificats, ou intervention manuelle | La preuve de propriété par enregistrement TXT est écrite et vérifiée par DNS-over-HTTPS. L'émission du certificat HTTPS ne l'est pas, et l'interface le dit au commerçant. |
| **Textes juridiques** | Raison sociale, RCCM, NINEA, adresse, e-mail de contact ; une relecture par un juriste | `/conditions` et `/confidentialite` : les mentions à compléter sont entre crochets, et un bandeau le signale. |
| **Photographies** | Des photos de vraies boutiques partenaires, avec leur autorisation | Les illustrations actuelles sont des dessins SVG originaux (`src/components/illustrations.tsx`). Nous n'avons pas publié de photos de commerçants que nous n'avons pas rencontrés. |

### Ce qui n'est délibérément pas fait

- **Services et produits numériques.** La colonne `produits.type` existe, aucune
  interface ne les propose. Ils ne seront pas affichés avant de fonctionner.
- **Notifications automatiques de commande** (SMS, e-mail, push). Le commerçant
  voit ses commandes en ouvrant l'application ; la FAQ le dit sans détour.
- **Variantes croisées** (taille × couleur × matière). Un seul axe : six tailles
  et quatre couleurs font vingt-quatre quantités à tenir à jour sur un
  téléphone. Un commerçant qui en a besoin crée deux produits.
- **Content-Security-Policy.** C'est la protection la plus utile qui manque.
  Elle demande une passe dédiée avec un `nonce` par requête, pas une ligne
  ajoutée à la va-vite dans `next.config.ts`.
- **Strict-Transport-Security.** À poser une fois le HTTPS confirmé stable :
  l'en-tête est irréversible côté navigateur pendant la durée annoncée.

---

## Sécurité — ce qui est en place

| Protection | Où |
|---|---|
| Mots de passe | scrypt + sel aléatoire, comparaison à temps constant |
| Sessions | Jeton de 32 octets, cookie `httpOnly` + `sameSite`, 30 jours ; l'administration : `sameSite: strict`, 8 heures |
| Récupération de compte | Jeton **haché** en base, valable 2 h, usage unique, ferme toutes les sessions |
| Limitation de débit | Connexion (8/15 min par IP+adresse), inscription (5/h), commande (10/h), IA, notifications, suivi — compteurs **en base**, donc valables derrière un répartiteur |
| Secrets des commerçants | AES-256-GCM, jamais renvoyés au navigateur, affichés masqués |
| Notifications de paiement | HMAC-SHA256 vérifié à temps constant, idempotence par contrainte UNIQUE, montant plafonné |
| Téléversements | Décodés par sharp et **ré-encodés** ; le type déclaré n'est jamais cru ; métadonnées EXIF (dont GPS) supprimées ; type de réponse figé à `image/webp` |
| Appels sortants (SSRF) | Schémas `http`/`https` seuls ; nom résolu par nous et **toutes** les adresses renvoyées contrôlées ; plages internes refusées y compris `169.254.169.254` et l'IPv4 encapsulée en IPv6 ; 4 redirections au plus, chacune recontrôlée ; plafonds de taille et de durée ; aucun cookie ni en-tête d'authentification |
| Injection SQL | Requêtes préparées partout, sans exception |
| XSS | Aucun `dangerouslySetInnerHTML` ; chevrons retirés à l'entrée ; contenu IA validé contre un schéma fermé |
| Suspension | Ferme les sessions ouvertes immédiatement, avec motif obligatoire (10 caractères minimum) et journalisation |
| Indexation | `/tableau-de-bord`, `/administration`, `/creer`, `/api/` fermés dans `robots.txt` |
| En-têtes | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |

---

## Ajouter un pays

Insérer une ligne dans `pays` (devise, libellé, décimales, indicatif, longueur
des numéros, villes, moyens de paiement) et la passer `actif = 1`. Sept pays
voisins sont déjà préparés, volontairement inactifs : les activer demande
d'avoir vérifié sur place les moyens de paiement et la livraison.

Aucun code à modifier : les montants passent par `paysDe()`, les numéros par
`canonique()` avec l'indicatif du pays, les villes alimentent les listes de
saisie.

---

## Sauvegarde et restauration

```bash
node scripts/sauvegarde.mjs              # → sauvegardes/<horodatage>/
node scripts/sauvegarde.mjs /mnt/backup  # ailleurs
```

La base est copiée par l'API `backup()` de SQLite, pas par `cp` : une copie
brute pendant une écriture donne un fichier corrompu, et le journal WAL laisse
des transactions dehors. Les photos sont copiées à côté — sans elles, la
restauration rend des boutiques aux images manquantes.

Pour restaurer : arrêter le service, remplacer le contenu du dossier de
données, redémarrer.

---

## Visuels

Les illustrations de `src/components/illustrations.tsx` sont des dessins
vectoriels originaux : une devanture avec son auvent, une pile de pagnes, une
livraison à deux-roues. Quelques kilo-octets, nets partout, et aucune question
de droits.

La maquette de la page d'accueil (`src/components/apercu-produit.tsx`) n'est pas
une capture retouchée : c'est le vrai gabarit du tableau de bord, rendu en HTML
avec les mêmes couleurs. Le jour où le tableau de bord change, elle jure et on
la met à jour — là où un PNG reste faux pendant des mois.
