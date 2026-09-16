"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { un, ecrire } from "./db";
import { exigerSession } from "./auth";
import { canonique } from "./telephone";
import { paysDe, paysServis } from "./pays";
import { couleurSure } from "./modeles";
import { MODELES, type Modele } from "./sections";
import { peutDomainePersonnalise, offreEnVigueur } from "./offres";
import { chiffrer, chiffrementPret } from "./chiffrement";
import { fournisseurPar } from "./paiements";
import * as photos from "./photos";

/**
 * Les réglages de la boutique : identité, livraison, paiements, conditions,
 * domaine, abonnement.
 *
 * Toutes ces actions passent par `exigerSession()` et n'écrivent que sur
 * `boutique.id`. Aucune ne lit un identifiant de boutique venu du formulaire.
 */

export type Etat = { erreur?: string; message?: string };

const CONTROLE = new RegExp("[\\u0000-\\u001F]", "g");

function texte(valeur: FormDataEntryValue | null, max: number): string {
  return String(valeur ?? "").replace(CONTROLE, " ").trim().slice(0, max);
}

function coche(donnees: FormData, nom: string): number {
  return donnees.get(nom) === "1" ? 1 : 0;
}

// ---------------------------------------------------------------------------
//  Identité de la boutique
// ---------------------------------------------------------------------------

