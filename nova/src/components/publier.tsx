"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { actionPublier, actionDepublier } from "@/lib/actions-editeur";
import { Message, Rondelle, BoutonCopier } from "./ui";
import { Coche, Lien as IconeLien, Alerte } from "./icones";

/**
 * Le bouton qui met une boutique en ligne.
 *
 * Trois états, trois messages différents — parce que « publier » ne veut pas
 * dire la même chose selon la situation :
 *
 *   jamais publiée   → « Mettre ma boutique en ligne », c'est un événement.
 *   déjà en ligne, brouillon identique → rien à faire, et on le dit.
 *   déjà en ligne, brouillon modifié   → « Publier mes modifications ».
 *
 * Et un quatrième cas : la formule ne permet pas la publication. On n'affiche
 * pas un bouton grisé sans explication — on dit ce qui manque et où changer.
 */
/**
 * L'adresse publique complète de la boutique.
 *
 * Elle ne peut pas être calculée au rendu serveur ET au rendu client de la
 * même façon : le serveur ne connaît pas l'hôte que le navigateur a utilisé.
 * Un calcul direct donnerait « /b/slug » côté serveur et
 * « https://… /b/slug » côté client, donc un désaccord d'hydratation.
 *
 * On rend donc le chemin relatif au premier passage, et on le complète après
 * le montage. Le texte change une fois, sans erreur et sans saut visuel.
 */
function useAdressePublique(slug: string): string {
  const [adresse, setAdresse] = useState(`/b/${slug}`);
  useEffect(() => { setAdresse(`${window.location.origin}/b/${slug}`); }, [slug]);
  return adresse;
}

export function PublierBoutique({
  slug, publiee, enAttente, permise, raison, nomOffre, depuisAssistant,
}: {
  slug: string;
  publiee: boolean;
  enAttente: boolean;
  permise: boolean;
  raison: string | null;
  nomOffre: string;
  depuisAssistant?: boolean;
}) {
  const [etat, setEtat] = useState<{ erreur?: string; message?: string }>({});
  const [enCours, setEnCours] = useState(false);
  const [confirmeRetrait, setConfirmeRetrait] = useState(false);

  const adresse = useAdressePublique(slug);

  async function publier() {
    setEnCours(true);
    setEtat({});
    try { setEtat(await actionPublier()); }
    catch { setEtat({ erreur: "La publication a échoué. Réessayez." }); }
    finally { setEnCours(false); }
  }

  async function retirer() {
    setEnCours(true);
    setEtat({});
    try { setEtat(await actionDepublier()); }
    catch { setEtat({ erreur: "Le retrait a échoué. Réessayez." }); }
    finally { setEnCours(false); setConfirmeRetrait(false); }
  }

  if (!permise) {
    return (
      <section className="carte border-terre-200 p-5">
        <div className="flex items-start gap-3">
          <Alerte className="mt-0.5 size-5 shrink-0 text-terre-600" />
          <div>
            <h2 className="titre-section">Publication non incluse</h2>
            <p className="mt-1.5 text-sm text-encre-600">
              {raison ?? `La formule ${nomOffre} ne permet pas la mise en ligne.`} Tout votre
              travail est conservé : dès que vous changez de formule, la boutique part
              en ligne telle quelle.
            </p>
            <Link href="/tableau-de-bord/abonnement" className="btn-principal mt-4">
              Voir les formules
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="carte p-5">
      {etat.erreur ? <div className="mb-3"><Message ton="erreur">{etat.erreur}</Message></div> : null}
      {etat.message ? <div className="mb-3"><Message ton="succes">{etat.message}</Message></div> : null}

      {publiee ? (
        <>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-vert-100 text-vert-700">
              <Coche className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="titre-section">Votre boutique est en ligne</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a href={`/b/${slug}`} target="_blank" rel="noopener"
                  className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-ivoire px-2.5 py-1.5 font-mono text-xs text-encre-700 hover:text-vert-700">
                  <IconeLien className="size-3.5 shrink-0" />
                  <span className="truncate">{adresse}</span>
                </a>
                <BoutonCopier valeur={adresse} libelle="Copier" />
              </div>
            </div>
          </div>

          {enAttente ? (
            <div className="mt-4 rounded-xl bg-terre-50 p-3.5">
              <p className="text-sm font-medium text-terre-700">
                Vous avez des modifications non publiées
              </p>
              <p className="mt-1 text-xs text-terre-700/90">
                Vos clients voient encore la version précédente.
              </p>
              <button type="button" className="btn-principal mt-3" onClick={publier} disabled={enCours}>
                {enCours ? <><Rondelle className="size-4" /> Publication…</> : "Publier mes modifications"}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-encre-600">
              Votre brouillon et votre boutique en ligne sont identiques. Rien à publier.
            </p>
          )}

          <div className="mt-5 border-t border-encre-100 pt-4">
            {confirmeRetrait ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
                <p className="text-sm font-medium text-red-900">
                  Retirer la boutique du web ? Vos clients verront « page introuvable ».
                </p>
                <p className="mt-1 text-xs text-red-800">
                  Vos produits, vos commandes et votre page sont conservés. Vous pourrez
                  republier quand vous voulez.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-danger btn-petit" onClick={retirer} disabled={enCours}>
                    Oui, retirer du web
                  </button>
                  <button type="button" className="btn-secondaire btn-petit"
                    onClick={() => setConfirmeRetrait(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="text-sm text-encre-500 hover:text-red-700"
                onClick={() => setConfirmeRetrait(true)}>
                Retirer ma boutique du web
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="titre-section">
            {depuisAssistant ? "Dernière étape : la mise en ligne" : "Mettre ma boutique en ligne"}
          </h2>
          <p className="mt-1.5 text-sm text-encre-600">
            Votre boutique deviendra accessible à cette adresse, et vos clients pourront
            commander.
          </p>
          <p className="mt-3 break-all rounded-xl bg-ivoire px-3 py-2.5 font-mono text-xs text-encre-700">
            {adresse}
          </p>
          <button type="button" className="btn-principal mt-4 w-full" onClick={publier} disabled={enCours}>
            {enCours
              ? <><Rondelle className="size-4" /> Mise en ligne…</>
              : "Publier ma boutique"}
          </button>
          <p className="mt-2.5 text-xs text-encre-500">
            Vous pouvez la retirer du web à tout moment, sans rien perdre.
          </p>
        </>
      )}
    </section>
  );
}
