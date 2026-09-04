import Link from "next/link";
import { actionEnregistrerLocataire } from "@/lib/actions";
import { Champ, Section, ZoneTexte } from "@/components/ui";
import type { Locataire } from "@/lib/types";
import { ChampTelephone } from "@/components/champ-telephone";

export function FormulaireLocataire({ locataire }: { locataire?: Locataire }) {
  return (
    <form action={actionEnregistrerLocataire} className="space-y-5">
      {locataire && <input type="hidden" name="id" value={locataire.id} />}

      <Section titre="Identité">
        <Champ label="Prénom" nom="prenom" obligatoire valeur={locataire?.prenom} placeholder="Awa" />
        <Champ label="Nom" nom="nom" obligatoire valeur={locataire?.nom} placeholder="Diop" />
        <ChampTelephone obligatoire valeur={locataire?.telephone} />
        <ChampTelephone nom="telephone2" label="Second téléphone" valeur={locataire?.telephone2}
                        aide="Facultatif — un proche au Sénégal, par exemple." />
        <Champ label="Adresse e-mail" nom="email" type="email" valeur={locataire?.email} />
        <Champ label="Numéro de CNI / Passeport" nom="cni" valeur={locataire?.cni}
               placeholder="1 234 1990 00123" aide="Carte nationale d'identité du locataire." />
      </Section>

      <Section titre="Situation professionnelle">
        <Champ label="Profession" nom="profession" valeur={locataire?.profession} placeholder="Comptable" />
        <Champ label="Employeur" nom="employeur" valeur={locataire?.employeur} placeholder="Sonatel" />
        <div className="sm:col-span-2">
          <Champ label="Adresse actuelle" nom="adresse" valeur={locataire?.adresse} />
        </div>
      </Section>

      <Section titre="Garant (caution solidaire)">
        <Champ label="Nom du garant" nom="garant_nom" valeur={locataire?.garant_nom} />
        <Champ label="Téléphone du garant" nom="garant_telephone" valeur={locataire?.garant_telephone}
               placeholder="70 123 45 67" />
        <div className="sm:col-span-2">
          <ZoneTexte label="Notes internes" nom="notes" valeur={locataire?.notes}
                     placeholder="Informations utiles : ponctualité des paiements, remarques…" />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primaire">
          {locataire ? "Enregistrer les modifications" : "Créer le locataire"}
        </button>
        <Link href="/dashboard/locataires" className="btn-secondaire">Annuler</Link>
      </div>
    </form>
  );
}
