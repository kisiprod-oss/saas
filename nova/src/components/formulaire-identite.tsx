"use client";

import { useActionState, useState } from "react";
import { actionEnregistrerIdentite, type Etat } from "@/lib/actions-reglages";
import { BoutonEnvoi, Message, Photo } from "./ui";
import { MODELES_LIBELLES, type Modele } from "@/lib/sections";

const COULEURS = [
  "#0E5C3F", "#14508F", "#8B3A62", "#1F2933",
  "#9A5B27", "#C2571F", "#4A5D45", "#6B2737",
];

/** L'identite de la boutique : nom, coordonnees, apparence, partage. */
export function FormulaireIdentite({
  boutique, pays,
}: {
  boutique: {
    id: number; nom: string; description: string | null; pays: string;
    ville: string | null; quartier: string | null; adresse: string | null;
    telephone: string | null; whatsapp: string | null; email: string | null;
    modele: string; couleur: string; logo: string | null; slug: string;
    titrePartage: string | null; descriptionPartage: string | null;
  };
  pays: { code: string; nom: string; villes: string[] }[];
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerIdentite, {});
  const [couleur, setCouleur] = useState(boutique.couleur);
  const [codePays, setCodePays] = useState(boutique.pays);

  const villes = pays.find((p) => p.code === codePays)?.villes ?? [];

  return (
    <form action={envoyer} className="carte space-y-5 p-5">
      <h2 className="titre-section">Ma boutique</h2>
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="nom">Nom</label>
        <input id="nom" name="nom" className="champ" required maxLength={80}
          defaultValue={boutique.nom} />
        <p className="aide">
          Votre adresse publique reste <code className="font-mono">{boutique.slug}</code> :
          elle ne change pas quand vous renommez la boutique, pour ne pas casser les
          liens déjà partagés.
        </p>
      </div>

      <div>
        <label className="etiquette" htmlFor="description">Description</label>
        <textarea id="description" name="description" className="zone-texte" rows={3}
          maxLength={600} defaultValue={boutique.description ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="pays">Pays</label>
          <select id="pays" name="pays" className="champ" value={codePays}
            onChange={(e) => setCodePays(e.target.value)}>
            {pays.map((p) => <option key={p.code} value={p.code}>{p.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="etiquette" htmlFor="ville">Ville</label>
          <input id="ville" name="ville" className="champ" maxLength={80} list="villes-reglages"
            defaultValue={boutique.ville ?? ""} />
          <datalist id="villes-reglages">
            {villes.map((ville) => <option key={ville} value={ville} />)}
          </datalist>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="quartier">Quartier</label>
          <input id="quartier" name="quartier" className="champ" maxLength={80}
            defaultValue={boutique.quartier ?? ""} />
        </div>
        <div>
          <label className="etiquette" htmlFor="adresse">Adresse</label>
          <input id="adresse" name="adresse" className="champ" maxLength={200}
            defaultValue={boutique.adresse ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="telephone">Téléphone</label>
          <input id="telephone" name="telephone" className="champ" required type="tel"
            defaultValue={boutique.telephone ?? ""} />
        </div>
        <div>
          <label className="etiquette" htmlFor="whatsapp">WhatsApp</label>
          <input id="whatsapp" name="whatsapp" className="champ" type="tel"
            defaultValue={boutique.whatsapp ?? ""} />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="email">Adresse e-mail affichée</label>
        <input id="email" name="email" className="champ" type="email" maxLength={160}
          defaultValue={boutique.email ?? ""} />
      </div>

      {/* --------------------------- Apparence --------------------------- */}
      <div className="border-t border-encre-100 pt-5">
        <p className="etiquette">Style</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MODELES_LIBELLES) as Modele[]).map((code) => (
            <label key={code}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-encre-300 px-3.5 py-2.5 text-sm has-[:checked]:border-vert-700 has-[:checked]:bg-vert-50">
              <input type="radio" name="modele" value={code} className="size-4 accent-vert-700"
                defaultChecked={boutique.modele === code} />
              {MODELES_LIBELLES[code].nom}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="etiquette">Couleur</p>
        <div className="flex flex-wrap items-center gap-2">
          {COULEURS.map((c) => (
            <button key={c} type="button" onClick={() => setCouleur(c)}
              aria-label={`Choisir ${c}`} aria-pressed={couleur === c}
              className={`size-9 rounded-full border-2 ${couleur === c ? "border-encre-900" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)}
            className="size-9 cursor-pointer rounded-lg border border-encre-300 bg-white p-1"
            aria-label="Choisir une autre couleur" />
        </div>
        <input type="hidden" name="couleur" value={couleur} />
      </div>

      <div>
        <p className="etiquette">Logo</p>
        <div className="flex items-center gap-4">
          {boutique.logo ? (
            <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-encre-200">
              <Photo src={`/api/photo/${boutique.id}/v_${boutique.logo}`} alt="Votre logo" />
            </div>
          ) : null}
          <input type="file" name="logo" accept="image/*"
            className="block w-full text-sm text-encre-600 file:mr-3 file:rounded-lg file:border-0
                       file:bg-vert-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold
                       file:text-vert-800 hover:file:bg-vert-100" />
        </div>
        {boutique.logo ? (
          <label className="mt-2 flex items-center gap-2 text-sm text-encre-600">
            <input type="checkbox" name="retirer_logo" value="1" className="size-4 accent-vert-700" />
            Retirer le logo actuel
          </label>
        ) : null}
      </div>

      {/* ---------------------------- Partage ---------------------------- */}
      <div className="border-t border-encre-100 pt-5">
        <p className="etiquette">Aperçu lors du partage</p>
        <p className="aide mb-2">
          Ce que voient vos clients quand ils collent votre lien dans WhatsApp ou
          Facebook.
        </p>
        <input name="titre_partage" className="champ" maxLength={90}
          defaultValue={boutique.titrePartage ?? ""}
          placeholder={boutique.nom} aria-label="Titre de partage" />
        <textarea name="description_partage" className="zone-texte mt-2" rows={2} maxLength={200}
          defaultValue={boutique.descriptionPartage ?? ""}
          placeholder={boutique.description ?? "Une phrase qui donne envie de cliquer."}
          aria-label="Description de partage" />
      </div>

      <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
    </form>
  );
}
