"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { un, ecrire } from "./db";
import { exigerSession } from "./auth";
import { canonique } from "./telephone";
import { paysDe, paysServis } from "./pays";
import { enSlug } from "./format";
import { peutAjouterProduit } from "./offres";
import { contenuParDefaut, MODELES, type Modele } from "./sections";
import { couleurSure } from "./modeles";
import { ecrireBrouillon } from "./versions";
import { genererStructure, paletteLocale } from "./ia";
import { categories as lireCategories, produits as lireProduits } from "./requetes";
import { ACTIVITES } from "./activites";
import * as photos from "./photos";

/**
 * L'assistant de création, en cinq étapes.
 *
 * ============================================================================
 *  LA PROGRESSION EST SAUVEGARDÉE À CHAQUE ÉTAPE
 * ============================================================================
 *  `boutiques.etape_assistant` avance d'un cran à chaque validation. Un
 *  commerçant peut fermer son téléphone au milieu de l'étape 3 et revenir le
 *  lendemain : il retombe exactement là. Rien n'est gardé en mémoire de
 *  session, rien ne dépend d'un onglet resté ouvert.
 *
 *  Le compteur ne recule jamais tout seul : revenir en arrière pour corriger
 *  ne fait pas perdre les étapes déjà franchies.
 * ============================================================================
 */

export type Etat = { erreur?: string; message?: string };

const CONTROLE = new RegExp("[\\u0000-\\u001F]", "g");

function texte(valeur: FormDataEntryValue | null, max: number): string {
  return String(valeur ?? "").replace(CONTROLE, " ").trim().slice(0, max);
}

