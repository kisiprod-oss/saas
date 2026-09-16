"use server";

import { revalidatePath } from "next/cache";
import { ecrire } from "./db";
import { exigerSession } from "./auth";
import { peutPublier } from "./offres";
import { valider, validerSection, comparer, type ContenuBoutique, type Section } from "./sections";
import {
  brouillon, ecrireBrouillon, publier, depublier, restaurer, instantane,
} from "./versions";
import { appliquerDemande } from "./ia";
import { categories as lireCategories } from "./requetes";

/**
 * Les actions de l'editeur de boutique.
 *
 * Deux garde-fous traversent tout ce fichier :
 *
 *  1. TOUT contenu qui entre repasse par `valider()`. Qu'il vienne de l'IA ou
 *     du formulaire du commercant, il est ramene au schema avant d'atteindre
 *     la base. Il n'existe aucun chemin d'ecriture qui saute cette etape.
 *
 *  2. Rien ne devient public sans `actionPublier`. Modifier, generer,
 *     restaurer : tout cela touche le BROUILLON. La boutique en ligne ne
 *     bouge que sur un clic explicite.
 */

export type Etat = { erreur?: string; message?: string };

export type EtatProposition = Etat & {
  proposition?: ContenuBoutique;
  resume?: { ajoutees: number; retirees: number; modifiees: number };
  moteur?: string;
};

// ---------------------------------------------------------------------------
//  Modification manuelle
// ---------------------------------------------------------------------------

/** Enregistre le brouillon complet envoye par l'editeur. */
export async function actionEnregistrerBrouillon(
  contenuBrut: unknown,
): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();

  const contenu = valider(contenuBrut);
  if (contenu.sections.length === 0) {
    return { erreur: "Votre page ne peut pas être vide. Gardez au moins une section." };
  }

  ecrireBrouillon(boutique.id, contenu, {
    origine: "manuel", resume: "Modification manuelle", utilisateurId: utilisateur.id,
  });
  revalidatePath("/tableau-de-bord/boutique");
  return { message: "Brouillon enregistré." };
}

/** Ajoute une section vierge d'un type connu. */
export async function actionAjouterSection(type: string): Promise<Etat & { section?: Section }> {
  await exigerSession();
  const { sectionNeuve, TYPES_SECTION } = await import("./sections");
  if (!TYPES_SECTION.includes(type as never)) {
    return { erreur: "Ce type de section n'existe pas." };
  }
  return { section: validerSection(sectionNeuve(type as never)) ?? undefined };
}

// ---------------------------------------------------------------------------
//  Modification par l'assistant
// ---------------------------------------------------------------------------

/**
 * Soumet une demande en francais courant et renvoie une PROPOSITION.
 *
 * Elle n'est PAS appliquee : le commercant la voit d'abord dans l'apercu, et
 * c'est `actionAppliquerProposition` qui l'ecrit s'il la garde. C'est la
 * difference entre un outil qui propose et un outil qui decide a votre place.
 */
export async function actionDemanderModification(
  demande: string,
): Promise<EtatProposition> {
  const { boutique, utilisateur } = await exigerSession();

  const propre = String(demande ?? "").trim().slice(0, 500);
  if (propre.length < 3) {
    return { erreur: "Dites ce que vous voulez changer, en une phrase." };
  }

  const actuel = brouillon(boutique.id);
  const resultat = await appliquerDemande(boutique, utilisateur.id, actuel, propre, {
    categories: lireCategories(boutique.id).map((c) => c.nom),
  });

  if (!resultat.ok) return { erreur: resultat.erreur };

  const resume = comparer(actuel, resultat.valeur);
  if (resume.ajoutees === 0 && resume.retirees === 0 && resume.modifiees === 0) {
    return {
      erreur: "L'assistant n'a rien changé. Reformulez votre demande en étant plus précis "
        + "(par exemple : « ajoute une section questions fréquentes »).",
    };
  }
  return { proposition: resultat.valeur, resume, moteur: resultat.moteur };
}

/** Applique une proposition deja affichee au commercant. */
export async function actionAppliquerProposition(
  proposition: unknown, demande: string,
): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();

  const contenu = valider(proposition);
  if (contenu.sections.length === 0) {
    return { erreur: "Cette proposition est vide : elle n'a pas été appliquée." };
  }

  ecrireBrouillon(boutique.id, contenu, {
    origine: "ia",
    resume: `Avant : ${String(demande ?? "").slice(0, 120)}`,
    utilisateurId: utilisateur.id,
  });
  revalidatePath("/tableau-de-bord/boutique");
  return { message: "Modification appliquée à votre brouillon. Publiez-la quand vous voulez." };
}

// ---------------------------------------------------------------------------
//  Publication
// ---------------------------------------------------------------------------

export async function actionPublier(): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();

  // La limite d'offre est verifiee ICI, cote serveur. Cacher le bouton ne
  // protege rien : l'action est appelable directement.
  const autorise = peutPublier(boutique);
  if (!autorise.ok) return { erreur: autorise.raison };

  const contenu = brouillon(boutique.id);
  if (contenu.sections.length === 0) {
    return { erreur: "Votre page est vide : ajoutez au moins une section avant de publier." };
  }

  publier(boutique.id, utilisateur.id);
  revalidatePath("/tableau-de-bord/boutique");
  revalidatePath(`/b/${boutique.slug}`);
  return { message: "Votre boutique est en ligne." };
}

export async function actionDepublier(): Promise<Etat> {
  const { boutique } = await exigerSession();
  depublier(boutique.id);
  ecrire(
    "INSERT INTO journal_erreurs (boutique_id, source, message) VALUES (?, 'boutique', ?)",
    boutique.id, "Boutique retirée du web par son propriétaire",
  );
  revalidatePath("/tableau-de-bord/boutique");
  revalidatePath(`/b/${boutique.slug}`);
  return { message: "Votre boutique n'est plus accessible au public. Vos données sont conservées." };
}

// ---------------------------------------------------------------------------
//  Historique
// ---------------------------------------------------------------------------

export async function actionRestaurerVersion(versionId: number): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();
  const resultat = restaurer(boutique.id, Math.trunc(Number(versionId)), utilisateur.id);
  if (!resultat.ok) return { erreur: resultat.erreur };

  revalidatePath("/tableau-de-bord/boutique");
  return {
    message: `Version ${resultat.numero} remise dans votre brouillon. `
      + `Relisez-la, puis publiez si elle vous convient.`,
  };
}

/** Pose un point de reprise avant une serie de modifications. */
export async function actionMarquerVersion(resume: string): Promise<Etat> {
  const { boutique, utilisateur } = await exigerSession();
  instantane(boutique.id, brouillon(boutique.id), {
    origine: "manuel",
    resume: String(resume ?? "Point de reprise").slice(0, 120),
    utilisateurId: utilisateur.id,
  });
  revalidatePath("/tableau-de-bord/boutique");
  return { message: "Point de reprise enregistré." };
}
