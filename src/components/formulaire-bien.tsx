import Link from "next/link";
import { actionEnregistrerBien } from "@/lib/actions";
import { EQUIPEMENTS, QUARTIERS, STATUTS_BIEN, TYPES_BIEN, VILLES } from "@/lib/constantes";
import { Case, Champ, Section, Selection, ZoneTexte } from "@/components/ui";
import { ChampPhotos } from "@/components/champ-photos";
import type { Bien } from "@/lib/types";

export function FormulaireBien({ bien }: { bien?: Bien }) {
  const equipementsActuels = (bien?.equipements ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const photosActuelles = (bien?.photos ?? "").split(/[\n,]/).map((p) => p.trim()).filter(Boolean);

  return (
    <form action={actionEnregistrerBien} className="space-y-5">
      {bien && <input type="hidden" name="id" value={bien.id} />}

      <Section titre="Description du bien">
        <div className="sm:col-span-2">
          <Champ
            label="Titre de l'annonce" nom="titre" obligatoire valeur={bien?.titre}
            placeholder="Ex : Appartement 3 chambres meublé aux Almadies"
          />
        </div>
        <Selection
          label="Type de bien" nom="type" valeur={bien?.type ?? "appartement"}
          options={TYPES_BIEN.map((t) => ({ valeur: t.valeur, libelle: t.libelle }))}
        />
        <Selection
          label="Statut" nom="statut" valeur={bien?.statut ?? "disponible"}
          options={STATUTS_BIEN.map((t) => ({ valeur: t.valeur, libelle: t.libelle }))}
        />
        <div className="sm:col-span-2">
          <ZoneTexte
            label="Description détaillée" nom="description" valeur={bien?.description} lignes={5}
            placeholder="Décrivez le bien : étage, orientation, proximité des commerces, état général…"
          />
        </div>
      </Section>

      <Section titre="Localisation">
        <div>
          <label className="etiquette" htmlFor="ville">Ville</label>
          <input
            id="ville" name="ville" list="liste-villes" defaultValue={bien?.ville ?? "Dakar"}
            className="champ" placeholder="Dakar"
          />
          <datalist id="liste-villes">{VILLES.map((v) => <option key={v} value={v} />)}</datalist>
        </div>
        <div>
          <label className="etiquette" htmlFor="quartier">Quartier</label>
          <input
            id="quartier" name="quartier" list="liste-quartiers" defaultValue={bien?.quartier ?? ""}
            className="champ" placeholder="Almadies, Mermoz, Point E…"
          />
          <datalist id="liste-quartiers">{QUARTIERS.map((q) => <option key={q} value={q} />)}</datalist>
        </div>
        <div className="sm:col-span-2">
          <Champ label="Adresse précise" nom="adresse" valeur={bien?.adresse}
                 placeholder="Rue, numéro de villa, point de repère…" />
        </div>
      </Section>

      <Section titre="Caractéristiques">
        <Champ label="Nombre de chambres" nom="chambres" type="number" min={0} valeur={bien?.chambres ?? 0} />
        <Champ label="Salles de bain" nom="salles_bain" type="number" min={0} valeur={bien?.salles_bain ?? 0} />
        <Champ label="Surface (m²)" nom="surface" type="number" min={0} valeur={bien?.surface} placeholder="120" />
        <Champ label="Étage" nom="etage" valeur={bien?.etage} placeholder="RDC, 2e étage…" />

        <div className="sm:col-span-2">
          <p className="etiquette">Équipements</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {EQUIPEMENTS.map((e) => (
              <label key={e} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox" name="equipements" value={e}
                  defaultChecked={equipementsActuels.includes(e)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {e}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Case label="Le bien est meublé" nom="meuble" coche={bien?.meuble === 1} />
        </div>
      </Section>

      <Section titre="Loyer et conditions">
        <Champ
          label="Loyer mensuel (FCFA)" nom="loyer" valeur={bien?.loyer ?? ""} inputMode="numeric"
          placeholder="450000" aide="Saisissez uniquement les chiffres."
        />
        <Champ
          label="Charges mensuelles (FCFA)" nom="charges" valeur={bien?.charges ?? ""} inputMode="numeric"
          placeholder="25000" aide="Eau, électricité commune, gardiennage…"
        />
        <Champ
          label="Caution (nombre de mois)" nom="caution_mois" type="number" min={0} max={12}
          valeur={bien?.caution_mois ?? 2} aide="Souvent 1 à 3 mois de loyer au Sénégal."
        />
      </Section>

      <Section titre="Propriétaire et publication">
        <Champ label="Nom du propriétaire" nom="proprietaire_nom" valeur={bien?.proprietaire_nom} />
        <Champ label="Téléphone du propriétaire" nom="proprietaire_telephone" valeur={bien?.proprietaire_telephone}
               placeholder="77 123 45 67" />
        <ChampPhotos photos={photosActuelles} />
        <div className="sm:col-span-2">
          <Case label="Publier ce bien sur la vitrine publique" nom="publie" coche={bien ? bien.publie === 1 : true} />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primaire">
          {bien ? "Enregistrer les modifications" : "Créer le bien"}
        </button>
        <Link href="/dashboard/biens" className="btn-secondaire">Annuler</Link>
      </div>
    </form>
  );
}
