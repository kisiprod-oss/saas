"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, ecrire, un } from "./db";
import {
  exigerSession, fermerSession, inscrireAgence, ouvrirSession, verifierMotDePasse,
} from "./auth";
import { genererFacturesDuMois, numeroFactureSuivant, referenceSuivante } from "./requetes";
import { aujourdhui } from "./format";
import { enregistrerPhotos, supprimerPhoto } from "./photos";
import { peutAjouterBien, plan, planSuivant, PLANS } from "./tarifs";

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

  const utilisateur = un<{ id: number; mot_de_passe_hash: string; actif: number }>(
    "SELECT id, mot_de_passe_hash, actif FROM utilisateurs WHERE email = ?",
    email,
  );

  if (!utilisateur || !utilisateur.actif || !verifierMotDePasse(motDePasse, utilisateur.mot_de_passe_hash)) {
    erreur("/connexion", "E-mail ou mot de passe incorrect.");
  }

  await ouvrirSession(utilisateur.id);
  redirect("/dashboard");
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
            adresse = ?, ville = ?, logo_url = ?, commission_pct = ?
      WHERE id = ?`,
    txt(fd, "nom") || agence.nom,
    vide(txt(fd, "ninea")), vide(txt(fd, "rccm")),
    vide(txt(fd, "telephone")), vide(txt(fd, "email")),
    vide(txt(fd, "adresse")), vide(txt(fd, "ville")),
    vide(txt(fd, "logo_url")),
    entier(fd, "commission_pct", 10),
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
    txt(fd, "statut") || "disponible", coche(fd, "publie"),
    vide(txt(fd, "proprietaire_nom")), vide(txt(fd, "proprietaire_telephone")),
  ];

  let bienId = id;

  if (id) {
    ecrire(
      `UPDATE biens SET titre=?, type=?, description=?, ville=?, quartier=?, adresse=?,
              chambres=?, salles_bain=?, surface=?, etage=?, meuble=?, equipements=?, photos=?,
              loyer=?, charges=?, caution_mois=?, statut=?, publie=?,
              proprietaire_nom=?, proprietaire_telephone=?
        WHERE id=? AND agence_id=?`,
      ...champs, id, agence.id,
    );
  } else {
    const res = ecrire(
      `INSERT INTO biens (agence_id, reference, titre, type, description, ville, quartier, adresse,
                          chambres, salles_bain, surface, etage, meuble, equipements, photos,
                          loyer, charges, caution_mois, statut, publie,
                          proprietaire_nom, proprietaire_telephone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
