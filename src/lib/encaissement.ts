import "server-only";
import { un } from "./db";
import { chiffrementConfigure, dechiffrer } from "./chiffrement";

/**
 * Encaissement automatique des loyers.
 *
 * Principe : CHAQUE AGENCE branche son propre compte marchand. L'argent va
 * directement de son locataire vers son compte ; Sen Gestion ne le touche
 * jamais, ne le detient jamais, et n'a donc pas besoin d'un agrement
 * d'etablissement de paiement.
 *
 * Les cles marchandes sont chiffrees en base (chiffrement.ts) et ne quittent
 * jamais le serveur.
 *
 * Regle de securite centrale : on ne croit JAMAIS la notification recue du
 * fournisseur. Elle sert uniquement de signal « va verifier ». Le statut qui
 * fait foi est celui obtenu en rappelant le fournisseur nous-memes, avec les
 * cles de l'agence. Une notification falsifiee ne peut donc rien solder.
 */

export const FOURNISSEURS = [
  {
    code: "paydunya",
    nom: "PayDunya",
    /** Ce que l'agence doit ouvrir chez le fournisseur pour obtenir ses cles. */
    ou: "paydunya.com → votre application → Clés d'API",
    moyens: "Orange Money, Wave, Free Money, carte bancaire",
  },
] as const;

export type CodeFournisseur = (typeof FOURNISSEURS)[number]["code"];

export type ClesAgence = {
  fournisseur: CodeFournisseur;
  mode: "test" | "reel";
  cleMaitre: string;
  clePrivee: string;
  jeton: string;
};

/** Etat de l'encaissement pour une agence, sans jamais exposer les cles. */
export type EtatEncaissement = {
  actif: boolean;
  fournisseur: string | null;
  mode: "test" | "reel";
  clesPresentes: boolean;
  /** Faux quand CLE_CHIFFREMENT manque : l'activation est alors impossible. */
  chiffrementPret: boolean;
};

type LigneAgence = {
  encaissement_actif: number;
  encaissement_fournisseur: string | null;
  encaissement_mode: string;
  encaissement_cle_maitre: string | null;
  encaissement_cle_privee: string | null;
  encaissement_jeton: string | null;
};

function lireLigne(agenceId: number): LigneAgence | undefined {
  return un<LigneAgence>(
    `SELECT encaissement_actif, encaissement_fournisseur, encaissement_mode,
            encaissement_cle_maitre, encaissement_cle_privee, encaissement_jeton
       FROM agences WHERE id = ?`,
    agenceId,
  );
}

export function etatEncaissement(agenceId: number): EtatEncaissement {
  const l = lireLigne(agenceId);
  return {
    actif: Boolean(l?.encaissement_actif),
    fournisseur: l?.encaissement_fournisseur ?? null,
    mode: l?.encaissement_mode === "reel" ? "reel" : "test",
    clesPresentes: Boolean(
      l?.encaissement_cle_maitre && l?.encaissement_cle_privee && l?.encaissement_jeton,
    ),
    chiffrementPret: chiffrementConfigure(),
  };
}

/**
 * Cles dechiffrees d'une agence, ou null si l'encaissement n'est pas
 * utilisable : desactive, incomplet, ou cle de chiffrement changee.
 */
export function clesAgence(agenceId: number): ClesAgence | null {
  const l = lireLigne(agenceId);
  if (!l || !l.encaissement_actif) return null;

  const cleMaitre = dechiffrer(l.encaissement_cle_maitre);
  const clePrivee = dechiffrer(l.encaissement_cle_privee);
  const jeton = dechiffrer(l.encaissement_jeton);
  if (!cleMaitre || !clePrivee || !jeton) return null;

  const fournisseur = l.encaissement_fournisseur as CodeFournisseur;
  if (!FOURNISSEURS.some((f) => f.code === fournisseur)) return null;

  return {
    fournisseur,
    mode: l.encaissement_mode === "reel" ? "reel" : "test",
    cleMaitre, clePrivee, jeton,
  };
}

// ------------------------------------------------------------- PayDunya

/**
 * Adresse de l'API selon le mode.
 * Le bac a sable permet a l'agence de tout essayer sans argent reel : c'est
 * le mode par defaut, et on n'en sort que deliberement.
 */
function basePaydunya(mode: "test" | "reel"): string {
  return mode === "reel"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";
}

function entetesPaydunya(cles: ClesAgence): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": cles.cleMaitre,
    "PAYDUNYA-PRIVATE-KEY": cles.clePrivee,
    "PAYDUNYA-TOKEN": cles.jeton,
  };
}

/** Coupe court si le fournisseur ne repond pas : le locataire attend. */
const DELAI_MS = 20_000;

async function appeler(
  url: string, options: RequestInit,
): Promise<{ ok: true; corps: Record<string, unknown> } | { ok: false; erreur: string }> {
  try {
    const reponse = await fetch(url, { ...options, signal: AbortSignal.timeout(DELAI_MS) });
    const texte = await reponse.text();

    let corps: Record<string, unknown>;
    try {
      corps = JSON.parse(texte) as Record<string, unknown>;
    } catch {
      // Une page HTML au lieu de JSON signale presque toujours des cles
      // refusees ou une mauvaise adresse : on le dit en clair.
      return { ok: false, erreur: `Réponse inattendue du fournisseur (HTTP ${reponse.status}).` };
    }
    return { ok: true, corps };
  } catch (e) {
    const message = (e as Error).name === "TimeoutError"
      ? "Le fournisseur de paiement n'a pas répondu à temps."
      : "Impossible de joindre le fournisseur de paiement.";
    return { ok: false, erreur: message };
  }
}

