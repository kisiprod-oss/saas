import { headers } from "next/headers";
import { MAX_CARACTERES, assistantConfigure, repondre, type MessageChat } from "@/lib/assistant";

/**
 * Point d'entree de l'assistant. Renvoie la reponse au fil de l'eau,
 * en texte brut : le navigateur l'affiche a mesure qu'elle arrive.
 */

/** Nombre de questions autorisees par machine et par heure. */
const QUOTA = 30;
const FENETRE_MS = 3600_000;

// Compteur en memoire : suffisant pour un seul serveur, et remis a zero a
// chaque redemarrage. Il ne protege pas d'une attaque determinee ; il evite
// qu'un robot fasse exploser la facture d'appels au modele.
const compteur = new Map<string, { nombre: number; depuis: number }>();

function quotaDepasse(cle: string): boolean {
  const maintenant = Date.now();
  const suivi = compteur.get(cle);
  if (!suivi || maintenant - suivi.depuis > FENETRE_MS) {
    compteur.set(cle, { nombre: 1, depuis: maintenant });
    return false;
  }
  suivi.nombre += 1;
  return suivi.nombre > QUOTA;
}

/**
 * Adresse de l'appelant, ou null si le serveur de facade n'en transmet pas.
 * On ne regroupe pas les inconnus sous une meme cle : une seule personne
 * bloquerait alors l'assistant pour tout le monde.
 */
async function origine(): Promise<string | null> {
  const entetes = await headers();
  const suivi = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  return suivi || entetes.get("x-real-ip") || null;
}

function refus(message: string, code: number) {
  return new Response(message, {
    status: code,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(requete: Request) {
  if (!assistantConfigure()) {
    return refus("L'assistant n'est pas encore activé sur ce site.", 503);
  }

  const ip = await origine();
  if (ip !== null && quotaDepasse(ip)) {
    return refus(
      "Vous avez posé beaucoup de questions d'affilée. Réessayez dans un moment,"
      + " ou écrivez directement à l'équipe.",
      429,
    );
  }

  let messages: MessageChat[];
  try {
    const corps = (await requete.json()) as { messages?: unknown };
    if (!Array.isArray(corps.messages)) throw new Error("format");
    messages = corps.messages
      .filter((m): m is MessageChat =>
        typeof m === "object" && m !== null
        && ((m as MessageChat).role === "user" || (m as MessageChat).role === "assistant")
        && typeof (m as MessageChat).content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
  } catch {
    return refus("Question illisible.", 400);
  }

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return refus("Question manquante.", 400);
  }

  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      const encodeur = new TextEncoder();
      let commence = false;
      try {
        for await (const morceau of repondre(messages)) {
          commence = true;
          controleur.enqueue(encodeur.encode(morceau));
        }
      } catch (e) {
        // Le message d'erreur du fournisseur peut contenir des details
        // internes : on journalise, et on n'envoie qu'une phrase lisible.
        console.error("Assistant :", e);
        // Le saut de ligne ne sert qu'a detacher le message d'une reponse
        // deja commencee ; sans reponse, il laisserait une ligne vide.
        controleur.enqueue(encodeur.encode(
          (commence ? "\n\n" : "")
          + "Désolé, la réponse a été interrompue. Réessayez dans un instant.",
        ));
      }
      controleur.close();
    },
  });

  return new Response(flux, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Empeche la mise en tampon par un serveur de facade, qui annulerait
      // tout l'interet du flux.
      "X-Accel-Buffering": "no",
    },
  });
}
