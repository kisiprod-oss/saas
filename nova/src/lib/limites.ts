import "server-only";
import { un, ecrire } from "./db";

/**
 * Limitation de debit, cote serveur.
 *
 * Elle protege trois endroits ou une boucle automatique fait des degats :
 * la connexion (essais de mots de passe), la commande (inondation de fausses
 * commandes), et les appels IA (qui coutent de l'argent).
 *
 * Le compteur vit en base plutot qu'en memoire : avec plusieurs instances
 * derriere un repartiteur, un compteur en memoire se contourne en changeant
 * d'instance.
 */
export type Verdict = { permis: true } | { permis: false; secondes: number };

export function limiter(cle: string, maximum: number, fenetreSecondes: number): Verdict {
  const maintenant = Date.now();
  const ligne = un<{ compte: number; fenetre_debut: string }>(
    "SELECT compte, fenetre_debut FROM limites_requetes WHERE cle = ?", cle,
  );

  const debut = ligne ? Date.parse(ligne.fenetre_debut) : NaN;
  const fenetreOuverte = ligne && !Number.isNaN(debut)
    && maintenant - debut < fenetreSecondes * 1000;

  if (!fenetreOuverte) {
    ecrire(
      `INSERT INTO limites_requetes (cle, compte, fenetre_debut) VALUES (?, 1, ?)
       ON CONFLICT (cle) DO UPDATE SET compte = 1, fenetre_debut = excluded.fenetre_debut`,
      cle, new Date(maintenant).toISOString(),
    );
    return { permis: true };
  }

  if (ligne!.compte >= maximum) {
    const reste = Math.ceil((fenetreSecondes * 1000 - (maintenant - debut)) / 1000);
    return { permis: false, secondes: Math.max(1, reste) };
  }

  ecrire("UPDATE limites_requetes SET compte = compte + 1 WHERE cle = ?", cle);
  return { permis: true };
}

/** Efface les fenetres closes depuis plus d'une journee. */
export function menageLimites() {
  ecrire("DELETE FROM limites_requetes WHERE fenetre_debut < datetime('now', '-1 day')");
}

/** Message pret a afficher, pour ne pas le reecrire a chaque appelant. */
export function messageAttente(secondes: number): string {
  if (secondes < 60) return `Trop d'essais. Réessayez dans ${secondes} secondes.`;
  return `Trop d'essais. Réessayez dans ${Math.ceil(secondes / 60)} minutes.`;
}
