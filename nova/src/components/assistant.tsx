"use client";

import { useActionState, useState } from "react";
import {
  actionEtape1, actionEtape2, actionEtape3, actionEtape4,
  actionGenererPage, actionProposerPalette, type Etat,
} from "@/lib/actions-assistant";
import { BoutonEnvoi, Message, ChampMontant, Photo, Rondelle } from "./ui";
import { Etincelle, Plus, Croix, Coche } from "./icones";
import { MODELES_LIBELLES, type Modele } from "@/lib/sections";
import { ACTIVITES } from "@/lib/activites";
import { Importateur } from "./importateur";

/**
 * Les cinq écrans de l'assistant.
 *
 * Chacun est un formulaire indépendant qui enregistre et passe au suivant par
 * une redirection. Conséquence : la progression tient dans la base, pas dans
 * l'état React. Fermer l'onglet ne perd rien, le bouton « précédent » du
 * navigateur fonctionne, et un rechargement ne redemande pas l'étape.
 */

const VIDE: Etat = {};

// ---------------------------------------------------------------------------

export function Etape1({ defauts }: { defauts: { nom: string; activite: string | null; description: string | null } }) {
  const [etat, envoyer] = useActionState(actionEtape1, VIDE);

  return (
    <form action={envoyer} className="space-y-5">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="nom">Le nom de votre boutique</label>
        <input id="nom" name="nom" className="champ" required maxLength={80}
          defaultValue={defauts.nom} autoFocus />
        <p className="aide">C&apos;est ce que vos clients verront en haut de la page.</p>
      </div>

      <div>
        <label className="etiquette" htmlFor="activite">Que vendez-vous ?</label>
        <select id="activite" name="activite" className="champ" required
          defaultValue={defauts.activite ?? ""}>
          <option value="" disabled>Choisissez votre activité</option>
          {ACTIVITES.map(([code, libelle]) => (
            <option key={code} value={code}>{libelle}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="etiquette" htmlFor="description">
          Décrivez votre activité en quelques mots
        </label>
        <textarea id="description" name="description" className="zone-texte" rows={4}
          maxLength={600} defaultValue={defauts.description ?? ""}
          placeholder="Je couds des tenues sur mesure à Dakar depuis six ans. Bazin, wax, tenues de cérémonie." />
        <p className="aide">
          L&apos;assistant s&apos;en servira pour écrire vos textes. Plus c&apos;est précis,
          mieux c&apos;est — et il n&apos;inventera rien au-delà.
        </p>
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Enregistrement…">
        Continuer
      </BoutonEnvoi>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function Etape2({
  pays, defauts,
}: {
  pays: { code: string; nom: string; indicatif: string; villes: string[] }[];
  defauts: {
    pays: string; ville: string | null; quartier: string | null; adresse: string | null;
    telephone: string | null; whatsapp: string | null; email: string | null;
  };
}) {
  const [etat, envoyer] = useActionState(actionEtape2, VIDE);
  const [codePays, setCodePays] = useState(defauts.pays || "SN");
  const paysChoisi = pays.find((p) => p.code === codePays) ?? pays[0];

  return (
    <form action={envoyer} className="space-y-5">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="pays">Pays</label>
        <select id="pays" name="pays" className="champ" required value={codePays}
          onChange={(e) => setCodePays(e.target.value)}>
          {pays.map((p) => <option key={p.code} value={p.code}>{p.nom}</option>)}
        </select>
        <p className="aide">
          Le pays fixe votre devise, le format des numéros et les moyens de paiement.
          D&apos;autres pays ouvriront progressivement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="ville">Ville</label>
          <input id="ville" name="ville" className="champ" required maxLength={80}
            list="villes-pays" defaultValue={defauts.ville ?? ""} />
          <datalist id="villes-pays">
            {(paysChoisi?.villes ?? []).map((ville) => <option key={ville} value={ville} />)}
          </datalist>
        </div>
        <div>
          <label className="etiquette" htmlFor="quartier">Quartier</label>
          <input id="quartier" name="quartier" className="champ" maxLength={80}
            defaultValue={defauts.quartier ?? ""} />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="adresse">
          Adresse <span className="font-normal text-encre-500">(facultatif)</span>
        </label>
        <input id="adresse" name="adresse" className="champ" maxLength={200}
          defaultValue={defauts.adresse ?? ""} placeholder="Marché HLM, allée 4, boutique 12" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="telephone">Téléphone</label>
          <input id="telephone" name="telephone" className="champ" required type="tel"
            inputMode="tel" defaultValue={defauts.telephone ?? ""} placeholder="77 123 45 67" />
          <p className="aide">Indicatif {paysChoisi?.indicatif}</p>
        </div>
        <div>
          <label className="etiquette" htmlFor="whatsapp">
            WhatsApp <span className="font-normal text-encre-500">(si différent)</span>
          </label>
          <input id="whatsapp" name="whatsapp" className="champ" type="tel" inputMode="tel"
            defaultValue={defauts.whatsapp ?? ""} />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="email">Adresse e-mail professionnelle</label>
        <input id="email" name="email" className="champ" type="email" maxLength={160}
          defaultValue={defauts.email ?? ""} />
        <p className="aide">Affichée sur votre boutique, pour les clients qui préfèrent écrire.</p>
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Enregistrement…">
        Continuer
      </BoutonEnvoi>
    </form>
  );
}

// ---------------------------------------------------------------------------

const COULEURS = [
  "#0E5C3F", "#14508F", "#8B3A62", "#1F2933",
  "#9A5B27", "#C2571F", "#4A5D45", "#6B2737",
];

export function Etape3({
  defauts, boutiqueId,
}: {
  defauts: { modele: string; couleur: string; logo: string | null };
  boutiqueId: number;
}) {
  const [etat, envoyer] = useActionState(actionEtape3, VIDE);
  const [modele, setModele] = useState<Modele>((defauts.modele as Modele) ?? "epure");
  const [couleur, setCouleur] = useState(defauts.couleur);
  const [suggestion, setSuggestion] = useState<{ texte: string; erreur?: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [apercuLogo, setApercuLogo] = useState<string | null>(null);

  async function demanderPalette() {
    setEnCours(true);
    setSuggestion(null);
    try {
      const proposition = await actionProposerPalette();
      setCouleur(proposition.couleur);
      setModele(proposition.modele as Modele);
      setSuggestion({
        texte: proposition.explication || "Proposition appliquée ci-dessous.",
        erreur: proposition.erreur,
      });
    } catch {
      setSuggestion({ texte: "", erreur: "La proposition n'a pas abouti. Choisissez vous-même." });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form action={envoyer} className="space-y-6">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <p className="etiquette">Le style de votre boutique</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(MODELES_LIBELLES) as Modele[]).map((code) => {
            const actif = modele === code;
            return (
              <button key={code} type="button" onClick={() => setModele(code)}
                aria-pressed={actif}
                className={`rounded-2xl border p-4 text-left transition-colors
                  ${actif ? "border-vert-700 bg-vert-50 ring-1 ring-vert-700" : "border-encre-200 bg-white hover:bg-encre-50"}`}>
                <ApercuModele modele={code} couleur={couleur} />
                <p className="mt-3 flex items-center gap-1.5 font-semibold text-encre-900">
                  {MODELES_LIBELLES[code].nom}
                  {actif ? <Coche className="size-4 text-vert-700" /> : null}
                </p>
                <p className="mt-0.5 text-xs text-encre-600">{MODELES_LIBELLES[code].description}</p>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="modele" value={modele} />
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="etiquette mb-0">Votre couleur</p>
          <button type="button" className="btn-secondaire btn-petit" onClick={demanderPalette}
            disabled={enCours}>
            {enCours ? <Rondelle className="size-4" /> : <Etincelle className="size-4" />}
            Proposer pour moi
          </button>
        </div>

        {suggestion?.erreur ? (
          <div className="mt-2"><Message ton="alerte">{suggestion.erreur}</Message></div>
        ) : suggestion?.texte ? (
          <div className="mt-2"><Message ton="succes">{suggestion.texte}</Message></div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {COULEURS.map((c) => (
            <button key={c} type="button" onClick={() => setCouleur(c)}
              aria-label={`Choisir la couleur ${c}`} aria-pressed={couleur === c}
              className={`size-10 rounded-full border-2 ${couleur === c ? "border-encre-900" : "border-transparent"}`}
              style={{ backgroundColor: c }} />
          ))}
          <label className="ml-1 inline-flex items-center gap-2 text-sm text-encre-600">
            <input type="color" value={couleur} onChange={(e) => setCouleur(e.target.value)}
              className="size-10 cursor-pointer rounded-lg border border-encre-300 bg-white p-1"
              aria-label="Choisir une autre couleur" />
            Autre
          </label>
        </div>
        <input type="hidden" name="couleur" value={couleur} />
      </div>

      <div>
        <label className="etiquette" htmlFor="logo">
          Votre logo <span className="font-normal text-encre-500">(facultatif)</span>
        </label>
        <div className="flex items-center gap-4">
          {apercuLogo || defauts.logo ? (
            <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-encre-200">
              <Photo src={apercuLogo ?? `/api/photo/${boutiqueId}/v_${defauts.logo}`} alt="Votre logo" />
            </div>
          ) : null}
          <input id="logo" type="file" name="logo" accept="image/*"
            className="block w-full text-sm text-encre-600 file:mr-3 file:rounded-lg file:border-0
                       file:bg-vert-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold
                       file:text-vert-800 hover:file:bg-vert-100"
            onChange={(e) => {
              const fichier = e.target.files?.[0];
              setApercuLogo(fichier ? URL.createObjectURL(fichier) : null);
            }} />
        </div>
        <p className="aide">Sans logo, le nom de votre boutique s&apos;affiche en toutes lettres.</p>
      </div>

      <BoutonEnvoi className="btn-principal w-full" enCours="Enregistrement…">
        Continuer
      </BoutonEnvoi>
    </form>
  );
}

/** Une maquette minuscule du modèle, pour choisir avec les yeux. */
function ApercuModele({ modele, couleur }: { modele: Modele; couleur: string }) {
  const arrondi = modele === "colore" ? "rounded-lg" : modele === "elegant" ? "rounded-none" : "rounded";
  return (
    <div className="overflow-hidden rounded-lg border border-encre-200 bg-white" aria-hidden>
      <div className="h-9 px-2 py-2"
        style={{
          backgroundColor: modele === "colore" ? couleur : modele === "elegant" ? "#1f2421" : "#f3f1ec",
        }}>
        <div className="h-2 w-10 rounded-full"
          style={{ backgroundColor: modele === "epure" ? "#b5bdb8" : "rgba(255,255,255,.8)" }} />
      </div>
      <div className="grid grid-cols-3 gap-1 p-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`overflow-hidden border border-encre-100 ${arrondi}`}>
            <div className="aspect-square bg-ivoire" />
            <div className="h-1.5 w-full" style={{ backgroundColor: couleur, opacity: 0.75 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Etape4({
  devise, categories, iaDisponible, tauxSaisis, marge, paysDevise,
}: {
  devise: string;
  categories: { id: number; nom: string }[];
  iaDisponible: boolean;
  tauxSaisis: string[];
  marge: number;
  paysDevise: string;
}) {
  const [etat, envoyer] = useActionState(actionEtape4, VIDE);
  const [caracteristiques, setCaracteristiques] = useState([{ nom: "", valeur: "" }]);
  const [apercus, setApercus] = useState<string[]>([]);
  // L'import est propose EN PREMIER : c'est le geste le plus rapide, et celui
  // qui donne le meilleur resultat quand le commercant a deja ses photos.
  const [chemin, setChemin] = useState<"import" | "main">("import");

  if (chemin === "import") {
    return (
      <div className="space-y-5">
        <Importateur
          categories={categories}
          devise={devise}
          iaDisponible={iaDisponible}
          tauxSaisis={tauxSaisis}
          marge={marge}
          paysDevise={paysDevise}
        />

        <div className="flex flex-col gap-2.5 border-t border-encre-200 pt-5 sm:flex-row">
          <button type="button" className="btn-secondaire flex-1"
            onClick={() => setChemin("main")}>
            Remplir la fiche moi-même
          </button>
          <form action={envoyer} className="flex-1">
            <BoutonEnvoi className="btn-discret w-full" name="passer" value="1">
              Je le ferai plus tard
            </BoutonEnvoi>
          </form>
        </div>
        <p className="text-center text-xs text-encre-500">
          Dès qu&apos;un produit est ajouté, vous passez à l&apos;aperçu.
        </p>
      </div>
    );
  }

  return (
    <form action={envoyer} className="space-y-5">
      <button type="button"
        className="text-sm font-medium text-encre-600 underline-offset-4 hover:underline"
        onClick={() => setChemin("import")}>
        ← Partir plutôt d&apos;une photo ou d&apos;un lien
      </button>
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

      <div>
        <label className="etiquette" htmlFor="nom">Nom du produit</label>
        <input id="nom" name="nom" className="champ" maxLength={120} autoFocus
          placeholder="Ensemble bazin brodé" />
      </div>

      <div>
        <label className="etiquette" htmlFor="photos">Photos</label>
        <input id="photos" type="file" name="photos" multiple accept="image/*"
          className="block w-full text-sm text-encre-600 file:mr-3 file:rounded-lg file:border-0
                     file:bg-vert-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold
                     file:text-vert-800 hover:file:bg-vert-100"
          onChange={(e) => setApercus(
            Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)),
          )} />
        <p className="aide">
          Photographiez sur fond uni, à la lumière du jour. C&apos;est ce qui fait vendre.
        </p>
        {apercus.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {apercus.map((src, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-encre-200">
                <Photo src={src} alt={`Photo ${i + 1}`} />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="prix">Prix de vente</label>
          <ChampMontant id="prix" nom="prix" devise={devise} requis />
        </div>
        <div>
          <label className="etiquette" htmlFor="stock">Quantité en stock</label>
          <input id="stock" name="stock" type="number" inputMode="numeric" min={0}
            className="champ" defaultValue={1} />
        </div>
      </div>

      <div>
        <p className="etiquette">Caractéristiques</p>
        <div className="space-y-2.5">
          {caracteristiques.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input name="caract_nom" className="champ flex-1" maxLength={60}
                placeholder="Matière" defaultValue={c.nom}
                aria-label={`Nom de la caractéristique ${i + 1}`} />
              <input name="caract_valeur" className="champ flex-[1.4]" maxLength={160}
                placeholder="Bazin riche" defaultValue={c.valeur}
                aria-label={`Valeur de la caractéristique ${i + 1}`} />
              <button type="button" className="btn-discret px-2.5"
                aria-label={`Retirer la ligne ${i + 1}`}
                onClick={() => setCaracteristiques(
                  caracteristiques.length > 1
                    ? caracteristiques.filter((_, j) => j !== i)
                    : [{ nom: "", valeur: "" }],
                )}>
                <Croix className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondaire btn-petit mt-2.5"
          onClick={() => setCaracteristiques([...caracteristiques, { nom: "", valeur: "" }])}>
          <Plus className="size-4" /> Ajouter une ligne
        </button>
      </div>

      <div>
        <label className="etiquette" htmlFor="description">
          Description <span className="font-normal text-encre-500">(facultatif)</span>
        </label>
        <textarea id="description" name="description" className="zone-texte" rows={3} maxLength={4000} />
        <p className="aide">
          Vous pourrez demander à l&apos;assistant de l&apos;écrire depuis la fiche produit.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <BoutonEnvoi className="btn-principal flex-1" enCours="Enregistrement…">
          Ajouter ce produit
        </BoutonEnvoi>
        <BoutonEnvoi className="btn-secondaire" name="passer" value="1">
          Je le ferai plus tard
        </BoutonEnvoi>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function BoutonGenerer({ quotaRestant }: { quotaRestant: number }) {
  const [etat, setEtat] = useState<Etat>({});
  const [enCours, setEnCours] = useState(false);

  async function lancer() {
    setEnCours(true);
    setEtat({});
    try {
      setEtat(await actionGenererPage());
    } catch {
      setEtat({ erreur: "La génération n'a pas abouti. Votre quota n'a pas été décompté." });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="space-y-3">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <button type="button" className="btn-principal w-full" onClick={lancer}
        disabled={enCours || quotaRestant <= 0}>
        {enCours
          ? <><Rondelle className="size-4" /> L&apos;assistant compose votre page…</>
          : <><Etincelle className="size-4" /> Composer ma page avec l&apos;assistant</>}
      </button>

      {quotaRestant <= 0 ? (
        <p className="text-xs text-terre-600">
          Quota du mois atteint. Votre page de départ reste utilisable, et vous pouvez
          la modifier à la main.
        </p>
      ) : (
        <p className="text-xs text-encre-500">
          Il vous reste {quotaRestant} génération{quotaRestant > 1 ? "s" : ""} ce mois-ci.
          La page proposée remplace le brouillon — rien n&apos;est mis en ligne.
        </p>
      )}
    </div>
  );
}
