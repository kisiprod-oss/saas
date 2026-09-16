"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { un, ecrire, transaction } from "./db";
import { exigerSession } from "./auth";
import { peutAjouterProduit } from "./offres";
import { enSlug } from "./format";
import * as photos from "./photos";
import { produit as lireProduit, variantes as lireVariantes } from "./requetes";
import { genererDescription } from "./ia";

/**
 * Les écritures du catalogue : produits, catégories, variantes, zones.
 *
 * Chaque action commence par `exigerSession()`. L'identifiant de boutique
 * utilisé dans les requêtes vient de là, JAMAIS du formulaire. Un formulaire
 * modifié dans les outils du navigateur ne peut donc pas viser la boutique
 * d'un autre : au pire, il vise un produit qui n'existe pas chez lui, et la
 * requête ne modifie aucune ligne.
 */

export type Etat = { erreur?: string; message?: string; champ?: string };

const CONTROLE = new RegExp("[\\u0000-\\u001F]", "g");

/** Un entier positif tiré d'un champ de formulaire, ou 0. */
function entier(valeur: FormDataEntryValue | null, max = 100_000_000): number {
  const n = Math.trunc(Number(String(valeur ?? "").replace(/[^\d-]/g, "")));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

function texte(valeur: FormDataEntryValue | null, max: number): string {
  // Les caracteres de controle (retours chariot des copier-coller, octets
  // nuls) sont remplaces par une espace : invisibles, ils cassent les
  // exports CSV et les messages WhatsApp.
  return String(valeur ?? "").replace(CONTROLE, " ").trim().slice(0, max);
}

/** Identifiant d'adresse unique DANS la boutique (deux boutiques peuvent le partager). */
function slugProduitLibre(boutiqueId: number, nom: string, sauf?: number): string {
  const base = enSlug(nom) || "produit";
  let slug = base;
  let n = 2;
  while (un(
    "SELECT id FROM produits WHERE boutique_id = ? AND slug = ? AND id IS NOT ?",
    boutiqueId, slug, sauf ?? null,
  )) slug = `${base}-${n++}`;
  return slug;
}

// ---------------------------------------------------------------------------
//  Produits
// ---------------------------------------------------------------------------

/**
 * Lit les caractéristiques d'un formulaire : des paires de champs
 * `caract_nom[]` / `caract_valeur[]`. Les lignes vides sont ignorées.
 */
function lireCaracteristiques(donnees: FormData): { nom: string; valeur: string }[] {
  const noms = donnees.getAll("caract_nom").map((v) => texte(v, 60));
  const valeurs = donnees.getAll("caract_valeur").map((v) => texte(v, 160));
  const resultat: { nom: string; valeur: string }[] = [];
  for (let i = 0; i < Math.min(noms.length, 20); i++) {
    if (noms[i] && valeurs[i]) resultat.push({ nom: noms[i], valeur: valeurs[i] });
  }
  return resultat;
}

export async function actionEnregistrerProduit(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const idBrut = donnees.get("id");
  const id = idBrut ? entier(idBrut) : 0;
  const existant = id ? lireProduit(boutique.id, id) : undefined;
  if (id && !existant) return { erreur: "Ce produit n'existe pas." };

  // La limite de l'offre est vérifiée ici, à la création seulement : modifier
  // un produit existant reste possible même au-dessus du quota, sinon un
  // commerçant qui change de formule se retrouverait incapable de corriger
  // une faute de frappe sur ses propres fiches.
  if (!existant) {
    const place = peutAjouterProduit(boutique);
    if (!place.ok) {
      return {
        erreur: `${place.raison} Changez de formule pour en ajouter davantage.`,
      };
    }
  }

  const nom = texte(donnees.get("nom"), 120);
  if (nom.length < 2) return { erreur: "Donnez un nom à ce produit.", champ: "nom" };

  const prix = entier(donnees.get("prix"));
  const prixBarre = entier(donnees.get("prix_barre"));
  const stock = entier(donnees.get("stock"), 1_000_000);
  const seuil = entier(donnees.get("seuil_alerte"), 10_000);
  const suiviStock = donnees.get("suivi_stock") === "1" ? 1 : 0;
  const actif = donnees.get("actif") === "1" ? 1 : 0;
  const description = texte(donnees.get("description"), 4000);
  const varianteLibelle = texte(donnees.get("variante_libelle"), 40) || null;
  const caracteristiques = lireCaracteristiques(donnees);

  const categorieBrute = entier(donnees.get("categorie_id"));
  // La catégorie doit appartenir à CETTE boutique. Sans ce contrôle, un
  // identifiant deviné rattacherait le produit à la catégorie d'un autre.
  const categorieId = categorieBrute && un(
    "SELECT id FROM categories WHERE boutique_id = ? AND id = ?", boutique.id, categorieBrute,
  ) ? categorieBrute : null;

  if (prixBarre > 0 && prixBarre <= prix) {
    return {
      erreur: "Le prix barré doit être plus élevé que le prix de vente.",
      champ: "prix_barre",
    };
  }

  let produitId = id;
  if (existant) {
    ecrire(
      `UPDATE produits SET nom = ?, slug = ?, description = ?, caracteristiques = ?,
              prix = ?, prix_barre = ?, stock = ?, suivi_stock = ?, seuil_alerte = ?,
              categorie_id = ?, variante_libelle = ?, actif = ?
        WHERE boutique_id = ? AND id = ?`,
      nom, slugProduitLibre(boutique.id, nom, id), description || null,
      JSON.stringify(caracteristiques), prix, prixBarre || null,
      // Un produit à variantes tient son stock dans ses variantes : on ne
      // laisse pas deux sources de vérité se contredire.
      lireVariantes(boutique.id, id).length > 0 ? existant.stock : stock,
      suiviStock, seuil, categorieId, varianteLibelle, actif,
      boutique.id, id,
    );
  } else {
    const insertion = ecrire(
      `INSERT INTO produits (boutique_id, categorie_id, nom, slug, description,
                             caracteristiques, prix, prix_barre, stock, suivi_stock,
                             seuil_alerte, photos, type, variante_libelle, actif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 'physique', ?, ?)`,
      boutique.id, categorieId, nom, slugProduitLibre(boutique.id, nom),
      description || null, JSON.stringify(caracteristiques), prix, prixBarre || null,
      stock, suiviStock, seuil, varianteLibelle, actif,
    );
    produitId = Number(insertion.lastInsertRowid);
  }

  // Photos : elles arrivent dans le même envoi. Une photo refusée n'annule
  // pas l'enregistrement du produit — on le dit, et le reste est sauvé.
  const fichiers = donnees.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const refus: string[] = [];
  if (fichiers.length > 0) {
    const actuelles = existant ? existant.photos : [];
    const ajoutees: string[] = [];
    for (const fichier of fichiers.slice(0, 8 - actuelles.length)) {
      const resultat = await photos.enregistrer(boutique.id, fichier);
      if (resultat.ok) ajoutees.push(resultat.fichier);
      else refus.push(resultat.erreur);
    }
    if (ajoutees.length > 0) {
      ecrire("UPDATE produits SET photos = ? WHERE boutique_id = ? AND id = ?",
        JSON.stringify([...actuelles, ...ajoutees].slice(0, 8)), boutique.id, produitId);
    }
  }

  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/b/${boutique.slug}`);

  if (refus.length > 0) {
    return {
      message: `Produit enregistré, mais ${refus.length} image refusée : ${refus[0]}`,
    };
  }
  redirect(`/tableau-de-bord/produits/${produitId}?enregistre=1`);
}

export async function actionSupprimerProduit(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const produit = lireProduit(boutique.id, id);
  if (!produit) return;

  // Les fichiers partent avec la ligne : sinon le disque se remplit de photos
  // de produits supprimés que plus rien ne référence.
  for (const fichier of produit.photos) photos.supprimer(boutique.id, fichier);
  ecrire("DELETE FROM produits WHERE boutique_id = ? AND id = ?", boutique.id, id);

  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/b/${boutique.slug}`);
  redirect("/tableau-de-bord/produits");
}

