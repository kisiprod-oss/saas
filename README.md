# Keur Gestion

**Logiciel de gestion locative pour le Sénégal** — vitrine d'annonces, tableau de bord,
locataires, contrats de bail, factures et quittances de loyer, suivi des paiements.
Tous les montants sont en francs CFA (XOF).

> *Keur* signifie « la maison » en wolof.

---

## Ce que fait l'application

| Module | À quoi ça sert |
|---|---|
| **Vitrine publique** | Vos annonces visibles par tous, avec recherche par ville, type, budget et nombre de chambres. Un formulaire permet aux visiteurs de demander une visite. |
| **Tableau de bord** | Loyers encaissés du mois, impayés, taux d'occupation, échéances à venir et graphique des 6 derniers mois. |
| **Biens** | Appartements, villas, studios, locaux commerciaux… avec photos, équipements, loyer et caution. |
| **Locataires** | Fiches complètes : identité, CNI, profession, garant, historique des factures. |
| **Contrats de bail** | Relie un bien à un locataire : loyer, charges, caution, jour d'échéance, honoraires d'agence. |
| **Factures & quittances** | Génération de toutes les factures du mois en un clic, impression au format A4 (montant en toutes lettres, NINEA, RCCM, cachet). |
| **Paiements** | Orange Money, Wave, Free Money, espèces, virement, chèque — avec la référence de transaction. |
| **Demandes** | Les demandes de visite reçues depuis la vitrine, avec appel direct et WhatsApp. |

Chaque agence a son espace : **une agence ne voit jamais les données d'une autre.**

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
| Adresse e-mail | `demo@keurgestion.sn` |
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

Dans un seul fichier : **`data/keur-gestion.db`** (base SQLite).

- Pour **sauvegarder**, copiez ce fichier sur une clé USB ou dans un cloud.
- Pour **restaurer**, remettez le fichier à sa place.
- Ce fichier n'est jamais envoyé sur Internet.

---

## Organisation du projet

```
db/schema.sql          Structure de la base (tables et colonnes)
scripts/seed.mjs       Données de démonstration sénégalaises
src/app/               Les pages du site
  page.tsx               Vitrine publique (accueil)
  biens/[id]/            Fiche publique d'une annonce
  connexion/             Connexion et inscription
  dashboard/             Espace agence (toutes les pages de gestion)
  factures/[id]/imprimer Quittance au format A4
src/lib/               Le « moteur » : base de données, calculs, actions
  db.ts                  Connexion à la base
  requetes.ts            Lectures : listes, statistiques, génération des factures
  actions.ts             Écritures : créer, modifier, supprimer
  format.ts              Affichage des montants en FCFA, dates, montants en lettres
  constantes.ts          Villes, quartiers, types de biens, modes de paiement
src/components/        Les éléments visuels réutilisés (boutons, cartes, formulaires)
```

---

## Mettre l'application en ligne

L'application fonctionne sur n'importe quel serveur qui accepte Node.js
(VPS, Render, Railway, un serveur au Sénégal…). Deux points d'attention :

1. **Le dossier `data/` doit être conservé** entre deux mises à jour, sinon vous
   perdez vos données. Sur les hébergeurs « sans disque », il faut brancher un
   disque persistant ou passer sur une base PostgreSQL.
2. Lancez `npm run build` puis `npm start`.

---

## Pour aller plus loin

Pistes naturelles pour la suite, par ordre d'utilité :

1. **Relances automatiques par SMS ou WhatsApp** des loyers en retard.
2. **Paiement en ligne** (Orange Money / Wave) directement par le locataire.
3. **Espace locataire** : consulter ses quittances et son solde.
4. **Plusieurs utilisateurs par agence**, avec des droits différents (agent / comptable).
5. **États des lieux** avec photos, à l'entrée et à la sortie.
6. **Reversement aux propriétaires** : relevé mensuel loyer − honoraires.
7. **Export comptable** (Excel/CSV) et déclarations fiscales.

Voir **[GUIDE.md](GUIDE.md)** pour le mode d'emploi au quotidien.
