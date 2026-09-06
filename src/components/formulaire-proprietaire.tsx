import Link from "next/link";
import { actionEnregistrerProprietaire } from "@/lib/actions";
import { Champ, Section, ZoneTexte } from "@/components/ui";
import type { Proprietaire } from "@/lib/types";
import { ChampTelephone } from "@/components/champ-telephone";
import { ChampPhotoProfil } from "@/components/champ-photo-profil";

export function FormulaireProprietaire({ proprietaire }: { proprietaire?: Proprietaire }) {
  return (
    <form action={actionEnregistrerProprietaire} className="space-y-5">
      {proprietaire && <input type="hidden" name="id" value={proprietaire.id} />}

      <Section titre="Identité">
        <Champ label="Nom" nom="nom" obligatoire valeur={proprietaire?.nom} placeholder="Aïssatou Sow" />
        <ChampTelephone valeur={proprietaire?.telephone}
                        aide="Un propriétaire vit parfois à l'étranger : choisissez son pays." />
        <Champ label="Adresse e-mail" nom="email" type="email" valeur={proprietaire?.email} />
        <div className="sm:col-span-2">
          <Champ label="Adresse" nom="adresse" valeur={proprietaire?.adresse} />
        </div>
        <div className="sm:col-span-2">
          <p className="etiquette">Photo</p>
          <ChampPhotoProfil
            photoActuelle={proprietaire?.photo_url ?? null}
            aide="Une photo aide à reconnaître le propriétaire lors d'une visite ou d'une signature."
          />
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-brand-700">
              Ou indiquer l&apos;adresse web d&apos;une photo
            </summary>
            <input name="photo_url" defaultValue={proprietaire?.photo_url ?? ""}
                   placeholder="https://…/photo.jpg" className="champ mt-2" />
          </details>
        </div>
        <div className="sm:col-span-2">
          <ZoneTexte label="Notes internes" nom="notes" valeur={proprietaire?.notes}
                     placeholder="Modalités de reversement, informations utiles…" />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primaire">
          {proprietaire ? "Enregistrer les modifications" : "Créer le propriétaire"}
        </button>
        <Link href="/dashboard/proprietaires" className="btn-secondaire">Annuler</Link>
      </div>
    </form>
  );
}
