"use client";

import { useActionState, useState } from "react";
import { actionEnregistrerPaiement, type Etat } from "@/lib/actions-reglages";
import { BoutonEnvoi, Message } from "./ui";
import { Cadenas } from "./icones";

type FournisseurVue = {
  code: string; nom: string; etat: string; etatTexte: string; etatTon: string;
  identifiants: { cle: string; libelle: string; aide: string }[];
  ou: string; note: string;
};

/**
 * Le choix du prestataire et la saisie des cles.
 *
 * Deux choses ne sont jamais cachees ici :
 *   — l'etat REEL de chaque integration, repris de src/lib/paiements.ts ;
 *   — le fait que le mode test n'affiche pas le paiement en ligne aux clients.
 *
 * Les cles privees deja enregistrees ne redescendent jamais dans le
 * navigateur : le champ est vide, et laisser vide conserve l'existant.
 */
export function GestionPaiement({
  boutiqueId, pays, fournisseurs, actuel, chiffrementPret,
}: {
  boutiqueId: number;
  pays: string;
  fournisseurs: FournisseurVue[];
  actuel: {
    actif: boolean; code: string | null; mode: string; clePublique: string | null;
    clePriveeEnregistree: boolean; secretEnregistre: boolean; masquePrivee: string;
  };
  chiffrementPret: boolean;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerPaiement, {});
  const [actif, setActif] = useState(actuel.actif);
  const [code, setCode] = useState(actuel.code ?? "test");
  const [mode, setMode] = useState(actuel.mode);

  const choisi = fournisseurs.find((f) => f.code === code);
  const modeReelPossible = choisi?.etat === "disponible" && chiffrementPret;

  return (
    <form action={envoyer} className="carte space-y-4 p-5">
      <h2 className="titre-section">Paiement en ligne</h2>

      {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
      {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

      <label className="flex items-start gap-3">
        <input type="checkbox" name="paiement_en_ligne" value="1" className="mt-0.5 size-5 accent-vert-700"
          checked={actif} onChange={(e) => setActif(e.target.checked)} />
        <span>
          <span className="font-medium text-encre-900">Accepter le paiement en ligne</span>
          <span className="block text-sm text-encre-600">
            En plus du paiement à la réception, qui reste actif.
          </span>
        </span>
      </label>

      {actif ? (
        <>
          <div>
            <label className="etiquette" htmlFor="fournisseur">
              Prestataire disponible pour {pays}
            </label>
            <select id="fournisseur" name="fournisseur" className="champ" value={code}
              onChange={(e) => { setCode(e.target.value); setMode("test"); }}>
              {fournisseurs.map((f) => (
                <option key={f.code} value={f.code}>{f.nom} — {f.etatTexte}</option>
              ))}
            </select>
          </div>

          {choisi ? (
            <div className="rounded-xl bg-ivoire p-3.5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-encre-900">{choisi.nom}</span>
                <span className={`puce ${choisi.etatTon}`}>{choisi.etatTexte}</span>
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-encre-600">{choisi.note}</p>
              {choisi.identifiants.length > 0 ? (
                <p className="mt-2 text-xs text-encre-500">Où trouver vos clés : {choisi.ou}</p>
              ) : null}
            </div>
          ) : null}

          {choisi && choisi.identifiants.length > 0 ? (
            <div className="space-y-3">
              {choisi.identifiants.map((champ) => {
                const enregistre = champ.cle === "cle_privee"
                  ? actuel.clePriveeEnregistree
                  : champ.cle === "secret_webhook" ? actuel.secretEnregistre : false;
                const secret = champ.cle !== "cle_publique";

                return (
                  <div key={champ.cle}>
                    <label className="etiquette" htmlFor={champ.cle}>
                      {champ.libelle}
                      {secret ? <Cadenas className="ml-1.5 inline size-3.5 text-encre-400" /> : null}
                    </label>
                    <input
                      id={champ.cle} name={champ.cle} className="champ"
                      type={secret ? "password" : "text"} maxLength={500}
                      autoComplete="off"
                      defaultValue={champ.cle === "cle_publique" ? (actuel.clePublique ?? "") : ""}
                      placeholder={enregistre ? "Enregistrée — laissez vide pour la conserver" : ""}
                    />
                    <p className="aide">{champ.aide}</p>
                  </div>
                );
              })}
              <p className="text-xs text-encre-500">
                Vos clés privées sont chiffrées avant d&apos;être enregistrées et ne
                sont jamais renvoyées vers votre navigateur.
              </p>
            </div>
          ) : null}

          <fieldset className="rounded-xl border border-encre-200 p-3.5">
            <legend className="px-1.5 text-sm font-medium">Mode</legend>
            <label className="flex items-start gap-3">
              <input type="radio" name="mode" value="test" className="mt-1 size-4 accent-vert-700"
                checked={mode === "test"} onChange={() => setMode("test")} />
              <span>
                <span className="font-medium text-encre-900">Test</span>
                <span className="block text-sm text-encre-600">
                  Rien n&apos;est encaissé, et vos clients ne voient PAS le paiement
                  en ligne sur la boutique. Sert à vérifier le circuit.
                </span>
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3">
              <input type="radio" name="mode" value="reel" className="mt-1 size-4 accent-vert-700"
                checked={mode === "reel"} disabled={!modeReelPossible}
                onChange={() => setMode("reel")} />
              <span>
                <span className={`font-medium ${modeReelPossible ? "text-encre-900" : "text-encre-400"}`}>
                  Réel
                </span>
                <span className="block text-sm text-encre-600">
                  {!chiffrementPret
                    ? "Indisponible : le serveur n'a pas de clé de chiffrement."
                    : choisi?.etat !== "disponible"
                      ? `Indisponible : l'intégration ${choisi?.nom ?? ""} n'est pas terminée.`
                      : "Vos clients paient réellement. L'argent arrive sur votre compte marchand."}
                </span>
              </span>
            </label>
          </fieldset>
        </>
      ) : null}

      <BoutonEnvoi className="btn-principal" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
      <input type="hidden" name="boutique" value={boutiqueId} />
    </form>
  );
}