export async function actionEnregistrerIdentite(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const nom = texte(donnees.get("nom"), 80);
  if (nom.length < 2) return { erreur: "Donnez un nom à votre boutique." };

  const codePays = texte(donnees.get("pays"), 2).toUpperCase() || boutique.pays;
  if (!paysServis().some((p) => p.code === codePays)) {
    return { erreur: "Ce pays n'est pas encore ouvert." };
  }
  const pays = paysDe(codePays);

  const telephone = canonique(texte(donnees.get("telephone"), 40), {
    indicatif: pays.indicatif, longueur: pays.longueur_nationale,
  });
  if (!telephone) return { erreur: `Numéro invalide pour ${pays.nom}.` };

  const whatsappBrut = texte(donnees.get("whatsapp"), 40);
  const whatsapp = whatsappBrut
    ? canonique(whatsappBrut, { indicatif: pays.indicatif, longueur: pays.longueur_nationale })
    : telephone;
  if (whatsappBrut && !whatsapp) return { erreur: "Le numéro WhatsApp n'est pas valide." };

  const modeleBrut = texte(donnees.get("modele"), 20);
  const modele: Modele = (MODELES as readonly string[]).includes(modeleBrut)
    ? (modeleBrut as Modele) : (boutique.modele as Modele);

  let logo = boutique.logo_url;
  const fichier = donnees.get("logo");
  if (fichier instanceof File && fichier.size > 0) {
    const resultat = await photos.enregistrer(boutique.id, fichier);
    if (!resultat.ok) return { erreur: resultat.erreur };
    if (logo) photos.supprimer(boutique.id, logo);
    logo = resultat.fichier;
  }
  if (donnees.get("retirer_logo") === "1" && logo) {
    photos.supprimer(boutique.id, logo);
    logo = null;
  }

  ecrire(
    `UPDATE boutiques SET nom = ?, description = ?, pays = ?, ville = ?, quartier = ?,
            adresse = ?, telephone = ?, whatsapp = ?, email = ?, modele = ?, couleur = ?,
            logo_url = ?, titre_partage = ?, description_partage = ?
      WHERE id = ?`,
    nom, texte(donnees.get("description"), 600) || null, codePays,
    texte(donnees.get("ville"), 80) || null, texte(donnees.get("quartier"), 80) || null,
    texte(donnees.get("adresse"), 200) || null, telephone, whatsapp,
    texte(donnees.get("email"), 160) || null, modele,
    couleurSure(texte(donnees.get("couleur"), 7)), logo,
    texte(donnees.get("titre_partage"), 90) || null,
    texte(donnees.get("description_partage"), 200) || null,
    boutique.id,
  );

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/b/${boutique.slug}`);
  return { message: "Réglages enregistrés." };
}

// ---------------------------------------------------------------------------
//  Livraison et retrait
// ---------------------------------------------------------------------------

export async function actionEnregistrerLivraison(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const retrait = coche(donnees, "retrait_actif");
  const livraison = coche(donnees, "livraison_active");
  const paiementLivraison = coche(donnees, "paiement_livraison");

  if (!retrait && !livraison) {
    return {
      erreur: "Gardez au moins un mode de réception : sans retrait ni livraison, "
        + "personne ne peut commander.",
    };
  }

  ecrire(
    `UPDATE boutiques SET retrait_actif = ?, retrait_adresse = ?, retrait_horaires = ?,
            livraison_active = ?, paiement_livraison = ? WHERE id = ?`,
    retrait, texte(donnees.get("retrait_adresse"), 200) || null,
    texte(donnees.get("retrait_horaires"), 120) || null,
    livraison, paiementLivraison, boutique.id,
  );

  revalidatePath("/tableau-de-bord/livraison");
  revalidatePath(`/b/${boutique.slug}`);
  return { message: "Modes de réception enregistrés." };
}

// ---------------------------------------------------------------------------
//  Conditions de vente
// ---------------------------------------------------------------------------

/**
 * Les conditions sont écrites ET validées par le commerçant.
 *
 * NOVA Boutique ne les rédige pas à sa place : ce serait prendre un engagement
 * juridique au nom de quelqu'un d'autre, sur des délais et des retours qu'on
 * ne connaît pas. La case de validation est explicite et datée.
 */
export async function actionEnregistrerConditions(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const vente = texte(donnees.get("conditions_vente"), 8000);
  const livraison = texte(donnees.get("conditions_livraison"), 4000);
  const retour = texte(donnees.get("conditions_retour"), 4000);
  const valide = donnees.get("valider") === "1";

  if (valide && vente.length < 50) {
    return {
      erreur: "Écrivez vos conditions de vente avant de les valider "
        + "(50 caractères minimum).",
    };
  }

  ecrire(
    `UPDATE boutiques SET conditions_vente = ?, conditions_livraison = ?,
            conditions_retour = ?, conditions_validees_le = ?
      WHERE id = ?`,
    vente || null, livraison || null, retour || null,
    valide ? new Date().toISOString() : null,
    boutique.id,
  );

  revalidatePath("/tableau-de-bord/parametres");
  revalidatePath(`/b/${boutique.slug}/conditions`);
  return {
    message: valide
      ? "Conditions enregistrées et publiées sur votre boutique."
      : "Conditions enregistrées. Cochez la validation pour les publier.",
  };
}

// ---------------------------------------------------------------------------
//  Paiement en ligne
// ---------------------------------------------------------------------------

/**
 * Branche un prestataire de paiement.
 *
 * ============================================================================
 *  L'ARGENT VA CHEZ LE COMMERÇANT
 * ============================================================================
 *  Les clés enregistrées ici sont celles du COMPTE MARCHAND DU COMMERÇANT.
 *  Les paiements de ses clients arrivent chez lui, pas chez nous. Ce circuit
 *  est totalement séparé de la facturation de son abonnement à NOVA Boutique.
 *
 *  Les clés privées sont chiffrées avant stockage (src/lib/chiffrement.ts) et
 *  ne redescendent JAMAIS dans le navigateur : les pages n'affichent qu'un
 *  masque.
 *
 *  Tant que le mode reste « test », la boutique ne propose pas le paiement en
 *  ligne à ses clients. On ne laisse pas une intégration à moitié branchée
 *  encaisser de vrais achats.
 * ============================================================================
 */
export async function actionEnregistrerPaiement(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);

  const actif = coche(donnees, "paiement_en_ligne");
  const code = texte(donnees.get("fournisseur"), 40);

  if (!actif) {
    ecrire(
      "UPDATE boutiques SET paiement_en_ligne = 0, paiement_mode = 'test' WHERE id = ?",
      boutique.id,
    );
    revalidatePath("/tableau-de-bord/paiements");
    return { message: "Paiement en ligne désactivé. Le paiement à la livraison continue." };
  }

  const fournisseur = fournisseurPar(code);
  if (!fournisseur) return { erreur: "Choisissez un prestataire." };
  if (!fournisseur.pays.includes(boutique.pays)) {
    return { erreur: `${fournisseur.nom} n'est pas disponible pour ${pays.nom}.` };
  }
  if (fournisseur.etat !== "disponible") {
    return {
      erreur: `L'intégration ${fournisseur.nom} n'est pas terminée. `
        + `Elle reste utilisable en mode test.`,
    };
  }

  const clePublique = texte(donnees.get("cle_publique"), 300);
  const clePrivee = texte(donnees.get("cle_privee"), 500);
  const secretWebhook = texte(donnees.get("secret_webhook"), 300);
  const modeReel = donnees.get("mode") === "reel";

  if (modeReel) {
    if (!chiffrementPret()) {
      return {
        erreur: "Le serveur n'a pas de clé de chiffrement (NOVA_CLE_SECRETE). "
          + "Vos clés ne peuvent pas être stockées en sécurité : contactez l'assistance.",
      };
    }
    if (!clePublique || (!clePrivee && !boutique.paiement_cle_privee)) {
      return { erreur: "Renseignez vos clés pour passer en mode réel." };
    }
    if (!secretWebhook && !boutique.paiement_secret_webhook) {
      return {
        erreur: "Le secret de notification est obligatoire en mode réel : sans lui, "
          + "nous ne pouvons pas vérifier qu'un paiement vient bien du prestataire.",
      };
    }
  }

  ecrire(
    `UPDATE boutiques SET paiement_en_ligne = 1, paiement_fournisseur = ?, paiement_mode = ?,
            paiement_cle_publique = ?,
            paiement_cle_privee = COALESCE(?, paiement_cle_privee),
            paiement_secret_webhook = COALESCE(?, paiement_secret_webhook)
      WHERE id = ?`,
    fournisseur.code, modeReel ? "reel" : "test",
    clePublique || boutique.paiement_cle_publique,
    clePrivee ? chiffrer(clePrivee) : null,
    secretWebhook ? chiffrer(secretWebhook) : null,
    boutique.id,
  );

  revalidatePath("/tableau-de-bord/paiements");
  revalidatePath(`/b/${boutique.slug}`);
  return {
    message: modeReel
      ? "Paiement en ligne actif. Faites un achat d'essai avant d'annoncer la nouveauté."
      : "Enregistré en mode test : vos clients ne verront pas encore le paiement en ligne.",
  };
}