function entier(valeur: FormDataEntryValue | null, max = 100_000_000): number {
  const n = Math.trunc(Number(String(valeur ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

/** Fait avancer le compteur, sans jamais le faire reculer. */
function avancer(boutiqueId: number, etape: number) {
  ecrire(
    "UPDATE boutiques SET etape_assistant = MAX(etape_assistant, ?) WHERE id = ?",
    Math.min(5, etape), boutiqueId,
  );
}


// ---------------------------------------------------------------------------
//  Étape 1 — activité, nom, description
// ---------------------------------------------------------------------------

export async function actionEtape1(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();

  const nom = texte(donnees.get("nom"), 80);
  if (nom.length < 2) return { erreur: "Donnez un nom à votre boutique." };

  const activite = texte(donnees.get("activite"), 40);
  if (!ACTIVITES.some(([code]) => code === activite)) {
    return { erreur: "Choisissez votre type d'activité." };
  }
  const description = texte(donnees.get("description"), 600);

  // L'adresse publique suit le nom TANT QUE la boutique n'est pas publiée.
  // Après publication, on n'y touche plus : changer l'adresse casserait tous
  // les liens que le commerçant a déjà partagés.
  let slug = boutique.slug;
  if (!boutique.publiee_le && enSlug(nom) && enSlug(nom) !== boutique.slug) {
    const base = enSlug(nom);
    let candidat = base;
    let n = 2;
    while (un("SELECT id FROM boutiques WHERE slug = ? AND id <> ?", candidat, boutique.id)) {
      candidat = `${base}-${n++}`;
    }
    slug = candidat;
  }

  ecrire(
    "UPDATE boutiques SET nom = ?, slug = ?, activite = ?, description = ? WHERE id = ?",
    nom, slug, activite, description || null, boutique.id,
  );

  // Le brouillon de départ reprend le nom et la description : l'aperçu de
  // l'étape 5 montre quelque chose, même sans passer par l'assistant IA.
  ecrireBrouillon(boutique.id, contenuParDefaut(nom, description), {
    origine: "assistant", resume: "Contenu de départ", poserInstantane: false,
  });

  avancer(boutique.id, 2);
  redirect("/creer?etape=2");
}

// ---------------------------------------------------------------------------
//  Étape 2 — pays, ville, coordonnées
// ---------------------------------------------------------------------------

export async function actionEtape2(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();

  const codePays = texte(donnees.get("pays"), 2).toUpperCase();
  const servis = paysServis();
  if (!servis.some((p) => p.code === codePays)) {
    return { erreur: "Ce pays n'est pas encore ouvert. Écrivez-nous pour le demander." };
  }
  const pays = paysDe(codePays);

  const ville = texte(donnees.get("ville"), 80);
  if (ville.length < 2) return { erreur: "Indiquez votre ville." };

  const telephone = canonique(texte(donnees.get("telephone"), 40), {
    indicatif: pays.indicatif, longueur: pays.longueur_nationale,
  });
  if (!telephone) {
    return {
      erreur: `Ce numéro n'est pas valide pour ${pays.nom} `
        + `(${pays.longueur_nationale} chiffres après ${pays.indicatif}).`,
    };
  }

  const whatsappBrut = texte(donnees.get("whatsapp"), 40);
  const whatsapp = whatsappBrut
    ? canonique(whatsappBrut, { indicatif: pays.indicatif, longueur: pays.longueur_nationale })
    : telephone;
  if (whatsappBrut && !whatsapp) {
    return { erreur: "Le numéro WhatsApp n'est pas valide." };
  }

  ecrire(
    `UPDATE boutiques SET pays = ?, ville = ?, quartier = ?, adresse = ?,
            telephone = ?, whatsapp = ?, email = ? WHERE id = ?`,
    codePays, ville, texte(donnees.get("quartier"), 80) || null,
    texte(donnees.get("adresse"), 200) || null, telephone, whatsapp,
    texte(donnees.get("email"), 160) || boutique.email, boutique.id,
  );

  avancer(boutique.id, 3);
  redirect("/creer?etape=3");
}

// ---------------------------------------------------------------------------
//  Étape 3 — logo, couleur, modèle
// ---------------------------------------------------------------------------

export async function actionEtape3(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();

  const modeleBrut = texte(donnees.get("modele"), 20);
  const modele: Modele = (MODELES as readonly string[]).includes(modeleBrut)
    ? (modeleBrut as Modele) : "epure";
  const couleur = couleurSure(texte(donnees.get("couleur"), 7));

  let logo = boutique.logo_url;
  const fichier = donnees.get("logo");
  if (fichier instanceof File && fichier.size > 0) {
    const resultat = await photos.enregistrer(boutique.id, fichier);
    if (!resultat.ok) return { erreur: resultat.erreur };
    if (logo) photos.supprimer(boutique.id, logo);
    logo = resultat.fichier;
  }

  ecrire(
    "UPDATE boutiques SET modele = ?, couleur = ?, logo_url = ? WHERE id = ?",
    modele, couleur, logo, boutique.id,
  );
  avancer(boutique.id, 4);
  redirect("/creer?etape=4");
}

/** Propose une couleur et un modèle, sans les appliquer. */
export async function actionProposerPalette(): Promise<{
  couleur: string; modele: string; explication: string; erreur?: string;
}> {
  const { boutique, utilisateur } = await exigerSession();
  const { genererPalette } = await import("./ia");
  const resultat = await genererPalette(boutique, utilisateur.id);

  if (!resultat.ok) {
    const repli = paletteLocale(boutique.activite);
    return { ...repli, explication: "", erreur: resultat.erreur };
  }
  return resultat.valeur;
}

// ---------------------------------------------------------------------------
//  Étape 4 — premier produit
// ---------------------------------------------------------------------------

export async function actionEtape4(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();

  // Le commerçant peut passer cette étape : certains veulent d'abord voir la
  // boutique, et ajouteront leurs produits ensuite.
  if (donnees.get("passer") === "1") {
    avancer(boutique.id, 5);
    redirect("/creer?etape=5");
  }

  const nom = texte(donnees.get("nom"), 120);
  if (nom.length < 2) return { erreur: "Donnez un nom à ce produit." };

  const prix = entier(donnees.get("prix"));
  if (prix <= 0) return { erreur: "Indiquez le prix de vente." };

  const place = peutAjouterProduit(boutique);
  if (!place.ok) return { erreur: place.raison };

  const noms = donnees.getAll("caract_nom").map((v) => texte(v, 60));
  const valeurs = donnees.getAll("caract_valeur").map((v) => texte(v, 160));
  const caracteristiques: { nom: string; valeur: string }[] = [];
  for (let i = 0; i < Math.min(noms.length, 10); i++) {
    if (noms[i] && valeurs[i]) caracteristiques.push({ nom: noms[i], valeur: valeurs[i] });
  }

  const base = enSlug(nom) || "produit";
  let slug = base;
  let n = 2;
  while (un("SELECT id FROM produits WHERE boutique_id = ? AND slug = ?", boutique.id, slug)) {
    slug = `${base}-${n++}`;
  }

  const insertion = ecrire(
    `INSERT INTO produits (boutique_id, nom, slug, description, caracteristiques,
                           prix, stock, suivi_stock, seuil_alerte, photos, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 3, '[]', 1)`,
    boutique.id, nom, slug, texte(donnees.get("description"), 4000) || null,
    JSON.stringify(caracteristiques), prix, entier(donnees.get("stock"), 1_000_000),
  );
  const produitId = Number(insertion.lastInsertRowid);

  const fichiers = donnees.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const ajoutees: string[] = [];
  for (const fichier of fichiers.slice(0, 5)) {
    const resultat = await photos.enregistrer(boutique.id, fichier);
    if (resultat.ok) ajoutees.push(resultat.fichier);
  }
  if (ajoutees.length > 0) {
    ecrire("UPDATE produits SET photos = ? WHERE boutique_id = ? AND id = ?",
      JSON.stringify(ajoutees), boutique.id, produitId);
  }

  avancer(boutique.id, 5);
  redirect("/creer?etape=5");
}

// ---------------------------------------------------------------------------
//  Étape 5 — génération de la page, puis publication
// ---------------------------------------------------------------------------

/**
 * Demande à l'assistant de composer la page d'accueil.
 *
 * Le résultat va dans le BROUILLON, et seulement là. L'aperçu de l'étape 5 le
 * montre ; rien n'est en ligne tant que le commerçant n'a pas publié.
 */
export async function actionGenererPage(): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();

  const resultat = await genererStructure(boutique, utilisateur.id, {
    categories: lireCategories(boutique.id).map((c) => c.nom),
    produits: lireProduits(boutique.id, { limite: 20 }).map((p) => p.nom),
  });

  if (!resultat.ok) return { erreur: resultat.erreur };

  ecrireBrouillon(boutique.id, resultat.valeur, {
    origine: "ia", resume: "Page composée par l'assistant", utilisateurId: utilisateur.id,
  });
  revalidatePath("/creer");
  return {
    message: resultat.moteur === "local"
      ? "Page composée à partir de vos informations (assistant intelligent non activé)."
      : "Votre page est prête. Relisez-la avant de publier.",
  };
}

export async function actionTerminerAssistant() {
  const { boutique } = await exigerSession();
  ecrire(
    "UPDATE boutiques SET etape_assistant = 5, assistant_fini_le = datetime('now') WHERE id = ?",
    boutique.id,
  );
  redirect("/tableau-de-bord");
}

/** Revenir à une étape précédente pour corriger. */
export async function actionRevenirEtape(donnees: FormData) {
  await exigerSession();
  const etape = Math.min(5, Math.max(1, Number(donnees.get("etape")) || 1));
  redirect(`/creer?etape=${etape}`);
}
