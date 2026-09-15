# Base de données

La base vit dans un projet **Supabase** (PostgreSQL hébergé). Elle a été
construite par migrations successives, appliquées dans cet ordre :

| Ordre | Migration | Rôle |
|---|---|---|
| 1 | `schema_initial` | Les 22 tables, les types (rôles, cycles, statuts de note…) et les index de base |
| 2 | `ajout_lien_compte_eleve` | Lien facultatif entre un dossier élève et un compte de connexion |
| 3 | `securite_rls` | Cloisonnement : RLS activé sur toutes les tables + politiques par rôle, et journal d'audit des notes |
| 4 | `durcissement_fonctions_securite` | Déplacement des fonctions de sécurité hors du schéma exposé, chemins de recherche figés |
| 5 | `optimisation_performance` | Index manquants et politiques réécrites pour éviter une réévaluation par ligne |
| 6 | `donnees_reference_senegal` | Le Sénégal et les trois formules d'abonnement |
| 7 | `jeu_demonstration_etablissement` | L'établissement fictif et ses 4 comptes de démonstration |

## Fichiers présents ici

Seules les migrations 2 et 6 sont pour l'instant reprises dans
`migrations/`. **Les cinq autres n'existent encore que dans le projet
Supabase hébergé** : elles n'ont pas pu être rapatriées depuis
l'environnement de développement utilisé, qui bloquait les connexions
sortantes vers Supabase.

À faire dès que l'accès réseau est ouvert : exporter le schéma complet, par
exemple avec la CLI Supabase :

```bash
npx supabase db dump --db-url "<chaîne de connexion du projet>" -f db/schema.sql
```

Tant que ce n'est pas fait, la seule copie complète du schéma est celle du
projet Supabase : ne supprimez pas ce projet.

## Point d'attention

`jeu_demonstration_etablissement` insère directement dans `auth.users`. C'est
acceptable pour créer un jeu de démonstration, mais ce n'est **pas** la façon
de créer de vrais comptes : passez par l'inscription de l'application ou par
l'API d'administration de Supabase, qui gèrent correctement la confirmation
d'adresse et les règles de mot de passe.
