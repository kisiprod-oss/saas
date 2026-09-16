import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { un, tous, ecrire } from "./db";
import { hacher, verifierMotDePasse } from "./auth";

/**
 * L'espace d'administration.
 *
 * ============================================================================
 *  UN AUTRE MONDE QUE L'ESPACE MARCHAND
 * ============================================================================
 *  Table de comptes distincte (`administrateurs`), table de sessions
 *  distincte (`sessions_admin`), cookie de nom différent. Un commerçant qui
 *  obtiendrait d'une façon ou d'une autre un cookie de session marchand ne
 *  peut rien en faire ici : les deux systèmes ne partagent aucune clé.
 *
 *  Et l'inverse est vrai : `exigerAdmin()` ne donne accès à AUCUNE écriture
 *  dans les données d'un commerçant en dehors de ce que ce fichier expose —
 *  suspendre, changer une offre, répondre à une demande. Pas de modification
 *  de produits, pas de modification de commandes, pas de lecture des secrets
 *  de paiement en clair.
 *
 *  Toute action sensible est journalisée dans `journal_admin`, avec son motif.
 * ============================================================================
 */

const COOKIE = "nova_admin";
const DUREE_HEURES = 8;

export type Admin = { id: number; nom: string; email: string };

/**
 * Crée le premier administrateur à partir des variables d'environnement.
 *
 * Aucun compte administrateur n'existe par défaut, et aucun mot de passe
 * n'est écrit en dur : il faut poser NOVA_ADMIN_EMAIL et NOVA_ADMIN_MOTDEPASSE
 * sur le serveur. Sans elles, l'espace d'administration est inaccessible —
 * ce qui est le bon comportement pour une installation qu'on vient de
 * déployer et dont personne ne s'est encore occupé.
 */
export function preparerAdministrateur(): boolean {
  const email = process.env.NOVA_ADMIN_EMAIL?.trim().toLowerCase();
  const motDePasse = process.env.NOVA_ADMIN_MOTDEPASSE;
  if (!email || !motDePasse || motDePasse.length < 12) return false;

  const existant = un<{ id: number }>("SELECT id FROM administrateurs WHERE email = ?", email);
  if (existant) return true;

  ecrire(
    "INSERT INTO administrateurs (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)",
    process.env.NOVA_ADMIN_NOM ?? "Administration", email, hacher(motDePasse),
  );
  return true;
}

export async function connecterAdmin(
  email: string, motDePasse: string,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  preparerAdministrateur();

  const admin = un<{ id: number; mot_de_passe_hash: string }>(
    "SELECT id, mot_de_passe_hash FROM administrateurs WHERE email = ? AND actif = 1",
    email.trim().toLowerCase(),
  );
  const refus = { ok: false as const, erreur: "Identifiants incorrects." };
  if (!admin) return refus;
  if (!verifierMotDePasse(motDePasse, admin.mot_de_passe_hash)) return refus;

  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_HEURES * 3_600_000);
  ecrire(
    "INSERT INTO sessions_admin (token, admin_id, expire_le) VALUES (?, ?, ?)",
    token, admin.id, expire.toISOString(),
  );

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict", // plus strict que l'espace marchand : aucun besoin de navigation croisée
    secure: process.env.NODE_ENV === "production",
    expires: expire,
    path: "/",
  });
  journaliser(admin.id, "connexion", null, null);
  return { ok: true };
}

export async function deconnecterAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) ecrire("DELETE FROM sessions_admin WHERE token = ?", token);
  jar.delete(COOKIE);
}

export async function adminCourant(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const ligne = un<Admin & { expire_le: string }>(
    `SELECT a.id, a.nom, a.email, s.expire_le
       FROM sessions_admin s
       JOIN administrateurs a ON a.id = s.admin_id
      WHERE s.token = ? AND a.actif = 1`,
    token,
  );
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions_admin WHERE token = ?", token);
    return null;
  }
  return { id: ligne.id, nom: ligne.nom, email: ligne.email };
}

