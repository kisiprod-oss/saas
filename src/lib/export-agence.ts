import "server-only";
import { tous, un } from "./db";

/**
 * Export des donnees d'UNE agence, pour la fonction « telecharger mes donnees ».
 *
 * Cette fonction remplace un telechargement du fichier SQLite entier. Ce
 * fichier-la contenait TOUTES les agences : n'importe quel inscrit gratuit
 * repartait avec les locataires, les baux, les empreintes de mots de passe et
 * les jetons de session de tout le monde. L'export ne lit donc plus le
 * fichier : il relit la base table par table, toujours filtre sur agence_id.
 *
 * DEUX VERROUS, PAS UN. Le filtre par agence dit ce qu'on lit ; la liste noire
 * ci-dessous dit ce qu'on n'ecrit jamais, quelle que soit la table. Elle
 * fonctionne par MOTIF et non par liste de noms : une colonne secrete ajoutee
 * demain sera exclue sans que personne ait a y penser. C'est le seul moyen
 * qu'une bonne intention d'aujourd'hui protege encore le code de l'annee
 * prochaine.
 */

/** Tables rattachees a une agence, et exportables telles quelles. */
const TABLES = [
  "proprietaires", "biens", "locataires", "contrats", "factures", "paiements",
  "reservations", "artisans", "interventions", "demandes", "relances",
  "documents_emis", "envois_documents", "transactions", "abonnements",
  "utilisateurs",
] as const;

/**
 * Colonnes jamais exportees, reconnues par leur nom.
 *
 * Empreintes de mots de passe, jetons de session, jetons de document, codes de
 * reception et cles marchandes : rien de tout cela n'aide une agence a
 * recuperer ses donnees, et tout cela sert a se faire passer pour quelqu'un.
 */
const INTERDIT = /mot_de_passe|_hash$|^jeton$|code_reception|cle_maitre|cle_privee|^token$|_token$/i;

function sansSecrets(lignes: Record<string, unknown>[]): Record<string, unknown>[] {
  return lignes.map((ligne) => {
    const propre: Record<string, unknown> = {};
    for (const [cle, valeur] of Object.entries(ligne)) {
      if (!INTERDIT.test(cle)) propre[cle] = valeur;
    }
    return propre;
  });
}

export type ExportAgence = {
  genere_le: string;
  agence: Record<string, unknown> | null;
  donnees: Record<string, Record<string, unknown>[]>;
};

/** Toutes les donnees de cette agence, et d'aucune autre. */
export function exporterAgence(agenceId: number): ExportAgence {
  const fiche = un<Record<string, unknown>>("SELECT * FROM agences WHERE id = ?", agenceId);

  const donnees: Record<string, Record<string, unknown>[]> = {};
  for (const table of TABLES) {
    // `table` vient de la liste figee ci-dessus, jamais d'une saisie : cette
    // interpolation ne peut pas porter d'injection. La valeur, elle, reste
    // un parametre.
    const lignes = tous<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE agence_id = ? ORDER BY id`,
      agenceId,
    );
    donnees[table] = sansSecrets(lignes);
  }

  return {
    genere_le: new Date().toISOString(),
    agence: fiche ? sansSecrets([fiche])[0] : null,
    donnees,
  };
}
