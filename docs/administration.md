# L'espace d'administration de Sen Gestion

Guide court, à l'usage de l'équipe qui administre la plateforme.
Adresse : **sengestion.net/admin**

---

## 1. Créer le premier super administrateur

Il n'existe **aucune inscription publique** à ce rôle. Le premier administrateur
se désigne chez l'hébergeur, jamais depuis le site.

1. Ouvrez hPanel → votre site → **Variables d'environnement**.
2. Créez ou modifiez `ADMIN_EMAILS`.
3. Valeur : l'adresse e-mail du compte, en minuscules.
   Plusieurs adresses se séparent par une virgule, sans espace.
   Exemple : `isidore@sengestion.sn,awa@sengestion.sn`
4. Enregistrez, puis redéployez le site.

Cette adresse doit **déjà avoir un compte d'agence** sur Sen Gestion : c'est
avec ce compte qu'on se connecte, l'administration s'ajoute par-dessus.

Toute adresse listée dans `ADMIN_EMAILS` est super administrateur, quoi que
dise la base. C'est volontaire : aucune faille du site ne peut donner les
pleins droits à quelqu'un, et personne ne peut se retirer les siens par erreur.

---

## 2. Première entrée : poser sa seconde vérification

À la première visite de `/admin`, le site demande d'activer une **seconde
vérification**. Le mot de passe seul n'ouvre pas l'administration.

1. Installez une application d'authentification sur votre téléphone :
   Google Authenticator, FreeOTP, ou votre gestionnaire de mots de passe.
2. Sur `/admin`, cliquez **Créer mon secret**.
3. Scannez le QR code affiché. Si l'appareil photo ne marche pas, saisissez
   le code écrit en dessous à la main.
4. Tapez les six chiffres affichés par l'application.

Ensuite, un code est redemandé **à chaque entrée**, et la vérification vaut
douze heures. Le bouton **Quitter**, en haut à droite, ferme l'administration
sans vous déconnecter du logiciel.

**Téléphone perdu ?** Un autre super administrateur peut réinitialiser votre
seconde vérification depuis **Équipe**. S'il n'y en a pas d'autre, retirez
puis remettez l'adresse dans `ADMIN_EMAILS` et effacez la ligne
correspondante dans la table `admins`.

---

## 3. Les quatre rôles

| Rôle | Ce qu'il ouvre |
|---|---|
| **Super administrateur** | Tout, y compris l'équipe. Vient de `ADMIN_EMAILS`. |
| **Support** | Agences (lecture), utilisateurs, notes internes, **tickets d'assistance**, journal. Pas la facturation, pas la modération. |
| **Modérateur** | Annonces, artisans, journal. Pas les utilisateurs, pas la facturation, pas les tickets. |
| **Responsable facturation** | Abonnements, règlements, exports. Pas les utilisateurs, pas la modération. |

Les trois derniers s'accordent depuis **Équipe**. Le rôle super administrateur
ne s'accorde **pas** depuis l'écran, uniquement dans `ADMIN_EMAILS`.

Le menu ne montre que ce que le rôle ouvre — mais masquer n'est pas protéger :
chaque page et chaque bouton revérifie la permission côté serveur. Taper
l'adresse à la main ne sert à rien.

---

## 4. Ce que fait chaque écran

**Tableau de bord.** Les chiffres viennent de la base, jamais d'une estimation.
Sous chaque nombre, une phrase dit ce qu'il compte exactement. Quand une
fonction n'existe pas encore — les signalements, à ce jour — l'écran l'écrit
plutôt que d'afficher zéro. Les abonnements réglés sont le revenu de **Sen
Gestion** ; les loyers appartiennent aux agences et n'apparaissent jamais comme
un revenu de la plateforme.

**Agences.** Recherche, filtres et pagination faits sur le serveur. La fiche
montre les coordonnées, l'équipe, le portefeuille, l'historique des actions et
les **notes internes** — invisibles pour l'agence, aucune page de son espace ne
lit ce champ.

*Suspendre une agence* exige un motif d'au moins dix caractères. L'écran liste
d'abord les conséquences : les comptes ne se connectent plus, leurs sessions
sont fermées, aucune donnée n'est supprimée, les locataires gardent l'accès à
leurs quittances. C'est réversible. Vous ne pouvez pas suspendre votre propre
agence : cela vous mettrait dehors.