export type Facturation = {
  montant: number;
  description: string;
  nomAgence: string;
  telephoneAgence: string | null;
  /** Ou le fournisseur nous previent (serveur a serveur). */
  urlNotification: string;
  /** Ou le payeur revient une fois l'operation terminee. */
  urlRetour: string;
  urlAnnulation: string;
  /** Donnees qui nous reviennent telles quelles a la confirmation. */
  reference: Record<string, string>;
};

/**
 * Cree une facture chez le fournisseur et renvoie l'adresse de paiement.
 * Le jeton renvoye est la cle de tout : c'est lui qu'on interroge ensuite.
 */
export async function creerPaiement(
  cles: ClesAgence, f: Facturation,
): Promise<{ ok: true; jeton: string; url: string } | { ok: false; erreur: string }> {
  const reponse = await appeler(`${basePaydunya(cles.mode)}/checkout-invoice/create`, {
    method: "POST",
    headers: entetesPaydunya(cles),
    body: JSON.stringify({
      invoice: { total_amount: f.montant, description: f.description },
      store: {
        name: f.nomAgence,
        tagline: "Loyer",
        ...(f.telephoneAgence ? { phone: f.telephoneAgence } : {}),
      },
      actions: {
        callback_url: f.urlNotification,
        return_url: f.urlRetour,
        cancel_url: f.urlAnnulation,
      },
      custom_data: f.reference,
    }),
  });

  if (!reponse.ok) return { ok: false, erreur: reponse.erreur };

  const { response_code, response_text, token } = reponse.corps as {
    response_code?: string; response_text?: string; token?: string;
  };

  // « 00 » est le code de succes de PayDunya ; response_text porte alors
  // l'adresse de paiement, et le message d'erreur sinon.
  if (response_code !== "00" || !token) {
    return {
      ok: false,
      erreur: response_text || "Le fournisseur a refusé la demande de paiement.",
    };
  }

  const url = typeof response_text === "string" && response_text.startsWith("http")
    ? response_text
    : `https://paydunya.com/checkout/invoice/${token}`;

  return { ok: true, jeton: token, url };
}

export type StatutPaiement = {
  /** payee | en_attente | annulee | echouee */
  statut: "payee" | "en_attente" | "annulee" | "echouee";
  /** Montant reellement encaisse, tel que le fournisseur le rapporte. */
  montant: number | null;
  detail: string;
};

/**
 * Demande au fournisseur le vrai statut d'un paiement.
 *
 * C'est cet appel — et lui seul — qui autorise a solder une facture.
 * La notification recue par le webhook n'est qu'une invitation a le faire.
 */
export async function verifierPaiement(
  cles: ClesAgence, jeton: string,
): Promise<{ ok: true; resultat: StatutPaiement } | { ok: false; erreur: string }> {
  const reponse = await appeler(
    `${basePaydunya(cles.mode)}/checkout-invoice/confirm/${encodeURIComponent(jeton)}`,
    { method: "GET", headers: entetesPaydunya(cles) },
  );
  if (!reponse.ok) return { ok: false, erreur: reponse.erreur };

  const corps = reponse.corps as {
    status?: string; response_text?: string;
    invoice?: { total_amount?: number | string };
  };

  const brut = String(corps.status ?? "").toLowerCase();
  const statut: StatutPaiement["statut"] =
    brut === "completed" ? "payee"
    : brut === "pending" ? "en_attente"
    : brut === "cancelled" || brut === "canceled" ? "annulee"
    : "echouee";

  const montantBrut = corps.invoice?.total_amount;
  const montant = montantBrut === undefined ? null : Math.round(Number(montantBrut));

  return {
    ok: true,
    resultat: {
      statut,
      montant: Number.isFinite(montant) ? montant : null,
      detail: corps.response_text || brut || "sans détail",
    },
  };
}

/**
 * Verifie que les cles saisies fonctionnent, en creant une facture d'essai
 * de 100 FCFA qui n'est jamais presentee a personne.
 *
 * Sans cela, l'agence ne decouvrirait une cle fausse que le jour ou un
 * locataire essaie de payer.
 */
export async function testerCles(
  cles: ClesAgence, nomAgence: string, adresseSite: string,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const essai = await creerPaiement(cles, {
    montant: 100,
    description: "Vérification de la configuration Sen Gestion",
    nomAgence,
    telephoneAgence: null,
    urlNotification: `${adresseSite}/api/encaissement/paydunya`,
    urlRetour: `${adresseSite}/dashboard/encaissement`,
    urlAnnulation: `${adresseSite}/dashboard/encaissement`,
    reference: { essai: "1" },
  });

  return essai.ok ? { ok: true } : { ok: false, erreur: essai.erreur };
}
