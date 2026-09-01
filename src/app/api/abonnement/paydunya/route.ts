import type { NextRequest } from "next/server";
import { confirmerAbonnement } from "@/lib/abonnement";

/**
 * Notification du fournisseur pour un reglement d'ABONNEMENT (agence vers
 * editeur). Le pendant de /api/encaissement/paydunya, qui traite les loyers.
 *
 * Meme regle, et c'est la seule qui compte : le corps du message n'est pas
 * lu. N'importe qui peut appeler cette adresse. Seul le jeton est retenu, et
 * `confirmerAbonnement` va demander au fournisseur ce qui s'est reellement
 * passe. Une fausse notification ne peut donc accorder aucune formule.
 */

const QUOTA = 120;
const FENETRE_MS = 60_000;
let fenetre = { debut: Date.now(), nombre: 0 };

function tropDAppels(): boolean {
  const maintenant = Date.now();
  if (maintenant - fenetre.debut > FENETRE_MS) fenetre = { debut: maintenant, nombre: 0 };
  fenetre.nombre += 1;
  return fenetre.nombre > QUOTA;
}

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

  const resultat = await confirmerAbonnement(jeton);

  // Toujours 200 quand le jeton a pu etre traite : un code d'erreur ferait
  // renvoyer la notification en boucle, y compris pour un probleme qui ne se
  // resoudra pas tout seul.
  if (!resultat.ok) {
    console.error("Abonnement — jeton %s : %s", jeton, resultat.erreur);
    return new Response("non traite", { status: 200 });
  }
  return new Response(resultat.statut, { status: 200 });
}

export function GET() {
  return new Response("Point de notification des abonnements Sen Gestion", { status: 200 });
}
