import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { exigerSession, type Agence, type Utilisateur } from "./auth";
import { ecrire, tous, un } from "./db";

/**
 * Administration de la plateforme : qui entre, et ce qu'il a le droit d'y faire.
 *
 * DEUX SOURCES DE DROIT, ET UNE SEULE RACINE.
 *
 * 1. La variable ADMIN_EMAILS, posee chez l'hebergeur. Toute adresse qui y
 *    figure est super administrateur, quoi que dise la base. C'est la
 *    racine : elle ne se modifie pas depuis l'application, donc aucune
 *    faille applicative ne peut la retourner, et elle interdit de se
 *    verrouiller dehors en se retirant ses propres droits par megarde.
 *    C'est aussi la procedure de creation du PREMIER administrateur : il
 *    n'existe aucune inscription publique a ce role.
 *
 * 2. La table `admins`, pour les roles plus etroits — support, moderateur,
 *    facturation. Seul un super administrateur peut y ecrire.
 *
 * AUCUN UTILISATEUR NE PEUT S'ATTRIBUER UN ROLE. La table n'est ecrite que
 * par des actions qui exigent `admins.gerer`, et cette permission n'existe
 * que pour le super administrateur.
 *
 * SECONDE VERIFICATION OBLIGATOIRE. Etre reconnu administrateur ne suffit
 * pas : il faut en plus un code a usage unique, verifie a l'entree et
 * renouvele toutes les douze heures. Voir src/lib/totp.ts.
 */

// --------------------------------------------------------------- les roles

export const ROLES = {
  super_admin: {
    libelle: "Super administrateur",
    description: "Gestion complète, y compris les autres administrateurs.",
  },
  support: {
    libelle: "Support",
    description: "Assistance aux agences et aux utilisateurs, sans accès à la facturation.",
  },
  moderateur: {
    libelle: "Modérateur",
    description: "Annonces, artisans et signalements.",
  },
  facturation: {
    libelle: "Responsable facturation",
    description: "Abonnements, règlements et factures.",
  },
} as const;

export type RoleAdmin = keyof typeof ROLES;

/**
 * Les permissions, une par geste reel. Le controle porte TOUJOURS sur une
 * permission, jamais sur le nom du role : ajouter un role demain ne demande
 * alors de toucher qu'a ce tableau.
 */
export type Permission =
  | "tableau.lire"
  | "agences.lire" | "agences.ecrire" | "agences.suspendre" | "agences.notes"
  | "utilisateurs.lire" | "utilisateurs.ecrire"
  | "annonces.lire" | "annonces.moderer"
  | "artisans.lire" | "artisans.moderer"
  | "facturation.lire"
  | "journal.lire"
  | "parametres.lire"
  | "admins.gerer"
  | "export";

const PERMISSIONS: Record<RoleAdmin, Permission[]> = {
  super_admin: [
    "tableau.lire",
    "agences.lire", "agences.ecrire", "agences.suspendre", "agences.notes",
    "utilisateurs.lire", "utilisateurs.ecrire",
    "annonces.lire", "annonces.moderer",
    "artisans.lire", "artisans.moderer",
    "facturation.lire",
    "journal.lire",
    "parametres.lire",
    "admins.gerer",
    "export",
  ],
  // Le support voit les agences et depanne leurs utilisateurs. Il ne voit ni
  // les montants encaisses, ni les autres administrateurs.
  support: [
    "tableau.lire",
    "agences.lire", "agences.notes",
    "utilisateurs.lire", "utilisateurs.ecrire",
    "annonces.lire",
    "artisans.lire",
    "journal.lire",
  ],
  // Le moderateur touche au contenu public, a rien d'autre.
  moderateur: [
    "tableau.lire",
    "agences.lire",
    "annonces.lire", "annonces.moderer",
    "artisans.lire", "artisans.moderer",
    "journal.lire",
  ],
  facturation: [
    "tableau.lire",
    "agences.lire",
    "facturation.lire",
    "journal.lire",
    "export",
  ],
};

export type Admin = {
  email: string;
  nom: string | null;
  role: RoleAdmin;
  /** « variable » = designe par ADMIN_EMAILS ; « base » = ligne de `admins`. */
  source: "variable" | "base";
  totp_actif: boolean;
};

export function permissionsDe(role: RoleAdmin): Permission[] {
  return PERMISSIONS[role] ?? [];
}

export function peut(admin: Admin | null, permission: Permission): boolean {
  if (!admin) return false;
  return permissionsDe(admin.role).includes(permission);
}

// ------------------------------------------------------- qui est admin, et comment

