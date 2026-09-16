"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  actionEnregistrerDomaine, actionVerifierDomaine, type Etat,
} from "@/lib/actions-reglages";
import { BoutonEnvoi, Message, BoutonCopier, Rondelle } from "./ui";
import { Coche } from "./icones";

/**
 * Le domaine personnalise.
 *
 * La preuve de propriete passe par un enregistrement TXT, jamais par un simple
 * CNAME : n'importe qui peut faire pointer son domaine sur notre serveur, et
 * sans preuve TXT il pourrait reclamer le domaine d'un concurrent. Seul celui
 * qui administre la zone DNS peut y poser un TXT.
 *
 * Le certificat HTTPS n'est PAS emis automatiquement ici : cela depend de
 * l'hebergeur retenu. On le dit plutot que de laisser croire que tout est
 * automatique.
 */
export function FormulaireDomaine({
  permis, raison, domaine, jeton, verifieLe, slug,
}: {
  permis: boolean; raison: string | null;
  domaine: string | null; jeton: string | null; verifieLe: string | null; slug: string;
}) {
  const [etat, envoyer] = useActionState<Etat, FormData>(actionEnregistrerDomaine, {});
  const [verification, setVerification] = useState<Etat>({});
  const [enCours, setEnCours] = useState(false);

  async function verifier() {
    setEnCours(true);
    setVerification({});
    try { setVerification(await actionVerifierDomaine()); }
    catch { setVerification({ erreur: "La vérification a échoué." }); }
    finally { setEnCours(false); }
  }

  if (!permis) {
    return (
      <section className="carte p-5">
        <h2 className="titre-section">Nom de domaine</h2>
        <p className="mt-1.5 text-sm text-encre-600">
          {raison} Votre boutique reste accessible sur{" "}
          <code className="font-mono text-xs">{slug}.nova.shop</code>.
        </p>
        <Link href="/tableau-de-bord/abonnement" className="btn-secondaire mt-4">
          Voir les formules
        </Link>
      </section>
    );
  }

  return (
    <section className="carte p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="titre-section">Nom de domaine</h2>
        {verifieLe ? (
          <span className="puce puce-vert"><Coche className="size-3.5" /> Propriété vérifiée</span>
        ) : domaine ? (
          <span className="puce puce-terre">Vérification en attente</span>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm text-encre-600">
        Utilisez votre propre adresse au lieu de{" "}
        <code className="font-mono text-xs">{slug}.nova.shop</code>.
      </p>

      {etat.erreur ? <div className="mt-3"><Message ton="erreur">{etat.erreur}</Message></div> : null}
      {etat.message ? <div className="mt-3"><Message ton="succes">{etat.message}</Message></div> : null}

      <form action={envoyer} className="mt-4 flex flex-wrap gap-2">
        <input name="domaine" className="champ flex-1" maxLength={120}
          defaultValue={domaine ?? ""} placeholder="maboutique.sn"
          aria-label="Votre nom de domaine" />
        <BoutonEnvoi className="btn-secondaire" enCours="Enregistrement…">Enregistrer</BoutonEnvoi>
      </form>

      {domaine && jeton ? (
        <div className="mt-5 space-y-4 border-t border-encre-100 pt-4">
          <div>
            <p className="etiquette mb-1.5">Étape 1 — prouver que le domaine est à vous</p>
            <p className="text-sm text-encre-600">
              Chez votre hébergeur de domaine, ajoutez un enregistrement <strong>TXT</strong> sur{" "}
              <code className="font-mono text-xs">{domaine}</code> avec cette valeur :
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded-xl bg-ivoire px-3 py-2.5 font-mono text-xs">
                {jeton}
              </code>
              <BoutonCopier valeur={jeton} />
            </div>
            <button type="button" className="btn-secondaire mt-3" onClick={verifier} disabled={enCours}>
              {enCours ? <><Rondelle className="size-4" /> Vérification…</> : "Vérifier maintenant"}
            </button>
            {verification.erreur ? (
              <div className="mt-2"><Message ton="alerte">{verification.erreur}</Message></div>
            ) : null}
            {verification.message ? (
              <div className="mt-2"><Message ton="succes">{verification.message}</Message></div>
            ) : null}
          </div>

          {verifieLe ? (
            <div>
              <p className="etiquette mb-1.5">Étape 2 — faire pointer le domaine</p>
              <p className="text-sm text-encre-600">
                Ajoutez un enregistrement <strong>CNAME</strong> de{" "}
                <code className="font-mono text-xs">{domaine}</code> vers{" "}
                <code className="font-mono text-xs">{slug}.nova.shop</code>.
              </p>
              <div className="message message-info mt-3">
                <div>
                  <p className="font-semibold">Le certificat HTTPS n&apos;est pas encore automatique</p>
                  <p className="mt-0.5">
                    Il dépend de l&apos;hébergeur choisi pour la mise en production.
                    Prévenez-nous une fois le CNAME en place : nous finalisons
                    l&apos;émission du certificat. Tant qu&apos;il n&apos;est pas émis,
                    continuez à partager votre adresse nova.shop.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
