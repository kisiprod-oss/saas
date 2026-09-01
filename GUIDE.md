# Guide d'utilisation — Sen Gestion

Ce guide explique comment utiliser l'application au quotidien.
Aucune connaissance technique n'est nécessaire.

---

## 1. Se connecter

Ouvrez <http://localhost:3000>, cliquez sur **« Espace agence »** en haut à droite,
puis saisissez votre e-mail et votre mot de passe.

Pour tester : `demo@sengestion.sn` / `demo1234`

---

## 1 bis. Mot de passe oublié

Sur la page de connexion, cliquez sur **« Oublié ? »** à côté du champ mot de
passe. Indiquez votre adresse e-mail : vous recevez un lien valable **une
heure**, utilisable **une seule fois**.

Par sécurité, changer le mot de passe ferme toutes les sessions ouvertes sur le
compte.

Après **8 essais infructueux**, la connexion à ce compte est bloquée pendant
15 minutes. C'est ce qui empêche quelqu'un d'essayer des milliers de mots de
passe. Si cela vous arrive, utilisez « Oublié ? » plutôt que d'attendre.

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
- **Photos** : voir la section suivante.
- **« Publier sur la vitrine publique »** : décochez si le bien ne doit pas
  apparaître dans les annonces.

Le bien reçoit automatiquement une référence : `BIEN-0001`, `BIEN-0002`…

---

## 3 bis. Les photos du bien

Dans le formulaire d'un bien, section **« Propriétaire et publication »**.

**Depuis un téléphone**, appuyez sur **« Envoyer des photos »** : votre téléphone
propose *Appareil photo* ou *Galerie*. Vous pouvez donc photographier
l'appartement pendant la visite et l'annonce est prête en sortant.

**Depuis un ordinateur**, le même bouton ouvre vos dossiers. Vous pouvez
sélectionner plusieurs images d'un coup.

Ce que le logiciel fait tout seul :

- il **redresse** la photo si le téléphone l'a prise de travers ;
- il la **réduit** à une taille raisonnable pour le web ;
- il l'**allège** fortement — une photo de 5 Mo tombe autour de 200 Ko.
  C'est important : vos clients consultent souvent les annonces en données
  mobiles.

Une fois les photos enregistrées, chaque vignette propose :

- **Principale** : la photo qui apparaît en premier sur l'annonce et dans les
  listes. Cochez-en une autre pour changer la vitrine.
- **Retirer** : cochez, puis enregistrez. La photo est supprimée définitivement.

Jusqu'à 12 photos par bien, 15 Mo maximum par photo. Si vous avez déjà vos
images en ligne, le lien **« Ajouter une photo par son adresse web »** reste
disponible.

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

## 7 bis. Un acompte sur plusieurs mois de retard

Le cas classique : un locataire doit **trois mois** et vient déposer
**100 000 FCFA**. Vous n'avez pas à ouvrir chaque facture ni à faire la
division vous-même.

Menu **« Locataires »** → ouvrez sa fiche → bouton
**« Encaisser un acompte »**.

L'écran liste toutes ses factures non soldées, **de la plus ancienne à la plus
récente**, avec ce qu'il reste à payer sur chacune.

1. Tapez le **montant remis par le locataire**.
2. Cliquez sur **« Répartir automatiquement »** : le logiciel impute d'abord
   sur le mois le plus ancien, puis sur le suivant, et ainsi de suite.
3. **Corrigez les lignes à la main si besoin.** C'est vous qui décidez : si le
   locataire a demandé que son versement aille sur un mois précis, changez
   simplement les chiffres.
4. Indiquez la date, le moyen de paiement et la référence, puis enregistrez.

Un règlement est écrit pour **chaque facture concernée**. Celles qui deviennent
entièrement payées passent automatiquement en quittance imprimable.

> **Pourquoi le plus ancien d'abord ?** C'est l'usage, et cela protège le
> locataire : sinon une vieille dette resterait ouverte indéfiniment pendant
> que les mois récents se soldent.

En bas de l'écran, un message vous indique en permanence ce qu'il reste à
placer — impossible d'enregistrer un total qui ne tombe pas juste, ou
d'imputer sur une facture plus que ce qu'elle doit.

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

## 9 bis. Relancer les impayés sur WhatsApp

Menu **« Relances »**. Le chiffre rouge indique combien de locataires sont à
relancer aujourd'hui.

### Le logiciel décide pour vous

Il regarde le retard de chaque facture et choisit le ton :

| Retard | Niveau | Ton du message |
|---|---|---|
| 1 à 7 jours | **Rappel amical** | « Nous vous rappelons que… » |
| 8 à 29 jours | **Relance ferme** | « Sauf erreur de notre part, le loyer demeure impayé… » |
| 30 jours et plus | **Mise en demeure** | « Nous vous mettons en demeure de régler sous 8 jours… » |

Il évite aussi de harceler : **un même locataire n'est pas relancé deux fois en
moins de 7 jours**. Ceux déjà contactés passent dans la liste
« Relancés récemment ».

### Envoyer

