/**
 * Verifie la configuration d'envoi des e-mails et envoie un message d'essai.
 *
 * Utilisation :
 *   npm run tester-email                      -> envoie a l'adresse SMTP_USER
 *   npm run tester-email -- vous@exemple.sn   -> envoie a l'adresse indiquee
 *
 * Les variables sont lues dans .env.local (voir .env.example).
 */
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_EXPEDITEUR, ADRESSE_SITE } = process.env;

const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

console.log("\n=== Configuration lue ===\n");

const manquantes = [];
for (const [nom, valeur, obligatoire] of [
  ["SMTP_HOST", SMTP_HOST, true],
  ["SMTP_PORT", SMTP_PORT ?? "587 (par défaut)", false],
  ["SMTP_USER", SMTP_USER, true],
  ["SMTP_PASS", SMTP_PASS ? "•".repeat(Math.min(12, SMTP_PASS.length)) : undefined, true],
  ["EMAIL_EXPEDITEUR", EMAIL_EXPEDITEUR ?? "(non défini, une valeur par défaut sera utilisée)", false],
  ["ADRESSE_SITE", ADRESSE_SITE ?? "(non défini, les liens pointeront vers localhost)", false],
]) {
  const present = Boolean(valeur);
  console.log(`  ${present ? vert("✓") : rouge("✗")} ${nom.padEnd(18)} ${valeur ?? rouge("non défini")}`);
  if (obligatoire && !present) manquantes.push(nom);
}

if (manquantes.length > 0) {
  console.log(rouge(`\n✗ Variables manquantes : ${manquantes.join(", ")}`));
  console.log(`
Créez un fichier « .env.local » à la racine du projet, sur le modèle de
« .env.example », puis relancez cette commande.

Sans cette configuration, l'application fonctionne, mais les e-mails sont
écrits dans data/emails/ au lieu d'être envoyés : personne ne peut alors
récupérer un mot de passe oublié.
`);
  process.exit(1);
}

const port = Number(SMTP_PORT ?? 587);
const transport = nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/** Traduit les pannes SMTP courantes en explication utile. */
function expliquer(erreur) {
  const code = erreur.code ?? "";
  const message = String(erreur.message ?? "");

  if (code === "EAUTH" || /535|534|authentication/i.test(message)) {
    return `Le serveur a refusé vos identifiants.

  • Gmail ou Google Workspace : le mot de passe du compte ne fonctionne pas.
    Activez la validation en deux étapes, puis créez un « mot de passe
    d'application » et utilisez celui-là.
  • Brevo : SMTP_USER est votre adresse de connexion, mais SMTP_PASS doit être
    la « clé SMTP » créée dans SMTP & API, pas le mot de passe du compte.
  • Hébergeur classique : vérifiez que SMTP_USER est bien l'adresse complète
    (contact@votre-domaine.sn) et non seulement « contact ».`;
  }

  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ECONNREFUSED", "EDNS"].includes(code)
      || /getaddrinfo|timeout|ENOTFOUND/i.test(message)) {
    return `Impossible de joindre ${SMTP_HOST} sur le port ${port}.

  • Vérifiez l'orthographe du serveur.
  • Essayez le port 587 (recommandé) ou 465.
  • Certains hébergeurs bloquent les ports d'envoi : demandez-leur de les ouvrir.`;
  }

  if (/self.signed|certificate/i.test(message)) {
    return `Le certificat du serveur n'est pas reconnu.
  C'est fréquent sur un serveur d'envoi interne. Utilisez de préférence un
  service reconnu (Brevo, votre hébergeur) plutôt que de désactiver la
  vérification du certificat.`;
  }

  if (code === "EENVELOPE" || /550|553|not allowed|sender/i.test(message)) {
    return `L'adresse d'expéditeur a été refusée.
  EMAIL_EXPEDITEUR doit utiliser un domaine vérifié chez votre fournisseur.
  Chez Brevo, ajoutez et validez le domaine dans « Expéditeurs et domaines ».`;
  }

  return "Consultez le message ci-dessus et la documentation de votre fournisseur.";
}

console.log("\n=== Connexion au serveur ===\n");

try {
  await transport.verify();
  console.log(vert(`  ✓ Connexion et authentification réussies sur ${SMTP_HOST}:${port}`));
} catch (erreur) {
  console.log(rouge(`  ✗ Échec : ${erreur.message}`));
  console.log(`\n${expliquer(erreur)}\n`);
  process.exit(1);
}

const destinataire = process.argv[2] ?? SMTP_USER;
console.log(`\n=== Envoi d'un message d'essai à ${destinataire} ===\n`);

try {
  const info = await transport.sendMail({
    from: EMAIL_EXPEDITEUR ?? `Sen Gestion <${SMTP_USER}>`,
    to: destinataire,
    subject: "Sen Gestion — test de configuration",
    text:
`Bonjour,

Si vous lisez ce message, l'envoi d'e-mails de Sen Gestion fonctionne.

Vos locataires et vos agences pourront donc recevoir les liens de
réinitialisation de mot de passe.

Serveur : ${SMTP_HOST}:${port}
Envoyé le ${new Date().toLocaleString("fr-FR")}

L'équipe Sen Gestion`,
  });

  console.log(vert("  ✓ Message envoyé"));
  console.log(gris(`    identifiant : ${info.messageId}`));
  if (info.accepted?.length) console.log(gris(`    accepté pour : ${info.accepted.join(", ")}`));
  console.log(`
Vérifiez la boîte de réception de ${destinataire}, ainsi que le dossier des
indésirables. Si le message y atterrit, configurez SPF et DKIM chez votre
fournisseur : c'est ce qui fait la différence pour la bonne réception.
`);
} catch (erreur) {
  console.log(rouge(`  ✗ Échec de l'envoi : ${erreur.message}`));
  console.log(`\n${expliquer(erreur)}\n`);
  process.exit(1);
}
