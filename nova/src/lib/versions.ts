import "server-only";
import { un, tous, ecrire, transaction } from "./db";
import { valider, type ContenuBoutique } from "./sections";

/**
 * Brouillon, publication, historique.
 *
 * ============================================================================
 *  TROIS ÉTATS, PAS DEUX
 * ============================================================================
 *   boutiques.brouillon  ce que le commerçant est en train de modifier
 *   boutiques.publie     ce que le visiteur voit, figé jusqu'à la prochaine
 *                        publication
 *   versions_boutique    des instantanés immuables, pour revenir en arrière
 *
 *  Écrire dans le brouillon ne touche JAMAIS `publie`. C'est ce qui permet à
 *  un commerçant de laisser une boutique à moitié réécrite pendant trois jours
 *  sans que ses clients voient quoi que ce soit.
 *
 *  Un instantané est posé AVANT chaque modification (pour annuler) et À chaque
 *  publication (pour savoir ce qui est en ligne). Jamais après coup : un
 *  instantané pris après la modification ne permet pas de revenir avant.
 * ============================================================================
 */

export type Version = {
  id: number;
  boutique_id: number;
  numero: number;
  contenu: string;
  etat: string;
  origine: string;
  resume: string | null;
  cree_par: number | null;
  cree_le: string;
};

export const ORIGINES: Record<string, string> = {
  manuel: "Modification manuelle",
  ia: "Assistant intelligent",
  assistant: "Assistant de création",
  restauration: "Restauration",
  publication: "Publication",
};

/** Le brouillon en cours, toujours valide (jamais d'exception). */
export function brouillon(boutiqueId: number): ContenuBoutique {
  const ligne = un<{ brouillon: string }>(
    "SELECT brouillon FROM boutiques WHERE id = ?", boutiqueId,
  );
  return valider(ligne?.brouillon);
}

export function publie(boutiqueId: number): ContenuBoutique | null {
  const ligne = un<{ publie: string | null }>(
    "SELECT publie FROM boutiques WHERE id = ?", boutiqueId,
  );
  return ligne?.publie ? valider(ligne.publie) : null;
}

function prochainNumero(boutiqueId: number): number {
  return (un<{ n: number }>(
    "SELECT COALESCE(MAX(numero), 0) n FROM versions_boutique WHERE boutique_id = ?",
    boutiqueId,
  )?.n ?? 0) + 1;
}

/**
 * Pose un instantané du contenu passé en argument.
 *
 * L'historique est plafonné à 30 entrées par boutique : au-delà, la base
 * grossit sans que personne ne remonte aussi loin. Les plus anciennes
 * partent, sauf celles marquées `publiee` — savoir ce qui a été mis en ligne
 * un jour donné est une information qu'on ne jette pas.
 */