**Utilisateurs.** Suspension avec motif, fermeture des sessions, envoi du lien
de récupération. Aucun mot de passe n'est affiché, et **aucun bouton ne permet
de se connecter à la place de quelqu'un**. Le lien de récupération part à
l'adresse du titulaire : lui seul choisit son nouveau mot de passe.

**Annonces.** Deux états séparés, à ne pas confondre :
- *l'état du bien* (disponible, loué, réservé) appartient à l'agence ;
- *la modération* (publiée, en attente, refusée, archivée) appartient à l'équipe.

Une annonce ne paraît que si l'agence l'a publiée **et** que la modération
l'accepte. Refuser ou archiver exige un motif : sans lui, l'agence n'a rien à
corriger. Chaque décision est datée et signée.

**Artisans.** Suspension avec motif — la fiche quitte alors l'annuaire. Le badge
**Vérifié** ne s'attribue jamais tout seul : il exige une candidature validée
**et** un questionnaire métier réussi, et la date comme le nom de qui l'a posé
restent enregistrés. Les pièces justificatives ne sont servies qu'aux personnes
habilitées.

**Support.** Les demandes d'assistance déposées par les agences depuis leur
espace (menu *Support*). La liste est filtrable par statut, priorité, catégorie
et responsable ; le compteur du menu montre ce qui reste ouvert.

Sur la fiche d'un ticket, deux zones d'écriture à ne pas confondre :
- *Répondre à l'agence* — visible par elle, dans son espace ;
- *Note interne* — **jamais** visible par elle. Le filtre est dans la requête,
  pas dans l'écran : la page de l'agence ne lit que les messages non internes.
  Une note n'est donc pas seulement masquée, elle n'est pas envoyée.

L'agence ne voit pas non plus quelle personne de l'équipe a répondu : elle lit
« Équipe Sen Gestion ». Répondre à un ticket neuf le passe seul en *En cours*.
Si une agence écrit sur un ticket marqué résolu, il se rouvre — le problème
n'était visiblement pas terminé.

Chaque agence ne voit que ses propres tickets : la requête prend son identifiant
en paramètre, il n'existe aucune version sans. Changer le numéro dans l'adresse
ne donne rien.

**Journal.** Toutes les actions sensibles : qui, quoi, sur quoi, quand, et le
motif. **Lecture seule** : aucun écran ne permet de corriger ni d'effacer une
ligne. On y note le geste, jamais la matière — aucun mot de passe, aucune clé,
aucun secret n'y entre.

**Paramètres.** L'état des raccordements. Les valeurs des clés ne sont **jamais**
affichées, pas même partiellement : une clé à moitié montrée reste une clé à
moitié divulguée. Cette page ne déclenche aucun envoi.

---

## 5. Ce qui reste à configurer

À poser dans hPanel → Variables d'environnement, puis redéployer.
La page **Paramètres** dit à tout moment lesquelles manquent.

| Variable | À quoi elle sert | Sans elle |
|---|---|---|
| `ADMIN_EMAILS` | Désigne les super administrateurs | L'administration est fermée à tout le monde |
| `CLE_CHIFFREMENT` | Chiffre les clés marchandes et les secrets de seconde vérification | Ces secrets sont enregistrés en clair dans la base |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Envoi des e-mails | Le lien de récupération ne part pas |
| `ADRESSE_SITE` | Liens dans les e-mails | Les liens envoyés sont incomplets |
| `ABONNEMENT_CLE_MAITRE` / `_CLE_PRIVEE` / `_JETON` | Règlement PayDunya en FCFA | Les agences ne peuvent pas payer leur abonnement |
| `ABONNEMENT_STRIPE_CLE_SECRETE` | Règlement par carte internationale | Pas de paiement pour la diaspora |

**Brevo** n'a pas d'interface propre dans le projet : si vous l'utilisez, ses
identifiants SMTP suffisent. **WhatsApp** n'est pas raccordé non plus — les
relances s'ouvrent dans WhatsApp depuis le navigateur de l'agence, avec le
message pré-écrit, et c'est l'agence qui appuie sur « envoyer ».
