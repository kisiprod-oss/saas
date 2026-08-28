# Sen Gestion

**Logiciel de gestion locative pour le Sénégal** — vitrine d'annonces, tableau de bord,
locataires, contrats de bail, factures et quittances de loyer, suivi des paiements.
Tous les montants sont en francs CFA (XOF).

> *Sen* comme Sénégal — et « sen » veut dire « votre » en wolof.

---

## Ce que fait l'application

| Module | À quoi ça sert |
|---|---|
| **Vitrine publique** | Vos annonces visibles par tous, avec recherche par ville, type, budget et nombre de chambres. Un formulaire permet aux visiteurs de demander une visite. |
| **Tableau de bord** | Loyers encaissés du mois, impayés, taux d'occupation, échéances à venir et graphique des 6 derniers mois. |
| **Biens** | Appartements, villas, studios, locaux commerciaux… avec équipements, loyer et caution. |
| **Photos** | Envoi direct depuis l'appareil photo du téléphone. Les images sont compressées automatiquement (une photo de 5 Mo tombe à environ 200 Ko). |
| **Locataires** | Fiches complètes : identité, CNI, profession, garant, historique des factures. |
| **Contrats de bail** | Relie un bien à un locataire : loyer, charges, caution, jour d'échéance, honoraires d'agence. |
| **Factures & quittances** | Génération de toutes les factures du mois en un clic, impression au format A4 (montant en toutes lettres, NINEA, RCCM, cachet). |
| **Paiements** | Orange Money, Wave, Free Money, espèces, virement, chèque — avec la référence de transaction. |
| **Relances** | Le logiciel repère les loyers en retard, choisit le ton du message selon l'ancienneté de la dette et l'envoie sur WhatsApp ou par SMS en un clic. |
| **Espace locataire** | Chaque locataire consulte ses quittances et signale ses règlements (Orange Money, Wave…). L'agence vérifie et confirme : rien n'est compté comme réglé avant sa validation. |
| **Demandes** | Les demandes de visite reçues depuis la vitrine, avec appel direct et WhatsApp. |
| **Formules** | Page tarifs publique, limites appliquées automatiquement selon l'abonnement. |
| **Compte** | Récupération du mot de passe par e-mail, blocage après 8 essais infructueux. |
| **Sauvegarde** | Script quotidien et téléchargement de ses données depuis l'espace agence. |

Chaque agence a son espace : **une agence ne voit jamais les données d'une autre.**

---

## Tarifs

| Formule | Prix / mois | Biens | Utilisateurs | Pour qui |
|---|---|---|---|---|
| **Découverte** | Gratuit | 3 | 1 | Essayer sans risque |
| **Bailleur** | 5 000 FCFA | 10 | 2 | Propriétaires particuliers et diaspora |
| **Agence** | 20 000 FCFA | 50 | 5 | Le cœur de métier d'une agence |
| **Agence Pro** | 45 000 FCFA | illimité | illimité | Réseaux, syndics, gros portefeuilles |

Paiement à l'année : **deux mois offerts**. Sans engagement. Premier mois offert
sur les formules payantes.

**Le raisonnement.** Plusieurs concurrents ouest-africains (Logestimmo, GERILL,
SenRent) sont gratuits : la formule Découverte doit donc être plus généreuse que
la leur. Le vrai budget est ailleurs — au Sénégal, une agence prélève 7 à 9 % du
loyer, soit 20 000 à 40 000 FCFA par mois sur un loyer de 400 000 FCFA. Une
agence de 50 lots à 300 000 FCFA de loyer moyen encaisse environ 1 200 000 FCFA
de commission par mois : la formule Agence lui coûte **1,7 % de ce montant**.

La formule Bailleur vise la **diaspora sénégalaise** — des milliers de
propriétaires d'un à trois biens qui gèrent à distance, mal servis par les
solutions existantes.

Les formules sont définies dans `src/lib/tarifs.ts` : prix, limites et arguments
se modifient à un seul endroit, et la page publique comme les contrôles internes
suivent automatiquement.

> ⚠️ Le paiement en ligne n'est pas branché. Le changement de formule est
> immédiat depuis « Mon agence ». Pour encaisser réellement, il faudra
> connecter Orange Money / Wave ou un prestataire de paiement.

---

## Installation (première fois)

Il faut **Node.js version 20 ou plus**. Pour vérifier, ouvrez un terminal et tapez :

```bash
node -v
```

Si la commande affiche une erreur, installez Node.js depuis <https://nodejs.org> (choisissez la version « LTS »).

Ensuite, dans le dossier du projet, tapez ces trois commandes **une par une** :

```bash
npm install     # installe l'application (à faire une seule fois)
npm run seed    # crée la base et remplit un exemple complet
npm run dev     # démarre l'application
```

Ouvrez ensuite <http://localhost:3000> dans votre navigateur.

### Compte de démonstration

| | |
|---|---|
| Adresse e-mail | `demo@sengestion.sn` |
| Mot de passe | `demo1234` |

Vous pouvez aussi créer votre propre agence depuis **« Créer mon agence »**.

