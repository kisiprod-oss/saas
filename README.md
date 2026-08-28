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
| **Demandes** | Les demandes de visite reçues depuis la vitrine, avec appel direct et WhatsApp. |
| **Formules** | Page tarifs publique, limites appliquées automatiquement selon l'abonnement. |

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
  dashboard/             Espace agence (toutes les pages de gestion)
  factures/[id]/imprimer Quittance au format A4
  api/photos/[fichier]   Sert les photos rangées dans data/televersements/
src/lib/               Le « moteur » : base de données, calculs, actions
  db.ts                  Connexion à la base
  requetes.ts            Lectures : listes, statistiques, génération des factures
  actions.ts             Écritures : créer, modifier, supprimer
  format.ts              Affichage des montants en FCFA, dates, montants en lettres
  constantes.ts          Villes, quartiers, types de biens, modes de paiement
  photos.ts              Réception, compression et stockage des photos
  relances.ts            Niveaux de relance et modèles de messages
  tarifs.ts              Formules d'abonnement, prix et limites
src/components/        Les éléments visuels réutilisés (boutons, cartes, formulaires)
```

---

## Mettre l'application en ligne

L'application fonctionne sur n'importe quel serveur qui accepte Node.js
(VPS, Render, Railway, un serveur au Sénégal…). Deux points d'attention :

1. **Le dossier `data/` doit être conservé** entre deux mises à jour, sinon vous
   perdez vos données **et vos photos**. Sur les hébergeurs « sans disque », il
   faut brancher un disque persistant, ou passer sur une base PostgreSQL avec
   un stockage de fichiers séparé.
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

1. **Reversement aux propriétaires** : relevé mensuel loyer − honoraires.
2. **Paiement en ligne** (Orange Money / Wave) directement par le locataire.
3. **Envoi automatique** des relances via un opérateur (voir ci-dessus).
4. **Espace locataire** : consulter ses quittances et son solde.
5. **Plusieurs utilisateurs par agence**, avec des droits différents (agent / comptable).
6. **États des lieux** avec photos, à l'entrée et à la sortie.
7. **Export comptable** (Excel/CSV) et déclarations fiscales.

Voir **[GUIDE.md](GUIDE.md)** pour le mode d'emploi au quotidien.