export async function exigerAdmin(): Promise<Admin> {
  const admin = await adminCourant();
  if (!admin) redirect("/administration/connexion");
  return admin;
}

/** Trace une action d'administration. Jamais optionnel sur un geste sensible. */
export function journaliser(
  adminId: number, action: string, cible: string | null, motif: string | null,
  details?: string,
) {
  ecrire(
    "INSERT INTO journal_admin (admin_id, action, cible, motif, details) VALUES (?, ?, ?, ?, ?)",
    adminId, action.slice(0, 80), cible?.slice(0, 120) ?? null,
    motif?.slice(0, 500) ?? null, details?.slice(0, 1000) ?? null,
  );
}

// ---------------------------------------------------------------------------
//  Lectures de l'administration
// ---------------------------------------------------------------------------

export type LigneBoutique = {
  id: number; nom: string; slug: string; pays: string; ville: string | null;
  offre: string; offre_expire_le: string | null;
  publiee_le: string | null; suspendue_le: string | null; motif_suspension: string | null;
  demonstration: number; cree_le: string;
  proprietaire: string | null; email: string | null;
  produits: number; commandes: number; encaisse: number; ia_mois: number;
};

export function boutiques(recherche?: string): LigneBoutique[] {
  const mois = new Date().toISOString().slice(0, 7);
  const filtre = recherche?.trim()
    ? "WHERE b.nom LIKE ? OR b.slug LIKE ? OR u.email LIKE ?"
    : "";
  const motif = `%${recherche?.trim() ?? ""}%`;

  return tous<LigneBoutique>(
    `SELECT b.id, b.nom, b.slug, b.pays, b.ville, b.offre, b.offre_expire_le,
            b.publiee_le, b.suspendue_le, b.motif_suspension, b.demonstration, b.cree_le,
            u.nom AS proprietaire, u.email,
            (SELECT COUNT(*) FROM produits p WHERE p.boutique_id = b.id) produits,
            (SELECT COUNT(*) FROM commandes c WHERE c.boutique_id = b.id) commandes,
            (SELECT COALESCE(SUM(montant_encaisse), 0) FROM commandes c WHERE c.boutique_id = b.id) encaisse,
            (SELECT COUNT(*) FROM operations_ia o
              WHERE o.boutique_id = b.id AND o.statut = 'reussie'
                AND substr(o.cree_le, 1, 7) = ?) ia_mois
       FROM boutiques b
       LEFT JOIN utilisateurs u ON u.boutique_id = b.id AND u.role = 'proprietaire'
       ${filtre}
      ORDER BY b.cree_le DESC LIMIT 200`,
    ...(filtre ? [mois, motif, motif, motif] : [mois]),
  );
}

export function boutiqueDetail(id: number) {
  return un<LigneBoutique>(
    `SELECT b.*, u.nom AS proprietaire, u.email,
            (SELECT COUNT(*) FROM produits p WHERE p.boutique_id = b.id) produits,
            (SELECT COUNT(*) FROM commandes c WHERE c.boutique_id = b.id) commandes,
            (SELECT COALESCE(SUM(montant_encaisse), 0) FROM commandes c WHERE c.boutique_id = b.id) encaisse
       FROM boutiques b
       LEFT JOIN utilisateurs u ON u.boutique_id = b.id AND u.role = 'proprietaire'
      WHERE b.id = ?`,
    id,
  );
}

export type Chiffres = {
  boutiques: number; publiees: number; suspendues: number;
  commandes: number; encaisse: number; produits: number;
  iaMois: number; iaEchecsMois: number;
  abonnementsEnAttente: number; assistanceOuverte: number; erreurs7j: number;
};

