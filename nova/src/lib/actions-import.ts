"use server";

import { revalidatePath } from "next/cache";
import { un, ecrire } from "./db";
import { exigerSession } from "./auth";
import { limiter, messageAttente } from "./limites";
import { peutAjouterProduit } from "./offres";
import { enSlug } from "./format";
import { paysDe } from "./pays";
import { lireTaux, DEVISES_SOURCE } from "./devises";
import { recupererImage } from "./import-web";
import {
  importerDepuisLien, importerDepuisPhoto, importAutorise, lireImport,
  type Proposition,
} from "./import-produit";
import * as photos from "./photos";

/**
 * Les actions d'import.
 *
 * ============================================================================
 *  CE QUI REVIENT DU NAVIGATEUR N'EST PAS CRU
 * ============================================================================
 *  Une proposition d'import fait un aller-retour : le serveur la fabrique, le
 *  commerçant la corrige à l'écran, elle revient. Rien de ce qui revient n'est
 *  pris pour argent comptant.
 *
 *  Les champs que le commerçant a le droit de fixer — nom, description, prix,
 *  stock, catégorie, caractéristiques — sont relus et validés comme ceux de
 *  n'importe quel produit saisi à la main.
 *
 *  L'ADRESSE DE L'IMAGE, elle, n'est PAS prise du formulaire : elle est relue
 *  dans `imports_produit.charge_utile`, c'est-à-dire dans ce que le serveur
 *  avait lui-même extrait. Le navigateur n'envoie qu'un NUMÉRO d'image. Sans
 *  cela, un formulaire modifié pourrait faire télécharger au serveur une
 *  adresse de son choix — et le garde-fou anti-SSRF, aussi solide soit-il, n'a
 *  pas à être la seule ligne de défense.
 * ============================================================================
 */

export type Etat = { erreur?: string; message?: string; conseil?: string };
export type EtatProposition = Etat & { proposition?: Proposition };

const CONTROLE = new RegExp("[\\u0000-\\u001F]", "g");

function texte(valeur: FormDataEntryValue | null, max: number): string {
  return String(valeur ?? "").replace(CONTROLE, " ").trim().slice(0, max);
}

