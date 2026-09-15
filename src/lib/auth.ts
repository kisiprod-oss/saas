import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type RoleEtablissement = Enums<"role_etablissement">;

export type AppartenanceAvecEtablissement = {
  role: RoleEtablissement;
  etablissement: {
    id: string;
    nom: string;
    demo: boolean;
    logo_url: string | null;
  };
};

/**
 * Récupère l'utilisateur connecté et la liste de ses appartenances
 * (établissement + rôle). Un même utilisateur peut apparaître dans
 * plusieurs établissements avec des rôles différents.
 */
export async function obtenirSessionUtilisateur() {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profil: null, appartenances: [] as AppartenanceAvecEtablissement[] };
  }

  const { data: profil } = await supabase
    .from("profils")
    .select("id, nom_complet, telephone, est_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  const { data: appartenancesBrutes } = await supabase
    .from("appartenances")
    .select("role, etablissement:etablissements(id, nom, demo, logo_url)")
    .eq("utilisateur_id", user.id);

  const appartenances: AppartenanceAvecEtablissement[] = (appartenancesBrutes ?? [])
    .filter((a) => a.etablissement)
    .map((a) => ({
      role: a.role,
      etablissement: a.etablissement as unknown as AppartenanceAvecEtablissement["etablissement"],
    }));

  return { user, profil, appartenances };
}

/**
 * À utiliser en tête d'une page qui exige d'être connecté.
 * Redirige vers /connexion si aucune session n'existe.
 */
export async function exigerUtilisateur() {
  const session = await obtenirSessionUtilisateur();
  if (!session.user) {
    redirect("/connexion");
  }
  return session;
}

/**
 * À utiliser en tête d'une page propre à un rôle (direction, enseignant...).
 * Vérifie que l'utilisateur a bien ce rôle dans l'établissement demandé ;
 * sinon renvoie vers le tableau de bord général. La vérification finale
 * et non contournable reste toujours celle des politiques RLS côté base
 * de données : ce contrôle ne fait qu'éviter d'afficher un écran inutile.
 */
export async function exigerRole(
  etablissementId: string,
  role: RoleEtablissement
) {
  const session = await exigerUtilisateur();
  const autorise = session.appartenances.some(
    (a) => a.etablissement.id === etablissementId && a.role === role
  );
  if (!autorise) {
    redirect("/tableau-de-bord");
  }
  return session;
}