---

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Démarre l'application en mode développement (<http://localhost:3000>) |
| `npm run seed` | Remet les données de démonstration (⚠️ **efface tout le contenu existant**) |
| `npm run tester-email` | Vérifie la configuration d'envoi et expédie un message d'essai |
| `npm run sauvegarde` | Crée une sauvegarde datée dans `data/sauvegardes/` |
| `npm run reset` | Supprime complètement la base de données |
| `npm run build` | Prépare la version optimisée pour la mise en ligne |
| `npm start` | Démarre la version optimisée (après `npm run build`) |

---

## Où sont mes données ?

Dans un seul dossier : **`data/`**

| | |
|---|---|
| `data/sen-gestion.db` | La base : agences, biens, locataires, baux, factures, paiements. |
| `data/televersements/` | Les photos envoyées depuis vos téléphones. |

- Pour **sauvegarder**, copiez le dossier `data/` sur une clé USB ou dans un cloud.
- Pour **restaurer**, remettez le dossier à sa place.
- Rien n'est envoyé sur Internet.

---

## Organisation du projet

```
db/schema.sql          Structure de la base (tables et colonnes)
scripts/seed.mjs       Données de démonstration sénégalaises
src/app/               Les pages du site
  page.tsx               Vitrine publique (accueil)
  biens/[id]/            Fiche publique d'une annonce
  connexion/             Connexion et inscription
  tarifs/                Page publique des formules et des prix
  espace-locataire/      Portail du locataire : quittances et déclarations
  mot-de-passe-oublie/   Demande de réinitialisation
  reinitialiser/[token]/ Choix d'un nouveau mot de passe
  cgu/ confidentialite/ mentions-legales/   Pages légales
  dashboard/             Espace agence (toutes les pages de gestion)
  factures/[id]/imprimer Quittance au format A4
  api/photos/[fichier]   Sert les photos rangées dans data/televersements/
src/lib/               Le « moteur » : base de données, calculs, actions
  db.ts                  Connexion à la base
  requetes.ts            Lectures : listes, statistiques, génération des factures
  actions.ts             Écritures : créer, modifier, supprimer
  format.ts              Affichage des montants en FCFA, dates, montants en lettres
  constantes.ts          Villes, quartiers, types de biens, modes de paiement
  auth-locataire.ts      Connexion des locataires (par téléphone, séparée de l'agence)
  photos.ts              Réception, compression et stockage des photos
  relances.ts            Niveaux de relance et modèles de messages
  tarifs.ts              Formules d'abonnement, prix et limites
  email.ts               Envoi des e-mails de service (SMTP, ou disque si absent)
  editeur.ts             Identité de l'éditeur, reprise sur les pages légales
src/components/        Les éléments visuels réutilisés (boutons, cartes, formulaires)
```

---

## Avant de mettre en ligne

Trois choses à faire, dans cet ordre.

### 1. Compléter l'identité de l'éditeur

Ouvrez `src/lib/editeur.ts` et remplacez toutes les valeurs commençant par
`À COMPLÉTER` : raison sociale, NINEA, RCCM, adresse, contact, hébergeur.
Tant qu'il en reste une, un bandeau d'avertissement s'affiche en haut des
pages légales — impossible de l'oublier.

**Avant l'immatriculation de la société.** Le champ `statut` de
`src/lib/editeur.ts` vaut `"personne_physique"` par défaut : les pages légales
indiquent alors que le service est fourni **gratuitement** par une personne
physique, sans NINEA ni RCCM, ce qui est cohérent. Basculez-le sur `"societe"`
et renseignez NINEA et RCCM dès l'immatriculation obtenue — **avant la première
facture.**

**Déclaration CDP.** Vous stockez des numéros de pièce d'identité de
locataires. L'article 18 de la loi n° 2008-12 impose de déclarer le traitement
à la Commission de protection des données personnelles **avant** sa mise en
œuvre. Les pages `/cgu`, `/confidentialite` et `/mentions-legales` sont
rédigées, mais doivent être relues par un juriste.

### 2. Configurer l'envoi d'e-mails

**C'est le seul point qui bloque vraiment un lancement.** Sans serveur d'envoi,
l'application fonctionne, mais les e-mails sont écrits dans `data/emails/` au
lieu d'être envoyés : *personne ne peut récupérer un mot de passe oublié.*

Copiez `.env.example` en `.env.local`, remplissez les quatre variables, puis
vérifiez :

```bash
npm run tester-email                       # envoie à l'adresse SMTP_USER
npm run tester-email -- vous@exemple.sn    # envoie à l'adresse indiquée
```

La commande affiche la configuration lue, teste la connexion, envoie un message
d'essai, et **explique en français** la cause probable en cas d'échec.
L'état apparaît aussi dans l'application, page « Mon agence ».

#### Quel fournisseur choisir

| Fournisseur | Serveur | Identifiants | Remarque |
|---|---|---|---|
| **Brevo** *(recommandé)* | `smtp-relay.brevo.com` port 587 | Adresse de connexion + **clé SMTP** | 300 e-mails/jour gratuits, transactionnel inclus, interface en français |
| **Gmail / Workspace** | `smtp.gmail.com` port 587 | Adresse + **mot de passe d'application** | Validation en deux étapes obligatoire ; convient à un faible volume |
| **Votre hébergeur** | `mail.votre-domaine.sn` port 587 | Adresse complète + mot de passe de la boîte | Souvent inclus avec un nom de domaine `.sn` |

