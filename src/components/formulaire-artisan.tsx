import { actionEnregistrerArtisan } from "@/lib/actions";
import { METIERS, VILLES } from "@/lib/constantes";
import { Case, Champ, Section, Selection, ZoneTexte } from "@/components/ui";
import type { Artisan } from "@/lib/requetes";

export function FormulaireArtisan({ artisan }: { artisan?: Artisan }) {
  return (
    <form action={actionEnregistrerArtisan} className="space-y-5">
      {artisan && <input type="hidden" name="id" value={artisan.id} />}

      <Section titre="Identité">
        <Champ label="Nom" nom="nom" obligatoire valeur={artisan?.nom}
               placeholder="Ex : Moussa Diallo, ou « Établissements Fall »" />
        <Selection label="Corps de métier" nom="metier" valeur={artisan?.metier ?? "autre"} options={METIERS} />
        <Champ label="Téléphone" nom="telephone" obligatoire valeur={artisan?.telephone}
               placeholder="77 123 45 67" />
        <Champ label="Second téléphone (facultatif)" nom="telephone2" valeur={artisan?.telephone2}
               placeholder="76 123 45 67" />
      </Section>

      <Section titre="Localisation">
        <div>
          <label className="etiquette" htmlFor="ville">Ville</label>
          <input id="ville" name="ville" list="villes-artisan" defaultValue={artisan?.ville ?? "Dakar"} className="champ" />
          <datalist id="villes-artisan">{VILLES.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
        <Champ label="Quartier" nom="quartier" valeur={artisan?.quartier} placeholder="Ex : Sacré-Cœur" />
      </Section>

      <Section titre="Présentation">
        <div className="sm:col-span-2">
          <ZoneTexte
            label="Description" nom="description" valeur={artisan?.description}
            placeholder="Spécialités, années d'expérience, chantiers réalisés…"
          />
        </div>
        <Champ label="Tarif indicatif (facultatif)" nom="tarif_indicatif" valeur={artisan?.tarif_indicatif}
               placeholder="Ex : À partir de 5 000 FCFA le déplacement" />
        <Champ label="Photo (adresse web, facultatif)" nom="photo_url" valeur={artisan?.photo_url}
               placeholder="https://…/photo.jpg" />
        <div className="sm:col-span-2">
          <Case label="Afficher sur la vitrine publique" nom="publie" coche={artisan ? artisan.publie === 1 : true} />
        </div>
      </Section>

      <button type="submit" className="btn-primaire">
        {artisan ? "Enregistrer" : "Ajouter cet artisan"}
      </button>
    </form>
  );
}