export async function actionBasculerProduit(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  ecrire(
    "UPDATE produits SET actif = 1 - actif WHERE boutique_id = ? AND id = ?",
    boutique.id, id,
  );
  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/b/${boutique.slug}`);
}

export async function actionSupprimerPhoto(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const fichier = texte(donnees.get("fichier"), 60);
  const produit = lireProduit(boutique.id, id);
  if (!produit || !produit.photos.includes(fichier)) return;

  photos.supprimer(boutique.id, fichier);
  ecrire(
    "UPDATE produits SET photos = ? WHERE boutique_id = ? AND id = ?",
    JSON.stringify(produit.photos.filter((p) => p !== fichier)), boutique.id, id,
  );
  revalidatePath(`/tableau-de-bord/produits/${id}`);
  revalidatePath(`/b/${boutique.slug}`);
}

/** Ajuste le stock d'un coup, depuis la liste des produits. */
export async function actionAjusterStock(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const stock = entier(donnees.get("stock"), 1_000_000);
  // Un produit à variantes tire son stock de ses variantes : on refuse la
  // saisie directe plutôt que de créer une incohérence silencieuse.
  if (lireVariantes(boutique.id, id).length > 0) return;
  ecrire("UPDATE produits SET stock = ? WHERE boutique_id = ? AND id = ?", stock, boutique.id, id);
  revalidatePath("/tableau-de-bord/produits");
}

// ---------------------------------------------------------------------------
//  Variantes
// ---------------------------------------------------------------------------

export async function actionEnregistrerVariantes(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();
  const produitId = entier(donnees.get("produit_id"));
  if (!lireProduit(boutique.id, produitId)) return { erreur: "Ce produit n'existe pas." };

  const libelle = texte(donnees.get("variante_libelle"), 40);
  const valeurs = donnees.getAll("variante_valeur").map((v) => texte(v, 60));
  const supplements = donnees.getAll("variante_supplement").map((v) => entier(v));
  const stocks = donnees.getAll("variante_stock").map((v) => entier(v, 1_000_000));
  const ids = donnees.getAll("variante_id").map((v) => entier(v));

  transaction(() => {
    const gardes = new Set<number>();
    for (let i = 0; i < valeurs.length; i++) {
      if (!valeurs[i]) continue;
      if (ids[i]) {
        ecrire(
          `UPDATE variantes SET valeur = ?, supplement = ?, stock = ?, ordre = ?
            WHERE boutique_id = ? AND produit_id = ? AND id = ?`,
          valeurs[i], supplements[i] ?? 0, stocks[i] ?? 0, i,
          boutique.id, produitId, ids[i],
        );
        gardes.add(ids[i]);
      } else {
        const r = ecrire(
          `INSERT INTO variantes (boutique_id, produit_id, valeur, supplement, stock, ordre)
           VALUES (?, ?, ?, ?, ?, ?)`,
          boutique.id, produitId, valeurs[i], supplements[i] ?? 0, stocks[i] ?? 0, i,
        );
        gardes.add(Number(r.lastInsertRowid));
      }
    }
    // Les variantes absentes du formulaire ont été retirées par le commerçant.
    for (const ancienne of lireVariantes(boutique.id, produitId)) {
      if (!gardes.has(ancienne.id)) {
        ecrire("DELETE FROM variantes WHERE boutique_id = ? AND id = ?", boutique.id, ancienne.id);
      }
    }
    const total = un<{ n: number }>(
      "SELECT COALESCE(SUM(stock), 0) n FROM variantes WHERE boutique_id = ? AND produit_id = ?",
      boutique.id, produitId,
    )?.n ?? 0;
    const combien = un<{ n: number }>(
      "SELECT COUNT(*) n FROM variantes WHERE boutique_id = ? AND produit_id = ?",
      boutique.id, produitId,
    )?.n ?? 0;
    ecrire(
      `UPDATE produits SET variante_libelle = ?, stock = CASE WHEN ? > 0 THEN ? ELSE stock END
        WHERE boutique_id = ? AND id = ?`,
      combien > 0 ? (libelle || "Option") : null, combien, total, boutique.id, produitId,
    );
  });

  revalidatePath(`/tableau-de-bord/produits/${produitId}`);
  revalidatePath(`/b/${boutique.slug}`);
  return { message: "Options enregistrées." };
}

// ---------------------------------------------------------------------------
//  Catégories
// ---------------------------------------------------------------------------

export async function actionEnregistrerCategorie(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const nom = texte(donnees.get("nom"), 60);
  if (nom.length < 2) return { erreur: "Donnez un nom à cette catégorie." };

  const base = enSlug(nom) || "categorie";
  let slug = base;
  let n = 2;
  while (un(
    "SELECT id FROM categories WHERE boutique_id = ? AND slug = ? AND id IS NOT ?",
    boutique.id, slug, id || null,
  )) slug = `${base}-${n++}`;

  if (id) {
    ecrire("UPDATE categories SET nom = ?, slug = ? WHERE boutique_id = ? AND id = ?",
      nom, slug, boutique.id, id);
  } else {
    ecrire("INSERT INTO categories (boutique_id, nom, slug, ordre) VALUES (?, ?, ?, ?)",
      boutique.id, nom, slug,
      (un<{ n: number }>("SELECT COUNT(*) n FROM categories WHERE boutique_id = ?", boutique.id)?.n ?? 0) + 1);
  }
  revalidatePath("/tableau-de-bord/categories");
  revalidatePath(`/b/${boutique.slug}`);
  return { message: id ? "Catégorie modifiée." : "Catégorie créée." };
}

export async function actionSupprimerCategorie(donnees: FormData) {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  // Les produits ne sont pas supprimés avec la catégorie : ils la perdent,
  // simplement. Supprimer un rayon ne doit pas vider le magasin.
  ecrire("DELETE FROM categories WHERE boutique_id = ? AND id = ?", boutique.id, id);
  revalidatePath("/tableau-de-bord/categories");
  revalidatePath(`/b/${boutique.slug}`);
}

// ---------------------------------------------------------------------------
//  Zones de livraison
// ---------------------------------------------------------------------------

export async function actionEnregistrerZone(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();
  const id = entier(donnees.get("id"));
  const nom = texte(donnees.get("nom"), 60);
  const frais = entier(donnees.get("frais"));
  const delai = texte(donnees.get("delai"), 60);
  if (nom.length < 2) return { erreur: "Donnez un nom à cette zone (un quartier, une ville)." };

  if (id) {
    ecrire(
      "UPDATE zones_livraison SET nom = ?, frais = ?, delai = ? WHERE boutique_id = ? AND id = ?",
      nom, frais, delai || null, boutique.id, id,
    );
  } else {
    ecrire(
      "INSERT INTO zones_livraison (boutique_id, nom, frais, delai, ordre) VALUES (?, ?, ?, ?, ?)",
      boutique.id, nom, frais, delai || null,
      (un<{ n: number }>("SELECT COUNT(*) n FROM zones_livraison WHERE boutique_id = ?", boutique.id)?.n ?? 0) + 1,
    );
  }
  revalidatePath("/tableau-de-bord/livraison");
  return { message: id ? "Zone modifiée." : "Zone ajoutée." };
}

export async function actionSupprimerZone(donnees: FormData) {
  const { boutique } = await exigerSession();
  ecrire("DELETE FROM zones_livraison WHERE boutique_id = ? AND id = ?",
    boutique.id, entier(donnees.get("id")));
  revalidatePath("/tableau-de-bord/livraison");
}

export async function actionBasculerZone(donnees: FormData) {
  const { boutique } = await exigerSession();
  ecrire("UPDATE zones_livraison SET actif = 1 - actif WHERE boutique_id = ? AND id = ?",
    boutique.id, entier(donnees.get("id")));
  revalidatePath("/tableau-de-bord/livraison");
}

// ---------------------------------------------------------------------------
//  Description écrite par l'assistant
// ---------------------------------------------------------------------------

export type EtatDescription = Etat & { description?: string; moteur?: string };

/**
 * Propose une description. Elle n'est PAS enregistrée : elle revient dans le
 * champ, le commerçant la lit, la corrige, et c'est son enregistrement à lui
 * qui la fixe. L'IA ne remplit jamais la base toute seule.
 */
export async function actionDecrireProduit(
  _precedent: EtatDescription, donnees: FormData,
): Promise<EtatDescription> {
  const { boutique, utilisateur } = await exigerSession();

  const nom = texte(donnees.get("nom"), 120);
  if (nom.length < 2) {
    return { erreur: "Donnez d'abord un nom au produit : l'assistant part de là." };
  }

  const resultat = await genererDescription(boutique, utilisateur.id, {
    nom,
    caracteristiques: lireCaracteristiques(donnees),
    notes: texte(donnees.get("notes_ia"), 500),
  });

  if (!resultat.ok) return { erreur: resultat.erreur };
  return {
    description: resultat.valeur,
    moteur: resultat.moteur,
    message: resultat.moteur === "local"
      ? "Texte composé à partir de vos caractéristiques (assistant intelligent non activé)."
      : "Proposition de l'assistant. Relisez-la : elle n'est enregistrée que si vous enregistrez le produit.",
  };
}
