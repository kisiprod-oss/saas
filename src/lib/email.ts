import "server-only";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { dossierData } from "./db";

/**
 * Envoi des e-mails de service (reinitialisation de mot de passe, bienvenue).
 *
 * Si aucun serveur SMTP n'est configure, le message n'est pas perdu :
 * il est ecrit dans `data/emails/`. On peut donc faire tourner
 * l'application sans configuration, et lire les messages sur le disque.
 *
 * Pour envoyer reellement, renseignez dans un fichier `.env.local` :
 *   SMTP_HOST=smtp.votre-hebergeur.sn
 *   SMTP_PORT=587
 *   SMTP_USER=contact@votre-domaine.sn
 *   SMTP_PASS=le-mot-de-passe
 *   EMAIL_EXPEDITEUR="Sen Gestion <contact@votre-domaine.sn>"
 */

const DOSSIER_SECOURS = path.join(dossierData, "emails");

export function smtpConfigure(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export type Message = {
  destinataire: string;
  sujet: string;
  texte: string;
};

export async function envoyerEmail(message: Message): Promise<{ envoye: boolean; chemin?: string }> {
  const expediteur = process.env.EMAIL_EXPEDITEUR ?? "Sen Gestion <ne-pas-repondre@sengestion.sn>";

  if (smtpConfigure()) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });

    await transport.sendMail({
      from: expediteur,
      to: message.destinataire,
      subject: message.sujet,
      text: message.texte,
    });

    return { envoye: true };
  }

  // Pas de SMTP : on depose le message sur le disque plutot que de le perdre.
  fs.mkdirSync(DOSSIER_SECOURS, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const chemin = path.join(DOSSIER_SECOURS, `${horodatage}-${message.destinataire}.txt`);

  fs.writeFileSync(
    chemin,
    `De      : ${expediteur}\nÀ       : ${message.destinataire}\nSujet   : ${message.sujet}\n`
    + `Date    : ${new Date().toISOString()}\n\n${message.texte}\n`,
    "utf8",
  );

  console.warn(
    `[Sen Gestion] SMTP non configuré : e-mail écrit dans ${chemin}`,
  );
  return { envoye: false, chemin };
}

/**
 * Adresse publique du site, utilisee dans les liens des e-mails.
 *
 * ADRESSE_SITE fait autorite quand elle est definie : c'est le reglage sur
 * lequel il faut compter, et le seul qui protege d'un en-tete « Host »
 * falsifie par un attaquant pour detourner un lien de reinitialisation.
 *
 * A defaut, l'adresse est deduite de la requete en cours. Cela evite les
 * liens casses le temps d'un essai sur un domaine provisoire, mais la page
 * « Mon agence » signale alors que le reglage manque.
 */
export async function adresseDuSite(): Promise<string> {
  const declaree = process.env.ADRESSE_SITE?.trim();
  if (declaree) return declaree.replace(/\/$/, "");

  try {
    const entetes = await headers();
    const hote = entetes.get("x-forwarded-host") ?? entetes.get("host");
    if (hote) {
      const protocole = entetes.get("x-forwarded-proto")
        ?? (hote.startsWith("localhost") || hote.startsWith("127.") ? "http" : "https");
      return `${protocole}://${hote}`;
    }
  } catch {
    // Hors d'une requete (script en ligne de commande) : on retombe plus bas.
  }

  return "http://localhost:3000";
}

/** Vrai si ADRESSE_SITE n'est pas renseignee : reglage a completer. */
export function adresseSiteDeclaree(): boolean {
  return Boolean(process.env.ADRESSE_SITE?.trim());
}
