import type { NextRequest } from "next/server";
import { confirmerParJeton } from "@/lib/confirmation-paiement";

/**
 * Notification du fournisseur : « il s'est passe quelque chose sur ce jeton ».
 *
 * Volontairement minimal. Le corps du message n'est PAS lu : n'importe qui
 * peut appeler cette adresse et pretendre ce qu'il veut. Seul le jeton est
 * retenu, et `confirmerParJeton` va demander au fournisseur, avec les cles
 * de l'agence, ce qui s'est reellement passe.
 *
 * Consequence : une fausse notification ne peut rien solder. Elle provoque
 * au pire une verification inutile.
 */

/** Plafond d'appels par minute, pour qu'un flot de requetes ne coute rien. */
const QUOTA = 120;
const FENETRE_MS = 60_000;
let fenetre = { debut: Date.now(), nombre: 0 };

function tropDAppels(): boolean {
  const maintenant = Date.now();
  if (maintenant - fenetre.debut > FENETRE_MS) fenetre = { debut: maintenant, nombre: 0 };
  fenetre.nombre += 1;
  return fenetre.nombre > QUOTA;
}

/**
 * Le jeton arrive soit en parametre d'adresse, soit dans le corps du
 * formulaire selon la configuration du fournisseur : on accepte les deux.
 */
async function jetonDe(requete: NextRequest): Promise<string | null> {
  const params = requete.nextUrl.searchParams.get("token");
  if (params) return params;

  try {
    const type = requete.headers.get("content-type") ?? "";
    if (type.includes("json")) {
      const corps = (await requete.json()) as { token?: unknown; data?: { token?: unknown } };
      const brut = corps.token ?? corps.data?.token;
      return typeof brut === "string" && brut ? brut : null;
    }
    const formulaire = await requete.formData();
    const brut = formulaire.get("token") ?? formulaire.get("data[token]");
    return typeof brut === "string" && brut ? brut : null;
  } catch {
    return null;
  }
}

export async function POST(requete: NextRequest) {
  if (tropDAppels()) return new Response("trop d'appels", { status: 429 });

  const jeton = await jetonDe(requete);
  if (!jeton) return new Response("jeton absent", { status: 400 });

  const resultat = await confirmerParJeton(jeton);

  // On repond toujours 200 quand le jeton a pu etre traite : un code d'erreur
  // pousse le fournisseur a renvoyer la notification en boucle, y compris
  // quand le probleme vient de chez nous et ne se resoudra pas tout seul.
  if (!resultat.ok) {
    console.error("Encaissement — jeton %s : %s", jeton, resultat.erreur);
    return new Response("non traite", { status: 200 });
  }
  return new Response(resultat.statut, { status: 200 });
}

/** Certains fournisseurs testent l'adresse en GET avant de l'accepter. */
export function GET() {
  return new Response("Point de notification Sen Gestion", { status: 200 });
}
