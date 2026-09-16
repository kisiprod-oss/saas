import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { un, ecrire, transaction } from "./db";
import { enSlug } from "./format";
import { canonique } from "./telephone";

const COOKIE = "nova_session";
const DUREE_JOURS = 30;

export type Utilisateur = {
  id: number;
  boutique_id: number;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
};

export type Boutique = {
  id: number;
  slug: string;
  nom: string;
  activite: string | null;
  description: string | null;
  pays: string;
  ville: string | null;
  quartier: string | null;
  adresse: string | null;
  telephone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  modele: string;
  couleur: string;
  brouillon: string;
  publie: string | null;
  publiee_le: string | null;
  titre_partage: string | null;
  description_partage: string | null;
  conditions_vente: string | null;
  conditions_livraison: string | null;
  conditions_retour: string | null;
  conditions_validees_le: string | null;
  retrait_actif: number;
  retrait_adresse: string | null;
  retrait_horaires: string | null;
  livraison_active: number;
  paiement_livraison: number;
  paiement_en_ligne: number;
  paiement_fournisseur: string | null;
  paiement_mode: string;
  paiement_cle_publique: string | null;
  paiement_cle_privee: string | null;
  paiement_secret_webhook: string | null;
  domaine: string | null;
  domaine_jeton: string | null;
  domaine_verifie_le: string | null;
  /** Taux de change saisis par le commercant, en JSON. Voir src/lib/devises.ts. */
  taux_change: string;
  /** Marge par defaut appliquee a un prix importe, en pourcentage. */
  marge_import: number;
  etape_assistant: number;
  assistant_fini_le: string | null;
  offre: string;
  offre_expire_le: string | null;
  suspendue_le: string | null;
  motif_suspension: string | null;
  notes_internes: string | null;
  demonstration: number;
  cree_le: string;
};

/** scrypt + sel aleatoire. Le format « sel:empreinte » tient dans une colonne. */
export function hacher(motDePasse: string): string {
  const sel = crypto.randomBytes(16).toString("hex");
  return `${sel}:${crypto.scryptSync(motDePasse, sel, 64).toString("hex")}`;
}

/** Comparaison a temps constant : une comparaison naive fuite la longueur. */
export function verifierMotDePasse(motDePasse: string, empreinte: string): boolean {
  const [sel, cle] = (empreinte ?? "").split(":");
  if (!sel || !cle) return false;
  const attendu = Buffer.from(cle, "hex");
  const calcule = crypto.scryptSync(motDePasse, sel, 64);
  return attendu.length === calcule.length && crypto.timingSafeEqual(attendu, calcule);
}

/** Regle minimale, annoncee a la saisie : 8 caracteres. */
export function motDePasseAcceptable(motDePasse: string): string | null {
  if (motDePasse.length < 8) return "Le mot de passe doit faire au moins 8 caractères.";
  if (motDePasse.length > 200) return "Le mot de passe est trop long.";
  return null;
}

export async function ouvrirSession(utilisateurId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + DUREE_JOURS * 86_400_000);
  ecrire(
    "INSERT INTO sessions (token, utilisateur_id, expire_le) VALUES (?, ?, ?)",
    token, utilisateurId, expire.toISOString(),
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expire,
    path: "/",
  });
}

export async function fermerSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) ecrire("DELETE FROM sessions WHERE token = ?", token);
  jar.delete(COOKIE);
}

export async function utilisateurCourant(): Promise<Utilisateur | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const ligne = un<Utilisateur & { expire_le: string }>(
    `SELECT u.id, u.boutique_id, u.nom, u.email, u.telephone, u.role, s.expire_le
       FROM sessions s
       JOIN utilisateurs u ON u.id = s.utilisateur_id
      WHERE s.token = ? AND u.actif = 1`,
    token,
  );
  if (!ligne) return null;
  if (new Date(ligne.expire_le).getTime() < Date.now()) {
    ecrire("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }
  return ligne;
}

export type Contexte = { utilisateur: Utilisateur; boutique: Boutique };

/**
 * LE point de passage de tout l'espace marchand.
 *
 * Aucune page, aucune action du tableau de bord ne lit un `boutique_id` venu
 * de l'URL ou d'un formulaire : il vient d'ici, c'est-a-dire du cookie de
 * session. C'est ce qui rend impossible d'afficher les commandes d'un autre
 * commercant en changeant un chiffre dans l'adresse.
 */
export async function exigerSession(): Promise<Contexte> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) redirect("/connexion");
  const boutique = un<Boutique>("SELECT * FROM boutiques WHERE id = ?", utilisateur.boutique_id);
  if (!boutique) redirect("/connexion");

  // Une boutique suspendue : la session est fermee tout de suite. Sans cela,
  // une session deja ouverte survivrait a la suspension pendant trente jours.
  if (boutique.suspendue_le) {
    await fermerSession();
    const motif = boutique.motif_suspension
      ? `Votre boutique est suspendue : ${boutique.motif_suspension}`
      : "Votre boutique est suspendue. Écrivez-nous pour en connaître la raison.";
    redirect(`/connexion?message=${encodeURIComponent(motif)}`);
  }
  return { utilisateur, boutique };
}

