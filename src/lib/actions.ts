"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, ecrire, un } from "./db";
import { headers } from "next/headers";
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
  bienDisponible, genererFacturesDuMois, numeroFactureSuivant,
  referenceReservation, referenceSuivante,
} from "./requetes";
import { aujourdhui, dateValide, nuitsEntre, periodeLisible } from "./format";
import { chiffrementConfigure, chiffrer } from "./chiffrement";
import {
  clesAgence, creerPaiement, FOURNISSEURS, testerCles,
} from "./encaissement";
import { enregistrerPhotoProfil, enregistrerPhotos, supprimerPhoto } from "./photos";
import { peutAjouterBien, plan, planSuivant, PLANS } from "./tarifs";
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
  if (motDePasse.length < 6) erreur("/inscription", "Le mot de passe doit contenir au moins 6 caractères.");

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
    vide(txt(fd, "logo_url")),
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
  const n = genererFacturesDuMois(agence.id, periode);

  revalidatePath("/dashboard/factures");
  redirect(`/dashboard/factures?periode=${periode}&genere=${n}`);
}

export async function actionCreerFacture(fd: FormData) {
  const { agence } = await exigerSession();
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

export async function actionStatutDemande(fd: FormData) {
  const { agence } = await exigerSession();
  ecrire(
    "UPDATE demandes SET statut = ? WHERE id = ? AND agence_id = ?",
    txt(fd, "statut") || "traitee", entier(fd, "id"), agence.id,
  );
  revalidatePath("/dashboard/demandes");
  redirect("/dashboard/demandes");
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

  if (motDePasse.length < 6) erreur(retour, "Le mot de passe doit contenir au moins 6 caractères.");
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

  const champs = [
    nom, txt(fd, "metier") || "autre", telephone,
    vide(txt(fd, "telephone2")), txt(fd, "ville") || "Dakar", vide(txt(fd, "quartier")),
    vide(txt(fd, "description")), vide(txt(fd, "tarif_indicatif")),
    vide(txt(fd, "photo_url")), coche(fd, "publie"),
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
  if (motDePasse.length < 6) erreur(retour, "Le mot de passe doit contenir au moins 6 caractères.");

  const existe = un<{ id: number }>("SELECT id FROM artisans WHERE email = ?", email);
  if (existe) erreur(retour, "Une candidature existe déjà avec cette adresse e-mail.");

  const cv = fd.get("cv");
  const { urls: cvUrls, erreurs: pbCv } = await enregistrerDocuments(
    cv instanceof File ? [cv] : [],
  );
  if (pbCv.length > 0) erreur(retour, pbCv[0]);

  const pieces = fd.getAll("documents").filter((f): f is File => f instanceof File);
  const { urls: docUrls, erreurs: pbDocs } = await enregistrerDocuments(pieces);

  const res = ecrire(
    `INSERT INTO artisans
       (agence_id, origine, nom, metier, telephone, telephone2, ville, quartier,
        description, tarif_indicatif, email, mot_de_passe_hash, experience_annees,
        cv_url, documents, statut_candidature, publie)
     VALUES (NULL, 'candidature', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', 1)`,
    nom, metier, telephone, vide(txt(fd, "telephone2")),
    txt(fd, "ville") || "Dakar", vide(txt(fd, "quartier")),
    vide(txt(fd, "description")), vide(txt(fd, "tarif_indicatif")),
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

  const artisan = un<{ id: number }>("SELECT id FROM artisans WHERE id = ?", artisanId);
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