export function chiffres(): Chiffres {
  const mois = new Date().toISOString().slice(0, 7);
  const n = (sql: string, ...p: unknown[]) => un<{ n: number }>(sql, ...p)?.n ?? 0;

  return {
    boutiques: n("SELECT COUNT(*) n FROM boutiques WHERE demonstration = 0"),
    publiees: n("SELECT COUNT(*) n FROM boutiques WHERE publiee_le IS NOT NULL AND demonstration = 0"),
    suspendues: n("SELECT COUNT(*) n FROM boutiques WHERE suspendue_le IS NOT NULL"),
    commandes: n("SELECT COUNT(*) n FROM commandes"),
    encaisse: n("SELECT COALESCE(SUM(montant_encaisse), 0) n FROM commandes"),
    produits: n("SELECT COUNT(*) n FROM produits"),
    iaMois: n(
      "SELECT COUNT(*) n FROM operations_ia WHERE statut = 'reussie' AND substr(cree_le, 1, 7) = ?", mois),
    iaEchecsMois: n(
      "SELECT COUNT(*) n FROM operations_ia WHERE statut = 'echouee' AND substr(cree_le, 1, 7) = ?", mois),
    abonnementsEnAttente: n("SELECT COUNT(*) n FROM abonnements WHERE statut = 'en_attente'"),
    assistanceOuverte: n("SELECT COUNT(*) n FROM demandes_assistance WHERE statut = 'ouverte'"),
    erreurs7j: n("SELECT COUNT(*) n FROM journal_erreurs WHERE cree_le >= datetime('now', '-7 days')"),
  };
}

export type Erreur = {
  id: number; boutique_id: number | null; source: string; message: string;
  details: string | null; cree_le: string; boutique: string | null;
};

export function erreurs(limite = 100): Erreur[] {
  return tous<Erreur>(
    `SELECT j.*, b.nom AS boutique FROM journal_erreurs j
       LEFT JOIN boutiques b ON b.id = j.boutique_id
      ORDER BY j.cree_le DESC LIMIT ?`,
    Math.min(limite, 500),
  );
}

export function journal(limite = 100) {
  return tous<{
    id: number; action: string; cible: string | null; motif: string | null;
    details: string | null; cree_le: string; admin: string | null;
  }>(
    `SELECT j.id, j.action, j.cible, j.motif, j.details, j.cree_le, a.nom AS admin
       FROM journal_admin j
       LEFT JOIN administrateurs a ON a.id = j.admin_id
      ORDER BY j.cree_le DESC LIMIT ?`,
    Math.min(limite, 500),
  );
}

export function demandesAssistance() {
  return tous<{
    id: number; boutique_id: number; sujet: string; message: string;
    statut: string; reponse: string | null; cree_le: string; boutique: string;
  }>(
    `SELECT d.*, b.nom AS boutique FROM demandes_assistance d
       JOIN boutiques b ON b.id = d.boutique_id
      ORDER BY CASE d.statut WHEN 'ouverte' THEN 0 ELSE 1 END, d.cree_le DESC LIMIT 100`,
  );
}

export function abonnementsEnAttente() {
  return tous<{
    id: number; boutique_id: number; offre: string; montant: number;
    devise: string; cree_le: string; boutique: string; email: string | null;
  }>(
    `SELECT a.id, a.boutique_id, a.offre, a.montant, a.devise, a.cree_le,
            b.nom AS boutique, u.email
       FROM abonnements a
       JOIN boutiques b ON b.id = a.boutique_id
       LEFT JOIN utilisateurs u ON u.boutique_id = b.id AND u.role = 'proprietaire'
      WHERE a.statut = 'en_attente' ORDER BY a.cree_le DESC LIMIT 100`,
  );
}

/** Les intégrations de paiement branchées, sans jamais montrer une clé. */
export function integrations() {
  return tous<{
    id: number; nom: string; slug: string; fournisseur: string | null;
    mode: string; actif: number; evenements: number; dernier: string | null;
  }>(
    `SELECT b.id, b.nom, b.slug, b.paiement_fournisseur AS fournisseur,
            b.paiement_mode AS mode, b.paiement_en_ligne AS actif,
            (SELECT COUNT(*) FROM evenements_paiement e WHERE e.boutique_id = b.id) evenements,
            (SELECT MAX(recu_le) FROM evenements_paiement e WHERE e.boutique_id = b.id) dernier
       FROM boutiques b
      WHERE b.paiement_en_ligne = 1
      ORDER BY b.nom LIMIT 200`,
  );
}
