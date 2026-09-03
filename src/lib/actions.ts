"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, ecrire, un } from "./db";
import { cookies, headers } from "next/headers";
import {
  appliquerNouveauMotDePasse, creerDemandeReinitialisation, exigerSession, fermerSession,
  inscrireAgence, lireDemandeReinitialisation, MINUTES_BLOCAGE, noterTentative, ouvrirSession,
  reinitialiserTentatives, tropDeTentatives, verifierMotDePasse,
} from "./auth";
import { adresseDuSite, envoyerEmail } from "./email";
import {
  activerAccesLocataire, desactiverAccesLocataire, exigerSessionLocataire,
  fermerSessionLocataire, ouvrirSessionLocataire, verifierIdentifiantsLocataire,
} from "./auth-locataire";
import {
  arrieresLocataire, artisanPourDevis, bienDisponible, devisReponduesCeMois,
  facturesEmisesCeMois, genererFacturesDuMois, lireDevisArtisan, lireFacture,
  numeroFactureSuivant, referenceReservation, referenceSuivante,
} from "./requetes";
import { aujourdhui, dateValide, nuitsEntre, periodeLisible, telephoneBrut } from "./format";
import { chiffrementConfigure, chiffrer } from "./chiffrement";
import {
  clesAgence, creerPaiement, FOURNISSEURS, testerCles,
} from "./encaissement";
import { ouvrirReglement, ouvrirReglementStripe } from "./abonnement";
import {
  enregistrerLogo, enregistrerPhotoProfil, enregistrerPhotos, estPhotoTeleversee,
  supprimerPhoto,
} from "./photos";
import {
  creerProspect, enregistrerImagesCourteDuree, imagesCourteDuree,
} from "./vitrine";
import { peutAjouterBien, plan, planArtisan, planSuivant, PLANS, PLANS_ARTISAN } from "./tarifs";
import { etatQuota, etatQuotaDevis } from "./quota";
import { refusMotDePasse } from "./mot-de-passe";
import { accuserReception, envoiDuDocument, messageWhatsApp, noterEnvoi } from "./envois";
import { codeNormalise, codeVerification } from "./verification";
import { aideDocumentsConfiguree, preparerBail, preparerFacture } from "./assistant-documents";
import { METIERS } from "./constantes";
import { hacherMotDePasse } from "./auth";
import { exigerAdmin } from "./admin";
import {
  exigerSessionArtisan, fermerSessionArtisan, ouvrirSessionArtisan,
  verifierIdentifiantsArtisan,
} from "./auth-artisan";
import { enregistrerDocuments } from "./documents";
import {
  corrigerSession, genererQuestions, ouvrirSessionQuiz, sessionEnCours,
  viderBanque, type SessionQuiz,
} from "./quiz";
import crypto from "node:crypto";

// ------------------------------------------------------------- utilitaires

const txt = (fd: FormData, cle: string) => String(fd.get(cle) ?? "").trim();

/** Lit un montant saisi ("450 000", "450000 FCFA") et renvoie un entier. */
const montant = (fd: FormData, cle: string) => {
  const brut = String(fd.get(cle) ?? "").replace(/[^\d]/g, "");
  const n = Number(brut);
  return Number.isFinite(n) ? n : 0;
};

