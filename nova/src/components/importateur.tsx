"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  actionImporterLien, actionImporterPlusieursLiens, actionImporterPhoto,
  actionCreerDepuisImport, actionAbandonnerImport, actionEnregistrerTaux,
  type Etat, type EtatProposition,
} from "@/lib/actions-import";
import type { Proposition } from "@/lib/import-produit";
import { BoutonEnvoi, Message, ChampMontant, Photo, Rondelle } from "./ui";
import { Lien as IconeLien, Etincelle, Plus, Croix, Coche, Alerte, Boite } from "./icones";
import { montant } from "@/lib/format";
import { ORIGINES_LIBELLES } from "@/lib/origines";

/**
 * L'importateur de produits.
 *
 * ============================================================================
 *  TROIS CHEMINS, PAR ORDRE DE FIABILITÉ
 * ============================================================================
 *   Une photo    — le plus solide. La photo appartient au commerçant, aucun
 *                  site ne peut la refuser, et la fiche décrit ce qui est
 *                  réellement sur l'image.
 *   Un lien      — rapide quand le site publie ses données de partage.
 *                  Beaucoup de places de marché bloquent la lecture : on le
 *                  dit, et on renvoie vers la photo.
 *   Plusieurs    — pour garnir une boutique d'un coup. Chaque lien est traité
 *     liens        à part : un échec n'emporte pas les autres.
 *
 *  Dans les trois cas, RIEN n'entre au catalogue avant relecture. Le prix
 *  surtout : celui du fournisseur est un prix de revient, pas un prix de
 *  vente, et le formulaire le répète.
 * ============================================================================
 */

type Onglet = "photo" | "lien" | "lot";

