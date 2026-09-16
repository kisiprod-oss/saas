"use client";

import { useState } from "react";
import { actionRestaurerVersion } from "@/lib/actions-editeur";
import { Message, Rondelle } from "./ui";
import { Retour, Horloge } from "./icones";

/**
 * L'historique des versions.
 *
 * Restaurer ne publie RIEN : la version choisie revient dans le brouillon, le
 * commercant la relit, et publie s'il la garde. C'est ce qui rend la
 * restauration sans risque — se tromper de version ne met pas une vieille
 * page en ligne devant les clients.
 *
 * Et la restauration est elle-meme annulable : un instantane de l'etat courant
 * est pose avant de l'ecraser (voir src/lib/versions.ts).
 */
export type Entree = {
  id: number;
  numero: number;
  origine: string;
  etat: string;
  resume: string | null;
  quand: string;
};

export function HistoriqueVersions({ versions }: { versions: Entree[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<{ erreur?: string; message?: string }>({});
  const [enCours, setEnCours] = useState<number | null>(null);

  async function restaurer(id: number) {
    setEnCours(id);
    setEtat({});
    try {
      setEtat(await actionRestaurerVersion(id));
    } catch {
      setEtat({ erreur: "La restauration a échoué. Votre brouillon n'a pas changé." });
    } finally {
      setEnCours(null);
    }
  }

  return (
    <section className="carte p-5">
      <button type="button" className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOuvert(!ouvert)} aria-expanded={ouvert}>
        <span>
          <span className="titre-section flex items-center gap-2">
            <Horloge className="size-5" /> Historique
          </span>
          <span className="mt-0.5 block text-sm text-encre-600">
            {versions.length} version{versions.length > 1 ? "s" : ""} conservée{versions.length > 1 ? "s" : ""}.
            Revenez en arrière à tout moment.
          </span>
        </span>
        <span aria-hidden className={`text-encre-400 transition-transform ${ouvert ? "rotate-180" : ""}`}>▾</span>
      </button>

      {ouvert ? (
        <div className="mt-4 space-y-3">
          {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
          {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

          {versions.length === 0 ? (
            <p className="text-sm text-encre-500">
              Aucune version enregistrée pour l&apos;instant. Elles apparaîtront dès
              votre première modification.
            </p>
          ) : (
            <ul className="divide-y divide-encre-100 border-y border-encre-100">
              {versions.map((version) => (
                <li key={version.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-encre-900">
                      Version {version.numero}
                      {version.etat === "publiee" ? (
                        <span className="puce puce-vert">Mise en ligne</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-encre-500">
                      {version.origine} · {version.quand}
                      {version.resume ? ` · ${version.resume}` : ""}
                    </p>
                  </div>
                  <button type="button" className="btn-secondaire btn-petit"
                    onClick={() => restaurer(version.id)} disabled={enCours !== null}>
                    {enCours === version.id
                      ? <Rondelle className="size-4" />
                      : <><Retour className="size-4" /> Restaurer</>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-encre-500">
            Restaurer remet la version choisie dans votre brouillon. Vos clients ne
            verront le changement qu&apos;après publication.
          </p>
        </div>
      ) : null}
    </section>
  );
}
