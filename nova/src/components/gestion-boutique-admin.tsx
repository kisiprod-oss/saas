"use client";

import { useActionState, useState } from "react";
import {
  actionSuspendre, actionRetablir, actionChangerOffre, actionNoteInterne,
  type Etat,
} from "@/lib/actions-admin";
import { BoutonEnvoi, Message } from "./ui";

/**
 * Les gestes d'administration sur une boutique.
 *
 * La suspension EXIGE un motif d'au moins dix caracteres (verifie cote
 * serveur). Ce motif part a deux endroits : au journal, et au commercant, qui
 * le voit en tentant de se connecter. Un acces coupe sans explication cree un
 * appel au support, une mauvaise reputation, et personne ne se souvient du
 * pourquoi six mois plus tard.
 */
export function GestionBoutiqueAdmin({
  boutique, offres,
}: {
  boutique: { id: number; nom: string; offre: string; suspendue: boolean; notes: string | null };
  offres: { code: string; nom: string; actif: boolean }[];
}) {
  const [etatSuspension, suspendre] = useActionState<Etat, FormData>(actionSuspendre, {});
  const [etatRetablir, retablir] = useActionState<Etat, FormData>(actionRetablir, {});
  const [etatOffre, changerOffre] = useActionState<Etat, FormData>(actionChangerOffre, {});
  const [etatNote, enregistrerNote] = useActionState<Etat, FormData>(actionNoteInterne, {});
  const [confirme, setConfirme] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="carte p-5">
        <h2 className="titre-section">Formule</h2>
        {etatOffre.erreur ? <div className="mt-3"><Message ton="erreur">{etatOffre.erreur}</Message></div> : null}
        {etatOffre.message ? <div className="mt-3"><Message ton="succes">{etatOffre.message}</Message></div> : null}

        <form action={changerOffre} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={boutique.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etiquette" htmlFor="offre">Formule</label>
              <select id="offre" name="offre" className="champ" defaultValue={boutique.offre}>
                {offres.map((offre) => (
                  <option key={offre.code} value={offre.code}>
                    {offre.nom}{offre.actif ? "" : " (désactivée)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiquette" htmlFor="mois">Durée (mois)</label>
              <input id="mois" name="mois" type="number" min={0} max={24} className="champ"
                defaultValue={0} />
              <p className="aide">0 = sans échéance.</p>
            </div>
          </div>
          <input name="motif" className="champ" maxLength={500}
            placeholder="Motif (facultatif, conservé au journal)" aria-label="Motif" />
          <BoutonEnvoi className="btn-secondaire" enCours="Application…">Appliquer</BoutonEnvoi>
        </form>
      </section>

      <section className={`carte p-5 ${boutique.suspendue ? "" : "border-red-200"}`}>
        <h2 className="titre-section">
          {boutique.suspendue ? "Rétablir l'accès" : "Suspendre cette boutique"}
        </h2>

        {etatSuspension.erreur ? <div className="mt-3"><Message ton="erreur">{etatSuspension.erreur}</Message></div> : null}
        {etatSuspension.message ? <div className="mt-3"><Message ton="succes">{etatSuspension.message}</Message></div> : null}
        {etatRetablir.message ? <div className="mt-3"><Message ton="succes">{etatRetablir.message}</Message></div> : null}

        {boutique.suspendue ? (
          <form action={retablir} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={boutique.id} />
            <input name="motif" className="champ" maxLength={500}
              placeholder="Motif du rétablissement (facultatif)" aria-label="Motif" />
            <BoutonEnvoi className="btn-principal" enCours="Rétablissement…">
              Rétablir {boutique.nom}
            </BoutonEnvoi>
          </form>
        ) : confirme ? (
          <form action={suspendre} className="mt-3 space-y-3">
            <input type="hidden" name="id" value={boutique.id} />
            <div>
              <label className="etiquette" htmlFor="motif-suspension">
                Motif (montré au commerçant)
              </label>
              <textarea id="motif-suspension" name="motif" className="zone-texte" rows={3}
                required minLength={10} maxLength={500}
                placeholder="Produits contraires à nos conditions : contactez-nous pour régulariser." />
              <p className="aide">
                Dix caractères minimum. Ce texte s&apos;affiche quand le commerçant
                tente de se connecter.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BoutonEnvoi className="btn-danger" enCours="Suspension…">
                Suspendre définitivement l&apos;accès
              </BoutonEnvoi>
              <button type="button" className="btn-secondaire" onClick={() => setConfirme(false)}>
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="mt-1.5 text-sm text-encre-600">
              La boutique publique renvoie une page introuvable, les sessions ouvertes
              sont fermées, et le commerçant voit le motif à sa prochaine connexion.
              Aucune donnée n&apos;est supprimée.
            </p>
            <button type="button" className="btn-danger mt-4" onClick={() => setConfirme(true)}>
              Suspendre cette boutique
            </button>
          </>
        )}
      </section>

      <section className="carte p-5 lg:col-span-2">
        <h2 className="titre-section">Notes internes</h2>
        <p className="mt-1 text-sm text-encre-600">
          Jamais lues par l&apos;espace marchand : aucune requête du tableau de bord
          ne touche à cette colonne.
        </p>
        {etatNote.message ? <div className="mt-3"><Message ton="succes">{etatNote.message}</Message></div> : null}

        <form action={enregistrerNote} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={boutique.id} />
          <textarea name="notes" className="zone-texte" rows={4} maxLength={4000}
            defaultValue={boutique.notes ?? ""} aria-label="Notes internes" />
          <BoutonEnvoi className="btn-secondaire" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
        </form>
      </section>
    </div>
  );
}