export function Importateur({
  categories, devise, iaDisponible, tauxSaisis, marge, paysDevise,
}: {
  categories: { id: number; nom: string }[];
  devise: string;
  iaDisponible: boolean;
  tauxSaisis: string[];
  marge: number;
  paysDevise: string;
}) {
  const [onglet, setOnglet] = useState<Onglet>(iaDisponible ? "photo" : "lien");
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [echecs, setEchecs] = useState<{ adresse: string; erreur: string }[]>([]);
  const [etat, setEtat] = useState<Etat>({});
  const [enCours, setEnCours] = useState(false);
  const [lien, setLien] = useState("");
  const [liens, setLiens] = useState("");

  const [etatPhoto, lirePhoto] = useActionState<EtatProposition, FormData>(actionImporterPhoto, {});

  // La proposition venue de la lecture de photo rejoint la même liste.
  const toutes = etatPhoto.proposition
    && !propositions.some((p) => p.importId === etatPhoto.proposition!.importId)
    ? [etatPhoto.proposition, ...propositions]
    : propositions;

  async function lireUnLien() {
    setEnCours(true);
    setEtat({});
    setEchecs([]);
    try {
      const resultat = await actionImporterLien(lien);
      if (resultat.proposition) {
        setPropositions([resultat.proposition, ...propositions]);
        setLien("");
      } else {
        setEtat({ erreur: resultat.erreur, conseil: resultat.conseil });
      }
    } catch {
      setEtat({ erreur: "La lecture a échoué. Vérifiez votre connexion." });
    } finally {
      setEnCours(false);
    }
  }

  async function lirePlusieursLiens() {
    setEnCours(true);
    setEtat({});
    setEchecs([]);
    try {
      const resultat = await actionImporterPlusieursLiens(liens);
      setPropositions([...resultat.propositions, ...propositions]);
      setEchecs(resultat.echecs);
      if (resultat.propositions.length > 0) setLiens("");
      if (resultat.propositions.length === 0 && resultat.echecs.length > 0) {
        setEtat({ erreur: "Aucun de ces liens n'a pu être lu." });
      }
    } catch {
      setEtat({ erreur: "La lecture a échoué." });
    } finally {
      setEnCours(false);
    }
  }

  function retirer(importId: number) {
    setPropositions(propositions.filter((p) => p.importId !== importId));
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------ Onglets ------------------------------ */}
      <div role="tablist" aria-label="Comment importer" className="flex flex-wrap gap-2">
        {([
          ["photo", "Partir d'une photo", true],
          ["lien", "Coller un lien", true],
          ["lot", "Plusieurs liens", true],
        ] as const).map(([code, libelle]) => (
          <button
            key={code} role="tab" type="button"
            aria-selected={onglet === code}
            onClick={() => { setOnglet(code); setEtat({}); setEchecs([]); }}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold
              ${onglet === code
                ? "border-vert-700 bg-vert-50 text-vert-800"
                : "border-encre-300 bg-white text-encre-700 hover:bg-encre-50"}`}
          >
            {code === "photo" ? <Etincelle className="size-4" /> : <IconeLien className="size-4" />}
            {libelle}
          </button>
        ))}
      </div>

      {/* ------------------------------ Saisie ------------------------------ */}
      <section className="carte p-5">
        {etat.erreur ? (
          <div className="mb-4">
            <Message ton="erreur" titre={etat.erreur}>
              {etat.conseil ?? null}
            </Message>
          </div>
        ) : null}

        {onglet === "photo" ? (
          <form action={lirePhoto} className="space-y-3">
            <h2 className="titre-section">Photographiez votre produit</h2>
            <p className="text-sm text-encre-600">
              L&apos;assistant regarde la photo et propose un nom, une catégorie et des
              caractéristiques. Il ne décrit que ce qu&apos;il voit : la taille, la
              contenance ou la matière, vous les ajouterez.
            </p>

            {!iaDisponible ? (
              <Message ton="alerte">
                Lire une photo demande l&apos;assistant intelligent, qui n&apos;est pas
                activé sur cette installation. Utilisez « Coller un lien », ou{" "}
                <Link href="/tableau-de-bord/produits/nouveau" className="lien">
                  ajoutez le produit à la main
                </Link>.
              </Message>
            ) : (
              <>
                {etatPhoto.erreur ? (
                  <Message ton="erreur" titre={etatPhoto.erreur}>{etatPhoto.conseil ?? null}</Message>
                ) : null}
                <input
                  type="file" name="photo" accept="image/*" required
                  className="block w-full text-sm text-encre-600 file:mr-3 file:rounded-lg
                             file:border-0 file:bg-vert-50 file:px-4 file:py-2.5 file:text-sm
                             file:font-semibold file:text-vert-800 hover:file:bg-vert-100"
                />
                <p className="aide">
                  Un seul produit par photo, de face, sur fond uni, à la lumière du jour.
                </p>
                <BoutonEnvoi className="btn-principal" enCours="L'assistant regarde la photo…">
                  <Etincelle className="size-4" /> Lire cette photo
                </BoutonEnvoi>
              </>
            )}
          </form>
        ) : null}

        {onglet === "lien" ? (
          <div className="space-y-3">
            <h2 className="titre-section">Collez l&apos;adresse du produit</h2>
            <p className="text-sm text-encre-600">
              Nous lisons les informations que la page publie pour le partage : nom,
              caractéristiques, prix, photo.
            </p>
            <input
              type="url" className="champ" value={lien} onChange={(e) => setLien(e.target.value)}
              placeholder="https://fr.aliexpress.com/item/…"
              aria-label="Adresse de la page du produit"
            />
            <button type="button" className="btn-principal" onClick={lireUnLien}
              disabled={enCours || lien.trim().length < 10}>
              {enCours ? <><Rondelle className="size-4" /> Lecture de la page…</> : (
                <><IconeLien className="size-4" /> Lire ce lien</>
              )}
            </button>
            <AvertissementLien />
          </div>
        ) : null}

        {onglet === "lot" ? (
          <div className="space-y-3">
            <h2 className="titre-section">Garnir la boutique d&apos;un coup</h2>
            <p className="text-sm text-encre-600">
              Une adresse par ligne, dix au maximum. Chaque lien est traité
              séparément : si l&apos;un échoue, les autres passent quand même.
            </p>
            <textarea
              className="zone-texte font-mono text-xs" rows={6} value={liens}
              onChange={(e) => setLiens(e.target.value)}
              placeholder={"https://exemple.com/produit-1\nhttps://exemple.com/produit-2"}
              aria-label="Adresses des produits, une par ligne"
            />
            <button type="button" className="btn-principal" onClick={lirePlusieursLiens}
              disabled={enCours || liens.trim().length < 10}>
              {enCours
                ? <><Rondelle className="size-4" /> Lecture en cours, un lien après l&apos;autre…</>
                : <><IconeLien className="size-4" /> Lire ces liens</>}
            </button>
            <AvertissementLien />
          </div>
        ) : null}
      </section>

      {/* --------------------------- Liens en échec --------------------------- */}
      {echecs.length > 0 ? (
        <section className="carte border-terre-200 p-5">
          <h2 className="flex items-center gap-2 titre-section">
            <Alerte className="size-5 text-terre-600" />
            {echecs.length} lien{echecs.length > 1 ? "s" : ""} non lu{echecs.length > 1 ? "s" : ""}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {echecs.map((echec, i) => (
              <li key={i}>
                {echec.adresse ? (
                  <span className="block truncate font-mono text-xs text-encre-500">
                    {echec.adresse}
                  </span>
                ) : null}
                <span className="text-encre-700">{echec.erreur}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-encre-600">
            Pour ces produits, prenez une photo : c&apos;est le chemin qui ne dépend
            de personne.
          </p>
        </section>
      ) : null}

      {/* --------------------------- Propositions --------------------------- */}
      {toutes.length > 0 ? (
        <section className="space-y-4">
          <h2 className="titre-page text-xl">
            {toutes.length} fiche{toutes.length > 1 ? "s" : ""} à relire
          </h2>
          <p className="text-sm text-encre-600">
            Rien n&apos;est encore dans votre catalogue. Corrigez, fixez votre prix,
            puis ajoutez.
          </p>
          {toutes.map((proposition) => (
            <FicheImport
              key={proposition.importId}
              proposition={proposition}
              categories={categories}
              devise={devise}
              marge={marge}
              tauxSaisis={tauxSaisis}
              paysDevise={paysDevise}
              onRetirer={() => retirer(proposition.importId)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function AvertissementLien() {
  return (
    <div className="rounded-xl bg-ivoire p-3.5 text-xs leading-relaxed text-encre-600">
      <p className="font-semibold text-encre-800">Ce qu&apos;il faut savoir</p>
      <ul className="mt-1.5 list-inside list-disc space-y-1">
        <li>
          Amazon, eBay, AliExpress et Alibaba bloquent souvent la lecture automatique
          de leurs pages. Quand c&apos;est le cas, nous vous le disons — nous
          n&apos;essayons pas de contourner leur protection.
        </li>
        <li>
          Le texte et les photos d&apos;une fiche appartiennent au vendeur d&apos;origine.
          L&apos;assistant réécrit la description ; pour la photo, vous devrez confirmer
          que vous avez le droit de l&apos;utiliser.
        </li>
        <li>
          Le prix trouvé est un prix d&apos;achat, pas un prix de vente : il ne couvre
          ni le transport, ni la douane, ni votre marge.
        </li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Une fiche à relire
// ---------------------------------------------------------------------------

function FicheImport({
  proposition, categories, devise, marge, tauxSaisis, paysDevise, onRetirer,
}: {
  proposition: Proposition;
  categories: { id: number; nom: string }[];
  devise: string;
  marge: number;
  tauxSaisis: string[];
  paysDevise: string;
  onRetirer: () => void;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionCreerDepuisImport, {});
  const [caracteristiques, setCaracteristiques] = useState(
    proposition.caracteristiques.length > 0
      ? proposition.caracteristiques
      : [{ nom: "", valeur: "" }],
  );
  const [imageIndex, setImageIndex] = useState<string>(
    proposition.images.length > 0 ? "0" : "aucune",
  );
  const [droits, setDroits] = useState(false);
  const [ajoute, setAjoute] = useState(false);

  /**
   * Abandonner, c'est le dire au serveur AVANT d'oublier la fiche.
   *
   * Le bouton portait un `formAction` avec `type="button"` : React l'ignorait
   * en silence, la ligne restait « Proposé » dans l'historique, et l'image
   * temporaire n'etait jamais liberee.
   */
  async function abandonner() {
    try {
      await actionAbandonnerImport(proposition.importId);
    } finally {
      onRetirer();
    }
  }

  const categorieSuggeree = categories.find((c) => c.nom === proposition.categorieSuggeree);

  if (ajoute || etat.message) {
    return (
      <div className="carte apparait p-5">
        <Message ton="succes" titre={etat.message ?? "Produit ajouté."}>
          {etat.conseil ?? null}
        </Message>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/tableau-de-bord/produits" className="btn-secondaire btn-petit">
            Voir mon catalogue
          </Link>
          <button type="button" className="btn-discret btn-petit" onClick={onRetirer}>
            Masquer cette fiche
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={(donnees) => { envoyer(donnees); setAjoute(false); }}
      className="carte overflow-hidden"
    >
      <input type="hidden" name="import_id" value={proposition.importId} />

      {/* --------------------------- Provenance --------------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-encre-200 bg-ivoire px-5 py-3">
        <span className="puce puce-neutre">
          {proposition.source === "photo"
            ? "Lu sur votre photo"
            : ORIGINES_LIBELLES[proposition.origine] ?? "Site externe"}
        </span>
        {proposition.adresse ? (
          <a href={proposition.adresse} target="_blank" rel="noopener nofollow"
            className="min-w-0 flex-1 truncate font-mono text-xs text-encre-500 hover:text-vert-700">
            {proposition.adresse}
          </a>
        ) : <span className="flex-1" />}
        <button type="button" onClick={abandonner}
          className="rounded-lg p-1.5 text-encre-500 hover:bg-white"
          aria-label="Abandonner cette fiche">
          <Croix className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}

        {proposition.noteAssistant ? (
          <p className="rounded-xl bg-vert-50 px-3.5 py-2.5 text-xs leading-relaxed text-vert-900">
            {proposition.noteAssistant}
          </p>
        ) : null}

        {/* ----------------------------- Photos ----------------------------- */}
        {proposition.images.length > 0 ? (
          <fieldset>
            <legend className="etiquette">Photo du fournisseur</legend>
            <div className="flex flex-wrap gap-2">
              {proposition.images.map((image, i) => (
                <label key={image}
                  className={`w-24 cursor-pointer overflow-hidden rounded-xl border-2
                    ${imageIndex === String(i) ? "border-vert-700" : "border-transparent opacity-70"}`}>
                  <input
                    type="radio" name="image_index" value={String(i)} className="sr-only"
                    checked={imageIndex === String(i)}
                    onChange={() => setImageIndex(String(i))}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`Photo ${i + 1} proposée`} className="aspect-square w-full object-cover"
                    referrerPolicy="no-referrer" />
                </label>
              ))}
              <label className={`flex w-24 cursor-pointer flex-col items-center justify-center gap-1
                  rounded-xl border-2 border-dashed px-2 py-4 text-center text-xs
                  ${imageIndex === "aucune" ? "border-vert-700 text-vert-800" : "border-encre-300 text-encre-500"}`}>
                <input type="radio" name="image_index" value="aucune" className="sr-only"
                  checked={imageIndex === "aucune"} onChange={() => setImageIndex("aucune")} />
                <Croix className="size-4" />
                Aucune
              </label>
            </div>

            {imageIndex !== "aucune" ? (
              <label className="mt-3 flex items-start gap-3 rounded-xl border border-terre-200 bg-terre-50 p-3.5">
                <input type="checkbox" name="droits" value="1" required
                  className="mt-0.5 size-5 accent-vert-700"
                  checked={droits} onChange={(e) => setDroits(e.target.checked)} />
                <span className="text-sm text-terre-700">
                  <span className="font-semibold">
                    Je confirme avoir le droit d&apos;utiliser cette photo
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed">
                    Les photos d&apos;une fiche appartiennent au vendeur qui l&apos;a
                    publiée. Beaucoup de fournisseurs autorisent leurs revendeurs à
                    s&apos;en servir — vérifiez auprès du vôtre. Votre confirmation et
                    sa date sont enregistrées.
                  </span>
                </span>
              </label>
            ) : (
              <p className="aide">
                Vous ajouterez votre propre photo depuis la fiche produit. Le produit
                sera enregistré retiré de la vente en attendant.
              </p>
            )}
          </fieldset>
        ) : proposition.source === "photo" ? (
          <p className="rounded-xl bg-ivoire px-3.5 py-2.5 text-xs text-encre-600">
            Votre photo n&apos;est pas encore attachée : ajoutez-la depuis la fiche du
            produit après l&apos;avoir créé. Il sera enregistré retiré de la vente en
            attendant.
          </p>
        ) : null}

        {/* ---------------------------- L'essentiel ---------------------------- */}
        <div>
          <label className="etiquette" htmlFor={`nom-${proposition.importId}`}>
            Nom du produit
          </label>
          <input id={`nom-${proposition.importId}`} name="nom" className="champ" required
            maxLength={120} defaultValue={proposition.nom} />
        </div>

        {/* ------------------------------- Prix ------------------------------- */}
        <div className="rounded-xl border border-encre-200 p-4">
          <p className="text-sm font-semibold text-encre-900">Votre prix de vente</p>

          {proposition.prixOrigine ? (
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-encre-600">Prix chez le fournisseur</dt>
                <dd className="font-medium">{proposition.prixOrigine.libelle}</dd>
              </div>
              {proposition.prixRevient !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-encre-600">Converti</dt>
                  <dd className="font-medium">{montant(proposition.prixRevient, devise)}</dd>
                </div>
              ) : null}
              {proposition.conversion ? (
                <p className="pt-1 text-encre-500">{proposition.conversion}</p>
              ) : null}
            </dl>
          ) : (
            <p className="mt-1 text-xs text-encre-500">
              {proposition.source === "photo"
                ? "Une photo ne porte aucun prix : vous êtes le seul à le connaître."
                : "Aucun prix lisible sur cette page."}
            </p>
          )}

          {proposition.tauxManquant ? (
            <div className="mt-3">
              <Message ton="alerte">
                {proposition.conversion}{" "}
                <Link href="/tableau-de-bord/produits/importer#taux" className="font-semibold underline">
                  Indiquer votre taux pour le {proposition.tauxManquant}
                </Link>
              </Message>
            </div>
          ) : null}

          <div className="mt-3">
            <label className="etiquette" htmlFor={`prix-${proposition.importId}`}>
              Prix affiché à vos clients
            </label>
            <ChampMontant
              id={`prix-${proposition.importId}`} nom="prix"
              defaut={proposition.prixSuggere} devise={devise} requis
            />
            <p className="aide">
              {proposition.prixSuggere !== null
                ? `Proposition : prix de revient + ${marge} % de marge, arrondi. `
                  + `À vous de fixer le vôtre — le transport et la douane ne sont pas comptés.`
                : `Comptez votre achat, le transport, la douane, et votre marge.`}
            </p>
          </div>

          <div className="mt-3">
            <label className="etiquette" htmlFor={`stock-${proposition.importId}`}>
              Quantité disponible
            </label>
            <input id={`stock-${proposition.importId}`} name="stock" type="number"
              inputMode="numeric" min={0} className="champ" defaultValue={0} />
            <p className="aide">
              Laissez 0 si vous commandez chez le fournisseur à chaque vente.
            </p>
          </div>
        </div>

        {/* ---------------------------- Catégorie ---------------------------- */}
        {categories.length > 0 ? (
          <div>
            <label className="etiquette" htmlFor={`categorie-${proposition.importId}`}>
              Catégorie
            </label>
            <select id={`categorie-${proposition.importId}`} name="categorie_id" className="champ"
              defaultValue={categorieSuggeree?.id ?? ""}>
              <option value="">Sans catégorie</option>
              {categories.map((categorie) => (
                <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>
              ))}
            </select>
            {categorieSuggeree ? (
              <p className="aide">Proposée par l&apos;assistant : {categorieSuggeree.nom}.</p>
            ) : null}
          </div>
        ) : null}

        {/* ------------------------- Caractéristiques ------------------------- */}
        <div>
          <p className="etiquette">Caractéristiques</p>
          <div className="space-y-2">
            {caracteristiques.map((caract, i) => (
              <div key={i} className="flex gap-2">
                <input name="caract_nom" className="champ flex-1" maxLength={60}
                  defaultValue={caract.nom} placeholder="Matière"
                  aria-label={`Nom de la caractéristique ${i + 1}`} />
                <input name="caract_valeur" className="champ flex-[1.4]" maxLength={160}
                  defaultValue={caract.valeur} placeholder="Coton"
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
          <button type="button" className="btn-secondaire btn-petit mt-2"
            onClick={() => setCaracteristiques([...caracteristiques, { nom: "", valeur: "" }])}>
            <Plus className="size-4" /> Ajouter une ligne
          </button>
          {proposition.source === "photo" ? (
            <p className="aide">
              Complétez ce que la photo ne montre pas : taille, contenance, matière exacte.
            </p>
          ) : null}
        </div>

        {/* ---------------------------- Description ---------------------------- */}
        <div>
          <label className="etiquette" htmlFor={`description-${proposition.importId}`}>
            Description
          </label>
          <textarea id={`description-${proposition.importId}`} name="description"
            className="zone-texte" rows={4} maxLength={4000}
            defaultValue={proposition.description} />
          <p className="aide">
            {proposition.description
              ? "Réécrite par l'assistant, pas recopiée du fournisseur. Relisez-la."
              : "À écrire. Vous pourrez demander une proposition depuis la fiche produit."}
          </p>
        </div>

        {proposition.sources.length > 0 ? (
          <p className="text-xs text-encre-400">
            Informations lues via : {proposition.sources.join(", ")}.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <BoutonEnvoi className="btn-principal" enCours="Ajout au catalogue…">
            <Coche className="size-4" /> Ajouter à mon catalogue
          </BoutonEnvoi>
          <button type="button" className="btn-secondaire" onClick={abandonner}>
            Abandonner
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
//  Taux de change et marge
// ---------------------------------------------------------------------------

export function ReglagesImport({
  devises, tauxActuels, marge, paysDevise, paysDeviseLibelle,
}: {
  devises: { code: string; nom: string; symbole: string }[];
  tauxActuels: Record<string, number>;
  marge: number;
  paysDevise: string;
  paysDeviseLibelle: string;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerTaux, {});

  return (
    <form action={envoyer} id="taux" className="carte scroll-mt-24 space-y-4 p-5">
      <h2 className="titre-section">Taux de change et marge</h2>
      <p className="text-sm text-encre-600">
        Les prix des places de marché sont en devises étrangères. Indiquez le taux
        que VOUS appliquez : celui auquel vous achetez réellement, pas une moyenne
        de marché.
      </p>

      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <div className="rounded-xl bg-vert-50 px-3.5 py-2.5 text-xs leading-relaxed text-vert-900">
        <strong>L&apos;euro n&apos;est pas dans la liste, et c&apos;est normal.</strong> Sa
        parité avec le franc CFA est fixe — 1 € = 655,957 FCFA — et ne se règle pas.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {devises
          .filter((d) => d.code !== "EUR" && d.code !== paysDevise)
          .map((d) => (
            <div key={d.code}>
              <label className="etiquette" htmlFor={`taux-${d.code}`}>
                1 {d.code} ({d.nom}) =
              </label>
              <div className="relative">
                <input
                  id={`taux-${d.code}`} name={`taux_${d.code}`} className="champ pr-16"
                  type="text" inputMode="decimal" placeholder="—"
                  defaultValue={tauxActuels[d.code] ?? ""}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-encre-500">
                  {paysDeviseLibelle}
                </span>
              </div>
            </div>
          ))}
      </div>

      <div>
        <label className="etiquette" htmlFor="marge">Marge appliquée aux imports</label>
        <div className="relative max-w-40">
          <input id="marge" name="marge" type="number" min={0} max={1000}
            className="champ pr-10" defaultValue={marge} />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-encre-500">
            %
          </span>
        </div>
        <p className="aide">
          Sert à proposer un prix de vente, arrondi à un montant qui se dit à voix
          haute. Vous pourrez toujours le corriger fiche par fiche.
        </p>
      </div>

      <BoutonEnvoi className="btn-secondaire" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
    </form>
  );
}

/** Raccourci vers l'importateur, posé sur les écrans de création de produit. */
export function RaccourciImport({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/tableau-de-bord/produits/importer"
      className={`carte flex items-start gap-3.5 p-4 transition-shadow hover:shadow-sm
        ${compact ? "" : "sm:p-5"}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-vert-50 text-vert-700">
        <Etincelle className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-encre-900">
          Partir d&apos;une photo ou d&apos;un lien
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-encre-600">
          Photographiez un produit, ou collez son adresse chez un fournisseur :
          l&apos;assistant prépare la fiche, vous la relisez.
        </span>
      </span>
      <Boite className="mt-1 size-4 shrink-0 text-encre-300" />
    </Link>
  );
}
