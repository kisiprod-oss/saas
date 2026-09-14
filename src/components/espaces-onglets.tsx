"use client";

import { useRef, useState } from "react";
import Link from "next/link";

/**
 * Les trois espaces de Sen Gestion, presentes l'un apres l'autre.
 *
 * Seul ce composant est envoye au navigateur : le reste de la page reste
 * rendu sur le serveur. C'est la raison du decoupage — une page de
 * presentation vue sur un telephone en donnees mobiles ne doit pas payer
 * du JavaScript pour son texte.
 *
 * CLAVIER. Un jeu d'onglets se parcourt aux FLECHES, pas a la tabulation :
 * une seule tabulation entre dans le groupe, les fleches changent d'onglet,
 * une autre tabulation en sort vers le contenu. C'est ce que fait un
 * lecteur d'ecran, et ce que le motif « tabs » de l'ARIA impose. D'ou le
 * tabIndex a -1 sur les onglets non selectionnes.
 */

export type Espace = {
  cle: string;
  onglet: string;
  titre: string;
  texte: string;
  points: { titre: string; texte: string }[];
  action: { libelle: string; href: string };
  secondaire: { libelle: string; href: string };
  /**
   * L'illustration de l'espace. `ajustement` n'est pas un detail : une
   * capture large se recadre bien (« couvrir »), un document en hauteur se
   * verrait ampute de ses montants — il tient donc entier dans son cadre
   * (« contenir »), sur un fond clair, comme une feuille posee sur un bureau.
   */
  image: {
    src: string;
    alt: string;
    largeur: number;
    hauteur: number;
    ajustement: "couvrir" | "contenir";
  };
};

export function EspacesOnglets({ espaces }: { espaces: Espace[] }) {
  const [actif, setActif] = useState(0);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const espace = espaces[actif];

  function auClavier(e: React.KeyboardEvent, index: number) {
    const dernier = espaces.length - 1;
    let cible: number | undefined;
    if (e.key === "ArrowRight") cible = index === dernier ? 0 : index + 1;
    if (e.key === "ArrowLeft") cible = index === 0 ? dernier : index - 1;
    if (e.key === "Home") cible = 0;
    if (e.key === "End") cible = dernier;
    if (cible === undefined) return;
    e.preventDefault();
    setActif(cible);
    boutons.current[cible]?.focus();
  }

  return (
    <>
      <div role="tablist" aria-label="Découvrir les espaces" className="mt-9 flex flex-wrap gap-2">
        {espaces.map((e, i) => (
          <button
            key={e.cle}
            ref={(el) => { boutons.current[i] = el; }}
            id={`onglet-${e.cle}`}
            role="tab"
            type="button"
            aria-selected={i === actif}
            aria-controls="panneau-espace"
            tabIndex={i === actif ? 0 : -1}
            onClick={() => setActif(i)}
            onKeyDown={(ev) => auClavier(ev, i)}
            className={`rounded-full border px-5 py-3 text-sm font-semibold transition-colors ${
              i === actif
                ? "border-brand-900 bg-brand-900 text-white"
                : "border-slate-300 bg-transparent text-slate-700 hover:bg-white"
            }`}
          >
            {e.onglet}
          </button>
        ))}
      </div>

      <div
        id="panneau-espace"
        role="tabpanel"
        aria-labelledby={`onglet-${espace.cle}`}
        tabIndex={0}
        className="mt-6 grid items-start gap-8 rounded-2xl bg-white p-6 ring-1 ring-slate-200 sm:p-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12"
      >
        {/* Le cadre porte le rapport de forme : la hauteur du panneau ne
            change donc pas d'un onglet a l'autre, et rien ne saute sous la
            souris au moment du clic. */}
        <div
          className={`overflow-hidden rounded-xl ring-1 ring-slate-200 ${
            espace.image.ajustement === "contenir" ? "bg-slate-50 p-3" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={espace.image.src}
            alt={espace.image.alt}
            width={espace.image.largeur}
            height={espace.image.hauteur}
            loading="lazy"
            decoding="async"
            className={`aspect-[4/3] w-full rounded-lg ${
              espace.image.ajustement === "contenir"
                ? "object-contain object-top"
                : "object-cover object-top"
            }`}
          />
        </div>

        <div>
          <h3 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {espace.titre}
          </h3>
          <p className="mt-4 text-slate-600">{espace.texte}</p>

          <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {espace.points.map((p) => (
              <li key={p.titre} className="py-3.5">
                <p className="font-semibold text-slate-900">{p.titre}</p>
                <p className="mt-0.5 text-sm text-slate-600">{p.texte}</p>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={espace.action.href} className="btn-primaire px-5 py-3">
              {espace.action.libelle}
            </Link>
            <Link href={espace.secondaire.href} className="btn-secondaire px-5 py-3">
              {espace.secondaire.libelle}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
