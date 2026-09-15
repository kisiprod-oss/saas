"use server";

import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase/server";

export async function creerDevoir(
  etablissementId: string,
  formData: FormData
) {
  const titre = String(formData.get("titre") ?? "").trim();
  const consignes = String(formData.get("consignes") ?? "").trim();
  const classeId = String(formData.get("classe_id") ?? "");
  const matiereId = String(formData.get("matiere_id") ?? "");
  const dateEcheance = String(formData.get("date_echeance") ?? "");
  const modeRemise = String(formData.get("mode_remise") ?? "en_ligne");
  const bareme = formData.get("bareme");

  if (!titre || !classeId || !matiereId || !dateEcheance) {
    return { erreur: "Merci de remplir les champs obligatoires." };
  }

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { data: devoir, error } = await supabase
    .from("devoirs")
    .insert({
      etablissement_id: etablissementId,
      classe_id: classeId,
      matiere_id: matiereId,
      enseignant_id: user.id,
      titre,
      consignes: consignes || null,
      date_echeance: new Date(dateEcheance).toISOString(),
      mode_remise: modeRemise as "en_ligne" | "en_classe",
      bareme: bareme ? Number(bareme) : null,
    })
    .select("id")
    .single();

  if (error || !devoir) {
    return { erreur: "Impossible de créer ce devoir." };
  }

  // Crée une remise "à faire" pour chaque élève actif de la classe,
  // pour que le statut soit visible immédiatement côté famille.
  const { data: eleves } = await supabase
    .from("eleves")
    .select("id")
    .eq("classe_id", classeId)
    .eq("statut", "actif");

  if (eleves && eleves.length > 0) {
    await supabase.from("remises").insert(
      eleves.map((e) => ({ devoir_id: devoir.id, eleve_id: e.id }))
    );
  }

  revalidatePath(`/enseignant/${etablissementId}`);
  return { erreur: null };
}

export async function creerEvaluation(
  etablissementId: string,
  formData: FormData
) {
  const titre = String(formData.get("titre") ?? "").trim();
  const classeId = String(formData.get("classe_id") ?? "");
  const matiereId = String(formData.get("matiere_id") ?? "");
  const anneeScolaireId = String(formData.get("annee_scolaire_id") ?? "");
  const periode = String(formData.get("periode") ?? "").trim();
  const baremeMax = Number(formData.get("bareme_max") ?? 20);
  const coefficient = Number(formData.get("coefficient") ?? 1);

  if (!titre || !classeId || !matiereId || !anneeScolaireId || !periode) {
    return { erreur: "Merci de remplir les champs obligatoires." };
  }

  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const { error } = await supabase.from("evaluations").insert({
    etablissement_id: etablissementId,
    classe_id: classeId,
    matiere_id: matiereId,
    annee_scolaire_id: anneeScolaireId,
    periode,
    titre,
    bareme_max: baremeMax,
    coefficient,
    cree_par: user.id,
  });

  if (error) {
    return { erreur: "Impossible de créer cette évaluation." };
  }

  revalidatePath(`/enseignant/${etablissementId}`);
  return { erreur: null };
}

export async function enregistrerNotes(
  etablissementId: string,
  evaluationId: string,
  formData: FormData
) {
  const supabase = await creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erreur: "Session expirée." };

  const elevesIds = formData.getAll("eleve_id").map(String);

  const lignes = elevesIds.map((eleveId) => {
    const statut = String(formData.get(`statut_${eleveId}`) ?? "non_note");
    const valeurBrute = formData.get(`valeur_${eleveId}`);
    const appreciation = String(
      formData.get(`appreciation_${eleveId}`) ?? ""
    ).trim();

    return {
      evaluation_id: evaluationId,
      eleve_id: eleveId,
      statut: statut as "note" | "absent" | "dispense" | "non_note",
      valeur:
        statut === "note" && valeurBrute ? Number(valeurBrute) : null,
      appreciation: appreciation || null,
      saisi_par: user.id,
    };
  });

  const { error } = await supabase
    .from("notes")
    .upsert(lignes, { onConflict: "evaluation_id,eleve_id" });

  if (error) {
    return { erreur: "Impossible d'enregistrer les notes." };
  }

  revalidatePath(`/enseignant/${etablissementId}`);
  revalidatePath(`/enseignant/${etablissementId}/evaluations/${evaluationId}`);
  return { erreur: null };
}
