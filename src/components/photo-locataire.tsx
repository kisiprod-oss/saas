import { ChampPhotoProfil } from "./champ-photo-profil";

/** Photo de profil du locataire. Conserve pour ne pas toucher a l'appelant. */
export function ChampPhotoLocataire({ photoActuelle }: { photoActuelle: string | null }) {
  return <ChampPhotoProfil photoActuelle={photoActuelle} boutonEnregistrer />;
}