// ---------------------------------------------------------------------------
//  Domaine personnalisé
// ---------------------------------------------------------------------------

/**
 * Enregistre un domaine et fabrique le jeton de preuve.
 *
 * La vérification tient en une règle : celui qui peut poser un enregistrement
 * TXT sur un domaine en est le gestionnaire. On ne se contente jamais d'un
 * CNAME qui pointe vers nous — n'importe qui peut faire pointer son domaine
 * sur n'importe quoi, ce qui permettrait de détourner la boutique d'un autre.
 */
export async function actionEnregistrerDomaine(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const autorise = peutDomainePersonnalise(boutique);
  if (!autorise.ok) return { erreur: autorise.raison };

  const brut = texte(donnees.get("domaine"), 120).toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  if (!brut) {
    ecrire(
      "UPDATE boutiques SET domaine = NULL, domaine_jeton = NULL, domaine_verifie_le = NULL WHERE id = ?",
      boutique.id,
    );
    revalidatePath("/tableau-de-bord/parametres");
    return { message: "Domaine retiré. Votre adresse nova.shop reste active." };
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(brut)) {
    return { erreur: "Ce nom de domaine n'est pas valide (exemple : maboutique.sn)." };
  }
  const pris = un<{ id: number }>(
    "SELECT id FROM boutiques WHERE domaine = ? AND id <> ?", brut, boutique.id,
  );
  if (pris) return { erreur: "Ce domaine est déjà utilisé par une autre boutique." };

  const jeton = boutique.domaine === brut && boutique.domaine_jeton
    ? boutique.domaine_jeton
    : `nova-verification=${crypto.randomBytes(16).toString("hex")}`;

  ecrire(
    `UPDATE boutiques SET domaine = ?, domaine_jeton = ?,
            domaine_verifie_le = CASE WHEN domaine = ? THEN domaine_verifie_le ELSE NULL END
      WHERE id = ?`,
    brut, jeton, brut, boutique.id,
  );

  revalidatePath("/tableau-de-bord/parametres");
  return {
    message: "Domaine enregistré. Ajoutez l'enregistrement TXT indiqué, puis lancez la vérification.",
  };
}

/**
 * Vérifie la propriété du domaine.
 *
 * Interroge le DNS via DNS-over-HTTPS (dns.google) : pas de dépendance
 * supplémentaire, et cela fonctionne depuis un hébergeur qui bloque le port 53.
 */