Pour les mots de passe oubliés, le volume est faible : quelques messages par
semaine. **Le plan gratuit de Brevo suffit largement pour démarrer.**

⚠️ Deux pièges classiques :

- **Ce n'est pas le mot de passe de votre compte.** Brevo demande une « clé
  SMTP », Gmail un « mot de passe d'application ». Le mot de passe habituel est
  systématiquement refusé.
- **Configurez SPF et DKIM** sur votre domaine, chez votre fournisseur. Sans
  cela, vos messages partent dans les indésirables — et un lien de
  réinitialisation qu'on ne voit pas ne sert à rien.

**Adresse du site.** Renseignez `ADRESSE_SITE` avec l'adresse réelle : le
domaine temporaire de l'hébergeur au début
(`https://xxx.hostingersite.com`), puis votre vrai domaine. Si la variable
manque, l'adresse est déduite de la requête en cours — les liens
fonctionnent, mais la fixer protège d'un en-tête `Host` falsifié.

### 3. Ne jamais lancer `npm run seed` en production

Cette commande **efface tout** pour installer le jeu de démonstration. Avec
`NODE_ENV=production`, elle refuse désormais de s'exécuter. Pour démarrer une
vraie agence, ouvrez simplement le site et créez le compte depuis
« Créer mon agence ».

### 4. Programmer la sauvegarde

Sur le serveur, ajoutez cette ligne à `crontab -e` :

```
0 2 * * * cd /chemin/vers/sen-gestion && /usr/bin/npm run sauvegarde >> data/sauvegardes.log 2>&1
```

Chaque nuit à 2 h, une archive datée est créée dans `data/sauvegardes/` avec la
base **et** les photos. Les 14 dernières sont conservées.
`SAUVEGARDES_A_CONSERVER` change ce nombre.

⚠️ Ces sauvegardes sont sur le **même disque** que les données. Copiez-les
régulièrement ailleurs — un autre serveur, un espace de stockage, une clé USB.
Une sauvegarde qui disparaît avec le serveur ne sert à rien.

---

## Mettre l'application en ligne

L'application fonctionne sur n'importe quel serveur qui accepte Node.js
(VPS, Render, Railway, un serveur au Sénégal…). Deux points d'attention :

1. **Placez le dossier de données HORS du dossier de l'application.** La plupart
   des hébergeurs (Hostinger, Render, Railway…) remplacent le dossier de
   l'application à chaque déploiement : des données rangées dedans seraient
   effacées à chaque mise à jour. Renseignez donc :

   ```
   DOSSIER_DONNEES=/home/u123456789/donnees-sen-gestion
   ```

   Base, photos et sauvegardes suivent automatiquement cet emplacement.

   **Vérifiez-le avant toute vraie donnée** : créez un compte d'essai,
   relancez un déploiement, et regardez si le compte existe encore.
2. Lancez `npm run build` puis `npm start`.

---

## Envoi réellement automatique des relances

Aujourd'hui, le logiciel fait **tout sauf le dernier clic** : il détecte les
retards, choisit le niveau du message, le rédige avec les bonnes informations
et enregistre l'envoi. L'agent appuie sur « Envoyer sur WhatsApp ».

Pour un envoi **sans aucune intervention humaine**, il faut un compte payant
chez un opérateur de messagerie (WhatsApp Business API via Twilio, Meta ou un
agrégateur local, ou une passerelle SMS sénégalaise). Le code est prêt pour
cela : il suffira d'appeler l'opérateur à l'endroit où la relance est
enregistrée (`actionEnregistrerRelance` dans `src/lib/actions.ts`), puis de
déclencher la fonction chaque matin par une tâche planifiée.

Nous avons volontairement gardé l'humain dans la boucle pour cette première
version : une relance envoyée à tort à un locataire qui vient de payer coûte
plus cher que le temps gagné.

## Pour aller plus loin

Pistes naturelles pour la suite, par ordre d'utilité :

Les trois premiers points sont annoncés « Bientôt » sur la page des tarifs :
ils doivent être livrés avant l'ouverture publique.

1. **Plusieurs utilisateurs par agence**, avec des droits différents (agent / comptable).
2. **Export comptable** (Excel/CSV).
3. **Reversement aux propriétaires** : relevé mensuel loyer − honoraires.
4. **Encaissement des abonnements** par Orange Money / Wave (PayDunya, CinetPay…).
5. **Paiement en ligne réel** depuis l'espace locataire : aujourd'hui le locataire
   *déclare* son règlement et l'agence confirme. Brancher une passerelle
   (PayDunya, CinetPay, InTouch) supprimerait cette étape de vérification.
6. **Envoi automatique** des relances via un opérateur (voir ci-dessus).
7. **États des lieux** avec photos, à l'entrée et à la sortie.

Voir **[GUIDE.md](GUIDE.md)** pour le mode d'emploi au quotidien.