const entier = (fd: FormData, cle: string, defaut = 0) => {
  const n = Number(String(fd.get(cle) ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : defaut;
};

const coche = (fd: FormData, cle: string) => (fd.get(cle) ? 1 : 0);

const vide = (v: string) => (v === "" ? null : v);

/** Redirige vers `url` en y ajoutant un message d'erreur affichable. */
function erreur(url: string, message: string): never {
  const separateur = url.includes("?") ? "&" : "?";
  redirect(`${url}${separateur}erreur=${encodeURIComponent(message)}`);
}

// ------------------------------------------------------------------ compte

export async function actionConnexion(fd: FormData) {
  const email = txt(fd, "email").toLowerCase();
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const origine = await adresseIp();

  // Deux verrous : sur l'adresse e-mail visee, et sur la machine qui essaie.
  if (tropDeTentatives(email) || (origine !== null && tropDeTentatives(origine))) {
    erreur(
      "/connexion",
      `Trop de tentatives de connexion. Réessayez dans ${MINUTES_BLOCAGE} minutes,`
      + " ou utilisez « Mot de passe oublié ».",
    );
  }

  const utilisateur = un<{ id: number; mot_de_passe_hash: string | null; actif: number }>(
    "SELECT id, mot_de_passe_hash, actif FROM utilisateurs WHERE email = ?",
    email,
  );

  // mot_de_passe_hash est nul pour un compte cree via Google : il n'a jamais
  // eu de mot de passe. On refuse alors, sans reveler que le compte existe.
  if (
    !utilisateur
    || !utilisateur.actif
    || !utilisateur.mot_de_passe_hash
    || !verifierMotDePasse(motDePasse, utilisateur.mot_de_passe_hash)
  ) {
    noterTentative(email, false);
    if (origine !== null) noterTentative(origine, false);
    erreur("/connexion", "E-mail ou mot de passe incorrect.");
  }

  reinitialiserTentatives(email);
  if (origine !== null) reinitialiserTentatives(origine);
  await ouvrirSession(utilisateur.id);
  redirect("/dashboard");
}

/**
 * Adresse IP de l'appelant, telle que transmise par le serveur de façade.
 *
 * Renvoie null quand aucune adresse n'est transmise. C'est important :
 * regrouper tous les visiteurs sous une meme cle « inconnue » permettrait
 * a une seule personne de bloquer la connexion de tout le monde.
 * Dans ce cas, seul le verrou par adresse e-mail s'applique.
 */
async function adresseIp(): Promise<string | null> {
  const entetes = await headers();
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim()
    || entetes.get("x-real-ip")?.trim();
  return transmise ? `ip:${transmise}` : null;
}

export async function actionInscription(fd: FormData) {
  const nomAgence = txt(fd, "nomAgence");
  const nom = txt(fd, "nom");
  const email = txt(fd, "email");
  const telephone = txt(fd, "telephone");
  const motDePasse = String(fd.get("motDePasse") ?? "");

  if (!nomAgence || !nom || !email) erreur("/inscription", "Merci de remplir tous les champs obligatoires.");
  const refus = refusMotDePasse(motDePasse);
  if (refus) erreur("/inscription", refus);

  const res = inscrireAgence({ nomAgence, nom, email, telephone, motDePasse });
  if (!res.ok) erreur("/inscription", res.erreur);

  await ouvrirSession(res.utilisateurId);
  redirect("/dashboard");
}

export async function actionDeconnexion() {
  await fermerSession();
  redirect("/connexion");
}

// ------------------------------------------------------------------ agence

export async function actionEnregistrerAgence(fd: FormData) {
  const { agence } = await exigerSession();

  // Un logo televerse remplace l'adresse web ; sans nouveau fichier, on
  // conserve ce qui est deja enregistre.
  const fichierLogo = fd.get("logo");
  let logoUrl = vide(txt(fd, "logo_url"));
  if (fichierLogo instanceof File && fichierLogo.size > 0) {
    const { url, erreur: probleme } = await enregistrerLogo(fichierLogo);
    if (probleme) erreur("/dashboard/agence", probleme);
    if (url) {
      if (agence.logo_url) await supprimerPhoto(agence.logo_url);
      logoUrl = url;
    }
  }

  ecrire(
    `UPDATE agences SET nom = ?, ninea = ?, rccm = ?, telephone = ?, email = ?,
            adresse = ?, ville = ?, logo_url = ?, commission_pct = ?,
            paiement_orange_money = ?, paiement_wave = ?, paiement_free_money = ?,
            paiement_consignes = ?
      WHERE id = ?`,
    txt(fd, "nom") || agence.nom,
    vide(txt(fd, "ninea")), vide(txt(fd, "rccm")),
    vide(txt(fd, "telephone")), vide(txt(fd, "email")),
    vide(txt(fd, "adresse")), vide(txt(fd, "ville")),
    logoUrl,
    entier(fd, "commission_pct", 10),
    vide(txt(fd, "paiement_orange_money")), vide(txt(fd, "paiement_wave")),
    vide(txt(fd, "paiement_free_money")), vide(txt(fd, "paiement_consignes")),
    agence.id,
  );
  revalidatePath("/dashboard/agence");
  redirect("/dashboard/agence?ok=1");
}

// ------------------------------------------------------------------- biens

export async function actionEnregistrerBien(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const titre = txt(fd, "titre");
  const retour = id ? `/dashboard/biens/${id}` : "/dashboard/biens/nouveau";
  if (!titre) erreur(retour, "Le titre est obligatoire.");

  // La formule d'abonnement limite le nombre de biens.
  if (!id) {
    const compte = un<{ n: number }>(
      "SELECT COUNT(*) AS n FROM biens WHERE agence_id = ?", agence.id,
    );
    if (!peutAjouterBien(agence.plan, compte?.n ?? 0)) {
      const actuelle = plan(agence.plan);
      const suivante = planSuivant(agence.plan);
      erreur(
        "/dashboard/biens",
        `Votre formule ${actuelle.nom} est limitée à ${actuelle.maxBiens} biens.`
        + (suivante ? ` Passez à la formule ${suivante.nom} pour en gérer ${
            suivante.maxBiens === null ? "un nombre illimité" : `jusqu'à ${suivante.maxBiens}`
          }.` : ""),
      );
    }
  }

  const { photos, avertissements } = await rassemblerPhotos(fd);
  const equipements = fd.getAll("equipements").map(String).join(", ");

  const champs = [
    titre, txt(fd, "type") || "appartement", vide(txt(fd, "description")),
    txt(fd, "ville") || "Dakar", vide(txt(fd, "quartier")), vide(txt(fd, "adresse")),
    entier(fd, "chambres"), entier(fd, "salles_bain"), entier(fd, "surface") || null,
    vide(txt(fd, "etage")), coche(fd, "meuble"), vide(equipements), vide(photos.join("\n")),
    montant(fd, "loyer"), montant(fd, "charges"), entier(fd, "caution_mois", 2),
    coche(fd, "courte_duree"), montant(fd, "prix_nuit"),
    Math.max(1, entier(fd, "nuits_min", 1)), Math.max(1, entier(fd, "capacite", 2)),
    txt(fd, "statut") || "disponible", coche(fd, "publie"),
    vide(txt(fd, "proprietaire_nom")), vide(txt(fd, "proprietaire_telephone")),
  ];

  let bienId = id;

  if (id) {
    ecrire(
      `UPDATE biens SET titre=?, type=?, description=?, ville=?, quartier=?, adresse=?,
              chambres=?, salles_bain=?, surface=?, etage=?, meuble=?, equipements=?, photos=?,
              loyer=?, charges=?, caution_mois=?,
              courte_duree=?, prix_nuit=?, nuits_min=?, capacite=?,
              statut=?, publie=?,
              proprietaire_nom=?, proprietaire_telephone=?
        WHERE id=? AND agence_id=?`,
      ...champs, id, agence.id,
    );
  } else {
    const res = ecrire(
      `INSERT INTO biens (agence_id, reference, titre, type, description, ville, quartier, adresse,
                          chambres, salles_bain, surface, etage, meuble, equipements, photos,
                          loyer, charges, caution_mois,
                          courte_duree, prix_nuit, nuits_min, capacite,
                          statut, publie,
                          proprietaire_nom, proprietaire_telephone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      agence.id, referenceSuivante(agence.id, "biens", "BIEN"), ...champs,
    );
    bienId = Number(res.lastInsertRowid);
  }

  revalidatePath("/dashboard/biens");
  revalidatePath("/");

  const suffixe = avertissements.length > 0
    ? `?avertissement=${encodeURIComponent(avertissements.join(" "))}`
    : "?ok=1";
  redirect(`/dashboard/biens/${bienId}${suffixe}`);
}

/**
 * Reconstitue la liste des photos d'un bien a partir du formulaire :
 * celles conservees, celles ajoutees par adresse web, et les fichiers
 * envoyes depuis l'ordinateur ou le telephone. La photo cochee
 * « principale » est placee en tete ; les photos retirees sont effacees.
 */
async function rassemblerPhotos(fd: FormData) {
  const conservees = fd.getAll("photos_existantes").map(String);
  const retirees = new Set(fd.getAll("photos_supprimees").map(String));
  const principale = txt(fd, "photo_principale");

  const parAdresse = txt(fd, "photos_url")
    .split(/[\n,]/).map((u) => u.trim()).filter(Boolean);

  const fichiers = fd.getAll("fichiers").filter((f): f is File => f instanceof File);
  const { urls: televersees, erreurs: avertissements } = await enregistrerPhotos(fichiers);

  let photos = [...new Set([
    ...conservees.filter((u) => !retirees.has(u)),
    ...parAdresse,
    ...televersees,
  ])];

  if (principale && photos.includes(principale)) {
    photos = [principale, ...photos.filter((u) => u !== principale)];
  }

  for (const url of retirees) await supprimerPhoto(url);

  return { photos, avertissements };
}

export async function actionSupprimerBien(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");

  const lie = un<{ n: number }>("SELECT COUNT(*) AS n FROM contrats WHERE bien_id = ?", id);
  if ((lie?.n ?? 0) > 0) {
    erreur("/dashboard/biens", "Ce bien est rattaché à un contrat : supprimez d'abord le contrat.");
  }

  const bien = un<{ photos: string | null }>(
    "SELECT photos FROM biens WHERE id = ? AND agence_id = ?", id, agence.id,
  );
  ecrire("DELETE FROM biens WHERE id = ? AND agence_id = ?", id, agence.id);

  // Les photos du bien n'ont plus de raison d'occuper le disque.
  for (const url of (bien?.photos ?? "").split(/[\n,]/).map((u) => u.trim()).filter(Boolean)) {
    await supprimerPhoto(url);
  }

  revalidatePath("/dashboard/biens");
  revalidatePath("/");
  redirect("/dashboard/biens");
}

// -------------------------------------------------------------- locataires

export async function actionEnregistrerLocataire(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const prenom = txt(fd, "prenom");
  const nom = txt(fd, "nom");
  const telephone = txt(fd, "telephone");
  const retour = id ? `/dashboard/locataires/${id}` : "/dashboard/locataires/nouveau";

  if (!prenom || !nom) erreur(retour, "Le prénom et le nom sont obligatoires.");
  if (!telephone) erreur(retour, "Le numéro de téléphone est obligatoire.");

  const champs = [
    prenom, nom, telephone, vide(txt(fd, "telephone2")), vide(txt(fd, "email")),
    vide(txt(fd, "cni")), vide(txt(fd, "profession")), vide(txt(fd, "employeur")),
    vide(txt(fd, "adresse")), vide(txt(fd, "garant_nom")), vide(txt(fd, "garant_telephone")),
    vide(txt(fd, "notes")),
  ];

  if (id) {
    ecrire(
      `UPDATE locataires SET prenom=?, nom=?, telephone=?, telephone2=?, email=?, cni=?,
              profession=?, employeur=?, adresse=?, garant_nom=?, garant_telephone=?, notes=?
        WHERE id=? AND agence_id=?`,
      ...champs, id, agence.id,
    );
  } else {
    const res = ecrire(
      `INSERT INTO locataires (agence_id, prenom, nom, telephone, telephone2, email, cni,
                               profession, employeur, adresse, garant_nom, garant_telephone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      agence.id, ...champs,
    );
    revalidatePath("/dashboard/locataires");
    redirect(`/dashboard/locataires/${res.lastInsertRowid}?ok=1`);
  }

  revalidatePath("/dashboard/locataires");
  redirect(`/dashboard/locataires/${id}?ok=1`);
}

export async function actionSupprimerLocataire(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");

  const lie = un<{ n: number }>("SELECT COUNT(*) AS n FROM contrats WHERE locataire_id = ?", id);
  if ((lie?.n ?? 0) > 0) {
    erreur("/dashboard/locataires", "Ce locataire a un contrat : supprimez d'abord le contrat.");
  }

  ecrire("DELETE FROM locataires WHERE id = ? AND agence_id = ?", id, agence.id);
  revalidatePath("/dashboard/locataires");
  redirect("/dashboard/locataires");
}

// ---------------------------------------------------------------- contrats

export async function actionEnregistrerContrat(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const bienId = entier(fd, "bien_id");
  const locataireId = entier(fd, "locataire_id");
  const dateDebut = txt(fd, "date_debut") || aujourdhui();
  const retour = id ? `/dashboard/contrats/${id}` : "/dashboard/contrats/nouveau";

  if (!bienId || !locataireId) erreur(retour, "Choisissez un bien et un locataire.");

  const bien = un<{ id: number }>("SELECT id FROM biens WHERE id = ? AND agence_id = ?", bienId, agence.id);
  const loc = un<{ id: number }>("SELECT id FROM locataires WHERE id = ? AND agence_id = ?", locataireId, agence.id);
  if (!bien || !loc) erreur(retour, "Bien ou locataire introuvable.");

  // Un bien ne peut pas avoir deux baux actifs en meme temps.
  const occupe = un<{ id: number }>(
    "SELECT id FROM contrats WHERE bien_id = ? AND statut = 'actif' AND id != ?",
    bienId, id || 0,
  );
  if (occupe) erreur(retour, "Ce bien a déjà un bail actif. Terminez-le avant d'en créer un nouveau.");

  const champs = [
    bienId, locataireId, dateDebut, vide(txt(fd, "date_fin")), entier(fd, "duree_mois", 12),
    montant(fd, "loyer"), montant(fd, "charges"), montant(fd, "caution"),
    Math.min(Math.max(entier(fd, "jour_echeance", 5), 1), 28),
    entier(fd, "commission_pct", Math.round(agence.commission_pct)),
    txt(fd, "statut") || "actif", vide(txt(fd, "notes")),
  ];

  const majStatutBien = db.transaction((contratId: number, statut: string) => {
    ecrire(
      "UPDATE biens SET statut = ? WHERE id = ? AND agence_id = ?",
      statut === "actif" ? "loue" : "disponible", bienId, agence.id,
    );
    return contratId;
  });

  if (id) {
    ecrire(
      `UPDATE contrats SET bien_id=?, locataire_id=?, date_debut=?, date_fin=?, duree_mois=?,
              loyer=?, charges=?, caution=?, jour_echeance=?, commission_pct=?, statut=?, notes=?
        WHERE id=? AND agence_id=?`,
      ...champs, id, agence.id,
    );
    majStatutBien(id, String(champs[10]));
    revalidatePath("/dashboard/contrats");
    redirect(`/dashboard/contrats/${id}?ok=1`);
  }

  const res = ecrire(
    `INSERT INTO contrats (agence_id, reference, bien_id, locataire_id, date_debut, date_fin,
                           duree_mois, loyer, charges, caution, jour_echeance, commission_pct, statut, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    agence.id, referenceSuivante(agence.id, "contrats", "BAIL"), ...champs,
  );
  majStatutBien(Number(res.lastInsertRowid), String(champs[10]));

  revalidatePath("/dashboard/contrats");
  redirect(`/dashboard/contrats/${res.lastInsertRowid}?ok=1`);
}

export async function actionTerminerContrat(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const statut = txt(fd, "statut") || "termine";

  const contrat = un<{ bien_id: number }>(
    "SELECT bien_id FROM contrats WHERE id = ? AND agence_id = ?", id, agence.id,
  );
  if (!contrat) erreur("/dashboard/contrats", "Contrat introuvable.");

  db.transaction(() => {
    ecrire(
      "UPDATE contrats SET statut = ?, date_fin = COALESCE(NULLIF(date_fin, ''), ?) WHERE id = ? AND agence_id = ?",
      statut, aujourdhui(), id, agence.id,
    );
    ecrire("UPDATE biens SET statut = 'disponible' WHERE id = ? AND agence_id = ?", contrat.bien_id, agence.id);
  })();

  revalidatePath("/dashboard/contrats");
  redirect(`/dashboard/contrats/${id}?ok=1`);
}

export async function actionSupprimerContrat(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");

  const contrat = un<{ bien_id: number }>(
    "SELECT bien_id FROM contrats WHERE id = ? AND agence_id = ?", id, agence.id,
  );
  if (!contrat) erreur("/dashboard/contrats", "Contrat introuvable.");

  db.transaction(() => {
    ecrire("DELETE FROM contrats WHERE id = ? AND agence_id = ?", id, agence.id);
    ecrire("UPDATE biens SET statut = 'disponible' WHERE id = ? AND agence_id = ?", contrat.bien_id, agence.id);
  })();

  revalidatePath("/dashboard/contrats");
  redirect("/dashboard/contrats");
}

// ---------------------------------------------------------------- factures

export async function actionGenererFactures(fd: FormData) {
  const { agence } = await exigerSession();
  const periode = txt(fd, "periode") || aujourdhui().slice(0, 7);

  // La formule gratuite borne le nombre de factures emises dans le mois.
  // On emet ce qui rentre dans le quota restant plutot que de tout refuser.
  const quota = etatQuota(agence, facturesEmisesCeMois(agence.id));
  if (quota.atteint) {
    erreur(
      `/dashboard/factures?periode=${periode}`,
      `Vous avez émis vos ${quota.quota} factures de ce mois. Choisissez une formule pour continuer sans limite — vos factures déjà émises restent accessibles.`,
    );
  }

  const { creees, bloquees } = genererFacturesDuMois(
    agence.id, periode, quota.illimite ? null : quota.restantes,
  );

  revalidatePath("/dashboard/factures");
  redirect(
    `/dashboard/factures?periode=${periode}&genere=${creees}` +
    (bloquees > 0 ? `&bloquees=${bloquees}` : ""),
  );
}

export async function actionCreerFacture(fd: FormData) {
  const { agence } = await exigerSession();
  const quota = etatQuota(agence, facturesEmisesCeMois(agence.id));
  if (quota.atteint) {
    erreur(
      "/dashboard/factures",
      `Vous avez émis vos ${quota.quota} factures de ce mois. Choisissez une formule pour continuer sans limite — vos factures déjà émises restent accessibles.`,
    );
  }
  const contratId = entier(fd, "contrat_id");
  const periode = txt(fd, "periode") || aujourdhui().slice(0, 7);

  const contrat = un<{ id: number; loyer: number; charges: number; jour_echeance: number }>(
    "SELECT id, loyer, charges, jour_echeance FROM contrats WHERE id = ? AND agence_id = ?",
    contratId, agence.id,
  );
  if (!contrat) erreur("/dashboard/factures/nouvelle", "Choisissez un contrat.");

  const doublon = un<{ id: number }>(
    "SELECT id FROM factures WHERE contrat_id = ? AND periode = ?", contratId, periode,
  );
  if (doublon) erreur("/dashboard/factures/nouvelle", `Une facture existe déjà pour ${periode} sur ce bail.`);

  // Un champ laisse vide reprend la valeur inscrite au bail.
  const loyer = txt(fd, "montant_loyer") === "" ? contrat.loyer : montant(fd, "montant_loyer");
  const charges = txt(fd, "montant_charges") === "" ? contrat.charges : montant(fd, "montant_charges");
  const autres = montant(fd, "montant_autres");

  const [annee, mois] = periode.split("-").map(Number);
  const dernierJour = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  const jour = Math.min(Math.max(contrat.jour_echeance || 5, 1), dernierJour);

  const res = ecrire(
    `INSERT INTO factures (agence_id, contrat_id, numero, periode, date_emission, date_echeance,
                           montant_loyer, montant_charges, montant_autres, libelle_autres, montant_total, statut)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'emise')`,
    agence.id, contratId, numeroFactureSuivant(agence.id), periode,
    txt(fd, "date_emission") || `${periode}-01`,
    `${periode}-${String(jour).padStart(2, "0")}`,
    loyer, charges, autres, vide(txt(fd, "libelle_autres")), loyer + charges + autres,
  );

  revalidatePath("/dashboard/factures");
  redirect(`/dashboard/factures/${res.lastInsertRowid}?ok=1`);
}

export async function actionAnnulerFacture(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  ecrire("UPDATE factures SET statut = 'annulee' WHERE id = ? AND agence_id = ?", id, agence.id);
  revalidatePath("/dashboard/factures");
  redirect(`/dashboard/factures/${id}?ok=1`);
}

export async function actionSupprimerFacture(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  ecrire("DELETE FROM factures WHERE id = ? AND agence_id = ?", id, agence.id);
  revalidatePath("/dashboard/factures");
  redirect("/dashboard/factures");
}

// --------------------------------------------------------------- paiements

export async function actionEnregistrerPaiement(fd: FormData) {
  const { agence } = await exigerSession();
  const factureId = entier(fd, "facture_id");
  const somme = montant(fd, "montant");
  const retour = `/dashboard/factures/${factureId}`;

  const facture = un<{ id: number }>(
    "SELECT id FROM factures WHERE id = ? AND agence_id = ?", factureId, agence.id,
  );
  if (!facture) erreur("/dashboard/factures", "Facture introuvable.");
  if (somme <= 0) erreur(retour, "Le montant du paiement doit être supérieur à zéro.");

  ecrire(
    `INSERT INTO paiements (agence_id, facture_id, montant, date_paiement, mode, reference, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    agence.id, factureId, somme,
    txt(fd, "date_paiement") || aujourdhui(),
    txt(fd, "mode") || "especes",
    vide(txt(fd, "reference")), vide(txt(fd, "note")),
  );

  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  redirect(`${retour}?ok=1`);
}

export async function actionSupprimerPaiement(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const factureId = entier(fd, "facture_id");
  ecrire("DELETE FROM paiements WHERE id = ? AND agence_id = ?", id, agence.id);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  redirect(factureId ? `/dashboard/factures/${factureId}` : "/dashboard/paiements");
}

/**
 * Encaisse un acompte reparti sur plusieurs factures en retard.
 *
 * Le cas reel : un locataire doit trois mois et apporte 100 000 FCFA. Plutot
 * que d'obliger l'agence a ouvrir chaque facture et a faire la division de
 * tete, elle saisit une repartition et le logiciel ecrit un reglement par
 * facture concernee.
 *
 * La repartition reste ENTRE LES MAINS DE L'AGENCE : l'ecran en propose une
 * (la plus ancienne d'abord), elle la corrige si le locataire a demande que
 * son versement aille sur un mois precis.
 */
export async function actionEncaisserAcompte(fd: FormData) {
  const { agence } = await exigerSession();
  const locataireId = entier(fd, "locataire_id");
  const retour = `/dashboard/locataires/${locataireId}/acompte`;

  const locataire = un<{ id: number }>(
    "SELECT id FROM locataires WHERE id = ? AND agence_id = ?", locataireId, agence.id,
  );
  if (!locataire) erreur("/dashboard/locataires", "Locataire introuvable.");

  // On repart des arrieres reels plutot que des montants soumis : une facture
  // soldee entre l'affichage et la validation ne peut pas etre surpayee.
  const arrieres = arrieresLocataire(agence.id, locataireId);

  const lignes: { factureId: number; montant: number }[] = [];
  for (const facture of arrieres) {
    const somme = montant(fd, `montant_${facture.id}`);
    if (somme <= 0) continue;
    if (somme > facture.reste) {
      erreur(retour, `Le montant affecté à la facture ${facture.numero} dépasse ce qu'il reste à payer (${facture.reste} FCFA).`);
    }
    lignes.push({ factureId: facture.id, montant: somme });
  }

  if (lignes.length === 0) {
    erreur(retour, "Indiquez au moins un montant à imputer sur une facture.");
  }

  const date = txt(fd, "date_paiement") || aujourdhui();
  const mode = txt(fd, "mode") || "especes";
  const reference = vide(txt(fd, "reference"));
  const note = vide(txt(fd, "note"));

  for (const ligne of lignes) {
    ecrire(
      `INSERT INTO paiements (agence_id, facture_id, montant, date_paiement, mode, reference, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      agence.id, ligne.factureId, ligne.montant, date, mode, reference, note,
    );
  }

  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  revalidatePath("/dashboard/relances");
  redirect(`/dashboard/locataires/${locataireId}?ok=1`);
}

// ---------------------------------------------------------------- demandes

/** Formulaire de contact de la vitrine publique (accessible sans compte). */
export async function actionEnvoyerDemande(fd: FormData) {
  const bienId = entier(fd, "bien_id");
  const nom = txt(fd, "nom");
  const telephone = txt(fd, "telephone");

  const bien = un<{ agence_id: number }>(
    "SELECT agence_id FROM biens WHERE id = ? AND publie = 1", bienId,
  );
  if (!bien) erreur(`/biens/${bienId}`, "Ce bien n'est plus disponible.");
  if (!nom || !telephone) erreur(`/biens/${bienId}`, "Votre nom et votre téléphone sont obligatoires.");

  ecrire(
    `INSERT INTO demandes (agence_id, bien_id, nom, telephone, email, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    bien.agence_id, bienId, nom, telephone, vide(txt(fd, "email")), vide(txt(fd, "message")),
  );

  revalidatePath("/dashboard/demandes");
  redirect(`/biens/${bienId}?envoye=1`);
}

// ------------------------------------------------- prospects de l'editeur

/**
 * Formulaire « être rappelé » de la page Courte durée (public, sans compte).
 *
 * Ce contact appartient a l'EDITEUR, pas a une agence : il atterrit dans
 * l'espace d'administration, jamais dans le tableau de bord d'une agence.
 */
export async function actionEtreRappele(fd: FormData) {
  const retour = "/courte-duree";
  const nom = txt(fd, "nom");
  const telephone = txt(fd, "telephone");

  if (!nom || !telephone) {
    erreur(retour, "Votre nom et votre téléphone sont obligatoires.");
  }

  creerProspect({
    nom,
    telephone,
    email: vide(txt(fd, "email")),
    ville: vide(txt(fd, "ville")),
    nbLogements: vide(txt(fd, "nb_logements")),
    message: vide(txt(fd, "message")),
    source: "courte-duree",
  });

  revalidatePath("/admin/courte-duree");
  redirect(`${retour}?rappel=1`);
}

/** L'administrateur classe un prospect (rappelé, devenu client, perdu). */
export async function actionStatutProspect(fd: FormData) {
  await exigerAdmin();
  const statuts = ["nouveau", "rappele", "client", "perdu"];
  const statut = txt(fd, "statut");
  if (!statuts.includes(statut)) erreur("/admin/courte-duree", "Statut inconnu.");

  ecrire("UPDATE prospects SET statut = ? WHERE id = ?", statut, entier(fd, "id"));
  revalidatePath("/admin/courte-duree");
  redirect("/admin/courte-duree");
}

/** L'administrateur remplace les photos de la page Courte durée. */
export async function actionImagesCourteDuree(fd: FormData) {
  await exigerAdmin();
  const retour = "/admin/courte-duree";

  const fichiers = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) erreur(retour, "Choisissez au moins une photo.");

  const resultat = await enregistrerPhotos(fichiers);
  if (resultat.urls.length === 0) {
    erreur(retour, resultat.erreurs[0] ?? "Aucune photo n'a pu être enregistrée.");
  }

  // Les nouvelles remplacent les anciennes : la page en montre trois au plus,
  // et garder les precedentes ne ferait qu'encombrer le dossier de donnees.
  for (const ancienne of imagesCourteDuree()) {
    if (estPhotoTeleversee(ancienne)) await supprimerPhoto(ancienne);
  }
  enregistrerImagesCourteDuree(resultat.urls);

  revalidatePath("/courte-duree");
  revalidatePath(retour);
  redirect(`${retour}?ok=1`);
}

export async function actionStatutDemande(fd: FormData) {
  const { agence } = await exigerSession();
  ecrire(
    "UPDATE demandes SET statut = ? WHERE id = ? AND agence_id = ?",
    txt(fd, "statut") || "traitee", entier(fd, "id"), agence.id,
  );
  revalidatePath("/dashboard/demandes");
  redirect("/dashboard/demandes");
}

// ------------------------------------- aide a la saisie (factures et baux)

/**
 * Construit l'adresse du formulaire pre-rempli.
 *
 * Les valeurs voyagent dans l'adresse plutot que dans un etat cote
 * navigateur : le formulaire reste une page ordinaire, relisible et
 * corrigeable, et l'agente peut meme garder le lien sous la main.
 */
function urlPreRemplie(
  base: string,
  champs: Record<string, string | number | null>,
  resume: string,
  manques: string[],
): string {
  const params = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(champs)) {
    if (valeur !== null && valeur !== "") params.set(cle, String(valeur));
  }
  if (resume) params.set("resume", resume);
  for (const m of manques) params.append("manque", m);
  return `${base}?${params.toString()}`;
}

/** L'agente decrit sa facture en une phrase ; le formulaire se pre-remplit. */
export async function actionPreparerFacture(fd: FormData) {
  const { agence } = await exigerSession();
  const retour = "/dashboard/factures/nouvelle";

  if (!aideDocumentsConfiguree()) erreur(retour, "L'aide à la saisie n'est pas configurée.");
  const description = txt(fd, "description");
  if (!description) erreur(retour, "Décrivez la facture à préparer.");

  const { champs, resume, manques } = await preparerFacture(agence.id, description);
  redirect(urlPreRemplie(retour, { ...champs, contrat: champs.contrat_id }, resume, manques));
}

/** Même principe pour un bail. */
export async function actionPreparerBail(fd: FormData) {
  const { agence } = await exigerSession();
  const retour = "/dashboard/contrats/nouveau";

  if (!aideDocumentsConfiguree()) erreur(retour, "L'aide à la saisie n'est pas configurée.");
  const description = txt(fd, "description");
  if (!description) erreur(retour, "Décrivez le bail à préparer.");

  const { champs, resume, manques } = await preparerBail(agence.id, description);
  redirect(urlPreRemplie(retour, champs, resume, manques));
}

// ------------------------------------------------------------ verification

/** Point d'entree de /verifier : normalise le code saisi et ouvre sa fiche. */
export async function actionRechercherVerification(fd: FormData) {
  const code = codeNormalise(txt(fd, "code"));
  if (!code) erreur("/verifier", "Saisissez le code imprimé sur le document.");
  redirect(`/verifier/${code}`);
}

// ---------------------------------------------------------------- relances

/** Note qu'un locataire a bien ete relance, pour ne pas le solliciter deux fois. */
export async function actionEnregistrerRelance(fd: FormData) {
  const { agence } = await exigerSession();
  const factureId = entier(fd, "facture_id");
  const niveau = txt(fd, "niveau") || "rappel";
  const canal = txt(fd, "canal") || "whatsapp";

  const facture = un<{ id: number }>(
    "SELECT id FROM factures WHERE id = ? AND agence_id = ?", factureId, agence.id,
  );
  if (!facture) erreur("/dashboard/relances", "Facture introuvable.");

  ecrire(
    "INSERT INTO relances (agence_id, facture_id, niveau, canal, message) VALUES (?, ?, ?, ?, ?)",
    agence.id, factureId, niveau, canal, vide(txt(fd, "message")),
  );

  revalidatePath("/dashboard/relances");
  redirect("/dashboard/relances?relances=1");
}

/** Enregistre les trois modeles de messages de relance de l'agence. */
export async function actionEnregistrerModeles(fd: FormData) {
  const { agence } = await exigerSession();
  ecrire(
    `UPDATE agences SET modele_rappel = ?, modele_relance = ?, modele_mise_en_demeure = ?
      WHERE id = ?`,
    vide(txt(fd, "modele_rappel")),
    vide(txt(fd, "modele_relance")),
    vide(txt(fd, "modele_mise_en_demeure")),
    agence.id,
  );
  revalidatePath("/dashboard/relances");
  redirect("/dashboard/relances/modeles?ok=1");
}

// ----------------------------------------------------------------- formule

/**
 * Change la formule d'abonnement de l'agence.
 * La facturation n'est pas encore branchee : le changement est immediat.
 */
export async function actionChangerPlan(fd: FormData) {
  const { agence } = await exigerSession();
  const code = txt(fd, "plan");

  if (!PLANS.some((p) => p.code === code)) {
    erreur("/dashboard/agence", "Formule inconnue.");
  }

  const nouvelle = plan(code);
  if (nouvelle.maxBiens !== null) {
    const compte = un<{ n: number }>(
      "SELECT COUNT(*) AS n FROM biens WHERE agence_id = ?", agence.id,
    );
    if ((compte?.n ?? 0) > nouvelle.maxBiens) {
      erreur(
        "/dashboard/agence",
        `Vous gérez ${compte?.n} biens : la formule ${nouvelle.nom} n'en accepte que ${nouvelle.maxBiens}.`
        + " Retirez des biens avant de redescendre de formule.",
      );
    }
  }

  ecrire("UPDATE agences SET plan = ? WHERE id = ?", code, agence.id);
  revalidatePath("/dashboard/agence");
  redirect("/dashboard/agence?ok=1");
}

// ------------------------------------------------- mot de passe oublie

/**
 * Envoie le lien de reinitialisation.
 * Le message affiche est le meme que l'adresse existe ou non : cela evite
 * de reveler quelles adresses possedent un compte.
 */
export async function actionDemanderReinitialisation(fd: FormData) {
  const email = txt(fd, "email").toLowerCase();
  if (!email) erreur("/mot-de-passe-oublie", "Indiquez votre adresse e-mail.");

  const demande = creerDemandeReinitialisation(email);

  if (demande) {
    const lien = `${await adresseDuSite()}/reinitialiser/${demande.token}`;
    await envoyerEmail({
      destinataire: email,
      sujet: "Réinitialisation de votre mot de passe Sen Gestion",
      texte:
`Bonjour ${demande.nom},

Vous avez demandé à changer le mot de passe de votre compte Sen Gestion.

Cliquez sur ce lien pour choisir un nouveau mot de passe :
${lien}

Ce lien est valable une heure et ne peut servir qu'une seule fois.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message :
votre mot de passe actuel reste valable.

L'équipe Sen Gestion`,
    });
  }

  redirect("/mot-de-passe-oublie?envoye=1");
}

export async function actionReinitialiser(fd: FormData) {
  const token = txt(fd, "token");
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const confirmation = String(fd.get("confirmation") ?? "");
  const retour = `/reinitialiser/${token}`;

  const refus = refusMotDePasse(motDePasse);
  if (refus) erreur(retour, refus);
  if (motDePasse !== confirmation) erreur(retour, "Les deux mots de passe ne sont pas identiques.");
  if (!lireDemandeReinitialisation(token)) {
    erreur("/mot-de-passe-oublie", "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.");
  }

  appliquerNouveauMotDePasse(token, motDePasse);
  redirect("/connexion?reinitialise=1");
}

// ---------------------------------------------------------- espace locataire

export async function actionConnexionLocataire(fd: FormData) {
  const telephone = txt(fd, "telephone");
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const origine = await adresseIp();
  const cle = `loc:${telephone.replace(/\D/g, "")}`;

  if (tropDeTentatives(cle) || (origine !== null && tropDeTentatives(origine))) {
    erreur(
      "/espace-locataire/connexion",
      `Trop de tentatives de connexion. Réessayez dans ${MINUTES_BLOCAGE} minutes.`,
    );
  }

  const resultat = verifierIdentifiantsLocataire(telephone, motDePasse);
  if (!resultat.ok) {
    noterTentative(cle, false);
    if (origine !== null) noterTentative(origine, false);
    erreur("/espace-locataire/connexion", resultat.erreur);
  }

  reinitialiserTentatives(cle);
  if (origine !== null) reinitialiserTentatives(origine);
  await ouvrirSessionLocataire(resultat.id);
  redirect("/espace-locataire");
}

export async function actionDeconnexionLocataire() {
  await fermerSessionLocataire();
  redirect("/espace-locataire/connexion");
}

/** Le locataire signale un règlement effectué : il reste en attente jusqu'à vérification par l'agence. */
export async function actionDeclarerPaiement(fd: FormData) {
  const locataire = await exigerSessionLocataire();
  const factureId = entier(fd, "facture_id");
  const somme = montant(fd, "montant");
  const retour = `/espace-locataire/factures/${factureId}`;

  const facture = un<{ id: number; agence_id: number; contrat_id: number }>(
    `SELECT f.id, f.agence_id, f.contrat_id FROM factures f
      JOIN contrats c ON c.id = f.contrat_id
     WHERE f.id = ? AND c.locataire_id = ?`,
    factureId, locataire.id,
  );
  if (!facture) erreur("/espace-locataire", "Facture introuvable.");
  if (somme <= 0) erreur(retour, "Le montant doit être supérieur à zéro.");

  ecrire(
    `INSERT INTO paiements
       (agence_id, facture_id, montant, date_paiement, mode, reference, note, declare_par_locataire, confirme)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    facture.agence_id, factureId, somme,
    txt(fd, "date_paiement") || aujourdhui(),
    txt(fd, "mode") || "orange_money",
    vide(txt(fd, "reference")), vide(txt(fd, "note")),
  );

  revalidatePath("/espace-locataire");
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  redirect(`${retour}?declare=1`);
}

/** L'agence vérifie un paiement déclaré par un locataire : il compte désormais dans le solde réglé. */
export async function actionConfirmerPaiement(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  ecrire(
    "UPDATE paiements SET confirme = 1 WHERE id = ? AND agence_id = ? AND declare_par_locataire = 1",
    id, agence.id,
  );
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  redirect(`/dashboard/factures/${entier(fd, "facture_id")}?ok=1`);
}

/** L'agence rejette une déclaration incorrecte ou frauduleuse : le paiement disparaît sans affecter le solde. */
export async function actionRejeterPaiement(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  ecrire(
    "DELETE FROM paiements WHERE id = ? AND agence_id = ? AND declare_par_locataire = 1",
    id, agence.id,
  );
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard/paiements");
  redirect(`/dashboard/factures/${entier(fd, "facture_id")}?rejete=1`);
}

/** Active ou réinitialise l'accès au portail : un mot de passe lisible est généré, à communiquer au locataire. */
export async function actionActiverAccesLocataire(fd: FormData) {
  const { agence } = await exigerSession();
  const locataireId = entier(fd, "id");

  const locataire = un<{ id: number }>(
    "SELECT id FROM locataires WHERE id = ? AND agence_id = ?", locataireId, agence.id,
  );
  if (!locataire) erreur("/dashboard/locataires", "Locataire introuvable.");

  const motDePasse = activerAccesLocataire(locataireId);
  revalidatePath(`/dashboard/locataires/${locataireId}`);
  redirect(`/dashboard/locataires/${locataireId}?acces=${motDePasse}`);
}

export async function actionDesactiverAccesLocataire(fd: FormData) {
  const { agence } = await exigerSession();
  const locataireId = entier(fd, "id");

  const locataire = un<{ id: number }>(
    "SELECT id FROM locataires WHERE id = ? AND agence_id = ?", locataireId, agence.id,
  );
  if (!locataire) erreur("/dashboard/locataires", "Locataire introuvable.");

  desactiverAccesLocataire(locataireId);
  revalidatePath(`/dashboard/locataires/${locataireId}`);
  redirect(`/dashboard/locataires/${locataireId}?ok=1`);
}

// -------------------------------------------------- photo du locataire

/**
 * Le locataire envoie sa propre photo depuis son espace.
 *
 * C'est lui qui la fournit, pas l'agence : cela evite a l'agent de courir
 * apres une piece d'identite, et le locataire garde la main sur son image.
 * L'ancienne photo est effacee du disque pour ne pas accumuler de fichiers
 * orphelins.
 */
export async function actionEnregistrerPhotoLocataire(fd: FormData) {
  const locataire = await exigerSessionLocataire();
  const fichier = fd.get("photo");
  const retour = "/espace-locataire/profil";

  if (!(fichier instanceof File) || fichier.size === 0) {
    erreur(retour, "Choisissez une photo avant d'enregistrer.");
  }

  const { url, erreur: probleme } = await enregistrerPhotoProfil(fichier);
  if (probleme) erreur(retour, probleme);
  if (!url) erreur(retour, "La photo n'a pas pu être enregistrée.");

  const ancienne = un<{ photo_url: string | null }>(
    "SELECT photo_url FROM locataires WHERE id = ?", locataire.id,
  );
  ecrire("UPDATE locataires SET photo_url = ? WHERE id = ?", url, locataire.id);
  if (ancienne?.photo_url) await supprimerPhoto(ancienne.photo_url);

  revalidatePath("/espace-locataire");
  revalidatePath(`/dashboard/locataires/${locataire.id}`);
  redirect(`${retour}?ok=1`);
}

export async function actionSupprimerPhotoLocataire() {
  const locataire = await exigerSessionLocataire();

  const ligne = un<{ photo_url: string | null }>(
    "SELECT photo_url FROM locataires WHERE id = ?", locataire.id,
  );
  ecrire("UPDATE locataires SET photo_url = NULL WHERE id = ?", locataire.id);
  if (ligne?.photo_url) await supprimerPhoto(ligne.photo_url);

  revalidatePath("/espace-locataire");
  revalidatePath(`/dashboard/locataires/${locataire.id}`);
  redirect("/espace-locataire/profil?retiree=1");
}

/**
 * Le locataire remet a plus tard l'ajout de sa photo.
 *
 * Le report tient dans un cookie de session, pas en base : c'est un simple
 * confort d'affichage. La demande revient a la prochaine connexion — on
 * insiste sans jamais bloquer l'acces a ses propres quittances.
 */
export async function actionReporterPhotoLocataire() {
  await exigerSessionLocataire();
  const jar = await cookies();
  jar.set("sen_photo_reportee", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/espace-locataire");
}

// ------------------------------------------- reservations de courte duree

/** Bornes communes a toute saisie de sejour, cote public comme cote agence. */
const NUITS_MAX = 90;
const VOYAGEURS_MAX = 30;

/**
 * Verifie et normalise un sejour saisi dans un formulaire.
 * Renvoie soit les valeurs propres, soit le premier probleme rencontre.
 */
function lireSejour(fd: FormData, bien: {
  prix_nuit: number; nuits_min: number; capacite: number;
}): { ok: true; arrivee: string; depart: string; nuits: number; voyageurs: number; total: number }
  | { ok: false; message: string } {
  const arrivee = txt(fd, "date_arrivee");
  const depart = txt(fd, "date_depart");

  if (!dateValide(arrivee) || !dateValide(depart)) {
    return { ok: false, message: "Indiquez une date d'arrivée et une date de départ valides." };
  }
  if (arrivee < aujourdhui()) {
    return { ok: false, message: "La date d'arrivée ne peut pas être dans le passé." };
  }

  const nuits = nuitsEntre(arrivee, depart);
  if (nuits < 1) return { ok: false, message: "Le départ doit être après l'arrivée." };
  if (nuits > NUITS_MAX) {
    return { ok: false, message: `Un séjour ne peut pas dépasser ${NUITS_MAX} nuits. Passez par un bail classique.` };
  }
  const minimum = Math.max(1, bien.nuits_min);
  if (nuits < minimum) {
    return { ok: false, message: `Ce logement se loue à partir de ${minimum} nuit${minimum > 1 ? "s" : ""}.` };
  }

  const voyageurs = Math.min(Math.max(1, entier(fd, "voyageurs", 1)), VOYAGEURS_MAX);
  if (voyageurs > bien.capacite) {
    return { ok: false, message: `Ce logement accueille au maximum ${bien.capacite} voyageur${bien.capacite > 1 ? "s" : ""}.` };
  }

  return { ok: true, arrivee, depart, nuits, voyageurs, total: nuits * bien.prix_nuit };
}

/** Un visiteur demande à réserver un logement depuis la vitrine publique. */
export async function actionDemanderReservation(fd: FormData) {
  const bienId = entier(fd, "bien_id");
  const retour = `/biens/${bienId}`;

  const bien = un<{
    id: number; agence_id: number; courte_duree: number;
    prix_nuit: number; nuits_min: number; capacite: number; statut: string;
  }>(
    `SELECT id, agence_id, courte_duree, prix_nuit, nuits_min, capacite, statut
       FROM biens WHERE id = ? AND publie = 1`,
    bienId,
  );
  if (!bien || !bien.courte_duree) erreur("/", "Ce logement n'accepte pas les réservations.");

  const nom = txt(fd, "nom");
  const telephone = txt(fd, "telephone");
  if (!nom || !telephone) erreur(retour, "Votre nom et votre téléphone sont nécessaires.");

  const sejour = lireSejour(fd, bien);
  if (!sejour.ok) erreur(retour, sejour.message);

  // Le controle de disponibilite et l'insertion doivent etre indissociables :
  // sans cela, deux demandes simultanees pourraient reserver les memes nuits.
  const reserver = db.transaction(() => {
    if (!bienDisponible(bienId, sejour.arrivee, sejour.depart)) return null;
    const reference = referenceReservation(bien.agence_id);
    ecrire(
      `INSERT INTO reservations
         (agence_id, bien_id, reference, nom, telephone, email, date_arrivee, date_depart,
          nuits, voyageurs, prix_nuit, montant_total, message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bien.agence_id, bienId, reference, nom, telephone, vide(txt(fd, "email")),
      sejour.arrivee, sejour.depart, sejour.nuits, sejour.voyageurs,
      bien.prix_nuit, sejour.total, vide(txt(fd, "message")),
    );
    return reference;
  });

  const reference = reserver();
  if (!reference) {
    erreur(retour, "Ces dates viennent d'être réservées. Choisissez d'autres dates.");
  }

  revalidatePath("/dashboard/reservations");
  revalidatePath(retour);
  redirect(`${retour}?reserve=${reference}`);
}

/** L'agence confirme, annule ou clôture une réservation. */
export async function actionStatutReservation(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const statut = txt(fd, "statut");

  if (!["demande", "confirmee", "annulee", "terminee"].includes(statut)) {
    erreur("/dashboard/reservations", "Statut inconnu.");
  }

  const reservation = un<{ bien_id: number; date_arrivee: string; date_depart: string }>(
    "SELECT bien_id, date_arrivee, date_depart FROM reservations WHERE id = ? AND agence_id = ?",
    id, agence.id,
  );
  if (!reservation) erreur("/dashboard/reservations", "Réservation introuvable.");

  // Confirmer un sejour qui chevauche un autre sejour confirme creerait une
  // double reservation : on le refuse plutot que de laisser l'agence decouvrir
  // le probleme le jour de l'arrivee.
  if (statut === "confirmee"
      && !bienDisponible(reservation.bien_id, reservation.date_arrivee, reservation.date_depart, id)) {
    erreur(
      `/dashboard/reservations/${id}`,
      "Ces dates chevauchent une autre réservation. Annulez-la d'abord.",
    );
  }

  ecrire(
    "UPDATE reservations SET statut = ?, note = ? WHERE id = ? AND agence_id = ?",
    statut, vide(txt(fd, "note")), id, agence.id,
  );
  revalidatePath("/dashboard/reservations");
  revalidatePath(`/dashboard/reservations/${id}`);
  redirect(`/dashboard/reservations/${id}?ok=1`);
}

/** L'agence enregistre un acompte ou le solde d'un séjour. */
export async function actionPaiementReservation(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const somme = montant(fd, "montant_paye");

  const reservation = un<{ montant_total: number }>(
    "SELECT montant_total FROM reservations WHERE id = ? AND agence_id = ?", id, agence.id,
  );
  if (!reservation) erreur("/dashboard/reservations", "Réservation introuvable.");
  if (somme < 0) erreur(`/dashboard/reservations/${id}`, "Le montant ne peut pas être négatif.");

  ecrire(
    "UPDATE reservations SET montant_paye = ? WHERE id = ? AND agence_id = ?",
    Math.min(somme, reservation.montant_total), id, agence.id,
  );
  revalidatePath(`/dashboard/reservations/${id}`);
  redirect(`/dashboard/reservations/${id}?ok=1`);
}

/** L'agence supprime une réservation devenue inutile (doublon, test…). */
export async function actionSupprimerReservation(fd: FormData) {
  const { agence } = await exigerSession();
  ecrire(
    "DELETE FROM reservations WHERE id = ? AND agence_id = ?", entier(fd, "id"), agence.id,
  );
  revalidatePath("/dashboard/reservations");
  redirect("/dashboard/reservations?supprime=1");
}

// --------------------------------------------- encaissement automatique

/**
 * L'agence enregistre ses cles marchandes.
 *
 * Les cles sont chiffrees avant d'entrer en base. Un champ laisse vide
 * conserve la cle deja enregistree : l'agence peut donc corriger un seul
 * identifiant sans avoir a tout resaisir — et l'ecran n'a jamais besoin de
 * reafficher un secret pour le renvoyer.
 */
export async function actionEnregistrerEncaissement(fd: FormData) {
  const { agence } = await exigerSession();
  const retour = "/dashboard/encaissement";

  if (!chiffrementConfigure()) {
    erreur(retour, "La clé de chiffrement du serveur (CLE_CHIFFREMENT) n'est pas configurée.");
  }

  const fournisseur = txt(fd, "fournisseur") || "paydunya";
  if (!FOURNISSEURS.some((f) => f.code === fournisseur)) {
    erreur(retour, "Fournisseur inconnu.");
  }

  const mode = txt(fd, "mode") === "reel" ? "reel" : "test";
  const actuel = un<{
    encaissement_cle_maitre: string | null;
    encaissement_cle_privee: string | null;
    encaissement_jeton: string | null;
  }>(
    `SELECT encaissement_cle_maitre, encaissement_cle_privee, encaissement_jeton
       FROM agences WHERE id = ?`,
    agence.id,
  );

  /** Chiffre la nouvelle valeur, ou garde l'ancienne si le champ est vide. */
  const cle = (nom: string, ancienne: string | null | undefined) => {
    const saisie = txt(fd, nom);
    return saisie ? chiffrer(saisie) : (ancienne ?? null);
  };

  const cleMaitre = cle("cle_maitre", actuel?.encaissement_cle_maitre);
  const clePrivee = cle("cle_privee", actuel?.encaissement_cle_privee);
  const jeton = cle("jeton", actuel?.encaissement_jeton);

  const actif = coche(fd, "actif");
  if (actif && !(cleMaitre && clePrivee && jeton)) {
    erreur(retour, "Renseignez les trois clés avant d'activer l'encaissement.");
  }

  ecrire(
    `UPDATE agences
        SET encaissement_actif = ?, encaissement_fournisseur = ?, encaissement_mode = ?,
            encaissement_cle_maitre = ?, encaissement_cle_privee = ?, encaissement_jeton = ?
      WHERE id = ?`,
    actif, fournisseur, mode, cleMaitre, clePrivee, jeton, agence.id,
  );

  revalidatePath(retour);
  redirect(`${retour}?ok=1`);
}

/** Vérifie que les clés saisies fonctionnent vraiment chez le fournisseur. */
export async function actionTesterEncaissement() {
  const { agence } = await exigerSession();
  const retour = "/dashboard/encaissement";

  const cles = clesAgence(agence.id);
  if (!cles) {
    erreur(retour, "Activez l'encaissement et enregistrez vos trois clés avant de tester.");
  }

  const essai = await testerCles(cles, agence.nom, await adresseDuSite());
  if (!essai.ok) erreur(retour, `Échec du test : ${essai.erreur}`);

  redirect(`${retour}?teste=1`);
}

/** L'agence lance le règlement de son propre abonnement à Sen Gestion. */
export async function actionPayerAbonnement(fd: FormData) {
  const { agence } = await exigerSession();
  const retour = "/dashboard/abonnement";

  const codePlan = txt(fd, "plan");
  const periodicite = txt(fd, "periodicite") === "an" ? "an" : "mois";

  const ouverture = await ouvrirReglement(
    { id: agence.id, nom: agence.nom, telephone: agence.telephone },
    codePlan, periodicite, await adresseDuSite(),
  );
  if (!ouverture.ok) erreur(retour, ouverture.erreur);

  // On quitte le site pour la page du fournisseur : c'est chez lui, et jamais
  // ici, que le numero Orange Money ou Wave est saisi.
  redirect(ouverture.url);
}

/** L'agence lance le règlement de son abonnement par carte, via Stripe. */
export async function actionPayerAbonnementStripe(fd: FormData) {
  const { agence } = await exigerSession();
  const retour = "/dashboard/abonnement";

  const codePlan = txt(fd, "plan");
  const periodicite = txt(fd, "periodicite") === "an" ? "an" : "mois";

  const ouverture = await ouvrirReglementStripe(
    { id: agence.id }, codePlan, periodicite, await adresseDuSite(),
  );
  if (!ouverture.ok) erreur(retour, ouverture.erreur);

  redirect(ouverture.url);
}

/** Le locataire lance le paiement en ligne d'une de ses factures. */
export async function actionPayerEnLigne(fd: FormData) {
  const locataire = await exigerSessionLocataire();
  const factureId = entier(fd, "facture_id");
  const retour = "/espace-locataire/payer";

  const facture = un<{
    id: number; agence_id: number; reste: number; periode: string;
    agence_nom: string; agence_telephone: string | null;
  }>(
    `SELECT f.id, f.agence_id, f.periode,
            f.montant_total - COALESCE(p.paye, 0) AS reste,
            a.nom AS agence_nom, a.telephone AS agence_telephone
       FROM factures f
       JOIN contrats c ON c.id = f.contrat_id
       JOIN agences  a ON a.id = f.agence_id
       LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements
                   WHERE confirme = 1 GROUP BY facture_id) p ON p.facture_id = f.id
      WHERE f.id = ? AND c.locataire_id = ? AND f.statut != 'annulee'`,
    factureId, locataire.id,
  );
  if (!facture) erreur(retour, "Facture introuvable.");
  if (facture.reste <= 0) erreur(retour, "Cette quittance est déjà réglée.");

  const cles = clesAgence(facture.agence_id);
  if (!cles) erreur(retour, "Votre agence n'accepte pas encore le paiement en ligne.");

  // Le locataire peut regler une partie seulement, jamais plus que le reste du.
  const demande = montant(fd, "montant");
  const aPayer = demande > 0 ? Math.min(demande, facture.reste) : facture.reste;

  const site = await adresseDuSite();
  const creation = await creerPaiement(cles, {
    montant: aPayer,
    description: `Loyer ${periodeLisible(facture.periode)} — ${facture.agence_nom}`,
    nomAgence: facture.agence_nom,
    telephoneAgence: facture.agence_telephone,
    urlNotification: `${site}/api/encaissement/paydunya`,
    urlRetour: `${site}/espace-locataire/paiement`,
    urlAnnulation: `${site}/espace-locataire/payer?annule=1`,
    reference: { facture: String(facture.id), locataire: String(locataire.id) },
  });

  if (!creation.ok) erreur(retour, creation.erreur);

  ecrire(
    `INSERT INTO transactions
       (agence_id, facture_id, locataire_id, fournisseur, jeton, montant, statut)
     VALUES (?, ?, ?, ?, ?, ?, 'initiee')`,
    facture.agence_id, facture.id, locataire.id, cles.fournisseur, creation.jeton, aPayer,
  );

  redirect(creation.url);
}

// ---------------------------------------------------------------- artisans

export async function actionEnregistrerArtisan(fd: FormData) {
  const { agence } = await exigerSession();
  const id = entier(fd, "id");
  const nom = txt(fd, "nom");
  const telephone = txt(fd, "telephone");
  const retour = id ? `/dashboard/artisans/${id}` : "/dashboard/artisans/nouveau";

  if (!nom) erreur(retour, "Le nom est obligatoire.");
  if (!telephone) erreur(retour, "Le téléphone est obligatoire.");

  // Une photo televersee remplace l'adresse web ; sans nouvelle photo, on
  // garde celle qui est deja enregistree.
  const fichierPhoto = fd.get("photo");
  let photoUrl = vide(txt(fd, "photo_url"));
  if (fichierPhoto instanceof File && fichierPhoto.size > 0) {
    const { url, erreur: probleme } = await enregistrerPhotoProfil(fichierPhoto);
    if (probleme) erreur(retour, probleme);
    photoUrl = url;
  }

  const champs = [
    nom, txt(fd, "metier") || "autre", telephone,
    vide(txt(fd, "telephone2")), txt(fd, "ville") || "Dakar", vide(txt(fd, "quartier")),
    vide(txt(fd, "description")), vide(txt(fd, "tarif_indicatif")),
    photoUrl, coche(fd, "publie"),
  ];

  let artisanId = id;
  if (id) {
    ecrire(
      `UPDATE artisans SET nom=?, metier=?, telephone=?, telephone2=?, ville=?, quartier=?,
              description=?, tarif_indicatif=?, photo_url=?, publie=?
        WHERE id=? AND agence_id=?`,
      ...champs, id, agence.id,
    );
  } else {
    const res = ecrire(
      `INSERT INTO artisans (agence_id, nom, metier, telephone, telephone2, ville, quartier,
                             description, tarif_indicatif, photo_url, publie)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      agence.id, ...champs,
    );
    artisanId = Number(res.lastInsertRowid);
  }

  revalidatePath("/dashboard/artisans");
  revalidatePath("/professionnels");
  redirect(`/dashboard/artisans/${artisanId}?ok=1`);
}

export async function actionSupprimerArtisan(fd: FormData) {
  const { agence } = await exigerSession();
  ecrire("DELETE FROM artisans WHERE id = ? AND agence_id = ?", entier(fd, "id"), agence.id);
  revalidatePath("/dashboard/artisans");
  revalidatePath("/professionnels");
  redirect("/dashboard/artisans?supprime=1");
}

// ------------------------------------------- candidature d'un professionnel

/** Un professionnel postule depuis la vitrine publique. */
export async function actionCandidature(fd: FormData) {
  const retour = "/pro/candidature";
  const nom = txt(fd, "nom");
  const email = txt(fd, "email").toLowerCase();
  const telephone = txt(fd, "telephone");
  const metier = txt(fd, "metier");
  const motDePasse = String(fd.get("motDePasse") ?? "");

  if (!nom || !email || !telephone) erreur(retour, "Nom, e-mail et téléphone sont obligatoires.");
  if (!METIERS.some((m) => m.valeur === metier)) erreur(retour, "Choisissez votre corps de métier.");
  const refus = refusMotDePasse(motDePasse);
  if (refus) erreur(retour, refus);

  const existe = un<{ id: number }>("SELECT id FROM artisans WHERE email = ?", email);
  if (existe) erreur(retour, "Une candidature existe déjà avec cette adresse e-mail.");

  const cv = fd.get("cv");
  const { urls: cvUrls, erreurs: pbCv } = await enregistrerDocuments(
    cv instanceof File ? [cv] : [],
  );
  if (pbCv.length > 0) erreur(retour, pbCv[0]);

  const pieces = fd.getAll("documents").filter((f): f is File => f instanceof File);
  const { urls: docUrls, erreurs: pbDocs } = await enregistrerDocuments(pieces);

  // La photo est exigee : c'est ce qui rassure une agence ou un locataire
  // au moment de laisser entrer quelqu'un chez soi.
  const photo = fd.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    erreur(retour, "Ajoutez une photo de vous : elle rassure vos futurs clients.");
  }
  const { url: photoUrl, erreur: pbPhoto } = await enregistrerPhotoProfil(photo);
  if (pbPhoto) erreur(retour, pbPhoto);

  const res = ecrire(
    `INSERT INTO artisans
       (agence_id, origine, nom, metier, telephone, telephone2, ville, quartier,
        description, tarif_indicatif, photo_url, email, mot_de_passe_hash,
        experience_annees, cv_url, documents, statut_candidature, publie)
     VALUES (NULL, 'candidature', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', 1)`,
    nom, metier, telephone, vide(txt(fd, "telephone2")),
    txt(fd, "ville") || "Dakar", vide(txt(fd, "quartier")),
    vide(txt(fd, "description")), vide(txt(fd, "tarif_indicatif")), photoUrl,
    email, hacherMotDePasse(motDePasse), Math.max(0, entier(fd, "experience_annees")),
    cvUrls[0] ?? null, vide(docUrls.join("\n")),
  );

  await ouvrirSessionArtisan(Number(res.lastInsertRowid));
  revalidatePath("/admin/candidatures");

  const suffixe = pbDocs.length > 0
    ? `?avertissement=${encodeURIComponent(pbDocs.join(" "))}`
    : "?envoye=1";
  redirect(`/pro${suffixe}`);
}

export async function actionConnexionArtisan(fd: FormData) {
  const email = txt(fd, "email").toLowerCase();
  const motDePasse = String(fd.get("motDePasse") ?? "");
  const origine = await adresseIp();
  const cle = `pro:${email}`;

  if (tropDeTentatives(cle) || (origine !== null && tropDeTentatives(origine))) {
    erreur("/pro/connexion", `Trop de tentatives. Réessayez dans ${MINUTES_BLOCAGE} minutes.`);
  }

  const resultat = verifierIdentifiantsArtisan(email, motDePasse);
  if (!resultat.ok) {
    noterTentative(cle, false);
    if (origine !== null) noterTentative(origine, false);
    erreur("/pro/connexion", resultat.erreur);
  }

  reinitialiserTentatives(cle);
  if (origine !== null) reinitialiserTentatives(origine);
  await ouvrirSessionArtisan(resultat.id);
  redirect("/pro");
}

export async function actionDeconnexionArtisan() {
  await fermerSessionArtisan();
  redirect("/pro/connexion");
}

/** Le professionnel remplace sa photo de profil depuis son espace. */
export async function actionPhotoArtisan(fd: FormData) {
  const artisan = await exigerSessionArtisan();
  const retour = "/pro/photo";

  const fichier = fd.get("photo");
  if (!(fichier instanceof File) || fichier.size === 0) {
    erreur(retour, "Choisissez une photo avant d'enregistrer.");
  }

  const { url, erreur: probleme } = await enregistrerPhotoProfil(fichier);
  if (probleme) erreur(retour, probleme);
  if (!url) erreur(retour, "La photo n'a pas pu être enregistrée.");

  const ancienne = un<{ photo_url: string | null }>(
    "SELECT photo_url FROM artisans WHERE id = ?", artisan.id,
  );
  ecrire("UPDATE artisans SET photo_url = ? WHERE id = ?", url, artisan.id);
  if (ancienne?.photo_url) await supprimerPhoto(ancienne.photo_url);

  revalidatePath("/pro");
  revalidatePath("/professionnels");
  redirect(`${retour}?ok=1`);
}

// ------------------------------------------------------ quiz metier

/** L'artisan démarre son test. Le minuteur part à cet instant, côté serveur. */
export async function actionDemarrerQuiz() {
  const artisan = await exigerSessionArtisan();

  if (artisan.statut_candidature !== "valide") {
    erreur("/pro", "Votre candidature doit d'abord être validée par la plateforme.");
  }
  if (sessionEnCours(artisan.id)) redirect("/pro/quiz");

  const ouverture = ouvrirSessionQuiz(artisan.id, artisan.metier);
  if (!ouverture.ok) erreur("/pro", ouverture.erreur);
  redirect("/pro/quiz");
}

/** L'artisan rend sa copie. La correction se fait entièrement ici. */
export async function actionRendreQuiz(fd: FormData) {
  const artisan = await exigerSessionArtisan();

  const session = un<SessionQuiz>(
    `SELECT * FROM quiz_sessions
      WHERE id = ? AND artisan_id = ? AND termine_le IS NULL`,
    entier(fd, "session_id"), artisan.id,
  );
  if (!session) erreur("/pro", "Test introuvable ou déjà terminé.");

  // Les réponses arrivent sous la forme « reponse_<id de question> ».
  const reponses = new Map<number, number>();
  for (const [cle, valeur] of fd.entries()) {
    if (!cle.startsWith("reponse_")) continue;
    const questionId = Number(cle.slice("reponse_".length));
    const choix = Number(valeur);
    if (Number.isFinite(questionId) && Number.isFinite(choix)) {
      reponses.set(questionId, choix);
    }
  }

  corrigerSession(session, reponses);
  revalidatePath("/pro");
  revalidatePath("/professionnels");
  redirect(`/pro/quiz/resultat?s=${session.id}`);
}

// ------------------------------------ administration des candidatures

export async function actionStatuerCandidature(fd: FormData) {
  await exigerAdmin();
  const id = entier(fd, "id");
  const decision = txt(fd, "decision");

  if (!["valide", "refuse", "en_attente"].includes(decision)) {
    erreur("/admin/candidatures", "Décision inconnue.");
  }

  const candidature = un<{ id: number }>(
    "SELECT id FROM artisans WHERE id = ? AND origine = 'candidature'", id,
  );
  if (!candidature) erreur("/admin/candidatures", "Candidature introuvable.");

  ecrire(
    `UPDATE artisans
        SET statut_candidature = ?, motif_refus = ?,
            valide_le = CASE WHEN ? = 'valide' THEN datetime('now') ELSE valide_le END
      WHERE id = ?`,
    decision, decision === "refuse" ? vide(txt(fd, "motif")) : null, decision, id,
  );

  revalidatePath("/admin/candidatures");
  revalidatePath("/professionnels");
  redirect(`/admin/candidatures/${id}?ok=1`);
}

/** L'administrateur remplit la banque de questions d'un métier. */
export async function actionGenererQuestions(fd: FormData) {
  await exigerAdmin();
  const metier = txt(fd, "metier");

  if (coche(fd, "remplacer")) viderBanque(metier);

  const resultat = await genererQuestions(metier);
  if (!resultat.ok) erreur("/admin/quiz", resultat.erreur);

  revalidatePath("/admin/quiz");
  redirect(`/admin/quiz?ajoutees=${resultat.ajoutees}&metier=${encodeURIComponent(metier)}`);
}

// ----------------------------------------- interventions et avis clients

/**
 * Une agence déclare avoir fait appel à un artisan.
 * C'est cette déclaration qui ouvre le droit à un avis — un seul.
 */
export async function actionDeclarerIntervention(fd: FormData) {
  const { agence } = await exigerSession();
  const artisanId = entier(fd, "artisan_id");

  // Uniquement les artisans que CETTE agence gere elle-meme : sans ce
  // controle, n'importe quelle agence pourrait declarer une intervention
  // pour l'artisan d'une autre et lui fabriquer un faux avis.
  const artisan = un<{ id: number }>(
    "SELECT id FROM artisans WHERE id = ? AND agence_id = ?", artisanId, agence.id,
  );
  if (!artisan) erreur("/dashboard/artisans", "Artisan introuvable.");

  const jeton = crypto.randomBytes(24).toString("hex");
  ecrire(
    `INSERT INTO interventions (artisan_id, agence_id, description, date_intervention, jeton)
     VALUES (?, ?, ?, ?, ?)`,
    artisanId, agence.id, vide(txt(fd, "description")),
    txt(fd, "date_intervention") || aujourdhui(), jeton,
  );

  revalidatePath("/dashboard/interventions");
  redirect(`/avis/${jeton}`);
}

/** Le client note l'intervention. Le jeton ne sert qu'une fois. */
export async function actionDonnerAvis(fd: FormData) {
  const jeton = txt(fd, "jeton");
  const retour = `/avis/${jeton}`;
  const note = entier(fd, "note");

  if (note < 1 || note > 5) erreur(retour, "Choisissez une note de 1 à 5 étoiles.");

  const intervention = un<{ id: number; artisan_id: number }>(
    "SELECT id, artisan_id FROM interventions WHERE jeton = ?", jeton,
  );
  if (!intervention) erreur("/", "Ce lien d'avis n'est pas valable.");

  // La contrainte UNIQUE sur intervention_id fait foi ; ce test evite
  // seulement d'afficher une erreur technique au client.
  const deja = un<{ id: number }>(
    "SELECT id FROM avis WHERE intervention_id = ?", intervention.id,
  );
  if (deja) erreur(retour, "Un avis a déjà été donné pour cette intervention.");

  ecrire(
    `INSERT INTO avis (artisan_id, intervention_id, note, commentaire, auteur)
     VALUES (?, ?, ?, ?, ?)`,
    intervention.artisan_id, intervention.id, note,
    vide(txt(fd, "commentaire")), vide(txt(fd, "auteur")),
  );

  revalidatePath("/professionnels");
  redirect(`${retour}?merci=1`);
}

// ------------------------------------------------------------------ devis

/**
 * Un particulier demande un devis a un artisan, sans creer de compte.
 * Seuls les artisans qui ont leur propre espace (candidature validee)
 * peuvent en recevoir : un contact recommande par une agence n'a personne
 * pour y repondre.
 */
export async function actionDemanderDevis(fd: FormData) {
  const artisanId = entier(fd, "artisan_id");
  const retour = `/professionnels/${artisanId}/devis`;

  const artisan = artisanPourDevis(artisanId);
  if (!artisan) erreur("/professionnels", "Cet artisan ne peut pas recevoir de demande de devis.");

  const nom = txt(fd, "nom_client");
  const telephone = txt(fd, "telephone_client");
  const description = txt(fd, "description");
  if (!nom || !telephone) erreur(retour, "Votre nom et votre téléphone sont obligatoires.");
  if (!description) erreur(retour, "Décrivez le projet pour lequel vous souhaitez un devis.");

  const jeton = crypto.randomBytes(24).toString("hex");
  ecrire(
    `INSERT INTO devis (artisan_id, jeton, nom_client, telephone_client, ville, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    artisanId, jeton, nom, telephone, vide(txt(fd, "ville")), description,
  );

  revalidatePath("/pro/devis");
  redirect(`/devis/${jeton}`);
}

/** L'artisan propose un prix. Consomme le quota gratuit du mois. */
export async function actionRepondreDevis(fd: FormData) {
  const artisan = await exigerSessionArtisan();
  const id = entier(fd, "id");
  const retour = "/pro/devis";

  const devis = lireDevisArtisan(artisan.id, id);
  if (!devis) erreur(retour, "Ce devis est introuvable.");
  if (devis.statut !== "demande") erreur(retour, "Ce devis a déjà reçu une réponse.");

  const quota = etatQuotaDevis(artisan.plan_devis, devisReponduesCeMois(artisan.id));
  if (quota.atteint) {
    erreur(retour, `Vous avez utilisé vos ${quota.quota} devis gratuits de ce mois-ci. Passez à la formule Devis Pro pour continuer.`);
  }

  const prix = montant(fd, "montant_propose");
  if (prix <= 0) erreur(retour, "Indiquez un montant pour votre devis.");

  ecrire(
    `UPDATE devis
        SET statut = 'propose', montant_propose = ?, message_artisan = ?, repondu_le = datetime('now')
      WHERE id = ?`,
    prix, vide(txt(fd, "message_artisan")), id,
  );

  revalidatePath("/pro/devis");
  redirect(`${retour}?ok=1`);
}

/** L'artisan decline sans proposer de prix : ne consomme pas le quota. */
export async function actionDeclinerDevisArtisan(fd: FormData) {
  const artisan = await exigerSessionArtisan();
  const id = entier(fd, "id");
  const retour = "/pro/devis";

  const devis = lireDevisArtisan(artisan.id, id);
  if (!devis) erreur(retour, "Ce devis est introuvable.");
  if (devis.statut !== "demande") erreur(retour, "Ce devis a déjà reçu une réponse.");

  ecrire(
    `UPDATE devis SET statut = 'refuse', motif_refus = ?, repondu_le = datetime('now') WHERE id = ?`,
    vide(txt(fd, "motif_refus")) ?? "Ce projet ne peut pas être pris en charge.", id,
  );

  revalidatePath("/pro/devis");
  redirect(`${retour}?ok=1`);
}

/** Le particulier accepte le prix propose. */
export async function actionAccepterDevis(fd: FormData) {
  const jeton = txt(fd, "jeton");
  const retour = `/devis/${jeton}`;

  const devis = un<{ id: number; statut: string }>("SELECT id, statut FROM devis WHERE jeton = ?", jeton);
  if (!devis) erreur("/", "Ce lien de devis n'est pas valable.");
  if (devis.statut !== "propose") erreur(retour, "Ce devis ne peut plus être accepté.");

  ecrire("UPDATE devis SET statut = 'accepte' WHERE id = ?", devis.id);
  redirect(`${retour}?ok=1`);
}

/** Le particulier refuse le prix propose. */
export async function actionRefuserDevis(fd: FormData) {
  const jeton = txt(fd, "jeton");
  const retour = `/devis/${jeton}`;

  const devis = un<{ id: number; statut: string }>("SELECT id, statut FROM devis WHERE jeton = ?", jeton);
  if (!devis) erreur("/", "Ce lien de devis n'est pas valable.");
  if (devis.statut !== "propose") erreur(retour, "Ce devis ne peut plus être refusé.");

  ecrire(
    "UPDATE devis SET statut = 'refuse', motif_refus = ? WHERE id = ?",
    vide(txt(fd, "motif_refus")), devis.id,
  );
  redirect(`${retour}?ok=1`);
}

/**
 * L'artisan marque le projet termine. Ouvre automatiquement le droit a un
 * avis, sur le meme mecanisme que les interventions declarees par une
 * agence : le particulier ne cree rien, il suit simplement le lien.
 */
export async function actionTerminerDevis(fd: FormData) {
  const artisan = await exigerSessionArtisan();
  const id = entier(fd, "id");
  const retour = "/pro/devis";

  const devis = lireDevisArtisan(artisan.id, id);
  if (!devis) erreur(retour, "Ce devis est introuvable.");
  if (devis.statut !== "accepte") erreur(retour, "Seul un devis accepté peut être marqué terminé.");

  const jetonAvis = crypto.randomBytes(24).toString("hex");
  const conclure = db.transaction(() => {
    const resultat = ecrire(
      `INSERT INTO interventions (artisan_id, description, date_intervention, jeton)
       VALUES (?, ?, ?, ?)`,
      artisan.id, devis.description, aujourdhui(), jetonAvis,
    );
    ecrire(
      `UPDATE devis SET statut = 'termine', conclu_le = datetime('now'), intervention_id = ? WHERE id = ?`,
      resultat.lastInsertRowid, id,
    );
  });
  conclure();

  revalidatePath("/pro/devis");
  redirect(`${retour}?termine=1`);
}

/**
 * Change la formule de devis de l'artisan.
 * Comme pour les agences, la facturation n'est pas encore branchee : le
 * changement est immediat.
 */
export async function actionChangerPlanArtisan(fd: FormData) {
  const artisan = await exigerSessionArtisan();
  const code = txt(fd, "plan_devis");
  const retour = "/pro/devis";

  if (!PLANS_ARTISAN.some((p) => p.code === code)) erreur(retour, "Formule inconnue.");

  ecrire("UPDATE artisans SET plan_devis = ? WHERE id = ?", code, artisan.id);
  revalidatePath("/pro/devis");
  redirect(`${retour}?ok=1`);
}


// ------------------------------------------- remise des documents au locataire

/** Le document, son destinataire et son envoi — commun aux trois canaux. */
async function preparerEnvoi(fd: FormData) {
  const { agence } = await exigerSession();
  const factureId = entier(fd, "facture_id");
  const retour = `/dashboard/factures/${factureId}`;

  const facture = lireFacture(agence.id, factureId);
  if (!facture) erreur("/dashboard/factures", "Cette facture est introuvable.");

  const locataire = un<{ id: number; prenom: string; email: string | null; telephone: string }>(
    `SELECT l.id, l.prenom, l.email, l.telephone
       FROM contrats c JOIN locataires l ON l.id = c.locataire_id
      WHERE c.id = ?`,
    facture.contrat_id,
  );

  // Le code de verification doit exister avant l'envoi : le locataire ouvre
  // le document sans passer par la page d'impression de l'agence.
  codeVerification("quittance", facture.id);
  const envoi = envoiDuDocument({
    agenceId: agence.id, type: "quittance", documentId: facture.id,
    locataireId: locataire?.id ?? null,
  });

  return { agence, facture, locataire, envoi, retour };
}

export async function actionEnvoyerDocumentEmail(fd: FormData) {
  const { agence, facture, locataire, envoi, retour } = await preparerEnvoi(fd);

  if (!locataire?.email) {
    erreur(retour, "Ce locataire n'a pas d'adresse e-mail. Ajoutez-la sur sa fiche, ou remettez-lui le document en main propre.");
  }

  const lien = `${await adresseDuSite()}/document/${envoi.jeton}`;
  const { envoye } = await envoyerEmail({
    destinataire: locataire.email,
    sujet: `Votre quittance ${facture.numero} — ${agence.nom}`,
    texte:
      `Bonjour ${locataire.prenom},\n\n` +
      `${agence.nom} met à votre disposition votre quittance de loyer ${facture.numero} ` +
      `(période ${facture.periode}).\n\n` +
      `Consultez-la et imprimez-la ici :\n${lien}\n\n` +
      `Un code de réception vous est envoyé séparément sur WhatsApp. ` +
      `Saisissez-le sur cette page pour confirmer que vous avez bien reçu le document.\n\n` +
      `${agence.nom}`,
  });

  noterEnvoi(envoi.id, "email", locataire.email);
  revalidatePath(retour);

  // Sans serveur SMTP configure, le message part sur le disque : on le dit
  // plutot que d'afficher un succes trompeur.
  redirect(envoye
    ? `${retour}?ok=1`
    : `${retour}?avertissement=${encodeURIComponent("aucun serveur d'e-mail n'est configuré, le message a été écrit dans data/emails/ au lieu d'être envoyé.")}`);
}

/**
 * Ouvre WhatsApp avec le code de reception pre-rempli.
 *
 * Le code part par WhatsApp et le document par e-mail : c'est la separation
 * des deux canaux qui donne sa valeur a l'accuse. On n'envoie donc JAMAIS le
 * lien du document dans ce message.
 */
export async function actionEnvoyerCodeWhatsApp(fd: FormData) {
  const { agence, facture, locataire, envoi } = await preparerEnvoi(fd);
  if (!locataire) erreur("/dashboard/factures", "Locataire introuvable.");

  noterEnvoi(envoi.id, "whatsapp", locataire.telephone);

  const texte = messageWhatsApp({
    agence: agence.nom,
    prenom: locataire.prenom,
    quoi: `quittance ${facture.numero}`,
    code: envoi.code_reception,
  });
  redirect(`https://wa.me/${telephoneBrut(locataire.telephone)}?text=${encodeURIComponent(texte)}`);
}

export async function actionRemiseMainPropre(fd: FormData) {
  const { envoi, retour } = await preparerEnvoi(fd);
  noterEnvoi(envoi.id, "main_propre", null);
  revalidatePath(retour);
  redirect(`${retour}?ok=1`);
}

/** Accuse de reception saisi par le locataire depuis la page du document. */
export async function actionAccuserReception(fd: FormData) {
  const jeton = txt(fd, "jeton");
  const res = accuserReception(jeton, "code", txt(fd, "code"));
  if (!res.ok) erreur(`/document/${jeton}`, res.erreur);
  revalidatePath(`/document/${jeton}`);
  redirect(`/document/${jeton}?recu=1`);
}
