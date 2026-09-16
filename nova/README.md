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
npm run essais      # 31 essais automatisés sur la couche métier
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

## Les cinq décisions qui structurent tout

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

---

## Ce qui a été vérifié, et comment

### Essais automatisés — `npm run essais`

31 essais, tous au vert. Ils exercent le **code de production**, compilé depuis
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

### Mise en page

Aucun défilement horizontal sur **6 largeurs × 13 pages** (320, 360, 414, 768,
1024, 1440 px).

### Défauts trouvés et corrigés pendant ces vérifications

Cinq, tous réels :

1. **Panier muet** — une boutique sans retrait en magasin ne pouvait chiffrer
   aucun panier. Corrigé par un mode `estimation` dans `calculer()`.
2. **Erreur d'hydratation** — l'adresse publique était calculée différemment
   côté serveur et côté client. Corrigé par un `useAdressePublique()`.
3. **Champ de montant sans nom accessible** — inutilisable au lecteur d'écran
   quand il n'avait pas de `<label>`. Corrigé par un `aria-label`.
4. **Débordement de l'en-tête à 768 px** — navigation étendue basculée à 1024.
5. **Maquette d'accueil illisible** — le téléphone masquait les chiffres.

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

### Ce qui reste à brancher, et ce qu'il me faut de vous

| À brancher | Ce que vous devez fournir | Où ça se passe |
|---|---|---|
| **Assistant intelligent** | Une clé d'API Anthropic (console.anthropic.com) | `ANTHROPIC_API_KEY`. Sans elle, le moteur local prend le relais. |
| **Envoi d'e-mails** | Un compte chez un expéditeur (Brevo, Resend, Mailgun…) et son adresse d'API | `NOVA_SMTP_URL` + `NOVA_SMTP_CLE`. Adapter `envoyerLien()` dans `src/lib/actions-compte.ts` au format du fournisseur : ~15 lignes. |
| **PayDunya** | Un compte marchand validé, puis ses clés publique/privée/master | Chaque commerçant les saisit lui-même. De notre côté : relire la documentation officielle en vigueur, vérifier le format de notification dans `lireEvenement()`, faire une transaction réelle en bac à sable puis en production, et seulement alors passer `etat: "disponible"`. |
| **Wave / Orange Money** | Un accès API (demande auprès de l'opérateur, validation du compte marchand) | Rien n'est écrit à ce jour. À traiter pays par pays : l'API Orange diffère d'un pays à l'autre. |
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
