"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  actionEnregistrerProduit, actionDecrireProduit,
  type Etat, type EtatDescription,
} from "@/lib/actions-catalogue";
import { BoutonEnvoi, Message, ChampMontant, Photo } from "./ui";
import { Etincelle, Plus, Croix } from "./icones";
import type { Produit, Categorie } from "@/lib/requetes";

/**
 * La fiche produit.
 *
 * Un point de conception s'y joue : L'ASSISTANT NE REMPLIT PAS LA BASE.
 * Le bouton « Proposer un texte » écrit dans le champ, sous les yeux du
 * commerçant. Tant qu'il ne clique pas sur « Enregistrer », rien n'est
 * stocké et sa boutique publique ne bouge pas. Le prix, le stock et l'état
 * en vente ne sont d'ailleurs jamais touchés par l'assistant — ils ne font
 * même pas partie de ce qu'on lui envoie.
 */

type Props = {
  produit?: Produit;
  categories: Categorie[];
  devise: string;
  iaDisponible: boolean;
  quotaRestant: number;
};

export function FormulaireProduit({ produit, categories, devise, iaDisponible, quotaRestant }: Props) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerProduit, {});
  const [etatIa, demanderTexte] = useActionState<EtatDescription, FormData>(actionDecrireProduit, {});

  const [description, setDescription] = useState(produit?.description ?? "");
  const [caracteristiques, setCaracteristiques] = useState<{ nom: string; valeur: string }[]>(
    produit?.caracteristiques.length ? produit.caracteristiques : [{ nom: "", valeur: "" }],
  );
  const [suiviStock, setSuiviStock] = useState((produit?.suivi_stock ?? 1) === 1);
  const [apercus, setApercus] = useState<string[]>([]);

  // La proposition de l'assistant arrive ici et remplit le champ. Le
  // commerçant peut encore tout réécrire avant d'enregistrer.
  const propositionRecue = etatIa.description && etatIa.description !== description;

  return (
    <div className="space-y-5">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="alerte">{etat.message}</Message> : null}

      <form action={envoyer} className="space-y-5" id="fiche-produit">
        {produit ? <input type="hidden" name="id" value={produit.id} /> : null}

        {/* ------------------------- L'essentiel ------------------------- */}
        <section className="carte p-5">
          <h2 className="titre-section">L&apos;essentiel</h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="etiquette" htmlFor="nom">Nom du produit</label>
              <input id="nom" name="nom" className="champ" required maxLength={120}
                defaultValue={produit?.nom} placeholder="Ensemble bazin brodé" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="prix">Prix de vente</label>
                <ChampMontant id="prix" nom="prix" defaut={produit?.prix} devise={devise} requis />
              </div>
              <div>
                <label className="etiquette" htmlFor="prix_barre">
                  Prix barré <span className="font-normal text-encre-500">(facultatif)</span>
                </label>
                <ChampMontant id="prix_barre" nom="prix_barre" defaut={produit?.prix_barre} devise={devise} />
                <p className="aide">L&apos;ancien prix, affiché rayé à côté du nouveau.</p>
              </div>
            </div>

            <div>
              <label className="etiquette" htmlFor="categorie_id">Catégorie</label>
              <select id="categorie_id" name="categorie_id" className="champ"
                defaultValue={produit?.categorie_id ?? ""}>
                <option value="">Sans catégorie</option>
                {categories.map((categorie) => (
                  <option key={categorie.id} value={categorie.id}>{categorie.nom}</option>
                ))}
              </select>
              {categories.length === 0 ? (
                <p className="aide">
                  Aucune catégorie pour l&apos;instant.{" "}
                  <Link href="/tableau-de-bord/categories" className="lien">En créer une</Link>
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {/* ------------------------ Caractéristiques ------------------------ */}
        <section className="carte p-5">
          <h2 className="titre-section">Caractéristiques</h2>
          <p className="mt-1 text-sm text-encre-600">
            Matière, taille, couleur, contenance… Ce sont VOS informations :
            l&apos;assistant peut les reformuler, jamais en inventer.
          </p>

          <div className="mt-4 space-y-2.5">
            {caracteristiques.map((caract, i) => (
              <div key={i} className="flex gap-2">
                <input
                  name="caract_nom" className="champ flex-1" maxLength={60}
                  placeholder="Matière" defaultValue={caract.nom}
                  aria-label={`Nom de la caractéristique ${i + 1}`}
                />
                <input
                  name="caract_valeur" className="champ flex-[1.4]" maxLength={160}
                  placeholder="Bazin riche" defaultValue={caract.valeur}
                  aria-label={`Valeur de la caractéristique ${i + 1}`}
                />
                <button
                  type="button" className="btn-discret px-2.5"
                  aria-label={`Retirer la caractéristique ${i + 1}`}
                  onClick={() => setCaracteristiques(
                    caracteristiques.length > 1
                      ? caracteristiques.filter((_, j) => j !== i)
                      : [{ nom: "", valeur: "" }],
                  )}
                >
                  <Croix className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn-secondaire btn-petit mt-3"
            onClick={() => setCaracteristiques([...caracteristiques, { nom: "", valeur: "" }])}>
            <Plus className="size-4" /> Ajouter une ligne
          </button>
        </section>

        {/* -------------------------- Description -------------------------- */}
        <section className="carte p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="titre-section">Description</h2>
            <span className="text-xs text-encre-500">
              {quotaRestant} génération{quotaRestant > 1 ? "s" : ""} restante{quotaRestant > 1 ? "s" : ""} ce mois
            </span>
          </div>

          {etatIa.erreur ? <div className="mt-3"><Message ton="erreur">{etatIa.erreur}</Message></div> : null}
          {propositionRecue ? (
            <div className="mt-3">
              <Message ton="succes">{etatIa.message}</Message>
            </div>
          ) : null}

          <textarea
            id="description" name="description" className="zone-texte mt-3" rows={6}
            maxLength={4000}
            value={propositionRecue ? etatIa.description : description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ce que votre client doit savoir avant d'acheter."
          />

          <div className="mt-3 rounded-xl bg-ivoire p-3.5">
            <label className="etiquette" htmlFor="notes_ia">
              Précisions pour l&apos;assistant <span className="font-normal text-encre-500">(facultatif)</span>
            </label>
            <input id="notes_ia" name="notes_ia" className="champ" maxLength={500}
              placeholder="Cousu main à Thiès, se porte en soirée" />
            <p className="aide">
              L&apos;assistant n&apos;utilisera que le nom, les caractéristiques ci-dessus
              et cette phrase. Il n&apos;ajoutera ni garantie, ni délai, ni avis client.
            </p>
            {/* Ce bouton envoie le MÊME formulaire vers une autre action : le
                nom et les caractéristiques déjà saisis partent avec, sans que
                le commerçant ait à enregistrer d'abord. */}
            <BoutonEnvoi
              className="btn-secondaire btn-petit mt-3"
              formAction={demanderTexte}
              enCours="L'assistant écrit…"
              disabled={quotaRestant <= 0}
            >
              <Etincelle className="size-4" />
              {iaDisponible ? "Proposer un texte" : "Composer à partir de mes caractéristiques"}
            </BoutonEnvoi>
            {quotaRestant <= 0 ? (
              <p className="aide text-terre-600">
                Quota du mois atteint. Vous pouvez écrire la description vous-même,
                ou changer de formule.
              </p>
            ) : null}
          </div>
        </section>

        {/* ---------------------------- Photos ---------------------------- */}
        <section className="carte p-5">
          <h2 className="titre-section">Photos</h2>
          <p className="mt-1 text-sm text-encre-600">
            8 au maximum. Elles sont réduites et allégées automatiquement.
          </p>

          {produit && produit.photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {produit.photos.map((fichier) => (
                <div key={fichier} className="overflow-hidden rounded-xl border border-encre-200">
                  <Photo src={`/api/photo/${produit.boutique_id}/v_${fichier}`}
                    alt={`Photo de ${produit.nom}`} />
                </div>
              ))}
            </div>
          ) : null}

          {apercus.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-encre-600">À ajouter :</p>
              <div className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {apercus.map((src, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-dashed border-vert-300">
                    <Photo src={src} alt={`Nouvelle photo ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <input
            type="file" name="photos" multiple accept="image/*"
            className="mt-4 block w-full text-sm text-encre-600 file:mr-3 file:rounded-lg
                       file:border-0 file:bg-vert-50 file:px-4 file:py-2.5 file:text-sm
                       file:font-semibold file:text-vert-800 hover:file:bg-vert-100"
            onChange={(e) => {
              const fichiers = Array.from(e.target.files ?? []);
              setApercus(fichiers.map((f) => URL.createObjectURL(f)));
            }}
          />
        </section>

        {/* ----------------------------- Stock ----------------------------- */}
        <section className="carte p-5">
          <h2 className="titre-section">Stock et mise en vente</h2>

          <label className="mt-4 flex items-start gap-3">
            <input type="checkbox" name="suivi_stock" value="1" className="mt-0.5 size-5 accent-vert-700"
              checked={suiviStock} onChange={(e) => setSuiviStock(e.target.checked)} />
            <span>
              <span className="font-medium text-encre-900">Suivre le stock</span>
              <span className="block text-sm text-encre-600">
                La quantité baisse à chaque commande, et la vente s&apos;arrête à zéro.
              </span>
            </span>
          </label>

          {suiviStock ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="stock">Quantité disponible</label>
                <input id="stock" name="stock" type="number" inputMode="numeric" min={0}
                  className="champ" defaultValue={produit?.stock ?? 0} />
              </div>
              <div>
                <label className="etiquette" htmlFor="seuil_alerte">Me prévenir à partir de</label>
                <input id="seuil_alerte" name="seuil_alerte" type="number" inputMode="numeric"
                  min={0} className="champ" defaultValue={produit?.seuil_alerte ?? 3} />
                <p className="aide">Une alerte apparaît sur votre accueil.</p>
              </div>
            </div>
          ) : null}

          <label className="mt-5 flex items-start gap-3 border-t border-encre-100 pt-4">
            <input type="checkbox" name="actif" value="1" className="mt-0.5 size-5 accent-vert-700"
              defaultChecked={(produit?.actif ?? 1) === 1} />
            <span>
              <span className="font-medium text-encre-900">En vente</span>
              <span className="block text-sm text-encre-600">
                Décochez pour le retirer de la boutique sans le supprimer.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-wrap gap-3">
          <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">
            {produit ? "Enregistrer les modifications" : "Ajouter ce produit"}
          </BoutonEnvoi>
          <Link href="/tableau-de-bord/produits" className="btn-secondaire">Annuler</Link>
        </div>
      </form>
    </div>
  );
}