export async function actionVerifierDomaine(): Promise<Etat> {
  const { boutique } = await exigerSession();
  if (!boutique.domaine || !boutique.domaine_jeton) {
    return { erreur: "Enregistrez d'abord un domaine." };
  }

  try {
    const reponse = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(boutique.domaine)}&type=TXT`,
      { headers: { accept: "application/dns-json" }, cache: "no-store" },
    );
    if (!reponse.ok) throw new Error(`DNS ${reponse.status}`);

    const donnees = await reponse.json() as { Answer?: { data?: string }[] };
    const trouve = (donnees.Answer ?? []).some(
      (a) => String(a.data ?? "").replace(/"/g, "").includes(boutique.domaine_jeton!),
    );

    if (!trouve) {
      return {
        erreur: "L'enregistrement TXT n'est pas encore visible. Les changements DNS "
          + "mettent parfois plusieurs heures à se propager : réessayez plus tard.",
      };
    }

    ecrire("UPDATE boutiques SET domaine_verifie_le = datetime('now') WHERE id = ?", boutique.id);
    revalidatePath("/tableau-de-bord/parametres");
    return {
      message: "Domaine vérifié. Faites maintenant pointer votre domaine vers NOVA "
        + "(enregistrement CNAME), puis prévenez-nous pour l'émission du certificat HTTPS.",
    };
  } catch {
    return { erreur: "La vérification a échoué. Réessayez dans quelques minutes." };
  }
}

// ---------------------------------------------------------------------------
//  Abonnement
// ---------------------------------------------------------------------------

/**
 * Enregistre une demande de changement de formule.
 *
 * Aucun prestataire de facturation n'est branché : l'abonnement est créé
 * « en attente » et l'équipe l'active à réception du règlement. On ne
 * fait pas semblant d'encaisser.
 */
export async function actionDemanderOffre(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();
  const code = texte(donnees.get("offre"), 40);

  const offre = un<{ code: string; nom: string; prix_mensuel: number; devise: string }>(
    "SELECT code, nom, prix_mensuel, devise FROM offres WHERE code = ? AND actif = 1", code,
  );
  if (!offre) return { erreur: "Cette formule n'existe pas." };

  const actuelle = offreEnVigueur(boutique);
  if (offre.code === actuelle.code) return { erreur: `Vous êtes déjà sur la formule ${offre.nom}.` };

  // Redescendre vers la formule gratuite est immédiat : personne ne doit
  // attendre pour arrêter de payer.
  if (offre.prix_mensuel === 0) {
    ecrire("UPDATE boutiques SET offre = ?, offre_expire_le = NULL WHERE id = ?", offre.code, boutique.id);
    revalidatePath("/tableau-de-bord/abonnement");
    return { message: `Vous êtes repassé sur la formule ${offre.nom}.` };
  }

  const deja = un<{ id: number }>(
    "SELECT id FROM abonnements WHERE boutique_id = ? AND offre = ? AND statut = 'en_attente'",
    boutique.id, offre.code,
  );
  if (deja) {
    return { message: `Votre demande pour la formule ${offre.nom} est déjà enregistrée.` };
  }

  ecrire(
    `INSERT INTO abonnements (boutique_id, offre, montant, devise, statut)
     VALUES (?, ?, ?, ?, 'en_attente')`,
    boutique.id, offre.code, offre.prix_mensuel, offre.devise,
  );

  revalidatePath("/tableau-de-bord/abonnement");
  return {
    message: `Demande enregistrée pour la formule ${offre.nom}. `
      + `Nous vous contactons pour le règlement — votre formule actuelle continue `
      + `jusqu'à l'activation.`,
  };
}

/** Une demande d'assistance. */
export async function actionDemanderAssistance(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const sujet = texte(donnees.get("sujet"), 120);
  const message = texte(donnees.get("message"), 3000);
  if (sujet.length < 3 || message.length < 10) {
    return { erreur: "Indiquez un sujet et décrivez votre problème." };
  }

  ecrire(
    "INSERT INTO demandes_assistance (boutique_id, sujet, message) VALUES (?, ?, ?)",
    boutique.id, sujet, message,
  );
  revalidatePath("/tableau-de-bord/parametres");
  return { message: "Demande envoyée. Nous répondons sous deux jours ouvrés." };
}