function entier(valeur: FormDataEntryValue | null | unknown, max = 100_000_000): number {
  const n = Math.trunc(Number(String(valeur ?? "").replace(/[^\d]/g, "")));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

// ---------------------------------------------------------------------------
//  Lire un lien
// ---------------------------------------------------------------------------

export async function actionImporterLien(adresse: string): Promise<EtatProposition> {
  const { boutique, utilisateur } = await exigerSession();

  // Cette action fait sortir le serveur sur Internet : elle est limitée plus
  // sévèrement que le reste, par boutique et non par adresse IP — c'est le
  // compte qui déclenche la sortie.
  const verdict = limiter(`import-lien:${boutique.id}`, 30, 3600);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const resultat = await importerDepuisLien(boutique, utilisateur.id, adresse);
  if (!resultat.ok) return { erreur: resultat.erreur, conseil: resultat.conseil };
  return { proposition: resultat.proposition };
}

/**
 * Lit plusieurs liens d'affilée.
 *
 * C'est ce qui permet de garnir une boutique en une fois. Chaque lien est
 * traité indépendamment : un échec ne fait pas tomber les autres, et le
 * commerçant voit ce qui a marché et ce qui n'a pas marché.
 */
export async function actionImporterPlusieursLiens(
  texteLiens: string,
): Promise<{ propositions: Proposition[]; echecs: { adresse: string; erreur: string }[] }> {
  const { boutique, utilisateur } = await exigerSession();

  const adresses = String(texteLiens ?? "")
    .split(/[\s,;]+/)
    .map((a) => a.trim())
    .filter((a) => /^https?:\/\//i.test(a))
    // Dix par envoi : au-delà, l'attente devient plus longue que la patience,
    // et le quota de sorties serait avalé d'un coup.
    .slice(0, 10);

  if (adresses.length === 0) {
    return { propositions: [], echecs: [{ adresse: "", erreur: "Aucune adresse http reconnue." }] };
  }

  const verdict = limiter(`import-lot:${boutique.id}`, 6, 3600);
  if (!verdict.permis) {
    return { propositions: [], echecs: [{ adresse: "", erreur: messageAttente(verdict.secondes) }] };
  }

  const propositions: Proposition[] = [];
  const echecs: { adresse: string; erreur: string }[] = [];

  // En série, pas en parallèle : dix requêtes simultanées vers le même site
  // ressemblent à une attaque et se font bloquer.
  for (const adresse of adresses) {
    const resultat = await importerDepuisLien(boutique, utilisateur.id, adresse);
    if (resultat.ok) propositions.push(resultat.proposition);
    else echecs.push({ adresse, erreur: resultat.erreur });
  }

  return { propositions, echecs };
}

// ---------------------------------------------------------------------------
//  Lire une photo
// ---------------------------------------------------------------------------

export async function actionImporterPhoto(
  _precedent: EtatProposition, donnees: FormData,
): Promise<EtatProposition> {
  const { boutique, utilisateur } = await exigerSession();

  const autorise = importAutorise(boutique, "photo");
  if (!autorise.ok) return { erreur: autorise.raison };

  const verdict = limiter(`import-photo:${boutique.id}`, 40, 3600);
  if (!verdict.permis) return { erreur: messageAttente(verdict.secondes) };

  const fichier = donnees.get("photo");
  if (!(fichier instanceof File)) return { erreur: "Choisissez une photo." };

  const resultat = await importerDepuisPhoto(boutique, utilisateur.id, fichier);
  if (!resultat.ok) return { erreur: resultat.erreur, conseil: resultat.conseil };
  return { proposition: resultat.proposition };
}

// ---------------------------------------------------------------------------
//  Créer le produit
// ---------------------------------------------------------------------------

/**
 * Transforme une proposition relue en produit.
 *
 * L'image reprise chez un fournisseur exige une confirmation explicite de
 * droits, enregistrée avec sa date. Nous ne pouvons pas vérifier qui détient
 * une photo ; nous pouvons demander au commerçant de l'affirmer, et garder la
 * trace de ce qu'il a affirmé. C'est ce que fait `droits_confirmes_le`.
 */
export async function actionCreerDepuisImport(
  _precedent: Etat, donnees: FormData,
): Promise<Etat> {
  const { boutique } = await exigerSession();

  const importId = entier(donnees.get("import_id"));
  const journal = importId ? lireImport(boutique.id, importId) : undefined;
  if (!journal) return { erreur: "Cet import n'existe plus. Recommencez." };

  const place = peutAjouterProduit(boutique);
  if (!place.ok) return { erreur: `${place.raison} Changez de formule pour en ajouter davantage.` };

  const nom = texte(donnees.get("nom"), 120);
  if (nom.length < 2) return { erreur: "Donnez un nom à ce produit." };

  const prix = entier(donnees.get("prix"));
  if (prix <= 0) {
    return {
      erreur: "Indiquez votre prix de vente. Le prix du fournisseur ne peut pas "
        + "être votre prix de vente : il ne couvre ni le transport, ni votre marge.",
    };
  }

  const description = texte(donnees.get("description"), 4000);
  const stock = entier(donnees.get("stock"), 1_000_000);

  const noms = donnees.getAll("caract_nom").map((v) => texte(v, 60));
  const valeurs = donnees.getAll("caract_valeur").map((v) => texte(v, 160));
  const caracteristiques: { nom: string; valeur: string }[] = [];
  for (let i = 0; i < Math.min(noms.length, 15); i++) {
    if (noms[i] && valeurs[i]) caracteristiques.push({ nom: noms[i], valeur: valeurs[i] });
  }

  const categorieBrute = entier(donnees.get("categorie_id"));
  const categorieId = categorieBrute && un(
    "SELECT id FROM categories WHERE boutique_id = ? AND id = ?", boutique.id, categorieBrute,
  ) ? categorieBrute : null;

  // --- l'image, reprise depuis ce que LE SERVEUR avait extrait -----------
  const indexImage = donnees.get("image_index");
  const veutImage = indexImage !== null && indexImage !== "" && indexImage !== "aucune";
  const droitsConfirmes = donnees.get("droits") === "1";

  if (veutImage && !droitsConfirmes) {
    return {
      erreur: "Pour reprendre la photo du fournisseur, confirmez que vous avez le "
        + "droit de l'utiliser. Sinon, décochez-la et mettez votre propre photo.",
    };
  }

  let fichierPhoto: string | null = null;
  let avertissement: string | null = null;

  if (veutImage) {
    let extraites: string[] = [];
    try {
      const charge = JSON.parse(journal.charge_utile ?? "{}") as { fiche?: { images?: unknown } };
      const brut = charge.fiche?.images;
      if (Array.isArray(brut)) extraites = brut.filter((u): u is string => typeof u === "string");
    } catch { /* charge illisible : aucune image reprise */ }

    const choisie = extraites[Number(indexImage)];
    if (!choisie) {
      avertissement = "L'image choisie n'a pas pu être retrouvée. Le produit est créé sans photo.";
    } else {
      const telechargement = await recupererImage(choisie, journal.adresse ?? undefined);
      if (!telechargement.ok) {
        avertissement = `L'image n'a pas pu être récupérée (${telechargement.echec.message}) `
          + `Le produit est créé sans photo : ajoutez la vôtre.`;
      } else {
        // Les octets passent par le même chemin que n'importe quel
        // téléversement : décodés, ré-encodés, réduits, EXIF retirés.
        const enregistrement = await photos.enregistrer(
          boutique.id,
          new File([new Uint8Array(telechargement.octets)], "import.jpg", { type: "image/jpeg" }),
        );
        if (enregistrement.ok) fichierPhoto = enregistrement.fichier;
        else avertissement = `${enregistrement.erreur} Le produit est créé sans photo.`;
      }
    }
  }

  // --- écriture ----------------------------------------------------------
  const base = enSlug(nom) || "produit";
  let slug = base;
  let n = 2;
  while (un("SELECT id FROM produits WHERE boutique_id = ? AND slug = ?", boutique.id, slug)) {
    slug = `${base}-${n++}`;
  }

  const insertion = ecrire(
    `INSERT INTO produits (boutique_id, categorie_id, nom, slug, description,
                           caracteristiques, prix, stock, suivi_stock, seuil_alerte,
                           photos, type, actif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 3, ?, 'physique', ?)`,
    boutique.id, categorieId, nom, slug, description || null,
    JSON.stringify(caracteristiques), prix, stock,
    JSON.stringify(fichierPhoto ? [fichierPhoto] : []),
    // Un produit importé arrive RETIRÉ de la vente quand il n'a pas de photo :
    // une fiche sans image ne vend rien et fait mauvais effet sur la boutique.
    fichierPhoto ? 1 : 0,
  );
  const produitId = Number(insertion.lastInsertRowid);

  ecrire(
    `UPDATE imports_produit
        SET statut = 'accepte', produit_id = ?, image_reprise = ?,
            droits_confirmes_le = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
      WHERE boutique_id = ? AND id = ?`,
    produitId, fichierPhoto ? 1 : 0, veutImage && droitsConfirmes ? 1 : 0,
    boutique.id, importId,
  );

  // Un produit ajoute pendant l'assistant de creation vaut franchissement de
  // l'etape 4 : sans cela, le commercant importerait un produit puis se
  // retrouverait renvoye a un formulaire vide.
  if (!boutique.assistant_fini_le) {
    ecrire(
      "UPDATE boutiques SET etape_assistant = MAX(etape_assistant, 5) WHERE id = ?",
      boutique.id,
    );
    revalidatePath("/creer");
  }

  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/b/${boutique.slug}`);

  const suffixe = fichierPhoto
    ? ""
    : " Il est enregistré mais retiré de la vente : ajoutez une photo pour le mettre en ligne.";

  return {
    message: `« ${nom} » ajouté à votre catalogue.${suffixe}`,
    conseil: avertissement ?? undefined,
  };
}

/**
 * Le commerçant abandonne une proposition : on le note, sans créer de produit.
 *
 * L'identifiant arrive directement du navigateur, donc sans confiance : le
 * `WHERE boutique_id = ?` fait que la requête ne peut toucher qu'une ligne de
 * SA boutique, et `statut = 'propose'` qu'une ligne encore en attente.
 */
export async function actionAbandonnerImport(brut: unknown) {
  const { boutique } = await exigerSession();
  const importId = entier(brut);
  ecrire(
    "UPDATE imports_produit SET statut = 'abandonne' WHERE boutique_id = ? AND id = ? AND statut = 'propose'",
    boutique.id, importId,
  );
}

// ---------------------------------------------------------------------------
//  Taux de change et marge
// ---------------------------------------------------------------------------

export async function actionEnregistrerTaux(_precedent: Etat, donnees: FormData): Promise<Etat> {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);

  const taux = lireTaux(boutique.taux_change);
  const problemes: string[] = [];

  for (const devise of DEVISES_SOURCE) {
    // L'euro n'est pas saisissable : sa parité avec le franc CFA est fixe.
    if (devise.code === "EUR" || devise.code === pays.devise) continue;

    const brut = String(donnees.get(`taux_${devise.code}`) ?? "").trim().replace(",", ".");
    if (brut === "") { delete taux[devise.code]; continue; }

    const valeur = Number(brut);
    if (!Number.isFinite(valeur) || valeur <= 0 || valeur >= 100_000) {
      problemes.push(devise.code);
      continue;
    }
    taux[devise.code] = Math.round(valeur * 100) / 100;
  }

  if (problemes.length > 0) {
    return {
      erreur: `Taux illisible pour : ${problemes.join(", ")}. `
        + `Indiquez combien vaut 1 unité en ${pays.devise_libelle}.`,
    };
  }

  const marge = Math.max(0, Math.min(1000, Number(donnees.get("marge")) || 0));

  ecrire(
    "UPDATE boutiques SET taux_change = ?, marge_import = ? WHERE id = ?",
    JSON.stringify(taux), Math.round(marge), boutique.id,
  );

  revalidatePath("/tableau-de-bord/produits/importer");
  return {
    message: Object.keys(taux).length > 0
      ? `Taux enregistrés. Marge appliquée aux imports : ${Math.round(marge)} %.`
      : `Marge enregistrée : ${Math.round(marge)} %. Aucun taux de change saisi.`,
  };
}
