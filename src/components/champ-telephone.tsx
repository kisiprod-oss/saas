import { INDICATIFS, INDICATIF_DEFAUT, numeroCanonique } from "@/lib/telephone";

/**
 * Saisie d'un numero de telephone, senegalais ou etranger.
 *
 * Deux champs cote a cote : le pays, puis le numero tel qu'on l'ecrit
 * chez soi. C'est le seul moyen honnete de lever l'ambiguite — « 612345678 »
 * est un mobile espagnol valide ET un numero senegalais valide, et aucune
 * regle automatique ne peut trancher a la place de la personne.
 *
 * Volontairement sans JavaScript : le rapprochement des deux champs se fait
 * sur le serveur (voir `numeroSoumis`). Une inscription depuis un telephone
 * en 3G a Milan ou a Dakar ne doit pas dependre du chargement d'un script.
 */
export function ChampTelephone({
  nom = "telephone",
  label = "Téléphone",
  obligatoire,
  valeur,
  aide,
}: {
  nom?: string;
  label?: string;
  obligatoire?: boolean;
  valeur?: string | null;
  aide?: string;
}) {
  // Un numero deja enregistre est stocke en international : on rouvre le
  // formulaire sur son pays, et on n'affiche que la partie nationale.
  const canonique = numeroCanonique(valeur);
  const codes = [...INDICATIFS].map((i) => i.code).sort((a, b) => b.length - a.length);
  const codeActuel = codes.find((c) => canonique.startsWith(c)) ?? INDICATIF_DEFAUT;
  const national = canonique ? canonique.slice(codeActuel.length) : "";

  return (
    <div>
      <label className="etiquette" htmlFor={nom}>
        {label} {obligatoire && <span className="text-rose-500">*</span>}
      </label>

      <div className="flex gap-2">
        <select
          name={`${nom}_indicatif`}
          defaultValue={codeActuel}
          aria-label="Indicatif du pays"
          className="champ w-auto shrink-0 pr-1"
        >
          {INDICATIFS.map((i) => (
            <option key={i.code} value={i.code}>
              {i.drapeau} +{i.code}
            </option>
          ))}
        </select>

        <input
          id={nom}
          name={nom}
          type="tel"
          inputMode="tel"
          required={obligatoire}
          defaultValue={national}
          placeholder={codeActuel === INDICATIF_DEFAUT ? "77 123 45 67" : "6 12 34 56 78"}
          className="champ"
        />
      </div>

      <p className="mt-1 text-xs text-slate-500">
        {aide ?? "Votre numéro, où que vous viviez. Choisissez le pays à gauche."}
      </p>
    </div>
  );
}
