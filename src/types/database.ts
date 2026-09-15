export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          classe_id: string
          cree_le: string
          date: string
          eleve_id: string
          id: string
          justifie: boolean
          motif: string | null
          saisi_par: string | null
          type: Database["public"]["Enums"]["type_absence"]
        }
        Insert: {
          classe_id: string
          cree_le?: string
          date: string
          eleve_id: string
          id?: string
          justifie?: boolean
          motif?: string | null
          saisi_par?: string | null
          type: Database["public"]["Enums"]["type_absence"]
        }
        Update: {
          classe_id?: string
          cree_le?: string
          date?: string
          eleve_id?: string
          id?: string
          justifie?: boolean
          motif?: string | null
          saisi_par?: string | null
          type?: Database["public"]["Enums"]["type_absence"]
        }
        Relationships: [
          {
            foreignKeyName: "absences_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      affectations_enseignants: {
        Row: {
          classe_id: string
          enseignant_id: string
          etablissement_id: string
          id: string
          matiere_id: string
        }
        Insert: {
          classe_id: string
          enseignant_id: string
          etablissement_id: string
          id?: string
          matiere_id: string
        }
        Update: {
          classe_id?: string
          enseignant_id?: string
          etablissement_id?: string
          id?: string
          matiere_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affectations_enseignants_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_enseignants_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affectations_enseignants_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      annees_scolaires: {
        Row: {
          active: boolean
          date_debut: string
          date_fin: string
          etablissement_id: string
          id: string
          libelle: string
        }
        Insert: {
          active?: boolean
          date_debut: string
          date_fin: string
          etablissement_id: string
          id?: string
          libelle: string
        }
        Update: {
          active?: boolean
          date_debut?: string
          date_fin?: string
          etablissement_id?: string
          id?: string
          libelle?: string
        }
        Relationships: [
          {
            foreignKeyName: "annees_scolaires_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      annonces: {
        Row: {
          auteur_id: string
          cible: Database["public"]["Enums"]["cible_annonce"]
          classe_id: string | null
          contenu: string
          etablissement_id: string
          id: string
          publie_le: string
          role_cible: Database["public"]["Enums"]["role_etablissement"] | null
          titre: string
        }
        Insert: {
          auteur_id: string
          cible?: Database["public"]["Enums"]["cible_annonce"]
          classe_id?: string | null
          contenu: string
          etablissement_id: string
          id?: string
          publie_le?: string
          role_cible?: Database["public"]["Enums"]["role_etablissement"] | null
          titre: string
        }
        Update: {
          auteur_id?: string
          cible?: Database["public"]["Enums"]["cible_annonce"]
          classe_id?: string | null
          contenu?: string
          etablissement_id?: string
          id?: string
          publie_le?: string
          role_cible?: Database["public"]["Enums"]["role_etablissement"] | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "annonces_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annonces_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      appartenances: {
        Row: {
          cree_le: string
          etablissement_id: string
          id: string
          role: Database["public"]["Enums"]["role_etablissement"]
          utilisateur_id: string
        }
        Insert: {
          cree_le?: string
          etablissement_id: string
          id?: string
          role: Database["public"]["Enums"]["role_etablissement"]
          utilisateur_id: string
        }
        Update: {
          cree_le?: string
          etablissement_id?: string
          id?: string
          role?: Database["public"]["Enums"]["role_etablissement"]
          utilisateur_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appartenances_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletins: {
        Row: {
          annee_scolaire_id: string
          chemin_fichier: string | null
          eleve_id: string
          genere_le: string | null
          id: string
          periode: string
          publie: boolean
          valide_par: string | null
        }
        Insert: {
          annee_scolaire_id: string
          chemin_fichier?: string | null
          eleve_id: string
          genere_le?: string | null
          id?: string
          periode: string
          publie?: boolean
          valide_par?: string | null
        }
        Update: {
          annee_scolaire_id?: string
          chemin_fichier?: string | null
          eleve_id?: string
          genere_le?: string | null
          id?: string
          periode?: string
          publie?: boolean
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulletins_annee_scolaire_id_fkey"
            columns: ["annee_scolaire_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletins_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          annee_scolaire_id: string
          etablissement_id: string
          id: string
          niveau_id: string
          nom: string
        }
        Insert: {
          annee_scolaire_id: string
          etablissement_id: string
          id?: string
          niveau_id: string
          nom: string
        }
        Update: {
          annee_scolaire_id?: string
          etablissement_id?: string
          id?: string
          niveau_id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_annee_scolaire_id_fkey"
            columns: ["annee_scolaire_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_niveau_id_fkey"
            columns: ["niveau_id"]
            isOneToOne: false
            referencedRelation: "niveaux"
            referencedColumns: ["id"]
          },
        ]
      }
      devoirs: {
        Row: {
          bareme: number | null
          classe_id: string
          consignes: string | null
          cree_le: string
          date_echeance: string
          date_publication: string
          enseignant_id: string
          etablissement_id: string
          id: string
          matiere_id: string
          mode_remise: Database["public"]["Enums"]["mode_remise_devoir"]
          titre: string
        }
        Insert: {
          bareme?: number | null
          classe_id: string
          consignes?: string | null
          cree_le?: string
          date_echeance: string
          date_publication?: string
          enseignant_id: string
          etablissement_id: string
          id?: string
          matiere_id: string
          mode_remise?: Database["public"]["Enums"]["mode_remise_devoir"]
          titre: string
        }
        Update: {
          bareme?: number | null
          classe_id?: string
          consignes?: string | null
          cree_le?: string
          date_echeance?: string
          date_publication?: string
          enseignant_id?: string
          etablissement_id?: string
          id?: string
          matiere_id?: string
          mode_remise?: Database["public"]["Enums"]["mode_remise_devoir"]
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "devoirs_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoirs_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devoirs_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      eleves: {
        Row: {
          classe_id: string | null
          cree_le: string
          date_naissance: string | null
          etablissement_id: string
          id: string
          identifiant_interne: string
          nom: string
          prenom: string
          sexe: string | null
          statut: Database["public"]["Enums"]["statut_eleve"]
          utilisateur_id: string | null
        }
        Insert: {
          classe_id?: string | null
          cree_le?: string
          date_naissance?: string | null
          etablissement_id: string
          id?: string
          identifiant_interne: string
          nom: string
          prenom: string
          sexe?: string | null
          statut?: Database["public"]["Enums"]["statut_eleve"]
          utilisateur_id?: string | null
        }
        Update: {
          classe_id?: string | null
          cree_le?: string
          date_naissance?: string | null
          etablissement_id?: string
          id?: string
          identifiant_interne?: string
          nom?: string
          prenom?: string
          sexe?: string | null
          statut?: Database["public"]["Enums"]["statut_eleve"]
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eleves_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eleves_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      etablissements: {
        Row: {
          adresse: string | null
          cree_le: string
          demo: boolean
          email: string | null
          id: string
          logo_url: string | null
          nom: string
          offre_abonnement_id: string | null
          pays_code: string
          telephone: string | null
        }
        Insert: {
          adresse?: string | null
          cree_le?: string
          demo?: boolean
          email?: string | null
          id?: string
          logo_url?: string | null
          nom: string
          offre_abonnement_id?: string | null
          pays_code: string
          telephone?: string | null
        }
        Update: {
          adresse?: string | null
          cree_le?: string
          demo?: boolean
          email?: string | null
          id?: string
          logo_url?: string | null
          nom?: string
          offre_abonnement_id?: string | null
          pays_code?: string
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etablissements_offre_abonnement_id_fkey"
            columns: ["offre_abonnement_id"]
            isOneToOne: false
            referencedRelation: "offres_abonnement"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etablissements_pays_code_fkey"
            columns: ["pays_code"]
            isOneToOne: false
            referencedRelation: "pays"
            referencedColumns: ["code"]
          },
        ]
      }
      evaluations: {
        Row: {
          annee_scolaire_id: string
          bareme_max: number
          classe_id: string
          coefficient: number
          cree_le: string
          cree_par: string
          date_evaluation: string
          etablissement_id: string
          id: string
          matiere_id: string
          periode: string
          publie: boolean
          titre: string
          type: Database["public"]["Enums"]["type_evaluation"]
          valide: boolean
        }
        Insert: {
          annee_scolaire_id: string
          bareme_max?: number
          classe_id: string
          coefficient?: number
          cree_le?: string
          cree_par: string
          date_evaluation?: string
          etablissement_id: string
          id?: string
          matiere_id: string
          periode: string
          publie?: boolean
          titre: string
          type?: Database["public"]["Enums"]["type_evaluation"]
          valide?: boolean
        }
        Update: {
          annee_scolaire_id?: string
          bareme_max?: number
          classe_id?: string
          coefficient?: number
          cree_le?: string
          cree_par?: string
          date_evaluation?: string
          etablissement_id?: string
          id?: string
          matiere_id?: string
          periode?: string
          publie?: boolean
          titre?: string
          type?: Database["public"]["Enums"]["type_evaluation"]
          valide?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_annee_scolaire_id_fkey"
            columns: ["annee_scolaire_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_matiere_id_fkey"
            columns: ["matiere_id"]
            isOneToOne: false
            referencedRelation: "matieres"
            referencedColumns: ["id"]
          },
        ]
      }
      inscriptions: {
        Row: {
          annee_scolaire_id: string
          classe_id: string
          date_debut: string
          date_fin: string | null
          eleve_id: string
          id: string
        }
        Insert: {
          annee_scolaire_id: string
          classe_id: string
          date_debut?: string
          date_fin?: string | null
          eleve_id: string
          id?: string
        }
        Update: {
          annee_scolaire_id?: string
          classe_id?: string
          date_debut?: string
          date_fin?: string | null
          eleve_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscriptions_annee_scolaire_id_fkey"
            columns: ["annee_scolaire_id"]
            isOneToOne: false
            referencedRelation: "annees_scolaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_classe_id_fkey"
            columns: ["classe_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscriptions_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_audit: {
        Row: {
          action: string
          apres: Json | null
          avant: Json | null
          cree_le: string
          etablissement_id: string | null
          id: string
          ligne_id: string | null
          table_cible: string
          utilisateur_id: string | null
        }
        Insert: {
          action: string
          apres?: Json | null
          avant?: Json | null
          cree_le?: string
          etablissement_id?: string | null
          id?: string
          ligne_id?: string | null
          table_cible: string
          utilisateur_id?: string | null
        }
        Update: {
          action?: string
          apres?: Json | null
          avant?: Json | null
          cree_le?: string
          etablissement_id?: string | null
          id?: string
          ligne_id?: string | null
          table_cible?: string
          utilisateur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_audit_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      matieres: {
        Row: {
          coefficient_defaut: number
          etablissement_id: string
          id: string
          nom: string
        }
        Insert: {
          coefficient_defaut?: number
          etablissement_id: string
          id?: string
          nom: string
        }
        Update: {
          coefficient_defaut?: number
          etablissement_id?: string
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "matieres_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      niveaux: {
        Row: {
          cycle: Database["public"]["Enums"]["cycle_scolaire"]
          etablissement_id: string
          id: string
          nom: string
          ordre: number
        }
        Insert: {
          cycle: Database["public"]["Enums"]["cycle_scolaire"]
          etablissement_id: string
          id?: string
          nom: string
          ordre: number
        }
        Update: {
          cycle?: Database["public"]["Enums"]["cycle_scolaire"]
          etablissement_id?: string
          id?: string
          nom?: string
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "niveaux_etablissement_id_fkey"
            columns: ["etablissement_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          appreciation: string | null
          eleve_id: string
          evaluation_id: string
          id: string
          modifie_le: string
          saisi_par: string | null
          statut: Database["public"]["Enums"]["statut_note"]
          valeur: number | null
        }
        Insert: {
          appreciation?: string | null
          eleve_id: string
          evaluation_id: string
          id?: string
          modifie_le?: string
          saisi_par?: string | null
          statut?: Database["public"]["Enums"]["statut_note"]
          valeur?: number | null
        }
        Update: {
          appreciation?: string | null
          eleve_id?: string
          evaluation_id?: string
          id?: string
          modifie_le?: string
          saisi_par?: string | null
          statut?: Database["public"]["Enums"]["statut_note"]
          valeur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      offres_abonnement: {
        Row: {
          code: string
          cree_le: string
          description: string | null
          devise: string
          id: string
          nom: string
          provisoire: boolean
          tarif_mensuel: number | null
        }
        Insert: {
          code: string
          cree_le?: string
          description?: string | null
          devise?: string
          id?: string
          nom: string
          provisoire?: boolean
          tarif_mensuel?: number | null
        }
        Update: {
          code?: string
          cree_le?: string
          description?: string | null
          devise?: string
          id?: string
          nom?: string
          provisoire?: boolean
          tarif_mensuel?: number | null
        }
        Relationships: []
      }
      pays: {
        Row: {
          actif: boolean
          code: string
          devise: string
          fuseau_horaire: string
          indicatif_telephonique: string
          langue: string
          nom: string
        }
        Insert: {
          actif?: boolean
          code: string
          devise?: string
          fuseau_horaire?: string
          indicatif_telephonique: string
          langue?: string
          nom: string
        }
        Update: {
          actif?: boolean
          code?: string
          devise?: string
          fuseau_horaire?: string
          indicatif_telephonique?: string
          langue?: string
          nom?: string
        }
        Relationships: []
      }
      pieces_jointes_devoirs: {
        Row: {
          chemin_fichier: string
          devoir_id: string
          id: string
          nom_fichier: string
          taille_octets: number | null
        }
        Insert: {
          chemin_fichier: string
          devoir_id: string
          id?: string
          nom_fichier: string
          taille_octets?: number | null
        }
        Update: {
          chemin_fichier?: string
          devoir_id?: string
          id?: string
          nom_fichier?: string
          taille_octets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pieces_jointes_devoirs_devoir_id_fkey"
            columns: ["devoir_id"]
            isOneToOne: false
            referencedRelation: "devoirs"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          cree_le: string
          est_superadmin: boolean
          id: string
          nom_complet: string | null
          telephone: string | null
        }
        Insert: {
          cree_le?: string
          est_superadmin?: boolean
          id: string
          nom_complet?: string | null
          telephone?: string | null
        }
        Update: {
          cree_le?: string
          est_superadmin?: boolean
          id?: string
          nom_complet?: string | null
          telephone?: string | null
        }
        Relationships: []
      }
      remises: {
        Row: {
          appreciation: string | null
          chemin_fichier: string | null
          corrige_le: string | null
          devoir_id: string
          eleve_id: string
          id: string
          note: number | null
          remis_en_classe: boolean
          remis_le: string | null
          statut: Database["public"]["Enums"]["statut_remise_devoir"]
        }
        Insert: {
          appreciation?: string | null
          chemin_fichier?: string | null
          corrige_le?: string | null
          devoir_id: string
          eleve_id: string
          id?: string
          note?: number | null
          remis_en_classe?: boolean
          remis_le?: string | null
          statut?: Database["public"]["Enums"]["statut_remise_devoir"]
        }
        Update: {
          appreciation?: string | null
          chemin_fichier?: string | null
          corrige_le?: string | null
          devoir_id?: string
          eleve_id?: string
          id?: string
          note?: number | null
          remis_en_classe?: boolean
          remis_le?: string | null
          statut?: Database["public"]["Enums"]["statut_remise_devoir"]
        }
        Relationships: [
          {
            foreignKeyName: "remises_devoir_id_fkey"
            columns: ["devoir_id"]
            isOneToOne: false
            referencedRelation: "devoirs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remises_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
      responsables_eleves: {
        Row: {
          cree_le: string
          eleve_id: string
          id: string
          lien_parente: string | null
          utilisateur_id: string
          verifie: boolean
        }
        Insert: {
          cree_le?: string
          eleve_id: string
          id?: string
          lien_parente?: string | null
          utilisateur_id: string
          verifie?: boolean
        }
        Update: {
          cree_le?: string
          eleve_id?: string
          id?: string
          lien_parente?: string | null
          utilisateur_id?: string
          verifie?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "responsables_eleves_eleve_id_fkey"
            columns: ["eleve_id"]
            isOneToOne: false
            referencedRelation: "eleves"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cible_annonce: "tous" | "classe" | "role"
      cycle_scolaire: "maternelle" | "primaire" | "college" | "lycee"
      mode_remise_devoir: "en_ligne" | "en_classe"
      role_etablissement: "direction" | "enseignant" | "parent" | "eleve"
      statut_eleve: "actif" | "inactif" | "archive"
      statut_note: "note" | "absent" | "dispense" | "non_note"
      statut_remise_devoir: "a_faire" | "remis" | "en_retard" | "corrige"
      type_absence: "absence" | "retard"
      type_evaluation: "note" | "competence"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"]
> = DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