/** Adresses de la variable d'environnement, en minuscules et sans espaces. */
function adressesRacine(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function administrationConfiguree(): boolean {
  return adressesRacine().length > 0;
}

/**
 * Liste des administrateurs racine, pour l'afficher dans l'espace.
 * Ce ne sont pas des secrets — ce sont des adresses de contact.
 */
export function adressesAdminVisibles(): string[] {
  return adressesRacine();
}

type LigneAdmin = {
  id: number; email: string; nom: string | null; role: string; actif: number;
  totp_secret: string | null; totp_actif: number;
};

function ligneAdmin(email: string): LigneAdmin | undefined {
  return un<LigneAdmin>("SELECT * FROM admins WHERE email = ?", email.trim().toLowerCase());
}

/**
 * Vrai si l'adresse a un acces d'administration, quel que soit son role.
 *
 * Utilisee par les routes qui servent des fichiers prives : elle repond a
 * « cette personne fait-elle partie de l'equipe ? », pas a « a-t-elle le
 * droit de faire ceci ? ». Pour cela, voir `exigerAdmin(permission)`.
 */
export function estAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const propre = email.trim().toLowerCase();
  if (adressesRacine().includes(propre)) return true;
  const ligne = ligneAdmin(propre);
  return Boolean(ligne && ligne.actif);
}

/** Le role et les droits d'une adresse, sans rien exiger. */
export function adminPour(email: string | null | undefined): Admin | null {
  if (!email) return null;
  const propre = email.trim().toLowerCase();
  const ligne = ligneAdmin(propre);

  // La variable l'emporte toujours : c'est la racine.
  if (adressesRacine().includes(propre)) {
    return {
      email: propre,
      nom: ligne?.nom ?? null,
      role: "super_admin",
      source: "variable",
      totp_actif: Boolean(ligne?.totp_actif),
    };
  }
  if (!ligne || !ligne.actif) return null;
  const role = (ligne.role in ROLES ? ligne.role : "support") as RoleAdmin;
  return {
    email: propre, nom: ligne.nom, role, source: "base",
    totp_actif: Boolean(ligne.totp_actif),
  };
}

/**
 * Cree, si besoin, la ligne d'un administrateur racine.
 *
 * Elle ne lui DONNE aucun droit — il les tient deja de la variable — mais
 * elle lui donne un endroit ou ranger son secret de seconde verification, et
 * le fait apparaitre dans la liste de l'equipe.
 */
export function assurerLigneAdmin(email: string, nom: string | null): void {
  const propre = email.trim().toLowerCase();
  if (ligneAdmin(propre)) return;
  ecrire(
    `INSERT INTO admins (email, nom, role, actif, cree_par)
     VALUES (?, ?, 'super_admin', 1, 'ADMIN_EMAILS')`,
    propre, nom,
  );
}

export function lireSecretTotp(email: string): { secret: string | null; actif: boolean } {
  const ligne = ligneAdmin(email);
  return { secret: ligne?.totp_secret ?? null, actif: Boolean(ligne?.totp_actif) };
}

// ------------------------------------------------- la seconde verification

const COOKIE_ADMIN = "sen_admin";
/** Douze heures : une journee de travail, pas davantage. */
const DUREE_HEURES = 12;

export async function ouvrirSessionAdmin(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_HEURES * 3600_000);
  ecrire(
    "INSERT INTO sessions_admin (token, email, expire_le) VALUES (?, ?, ?)",
    token, email.trim().toLowerCase(), expire.toISOString(),
  );
  ecrire("UPDATE admins SET derniere_connexion_le = datetime('now') WHERE email = ?",
    email.trim().toLowerCase());
  const jar = await cookies();
  jar.set(COOKIE_ADMIN, token, {
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expire, path: "/",
  });
}

export async function fermerSessionAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE_ADMIN)?.value;
  if (token) ecrire("DELETE FROM sessions_admin WHERE token = ?", token);
  jar.delete(COOKIE_ADMIN);
}

/** Ferme toutes les sessions d'administration d'une adresse. */
export function revoquerSessionsAdmin(email: string) {
  ecrire("DELETE FROM sessions_admin WHERE email = ?", email.trim().toLowerCase());
}

/** Vrai si la seconde verification a ete faite, et n'a pas expire. */
async function secondeVerificationFaite(email: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_ADMIN)?.value;
  if (!token) return false;
  const ligne = un<{ email: string; expire_le: string }>(
    "SELECT email, expire_le FROM sessions_admin WHERE token = ?", token,
  );
  if (!ligne) return false;
  if (ligne.email !== email.trim().toLowerCase()) return false;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions_admin WHERE token = ?", token);
    return false;
  }
  return true;
}

