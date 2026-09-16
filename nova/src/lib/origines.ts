/**
 * Les places de marche reconnues.
 *
 * Dans un module a part, SANS « server-only » : l'importateur affiche le nom
 * de la place de marche cote navigateur, et un module server-only importe
 * dans un composant client fait echouer la compilation.
 *
 * Reconnaitre l'origine ne sert qu'a l'affichage. Aucune decision n'en depend :
 * un site inconnu est traite exactement comme un site connu, avec les memes
 * controles d'adresse et la meme extraction.
 */
export function origineDe(hote: string): string {
  const bas = String(hote ?? "").toLowerCase();
  if (bas.includes("amazon")) return "amazon";
  if (bas.includes("aliexpress")) return "aliexpress";
  if (bas.includes("alibaba")) return "alibaba";
  if (bas.includes("ebay")) return "ebay";
  if (bas.includes("temu")) return "temu";
  if (bas.includes("shein")) return "shein";
  if (bas.includes("jumia")) return "jumia";
  return "autre";
}

export const ORIGINES_LIBELLES: Record<string, string> = {
  amazon: "Amazon",
  aliexpress: "AliExpress",
  alibaba: "Alibaba",
  ebay: "eBay",
  temu: "Temu",
  shein: "Shein",
  jumia: "Jumia",
  photo: "Votre photo",
  autre: "Autre site",
};
