import { assistantConfigure } from "@/lib/assistant";
import { Assistant } from "./assistant";

/**
 * Affiche l'assistant seulement si une cle ANTHROPIC_API_KEY est configuree.
 * Le test se fait ici, cote serveur : la cle ne quitte jamais le serveur.
 */
export function AssistantMonte() {
  if (!assistantConfigure()) return null;
  return <Assistant />;
}
