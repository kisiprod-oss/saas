# Guide d'utilisation — Keur Gestion

Ce guide explique comment utiliser l'application au quotidien.
Aucune connaissance technique n'est nécessaire.

---

## 1. Se connecter

Ouvrez <http://localhost:3000>, cliquez sur **« Espace agence »** en haut à droite,
puis saisissez votre e-mail et votre mot de passe.

Pour tester : `demo@keurgestion.sn` / `demo1234`

---

## 2. Renseigner votre agence (à faire en premier)

Menu **« Mon agence »**.

Remplissez le nom, l'adresse, le téléphone, le **NINEA** et le **RCCM**.
Ces informations s'impriment automatiquement en haut de chaque facture et de
chaque quittance : c'est ce qui donne un document officiel.

Le champ **« Honoraires de gestion »** (souvent 5 % à 10 % au Sénégal) sera
proposé par défaut sur chaque nouveau bail.

---

## 3. Ajouter un bien

Menu **« Biens »** → bouton **« Ajouter un bien »**.

Points importants :

- **Titre** : c'est ce que verront les gens sur la vitrine.
  Soyez précis : *« Appartement 3 chambres meublé aux Almadies »*.
- **Loyer** : tapez uniquement les chiffres, sans espace ni « FCFA ».
  Écrivez `450000`, pas `450 000 FCFA`.
- **Caution** : indiquez le **nombre de mois** (2 = deux mois de loyer).
- **Photos** : collez une adresse web d'image par ligne. Sans photo, une
  illustration est affichée automatiquement.
- **« Publier sur la vitrine publique »** : décochez si le bien ne doit pas
  apparaître dans les annonces.

Le bien reçoit automatiquement une référence : `BIEN-0001`, `BIEN-0002`…

---

## 4. Ajouter un locataire

Menu **« Locataires »** → **« Ajouter un locataire »**.

Le prénom, le nom et le téléphone sont obligatoires. Pensez à renseigner
le **numéro de CNI** et le **garant** : ce sont les informations que l'on
cherche toujours en cas de litige.

---

## 5. Créer le contrat de bail

Menu **« Contrats de bail »** → **« Nouveau bail »**.

Vous choisissez un bien et un locataire, puis vous indiquez le loyer, la caution
et le **jour d'échéance** (le jour du mois où le loyer est dû, par exemple le 5).

Ce qui se passe automatiquement :

- le bien passe en statut **« Loué »** et disparaît des annonces disponibles ;
- un bien qui a déjà un bail actif ne peut pas être reloué : l'application refuse
  et vous prévient.

Pour libérer un logement : ouvrez le bail et cliquez sur **« Terminer le bail »**.
Le bien redevient disponible.

---

## 6. Générer les factures du mois

**C'est l'opération la plus importante, à faire une fois par mois.**

Sur le **tableau de bord**, cliquez sur **« Générer les factures du mois »**.

L'application crée d'un coup une facture pour **chaque bail actif**, avec le loyer,
les charges et la bonne date d'échéance.

- Vous pouvez cliquer plusieurs fois sans risque : **aucun doublon n'est créé**.
- Un bail créé en cours de mois sera facturé au prochain clic.
- Pour une facture particulière (régularisation d'eau, réparation…), utilisez
  **« Facture manuelle »** dans le menu Factures.

---

## 7. Encaisser un paiement

Menu **« Factures »** → ouvrez la facture → colonne de droite
**« Enregistrer un paiement »**.

Indiquez le montant, le mode de paiement (Orange Money, Wave, Free Money,
espèces, virement, chèque) et la **référence de la transaction**.

L'application calcule seule :

- **Payée** → le montant total a été reçu ;
- **Partielle** → le locataire a payé une partie (le reste dû s'affiche en rouge) ;
- **En retard** → la date d'échéance est dépassée et le solde n'est pas réglé.

Vous pouvez donc encaisser en plusieurs fois, ce qui est fréquent.

---

## 8. Imprimer la quittance

Sur la facture, cliquez sur **« Imprimer / PDF »**.

Un document A4 s'affiche avec l'en-tête de votre agence, le détail des montants,
**le montant en toutes lettres** et un emplacement pour la signature et le cachet.

- Le document s'intitule **« Quittance de loyer »** quand tout est payé,
  et **« Facture de loyer »** tant qu'il reste un solde.
- Pour obtenir un PDF : cliquez sur **Imprimer**, puis choisissez
  **« Enregistrer au format PDF »** comme destination.

---

## 9. Suivre les impayés

Deux endroits :

- **Tableau de bord** → encadré **« Factures en retard »**, trié par ancienneté,
  avec le nombre de jours de retard.
- **Factures** → filtre **« En retard »** ou **« Non soldées »**.

Depuis la fiche du locataire, le bouton **WhatsApp** ouvre directement une
conversation pour la relance.

---

## 10. Traiter les demandes de visite

Menu **« Demandes »**. Le chiffre rouge dans le menu indique les demandes
non traitées.

Pour chaque demande, vous pouvez **Appeler**, écrire sur **WhatsApp**,
puis **Marquer traitée** ou **Archiver**.

---

## Questions fréquentes

**Comment corriger une erreur sur une facture ?**
Ouvrez-la et cliquez sur **« Annuler la facture »** (elle reste dans l'historique,
marquée annulée), puis créez une facture manuelle avec les bons montants.
Le bouton **« Supprimer »** l'efface définitivement.

**J'ai supprimé un paiement par erreur.**
Réenregistrez-le simplement : les totaux et les états se recalculent seuls.

**Puis-je gérer plusieurs villes ?**
Oui. Dakar, Thiès, Mbour, Saint-Louis… sont proposées, et vous pouvez saisir
n'importe quelle autre ville ou quartier à la main.

**Comment sauvegarder mes données ?**
Copiez le fichier `data/keur-gestion.db`. Il contient absolument tout.

**Comment repartir de zéro ?**
Lancez `npm run reset` puis `npm run seed`.
⚠️ Cela efface toutes les données existantes.
