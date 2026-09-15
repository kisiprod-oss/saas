"use server";

import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";

export async function connecterAvecMotDePasse(
  _etatPrecedent: { erreur: string | null },
  formData: FormData
): Promise<{ erreur: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");

  if (!email || !motDePasse) {
    return { erreur: "Merci de renseigner l'email et le mot de passe." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });

  if (error) {
    console.error("Erreur de connexion Supabase:", error.status, error.message);
    return {
      erreur:
        "Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.",
    };
  }

  redirect("/tableau-de-bord");
}