export type ContexteAdmin = {
  utilisateur: Utilisateur;
  agence: Agence;
  admin: Admin;
};

/**
 * Le gardien de tout l'espace : session d'agence valide, adresse reconnue
 * administrateur, seconde verification faite, et permission demandee accordee.
 *
 * REFUS PAR DEFAUT. Chaque page et chaque action nomme la permission dont
 * elle a besoin ; sans permission nommee, seule l'appartenance a l'equipe est
 * verifiee. Une page qui oublie d'appeler cette fonction n'est pas protegee —
 * c'est pourquoi le controle est aussi pose dans la mise en page de /admin,
 * qui couvre tout ce qui est range dessous.
 */
export async function exigerAdmin(permission?: Permission): Promise<ContexteAdmin> {
  const session = await exigerSession();
  const admin = adminPour(session.utilisateur.email);
  if (!admin) redirect("/dashboard");

  // Un administrateur racine sans ligne en base : on la cree pour qu'il
  // puisse y ranger son secret de seconde verification.
  if (admin.source === "variable") assurerLigneAdmin(admin.email, session.utilisateur.nom);

  const { secret, actif } = lireSecretTotp(admin.email);
  if (!secret || !actif) redirect("/admin/securite/activer");
  if (!(await secondeVerificationFaite(admin.email))) redirect("/admin/securite/verifier");

  if (permission && !peut(admin, permission)) redirect("/admin?refus=1");
  return { ...session, admin: { ...admin, totp_actif: actif } };
}

/**
 * Meme gardien, mais SANS exiger la seconde verification : reserve aux deux
 * pages qui servent justement a la faire. Elles ne montrent rien d'autre.
 */
export async function exigerAdminSansSecondeVerification(): Promise<ContexteAdmin> {
  const session = await exigerSession();
  const admin = adminPour(session.utilisateur.email);
  if (!admin) redirect("/dashboard");
  if (admin.source === "variable") assurerLigneAdmin(admin.email, session.utilisateur.nom);
  return { ...session, admin };
}

// ------------------------------------------------------------- le journal

export type EntreeJournal = {
  action: string;
  cible_type?: string | null;
  cible_id?: string | number | null;
  motif?: string | null;
  details?: string | null;
};

/**
 * Ecrit une ligne de journal. Appelee par toute action sensible.
 *
 * Ce qui n'y entre JAMAIS : mots de passe, empreintes, secrets, cles
 * marchandes, jetons. On note le geste, pas la matiere.
 */
export function journaliser(admin: Admin, e: EntreeJournal): void {
  ecrire(
    `INSERT INTO admin_journal (acteur, role, action, cible_type, cible_id, motif, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    admin.email, admin.role, e.action,
    e.cible_type ?? null,
    e.cible_id === undefined || e.cible_id === null ? null : String(e.cible_id),
    e.motif ?? null, e.details ?? null,
  );
}

export type LigneJournal = {
  id: number; acteur: string; role: string | null; action: string;
  cible_type: string | null; cible_id: string | null;
  motif: string | null; details: string | null; cree_le: string;
};

export function lireJournal(options: {
  limite?: number; depuis?: number; acteur?: string; action?: string;
  cible_type?: string; cible_id?: string;
} = {}): { lignes: LigneJournal[]; total: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.acteur) { conditions.push("acteur = ?"); params.push(options.acteur); }
  if (options.action) { conditions.push("action LIKE ?"); params.push(`%${options.action}%`); }
  if (options.cible_type) { conditions.push("cible_type = ?"); params.push(options.cible_type); }
  if (options.cible_id) { conditions.push("cible_id = ?"); params.push(options.cible_id); }
  const ou = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = un<{ n: number }>(`SELECT COUNT(*) AS n FROM admin_journal ${ou}`, ...params)?.n ?? 0;
  const lignes = tous<LigneJournal>(
    `SELECT * FROM admin_journal ${ou} ORDER BY cree_le DESC, id DESC LIMIT ? OFFSET ?`,
    ...params, options.limite ?? 50, options.depuis ?? 0,
  );
  return { lignes, total };
}

/** L'equipe d'administration, pour la page qui la gere. */
export type MembreEquipe = {
  id: number; email: string; nom: string | null; role: string; actif: number;
  totp_actif: number; cree_le: string; derniere_connexion_le: string | null; cree_par: string | null;
};

export function equipeAdmin(): MembreEquipe[] {
  return tous<MembreEquipe>("SELECT * FROM admins ORDER BY role, email");
}
