"use client";

import { useEffect, useState } from "react";
import { Lien, Whatsapp, Coche, Croix } from "./icones";

/**
 * « Partager ma boutique ».
 *
 * Trois chemins, parce que trois usages réels :
 *   — le partage natif du téléphone (`navigator.share`), qui ouvre WhatsApp,
 *     Facebook ou les SMS selon ce que la personne utilise ;
 *   — un lien WhatsApp direct, parce que c'est là que ça se passe ;
 *   — la copie du lien, pour le coller dans une bio Instagram ou un statut.
 *
 * Le bouton refuse de partager une boutique non publiée : envoyer à ses
 * clients un lien qui affiche « page introuvable » est pire que de ne rien
 * envoyer. Il explique alors ce qui manque.
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

export function Partage({
  boutique,
}: { boutique: { slug: string; nom: string; publiee: boolean } }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState(false);

  const adresse = useAdressePublique(boutique.slug);

  const texte = `Découvrez ${boutique.nom} : ${adresse}`;

  async function partager() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: boutique.nom, text: `Découvrez ${boutique.nom}`, url: adresse });
        return;
      } catch {
        // Partage refusé ou annulé : on ouvre le panneau, qui offre les
        // autres chemins.
      }
    }
    setOuvert(true);
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(adresse);
    } catch {
      const champ = document.createElement("textarea");
      champ.value = adresse;
      document.body.appendChild(champ);
      champ.select();
      try { document.execCommand("copy"); } catch { /* le visiteur copiera */ }
      champ.remove();
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2400);
  }

  // Boutique en brouillon : le bouton reste, mais il explique ce qui manque
  // au lieu de distribuer un lien qui afficherait « page introuvable ».
  if (!boutique.publiee) {
    return (
      <>
        <button type="button" className="btn-secondaire" onClick={() => setOuvert(true)}>
          <Lien className="size-4" /> Partager ma boutique
        </button>
        {ouvert ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-encre-900/40 sm:items-center sm:p-4"
            role="dialog" aria-modal="true" aria-label="Partage impossible"
            onClick={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}>
            <div className="apparait w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
              <div className="flex items-start justify-between">
                <h2 className="titre-section">Pas encore partageable</h2>
                <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer"
                  className="rounded-lg p-1 text-encre-500 hover:bg-encre-100">
                  <Croix className="size-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-encre-600">
                Votre boutique est un brouillon. Le lien que vous enverriez afficherait
                « page introuvable » à vos clients.
              </p>
              <a href="/tableau-de-bord/boutique" className="btn-principal mt-4 w-full">
                Publier ma boutique
              </a>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <button type="button" className="btn-secondaire" onClick={partager}>
        <Lien className="size-4" /> Partager ma boutique
      </button>

      {ouvert ? (
        <PanneauPartage
          adresse={adresse} texte={texte} copie={copie}
          onCopier={copier} onFermer={() => setOuvert(false)}
        />
      ) : null}
    </>
  );
}

function PanneauPartage({
  adresse, texte, copie, onCopier, onFermer,
}: {
  adresse: string; texte: string; copie: boolean;
  onCopier: () => void; onFermer: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-encre-900/40 p-0 sm:items-center sm:p-4"
      role="dialog" aria-modal="true" aria-label="Partager ma boutique"
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="apparait w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between">
          <h2 className="titre-section">Partager ma boutique</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer"
            className="rounded-lg p-1 text-encre-500 hover:bg-encre-100">
            <Croix className="size-5" />
          </button>
        </div>

        <p className="mt-3 break-all rounded-xl bg-ivoire px-3 py-2.5 font-mono text-xs text-encre-700">
          {adresse}
        </p>

        <div className="mt-4 grid gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(texte)}`}
            target="_blank" rel="noopener"
            className="btn-principal"
          >
            <Whatsapp className="size-4" /> Envoyer sur WhatsApp
          </a>
          <button type="button" className="btn-secondaire" onClick={onCopier}>
            {copie ? <><Coche className="size-4" /> Lien copié</> : <><Lien className="size-4" /> Copier le lien</>}
          </button>
        </div>

        <p className="mt-3 text-xs text-encre-500">
          Ouvrir WhatsApp ne garantit pas que le message part : vérifiez l&apos;envoi
          dans l&apos;application.
        </p>
      </div>
    </div>
  );
}

