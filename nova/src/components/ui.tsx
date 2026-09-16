"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Alerte, Coche, Info, Croix } from "./icones";

/**
 * Les briques d'interface partagées.
 *
 * Elles portent trois exigences du cahier des charges, une fois pour toutes,
 * au lieu de les répéter dans chaque page :
 *   — un état de chargement visible sur chaque envoi de formulaire ;
 *   — un message d'erreur qui dit quoi faire, pas seulement ce qui a raté ;
 *   — un écran vide qui propose l'action suivante plutôt que de constater.
 */

// ---------------------------------------------------------------------------
//  Bouton d'envoi
// ---------------------------------------------------------------------------

/**
 * `useFormStatus` connaît l'état du formulaire parent sans qu'on ait à gérer
 * un état local. Le bouton se désactive pendant l'envoi : c'est la première
 * protection contre le double-clic (la seconde est la clé d'idempotence,
 * côté serveur).
 */
export function BoutonEnvoi({
  children, className = "btn-principal", enCours, ...reste
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { enCours?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...reste} type="submit" disabled={pending || reste.disabled} className={className}>
      {pending ? (
        <>
          <Rondelle />
          <span>{enCours ?? "Un instant…"}</span>
        </>
      ) : children}
    </button>
  );
}

export function Rondelle({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
//  Messages
// ---------------------------------------------------------------------------

export type TonMessage = "info" | "succes" | "alerte" | "erreur";

const ICONE_MESSAGE = { info: Info, succes: Coche, alerte: Alerte, erreur: Alerte };

export function Message({
  ton = "info", titre, children, onFermer,
}: {
  ton?: TonMessage; titre?: string; children?: React.ReactNode; onFermer?: () => void;
}) {
  const Icone = ICONE_MESSAGE[ton];
  return (
    <div
      className={`message message-${ton} apparait`}
      role={ton === "erreur" ? "alert" : "status"}
    >
      <Icone className="mt-0.5 size-4.5 shrink-0" />
      <div className="flex-1">
        {titre ? <p className="font-semibold">{titre}</p> : null}
        {children ? <div className={titre ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
      {onFermer ? (
        <button type="button" onClick={onFermer} aria-label="Fermer ce message"
          className="rounded p-0.5 hover:bg-black/5">
          <Croix className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Écran vide
// ---------------------------------------------------------------------------

/**
 * Un écran vide n'annonce pas « aucun résultat » : il explique pourquoi c'est
 * vide et propose le geste suivant. C'est le moment où un commerçant décide
 * s'il continue ou s'il abandonne.
 */
export function EcranVide({
  icone, titre, texte, action,
}: {
  icone?: React.ReactNode; titre: string; texte?: string; action?: React.ReactNode;
}) {
  return (
    <div className="carte flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icone ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-vert-50 text-vert-700">
          {icone}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-encre-900">{titre}</h3>
      {texte ? <p className="max-w-sm text-sm text-encre-600">{texte}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Confirmation avant un geste irréversible
// ---------------------------------------------------------------------------

/**
 * Un bouton qui demande confirmation dans la page, sans `window.confirm` :
 * la boîte native est illisible sur mobile et ne dit pas ce qui va disparaître.
 */
export function BoutonConfirmation({
  question, libelle, libelleConfirme = "Oui, continuer",
  className = "btn-danger", enCours,
}: {
  question: string; libelle: React.ReactNode; libelleConfirme?: string;
  className?: string; enCours?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    // Échap referme : un geste dangereux doit toujours pouvoir être abandonné.
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, [ouvert]);

  if (!ouvert) {
    return (
      <button type="button" className={className} onClick={() => setOuvert(true)}>
        {libelle}
      </button>
    );
  }
  return (
    <div ref={zone} className="apparait rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-900">{question}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <BoutonEnvoi className="btn-danger btn-petit" enCours={enCours}>
          {libelleConfirme}
        </BoutonEnvoi>
        <button type="button" className="btn-secondaire btn-petit" onClick={() => setOuvert(false)}>
          Annuler
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Copier une adresse
// ---------------------------------------------------------------------------

export function BoutonCopier({
  valeur, libelle = "Copier", className = "btn-secondaire btn-petit",
}: { valeur: string; libelle?: string; className?: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(valeur);
    } catch {
      // Sans permission presse-papiers (navigateur ancien, page non sécurisée),
      // on sélectionne le texte : le visiteur copie lui-même.
      const champ = document.createElement("textarea");
      champ.value = valeur;
      document.body.appendChild(champ);
      champ.select();
      try { document.execCommand("copy"); } catch { /* tant pis */ }
      champ.remove();
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2200);
  }

  return (
    <button type="button" className={className} onClick={copier}>
      {copie ? <><Coche className="size-4" /> Copié</> : libelle}
    </button>
  );
}

// ---------------------------------------------------------------------------
//  Champ de montant
// ---------------------------------------------------------------------------

/** Espace fine insécable et espace insécable : jolies à l'écran, pénibles à copier. */
const ESPACES_FINES = new RegExp("[\\u202F\\u00A0]", "g");

/**
 * Saisie d'un montant en francs CFA : entiers seulement, séparateurs affichés
 * pendant la frappe. Le formulaire envoie la valeur brute dans un champ caché,
 * pour que le serveur reçoive « 12500 » et non « 12 500 ».
 */
export function ChampMontant({
  nom, defaut, devise = "FCFA", requis, id, etiquette,
}: {
  nom: string; defaut?: number | null; devise?: string; requis?: boolean;
  id?: string;
  /** Nom lu par un lecteur d'écran quand aucun <label> ne pointe vers le champ. */
  etiquette?: string;
}) {
  const [valeur, setValeur] = useState(defaut ? String(defaut) : "");
  const chiffres = valeur.replace(/\D/g, "");
  const affiche = chiffres
    ? Number(chiffres).toLocaleString("fr-FR").replace(ESPACES_FINES, " ")
    : "";

  return (
    <div className="relative">
      <input
        id={id}
        type="text" inputMode="numeric" autoComplete="off"
        className="champ pr-16" value={affiche} required={requis}
        onChange={(e) => setValeur(e.target.value)}
        // Sans `id`, aucun <label> ne peut pointer vers ce champ : son nom
        // accessible vient alors d'`aria-label`. Un champ de montant sans nom
        // est inutilisable au lecteur d'écran.
        aria-label={id ? undefined : (etiquette ?? `Montant en ${devise}`)}
        aria-describedby={id ? `${id}-devise` : undefined}
      />
      <span id={id ? `${id}-devise` : undefined}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-encre-500">
        {devise}
      </span>
      <input type="hidden" name={nom} value={chiffres} />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Image qui se charge progressivement
// ---------------------------------------------------------------------------

/**
 * Une photo de produit sur une connexion lente : on montre un cadre gris qui
 * respire, puis l'image apparaît. Le cadre a la bonne taille dès le départ,
 * ce qui évite que la page saute quand l'image arrive.
 */
export function Photo({
  src, alt, className = "", ratio = "aspect-square",
}: { src: string | null; alt: string; className?: string; ratio?: string }) {
  const [chargee, setChargee] = useState(false);

  if (!src) {
    return (
      <div className={`${ratio} ${className} flex items-center justify-center bg-ivoire text-encre-300`}>
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4.5" width="18" height="15" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${ratio} ${className} relative overflow-hidden bg-ivoire`}>
      {!chargee ? <div className="absolute inset-0 squelette rounded-none" /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={alt} loading="lazy" decoding="async"
        onLoad={() => setChargee(true)}
        onError={() => setChargee(true)}
        className={`size-full object-cover transition-opacity duration-300 ${chargee ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Onglets simples
// ---------------------------------------------------------------------------

export function Compteur({ valeur }: { valeur: number }) {
  if (valeur <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-terre-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
      {valeur > 99 ? "99+" : valeur}
    </span>
  );
}
