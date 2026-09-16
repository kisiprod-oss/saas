"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  actionEnregistrerCategorie, actionSupprimerCategorie, type Etat,
} from "@/lib/actions-catalogue";
import { BoutonEnvoi, Message, EcranVide } from "./ui";
import { Etiquette, Plus, Crayon, Corbeille } from "./icones";

/**
 * Creation, renommage et suppression des categories.
 *
 * Supprimer une categorie NE SUPPRIME PAS ses produits : ils perdent
 * simplement leur rayon et restent en vente. C'est dit sous le bouton, parce
 * que c'est exactement la question qu'on se pose avant de cliquer.
 */
export function GestionCategories({
  categories, sansCategorie,
}: {
  categories: { id: number; nom: string; slug: string; nombre: number }[];
  sansCategorie: number;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerCategorie, {});
  const [edition, setEdition] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <form action={envoyer} className="carte flex flex-wrap gap-2 p-4">
        <input name="nom" className="champ flex-1" required maxLength={60}
          placeholder="Nom de la catégorie (Pagnes, Sacs…)" aria-label="Nom de la catégorie" />
        <BoutonEnvoi className="btn-principal" enCours="Création…">
          <Plus className="size-4" /> Créer
        </BoutonEnvoi>
      </form>

      {categories.length === 0 ? (
        <EcranVide
          icone={<Etiquette className="size-6" />}
          titre="Aucune catégorie"
          texte={sansCategorie > 0
            ? `Vos ${sansCategorie} produits s'affichent tous ensemble. Des rayons aident le client à s'y retrouver.`
            : "Créez vos rayons quand vous aurez plusieurs familles de produits."}
        />
      ) : (
        <ul className="space-y-2">
          {categories.map((categorie) => (
            <li key={categorie.id} className="carte p-4">
              {edition === categorie.id ? (
                <form action={envoyer} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={categorie.id} />
                  <input name="nom" className="champ flex-1" required maxLength={60}
                    defaultValue={categorie.nom} autoFocus aria-label="Nouveau nom" />
                  <BoutonEnvoi className="btn-principal btn-petit">Enregistrer</BoutonEnvoi>
                  <button type="button" className="btn-secondaire btn-petit"
                    onClick={() => setEdition(null)}>Annuler</button>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-encre-900">{categorie.nom}</p>
                    <p className="mt-0.5 text-xs text-encre-500">
                      {categorie.nombre} produit{categorie.nombre > 1 ? "s" : ""} · /{categorie.slug}
                    </p>
                  </div>
                  <button type="button" className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
                    aria-label={`Renommer ${categorie.nom}`} onClick={() => setEdition(categorie.id)}>
                    <Crayon className="size-4" />
                  </button>
                  <form action={actionSupprimerCategorie}>
                    <input type="hidden" name="id" value={categorie.id} />
                    <button type="submit" className="rounded-lg p-2 text-encre-500 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Supprimer ${categorie.nom}`}>
                      <Corbeille className="size-4" />
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {sansCategorie > 0 && categories.length > 0 ? (
        <p className="text-sm text-encre-600">
          {sansCategorie} produit{sansCategorie > 1 ? "s" : ""} sans catégorie.{" "}
          <Link href="/tableau-de-bord/produits" className="lien">Les classer</Link>
        </p>
      ) : null}

      <p className="text-xs text-encre-500">
        Supprimer une catégorie ne supprime aucun produit : ils restent en vente,
        sans rayon.
      </p>
    </div>
  );
}
