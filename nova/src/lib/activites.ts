/**
 * Les types d'activite proposes a l'inscription.
 *
 * Dans un module a part, sans « use server » : l'assistant a besoin de la
 * liste pour construire son menu deroulant cote navigateur, et un fichier
 * d'actions serveur ne peut exporter que des fonctions.
 *
 * La liste vient du commerce de detail ouest-africain : « Mode et
 * habillement » avant « Electronique », parce que c'est ce qu'on trouve
 * d'abord sur les marches et dans les boutiques de quartier.
 */
export const ACTIVITES: [string, string][] = [
  ["mode", "Mode et habillement"],
  ["beaute", "Beauté et cosmétiques"],
  ["alimentaire", "Alimentaire et épicerie"],
  ["artisanat", "Artisanat et décoration"],
  ["electronique", "Téléphonie et électronique"],
  ["maison", "Maison et ameublement"],
  ["enfant", "Enfant et puériculture"],
  ["sport", "Sport et loisirs"],
  ["autre", "Autre activité"],
];

export function libelleActivite(code: string | null | undefined): string {
  return ACTIVITES.find(([c]) => c === code)?.[1] ?? "Commerce";
}
