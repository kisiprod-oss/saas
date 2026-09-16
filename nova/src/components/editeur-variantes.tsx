"use client";

import { useActionState, useState } from "react";
import { actionEnregistrerVariantes, type Etat } from "@/lib/actions-catalogue";
import { BoutonEnvoi, Message } from "./ui";
import { Plus, Croix } from "./icones";
import type { Variante } from "@/lib/requetes";

/**
 * Les variantes « simples » : un seul axe (Taille, ou Couleur), plusieurs
 * valeurs, chacune avec son stock et son éventuel supplément.
 *
 * Volontairement un seul axe. Les combinaisons (taille × couleur × matière)
 * multiplient les lignes de stock et deviennent ingérables sur un téléphone :
 * six tailles et quatre couleurs font vingt-quatre quantités à tenir à jour.
 * Un commerçant qui a besoin de ça crée deux produits.
 *
 * Dès qu'une variante existe, le stock du produit devient la SOMME des stocks
 * de ses variantes, et le champ « quantité » de la fiche est ignoré : deux
 * sources de vérité pour un même nombre finissent toujours par diverger.
 */
export function EditeurVariantes({
  produitId, libelle, variantes, devise,
}: {
  produitId: number; libelle: string | null; variantes: Variante[]; devise: string;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerVariantes, {});
  const [lignes, setLignes] = useState<Partial<Variante>[]>(
    variantes.length > 0 ? variantes : [],
  );

  return (
    <section className="carte p-5">
      <h2 className="titre-section">Options (taille, couleur…)</h2>
      <p className="mt-1 text-sm text-encre-600">
        Facultatif. Une seule sorte d&apos;option par produit, pour que le stock
        reste tenable.
      </p>

      {etat.erreur ? <div className="mt-3"><Message ton="erreur">{etat.erreur}</Message></div> : null}
      {etat.message ? <div className="mt-3"><Message ton="succes">{etat.message}</Message></div> : null}

      <form action={envoyer} className="mt-4 space-y-4">
        <input type="hidden" name="produit_id" value={produitId} />

        <div>
          <label className="etiquette" htmlFor="variante_libelle">Nom de l&apos;option</label>
          <input id="variante_libelle" name="variante_libelle" className="champ"
            maxLength={40} defaultValue={libelle ?? ""} placeholder="Taille" />
        </div>

        {lignes.length > 0 ? (
          <div className="space-y-2.5">
            <div className="hidden gap-2 px-1 text-xs font-medium text-encre-500 sm:grid sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <span>Valeur</span>
              <span>Supplément ({devise})</span>
              <span>Stock</span>
              <span className="w-9" />
            </div>
            {lignes.map((ligne, i) => (
              <div key={ligne.id ?? `neuve-${i}`} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <input type="hidden" name="variante_id" value={ligne.id ?? ""} />
                <input
                  name="variante_valeur" className="champ" maxLength={60} required
                  defaultValue={ligne.valeur ?? ""} placeholder="M"
                  aria-label={`Valeur de l'option ${i + 1}`}
                />
                <input
                  name="variante_supplement" type="number" inputMode="numeric" min={0}
                  className="champ" defaultValue={ligne.supplement ?? 0}
                  aria-label={`Supplément de prix pour l'option ${i + 1}`}
                />
                <input
                  name="variante_stock" type="number" inputMode="numeric" min={0}
                  className="champ" defaultValue={ligne.stock ?? 0}
                  aria-label={`Stock de l'option ${i + 1}`}
                />
                <button type="button" className="btn-discret px-2.5"
                  aria-label={`Retirer l'option ${i + 1}`}
                  onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>
                  <Croix className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-ivoire px-3.5 py-3 text-sm text-encre-600">
            Ce produit n&apos;a pas d&apos;option : il se vend tel quel.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondaire btn-petit"
            onClick={() => setLignes([...lignes, { valeur: "", supplement: 0, stock: 0 }])}>
            <Plus className="size-4" /> Ajouter une option
          </button>
          <BoutonEnvoi className="btn-principal btn-petit" enCours="Enregistrement…">
            Enregistrer les options
          </BoutonEnvoi>
        </div>

        {lignes.length > 0 ? (
          <p className="aide">
            Le stock du produit devient la somme des stocks ci-dessus.
          </p>
        ) : null}
      </form>
    </section>
  );
}
