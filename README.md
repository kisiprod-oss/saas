# SamaÉcole

**Plateforme de gestion scolaire multiétablissement**, conçue d'abord pour le
Sénégal puis extensible à l'Afrique francophone : scolarité, devoirs, notes,
absences, bulletins et communication école-famille.

> Projet en développement. Ce document dit ce qui fonctionne réellement, ce qui
> reste à faire, et ce qui dépend d'une configuration extérieure. Rien n'y est
> présenté comme terminé tant que ça n'a pas été vérifié.

---

## 1. Où en est le projet

### Ce qui est construit et vérifié

| Élément | État | Comment ça a été vérifié |
|---|---|---|
| Base de données (22 tables) | ✅ en place | Schéma inspecté table par table sur le projet Supabase |
| Cloisonnement par établissement (RLS) | ✅ en place | Politiques appliquées sur les 22 tables ; 0 alerte au contrôle de sécurité Supabase |
| Journal des modifications de notes | ✅ en place | Déclencheur SQL actif sur la table `notes` |
| Jeu de données de démonstration | ✅ en place | Lignes comptées en base après insertion |
| Compilation de l'application | ✅ sans erreur | `npm run build` passe, TypeScript inclus |
| Page d'accueil et page de connexion | ✅ affichées | Ouvertes dans un vrai navigateur |

### Ce qui est écrit mais **pas encore vérifié**

Les quatre espaces connectés (direction, enseignant, parent, élève) sont codés
et compilent, mais ils n'ont **pas encore pu être ouverts contre la vraie base
de données**, pour une raison d'environnement et non de code : le conteneur de
développement utilisé bloquait les appels sortants vers `*.supabase.co`.

Tant que cette vérification n'a pas été faite, ces écrans sont considérés comme
**non terminés**.

### Ce qui reste à construire

- Inscription d'un élève et rattachement d'un parent depuis l'écran Direction
- Invitation d'un enseignant par email
- Bulletin PDF
- Import CSV des élèves, saisie des absences, rédaction des annonces
- Annuaire professionnel (écoles ↔ éducateurs) et candidatures
- Abonnements et paiements

---

## 2. Les comptes de démonstration

L'établissement de démonstration s'appelle **Groupe Scolaire Étoile du Sahel
(démonstration)**. Il est marqué comme fictif en base (`demo = true`) et
affiche un badge « Démo » dans l'application.

| Rôle | Email | Mot de passe |
|---|---|---|
| Direction | `direction@demo.samaecole.sn` | `SamaEcoleDemo2026!` |
| Enseignant | `enseignant@demo.samaecole.sn` | `SamaEcoleDemo2026!` |
| Parent | `parent@demo.samaecole.sn` | `SamaEcoleDemo2026!` |
| Élève | `eleve@demo.samaecole.sn` | `SamaEcoleDemo2026!` |

⚠️ Ces comptes servent uniquement à la démonstration. **Supprimez-les avant
toute mise en service réelle**, et ne réutilisez jamais ce mot de passe.