/** Variante sans redirection, pour les pages qui s'adaptent (en-tete public). */
export async function sessionEventuelle(): Promise<Contexte | null> {
  const utilisateur = await utilisateurCourant();
  if (!utilisateur) return null;
  const boutique = un<Boutique>("SELECT * FROM boutiques WHERE id = ?", utilisateur.boutique_id);
  if (!boutique || boutique.suspendue_le) return null;
  return { utilisateur, boutique };
}

/** Fabrique une adresse publique libre a partir du nom de la boutique. */
export function slugLibre(nom: string): string {
  const base = enSlug(nom) || "boutique";
  // Reserves : ces mots sont des chemins du site ou des sous-domaines de
  // service. Les laisser pris par une boutique casserait le site lui-meme.
  const interdits = new Set([
    "www", "api", "admin", "app", "nova", "boutique", "aide", "blog", "mail",
    "static", "assets", "cdn", "connexion", "inscription", "tarifs", "demo",
  ]);
  let slug = interdits.has(base) ? `${base}-boutique` : base;
  let n = 2;
  while (un("SELECT id FROM boutiques WHERE slug = ?", slug)) slug = `${base}-${n++}`;
  return slug;
}

export type Inscription = {
  nomBoutique: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
};

/**
 * Cree une boutique et son proprietaire, en une transaction : jamais un
 * utilisateur sans boutique, jamais une boutique sans proprietaire.
 */
export function inscrire(
  params: Inscription,
): { ok: true; utilisateurId: number; boutiqueId: number } | { ok: false; erreur: string } {
  const email = params.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, erreur: "Cette adresse e-mail n'est pas valide." };
  }
  if (un("SELECT id FROM utilisateurs WHERE email = ?", email)) {
    return { ok: false, erreur: "Cette adresse e-mail a déjà un compte. Connectez-vous." };
  }
  const faible = motDePasseAcceptable(params.motDePasse);
  if (faible) return { ok: false, erreur: faible };

  const nomBoutique = params.nomBoutique.trim();
  if (nomBoutique.length < 2) {
    return { ok: false, erreur: "Donnez un nom à votre boutique." };
  }
  const telephone = canonique(params.telephone);

  return transaction(() => {
    const slug = slugLibre(nomBoutique);
    const boutique = ecrire(
      `INSERT INTO boutiques (slug, nom, telephone, whatsapp, email, brouillon)
       VALUES (?, ?, ?, ?, ?, '{}')`,
      slug, nomBoutique, telephone, telephone, email,
    );
    const boutiqueId = Number(boutique.lastInsertRowid);
    const utilisateur = ecrire(
      `INSERT INTO utilisateurs (boutique_id, nom, email, telephone, mot_de_passe_hash, role)
       VALUES (?, ?, ?, ?, ?, 'proprietaire')`,
      boutiqueId, params.nom.trim() || nomBoutique, email, telephone,
      hacher(params.motDePasse),
    );
    return {
      ok: true as const,
      utilisateurId: Number(utilisateur.lastInsertRowid),
      boutiqueId,
    };
  });
}

// ---------------------------------------------------------------------------
//  Recuperation de compte
// ---------------------------------------------------------------------------

/**
 * Cree un jeton de reinitialisation et renvoie sa forme EN CLAIR (la seule
 * qui parte par e-mail). La base n'en garde que l'empreinte : si elle fuite,
 * les jetons qu'elle contient ne servent a rien.
 */
export function demanderReinitialisation(email: string): string | null {
  const utilisateur = un<{ id: number }>(
    "SELECT id FROM utilisateurs WHERE email = ? AND actif = 1", email.trim().toLowerCase(),
  );
  // Aucun retour different si l'adresse est inconnue : l'appelant affiche le
  // meme message dans les deux cas, pour ne pas reveler qui a un compte.
  if (!utilisateur) return null;

  const jeton = crypto.randomBytes(32).toString("hex");
  const empreinte = crypto.createHash("sha256").update(jeton).digest("hex");
  ecrire(
    `INSERT INTO reinitialisations (jeton_hash, utilisateur_id, expire_le)
     VALUES (?, ?, datetime('now', '+2 hours'))`,
    empreinte, utilisateur.id,
  );
  return jeton;
}

export function reinitialiser(
  jeton: string, nouveau: string,
): { ok: true } | { ok: false; erreur: string } {
  const faible = motDePasseAcceptable(nouveau);
  if (faible) return { ok: false, erreur: faible };

  const empreinte = crypto.createHash("sha256").update(jeton).digest("hex");
  const ligne = un<{ utilisateur_id: number }>(
    `SELECT utilisateur_id FROM reinitialisations
      WHERE jeton_hash = ? AND utilise_le IS NULL AND expire_le > datetime('now')`,
    empreinte,
  );
  if (!ligne) {
    return { ok: false, erreur: "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau." };
  }

  transaction(() => {
    ecrire("UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE id = ?",
      hacher(nouveau), ligne.utilisateur_id);
    ecrire("UPDATE reinitialisations SET utilise_le = datetime('now') WHERE jeton_hash = ?",
      empreinte);
    // Toutes les sessions ouvertes tombent : si quelqu'un d'autre etait
    // connecte sur ce compte, le changement de mot de passe le met dehors.
    ecrire("DELETE FROM sessions WHERE utilisateur_id = ?", ligne.utilisateur_id);
  });
  return { ok: true };
}
