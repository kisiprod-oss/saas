"use server";

import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";

export async function publierEvaluation(
  etablissementId: string,
  evaluationId: string
): Promise<void> {
  const supabase = await creerClientServeur();

  // La politique RLS "evaluations_update" vérifie déjà que l'utilisateur
  // connecté est bien direction ou enseignant de cet établissement :
  // cette action ne fait qu'exécuter la requête avec sa session. En cas
  // d'échec (droits insuffisants), la ligne reste simplement inchangée.
  await supabase
    .from("evaluations")
    .update({ valide: true, publie: true })
    .eq("id", evaluationId);

  revalidatePath(`/direction/${etablissementId}`);
}

export async function creerClasse(
  etablissementId: string,
  formData: FormData
) {
  const nom = String(formData.get("nom") ?? "").trim();
  const niveauId = String(formData.get("niveau_id") ?? "");
  const anneeScolaireId = String(formData.get("annee_scolaire_id") ?? "");

  if (!nom || !niveauId || !anneeScolaireId) {
    return { erreur: "Merci de remplir tous les champs." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("classes").insert({
    etablissement_id: etablissementId,
    niveau_id: niveauId,
    annee_scolaire_id: anneeScolaireId,
    nom,
  });

  if (error) {
    return { erreur: "Impossible de créer cette classe." };
  }

  revalidatePath(`/direction/${etablissementId}`);
  return { erreur: null };
}