Ce que contient la démonstration : une classe CM2 A, deux élèves, un devoir de
mathématiques, trois évaluations (dont **une volontairement non publiée**, pour
vérifier qu'elle reste invisible à la famille), des notes incluant un cas
« absent », un retard et deux annonces.

---

## 3. Lancer l'application sur votre ordinateur

**Il faut d'abord installer Node.js version 20 ou plus** (https://nodejs.org).

```bash
# 1. Récupérer le code
git clone <adresse-du-dépôt> sama-ecole
cd sama-ecole

# 2. Installer les dépendances (une seule fois)
npm install

# 3. Créer le fichier de configuration
cp .env.example .env.local
```

Ouvrez `.env.local` et renseignez les deux lignes :

```
NEXT_PUBLIC_SUPABASE_URL=https://<identifiant-du-projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé publiable du projet>
```

Ces deux valeurs se trouvent dans le tableau de bord Supabase, dans les
réglages d'API du projet. La clé publiable est **conçue pour être visible côté
navigateur** : ce n'est pas un secret, et ce n'est pas elle qui protège les
données — c'est le cloisonnement RLS décrit plus bas. En revanche, la clé
`service_role` du même écran ne doit **jamais** être mise dans ce fichier ni
dans le code.

```bash
# 4. Démarrer
npm run dev
```

L'application est alors sur http://localhost:3000.

---

## 4. Mettre en ligne (déploiement)

Le plus simple est Vercel, qui héberge gratuitement ce type d'application :

1. Poussez le code sur GitHub.
2. Sur vercel.com, « Add New… → Project », choisissez le dépôt.
3. Dans les réglages du projet, ajoutez les deux mêmes variables
   d'environnement : `NEXT_PUBLIC_SUPABASE_URL` et
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Déployez. Vercel redéploie ensuite à chaque envoi de code.

Aucune autre configuration serveur n'est nécessaire : la base de données et
l'authentification sont gérées par Supabase.

---

## 5. Réglages à faire dans Supabase

À faire une fois, dans le tableau de bord du projet :

- **Authentication → protection des mots de passe compromis** : à activer.
  Supabase vérifie alors que le mot de passe choisi n'a pas fuité ailleurs.
  *(Non activé à ce jour.)*
- **Authentication → URL du site** : mettre l'adresse de production une fois le
  déploiement fait, sinon les liens envoyés par email pointeront au mauvais
  endroit.
- **Sauvegardes** : vérifier la fréquence des sauvegardes automatiques offerte
  par votre formule Supabase, et tester une restauration avant la mise en
  service réelle.

---

## 6. Services extérieurs : ce qui n'est **pas** branché

Aucun envoi réel n'est possible aujourd'hui, et l'application ne fait semblant
de rien :

| Service | État |
|---|---|
| Email (notifications, invitations) | ❌ non configuré |
| SMS | ❌ non configuré |
| WhatsApp | ❌ non configuré |
| Paiement (abonnements, frais de scolarité) | ❌ non configuré — aucun encaissement possible |

Les tarifs des trois formules (Essentiel, Établissement, Groupe scolaire) sont
enregistrés en base comme **provisoires** et doivent être validés
commercialement avant d'être annoncés à un client.

---

## 7. Comment les données sont protégées

Le cloisonnement n'est pas fait dans les écrans, il est fait **dans la base de
données** (Row Level Security PostgreSQL). Concrètement : même si quelqu'un
contournait l'interface et interrogeait directement l'API, il ne verrait que ce
que son rôle autorise.

Règles appliquées :

- Un établissement ne voit jamais les données d'un autre.
- Un parent ne voit que les enfants qui lui sont rattachés **et dont le
  rattachement a été vérifié** par la direction.
- Un enseignant n'agit que sur les classes et matières qui lui sont attribuées.
- Une note dont l'évaluation n'est pas publiée reste invisible aux familles.
- Les familles ne peuvent jamais modifier une note, même celle de leur enfant.
- Les absences et les notes se consultent élève par élève : la famille d'un
  enfant ne voit rien des autres enfants de la classe.
- Toute création, modification ou suppression de note est enregistrée dans un
  journal avec l'état avant et après.

Sur les évaluations, le circuit est volontairement en deux temps : l'enseignant
**saisit** les notes, puis la publication à la famille est une **action
séparée** depuis l'espace Direction. Une note manquante n'est jamais
transformée en zéro : le statut distingue explicitement *noté*, *absent*,
*dispensé* et *pas encore noté*.

---

## 8. Points juridiques à faire vérifier

Ces données concernent des mineurs. Avant toute mise en service réelle au
Sénégal, faites vérifier par un juriste compétent : les obligations de la
Commission de protection des données personnelles (CDP), les formalités
éventuelles de déclaration, les règles applicables aux données d'enfants, le
lieu d'hébergement des données et les transferts hors du pays, ainsi que les
durées de conservation et les modalités de suppression.

**Aucune conformité légale n'est revendiquée à ce stade.**

---

## 9. Organisation du code

```
src/
  app/
    page.tsx                  page d'accueil publique
    connexion/                connexion par email et mot de passe
    tableau-de-bord/          aiguillage vers le bon espace selon le rôle
    direction/[id]/           espace direction
    enseignant/[id]/          espace enseignant (devoirs, évaluations, notes)
    parent/[id]/              espace parent (sélection de l'enfant)
    eleve/[id]/               espace élève
  components/                 éléments partagés entre les espaces
  lib/
    auth.ts                   session, rôles et garde d'accès
    supabase/                 connexion à la base (navigateur et serveur)
  types/database.ts           types générés depuis le schéma réel
```

Les libellés, les noms de fichiers et les noms de colonnes sont en français,
volontairement : l'équipe qui reprendra ce code travaille en français.
