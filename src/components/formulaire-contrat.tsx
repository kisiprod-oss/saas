import Link from "next/link";
import { actionEnregistrerContrat } from "@/lib/actions";
import { STATUTS_CONTRAT } from "@/lib/constantes";
import { Champ, Section, Selection, ZoneTexte } from "@/components/ui";
import { aujourdhui, fcfa } from "@/lib/format";
import type { Contrat } from "@/lib/types";

type Option = { valeur: string | number; libelle: string };

export function FormulaireContrat({
  contrat, biens, locataires,
}: {
  contrat?: Contrat;
  biens: { id: number; titre: string; reference: string; loyer: number; charges: number; caution_mois: number }[];
  locataires: { id: number; prenom: string; nom: string; telephone: string }[];
}) {
  const optionsBiens: Option[] = biens.map((b) => ({
    valeur: b.id,
    libelle: `${b.titre} — ${b.reference} (${fcfa(b.loyer)}/mois)`,
  }));

  const optionsLocataires: Option[] = locataires.map((l) => ({
    valeur: l.id,
    libelle: `${l.prenom} ${l.nom} — ${l.telephone}`,
  }));

  return (
    <form action={actionEnregistrerContrat} className="space-y-5">
      {contrat && <input type="hidden" name="id" value={contrat.id} />}

      <Section titre="Parties du bail">
        <Selection
          label="Bien loué" nom="bien_id" obligatoire vide="— Choisir un bien —"
          valeur={contrat?.bien_id} options={optionsBiens}
        />
        <Selection
          label="Locataire" nom="locataire_id" obligatoire vide="— Choisir un locataire —"
          valeur={contrat?.locataire_id} options={optionsLocataires}
        />
      </Section>

      <Section titre="Durée du bail">
        <Champ label="Date de début" nom="date_debut" type="date" obligatoire
               valeur={contrat?.date_debut ?? aujourdhui()} />
        <Champ label="Date de fin" nom="date_fin" type="date" valeur={contrat?.date_fin}
               aide="Laissez vide pour un bail reconductible." />
        <Champ label="Durée (mois)" nom="duree_mois" type="number" min={1} valeur={contrat?.duree_mois ?? 12} />
        <Selection
          label="Statut du bail" nom="statut" valeur={contrat?.statut ?? "actif"}
          options={STATUTS_CONTRAT.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
        />
      </Section>

      <Section titre="Montants">
        <Champ label="Loyer mensuel (FCFA)" nom="loyer" inputMode="numeric" obligatoire
               valeur={contrat?.loyer ?? ""} placeholder="450000" />
        <Champ label="Charges mensuelles (FCFA)" nom="charges" inputMode="numeric"
               valeur={contrat?.charges ?? ""} placeholder="25000" />
        <Champ label="Caution versée (FCFA)" nom="caution" inputMode="numeric"
               valeur={contrat?.caution ?? ""} placeholder="900000"
               aide="Généralement 1 à 3 mois de loyer." />
        <Champ label="Jour d'échéance du loyer" nom="jour_echeance" type="number" min={1} max={28}
               valeur={contrat?.jour_echeance ?? 5}
               aide="Jour du mois où le loyer est dû (1 à 28)." />
        <Champ label="Honoraires agence (%)" nom="commission_pct" type="number" min={0} max={100}
               valeur={contrat?.commission_pct ?? 10}
               aide="Part prélevée sur le loyer pour la gestion." />
      </Section>

      <Section titre="Remarques">
        <div className="sm:col-span-2">
          <ZoneTexte label="Notes sur le bail" nom="notes" valeur={contrat?.notes}
                     placeholder="Clauses particulières, état des lieux, inventaire du mobilier…" />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primaire">
          {contrat ? "Enregistrer les modifications" : "Créer le bail"}
        </button>
        <Link href="/dashboard/contrats" className="btn-secondaire">Annuler</Link>
      </div>
    </form>
  );
}