export function instantane(
  boutiqueId: number,
  contenu: ContenuBoutique,
  options: { origine: string; resume?: string; etat?: string; utilisateurId?: number | null },
): number {
  return transaction(() => {
    const numero = prochainNumero(boutiqueId);
    const r = ecrire(
      `INSERT INTO versions_boutique
         (boutique_id, numero, contenu, etat, origine, resume, cree_par)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      boutiqueId, numero, JSON.stringify(contenu), options.etat ?? "brouillon",
      options.origine, options.resume?.slice(0, 200) ?? null, options.utilisateurId ?? null,
    );

    const trop = tous<{ id: number }>(
      `SELECT id FROM versions_boutique
        WHERE boutique_id = ? AND etat <> 'publiee'
        ORDER BY numero DESC LIMIT -1 OFFSET 30`,
      boutiqueId,
    );
    for (const vieille of trop) {
      ecrire("DELETE FROM versions_boutique WHERE boutique_id = ? AND id = ?", boutiqueId, vieille.id);
    }
    return Number(r.lastInsertRowid);
  });
}

/**
 * Écrit le brouillon, après avoir gardé une copie de l'état précédent.
 *
 * `poserInstantane: false` sert aux enregistrements très fréquents (chaque
 * frappe dans l'éditeur ne mérite pas une version) : l'appelant pose alors
 * lui-même un instantané au bon moment.
 */
export function ecrireBrouillon(
  boutiqueId: number,
  contenu: ContenuBoutique,
  options: { origine: string; resume?: string; utilisateurId?: number | null; poserInstantane?: boolean } ,
) {
  transaction(() => {
    if (options.poserInstantane !== false) {
      instantane(boutiqueId, brouillon(boutiqueId), {
        origine: options.origine,
        resume: options.resume,
        utilisateurId: options.utilisateurId,
      });
    }
    ecrire(
      "UPDATE boutiques SET brouillon = ? WHERE id = ?",
      JSON.stringify(valider(contenu)), boutiqueId,
    );
  });
}

/**
 * Met le brouillon en ligne.
 *
 * C'est le SEUL endroit du code qui écrit `boutiques.publie`. Un seul point
 * de passage veut dire une seule chose à vérifier quand on se demande
 * « comment ce texte est-il arrivé sur le site ? ».
 */
export function publier(boutiqueId: number, utilisateurId: number | null) {
  transaction(() => {
    const contenu = brouillon(boutiqueId);
    instantane(boutiqueId, contenu, {
      origine: "publication", etat: "publiee",
      resume: "Mise en ligne", utilisateurId,
    });
    ecrire(
      `UPDATE boutiques
          SET publie = ?, publiee_le = COALESCE(publiee_le, datetime('now'))
        WHERE id = ?`,
      JSON.stringify(contenu), boutiqueId,
    );
  });
}

/**
 * Retire la boutique du web.
 *
 * `publie` est conservé : reprendre la vente ne doit pas demander de tout
 * réécrire. Seule `publiee_le` passe à NULL, et c'est elle que consultent les
 * pages publiques.
 */
export function depublier(boutiqueId: number) {
  ecrire("UPDATE boutiques SET publiee_le = NULL WHERE id = ?", boutiqueId);
}

export function historique(boutiqueId: number, limite = 30): Version[] {
  return tous<Version>(
    `SELECT id, boutique_id, numero, etat, origine, resume, cree_par, cree_le, contenu
       FROM versions_boutique WHERE boutique_id = ?
      ORDER BY numero DESC LIMIT ?`,
    boutiqueId, Math.min(Math.max(1, limite), 100),
  );
}

export function version(boutiqueId: number, id: number): Version | undefined {
  return un<Version>(
    "SELECT * FROM versions_boutique WHERE boutique_id = ? AND id = ?", boutiqueId, id,
  );
}

/**
 * Remet une ancienne version dans le brouillon.
 *
 * La restauration est elle-même annulable : on pose un instantané de l'état
 * courant avant de l'écraser. Se tromper de version à restaurer n'est donc
 * jamais définitif.
 *
 * Elle ne publie rien : le commerçant relit, puis publie s'il veut.
 */
export function restaurer(
  boutiqueId: number, versionId: number, utilisateurId: number | null,
): { ok: true; numero: number } | { ok: false; erreur: string } {
  const cible = version(boutiqueId, versionId);
  if (!cible) return { ok: false, erreur: "Cette version n'existe plus." };

  const contenu = valider(cible.contenu);
  if (contenu.sections.length === 0) {
    return { ok: false, erreur: "Cette version est vide : la restaurer effacerait votre page." };
  }

  ecrireBrouillon(boutiqueId, contenu, {
    origine: "restauration",
    resume: `Avant restauration de la version ${cible.numero}`,
    utilisateurId,
  });
  return { ok: true, numero: cible.numero };
}

/** Vrai si le brouillon diffère de ce qui est en ligne. */
export function modificationsEnAttente(boutiqueId: number): boolean {
  const ligne = un<{ brouillon: string; publie: string | null }>(
    "SELECT brouillon, publie FROM boutiques WHERE id = ?", boutiqueId,
  );
  if (!ligne) return false;
  if (!ligne.publie) return true;
  return JSON.stringify(valider(ligne.brouillon)) !== JSON.stringify(valider(ligne.publie));
}