Chaque carte affiche le locataire, le bien, le montant dû, l'échéance et le
retard. Cliquez sur **« Voir et modifier le message »** pour lire le texte déjà
rédigé — nom du locataire, montant, période, tout est rempli. Vous pouvez le
retoucher.

Puis un seul clic :

- **Envoyer sur WhatsApp** — ouvre la conversation avec le message déjà écrit ;
- **Par SMS** — même chose dans l'application de messages ;
- **Appeler** — lance l'appel ;
- **Noter comme relancé** — si vous avez appelé depuis un autre téléphone.

Dans tous les cas, la relance est **enregistrée automatiquement** dans
l'historique, en bas de la page. Vous savez toujours qui a été contacté, quand
et comment.

> ⚠️ Si un locataire a plusieurs mois impayés, un bandeau orange vous le signale :
> mieux vaut lui en parler une seule fois que d'envoyer trois messages.

### Vos propres messages

Bouton **« Modifier mes messages »**. Vous réécrivez les trois messages comme
vous parlez à vos clients. Les mots entre accolades sont remplacés
automatiquement : `{prenom}`, `{montant}`, `{periode}`, `{bien}`, `{jours}`,
`{agence}`… La liste complète est affichée à droite de la page.

**À savoir :** l'envoi se fait par votre WhatsApp ou votre téléphone, pas par un
serveur. C'est volontaire : c'est gratuit, vos clients reconnaissent votre
numéro, et vous gardez la main sur ce qui part. Un envoi 100 % automatique
demanderait un abonnement WhatsApp Business API.

---

## 9 ter. Donner un accès à votre locataire

Menu **« Locataires »** → ouvrez la fiche → encadré **« Espace locataire »**
à droite → **« Activer l'accès »**.

Un mot de passe est généré et affiché **une seule fois**. Un bouton
**« Envoyer par WhatsApp »** prépare le message avec le numéro de téléphone et
le mot de passe. Envoyez-le tout de suite : après, il faudra en générer un
nouveau.

### Ce que votre locataire peut faire

Il se connecte sur **votre-site.com/espace-locataire** avec **son numéro de
téléphone** et ce mot de passe. Il voit alors :

- son **solde restant dû**, en rouge s'il doit quelque chose ;
- **toutes ses quittances**, qu'il peut imprimer ou enregistrer en PDF ;
- un bouton pour **signaler un règlement** après un paiement Orange Money,
  Wave ou en espèces, avec la référence de transaction.

### Le point important : rien n'est réglé sans votre accord

Quand un locataire signale un paiement, **le solde ne bouge pas**. Le règlement
apparaît en attente, surligné en orange, avec une pastille sur le menu
« Paiements ».

Vous vérifiez auprès de votre compte Orange Money ou Wave, puis vous cliquez
sur **Confirmer** — le solde se met alors à jour — ou sur **Rejeter** si la
somme n'est jamais arrivée.

> ⚠️ Ne confirmez jamais sans avoir vérifié l'arrivée réelle de l'argent.
> Le locataire déclare ce qu'il veut : c'est votre vérification qui fait foi.

**Pour couper l'accès** (fin de bail, litige) : bouton **« Couper »**. Le
locataire est déconnecté immédiatement et ne peut plus se reconnecter.

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
Deux façons. Depuis l'application : **« Mon agence »** → **« Télécharger mes
données »** vous donne un fichier contenant tout (biens, locataires, baux,
factures, paiements). Sur le serveur : la commande `npm run sauvegarde` crée une
archive datée avec en plus les photos, et devrait tourner chaque nuit
automatiquement.

**Une photo est à l'envers.**
Le logiciel redresse automatiquement les photos prises au téléphone. Si l'une
reste de travers, retirez-la et renvoyez-la après l'avoir tournée dans la
galerie du téléphone.

**J'ai relancé un locataire qui avait déjà payé.**
Enregistrez son paiement : la facture sort immédiatement de la liste des
relances.

**Quelle formule me faut-il ?**
Regardez le nombre de biens que vous gérez : 3 en gratuit, 10 en Bailleur,
50 en Agence, illimité en Agence Pro. Le compteur se trouve dans
**« Mon agence »**, à droite, avec une barre de progression. Vous changez de
formule depuis le même encadré.

**Que se passe-t-il si j'atteins la limite ?**
Le logiciel vous prévient au moment d'ajouter un bien de trop et vous indique la
formule adaptée. Rien n'est perdu ni bloqué par ailleurs.

**Mon locataire a perdu son mot de passe.**
Ouvrez sa fiche, cliquez sur **« Réinitialiser le mot de passe »**. Un nouveau
mot de passe est généré et l'ancien cesse de fonctionner immédiatement.

**Un locataire a déclaré un paiement que je n'ai jamais reçu.**
Cliquez sur **Rejeter**. La déclaration disparaît et n'a jamais compté dans son
solde. Rien n'est perdu de votre côté.

**Comment repartir de zéro ?**
Lancez `npm run reset` puis `npm run seed`.
⚠️ Cela efface toutes les données existantes.
