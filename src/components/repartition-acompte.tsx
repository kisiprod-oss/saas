"use client";

import { useState } from "react";
import { fcfa, periodeLisible } from "@/lib/format";

/**
 * Repartition d'un acompte sur plusieurs factures en retard.
 *
 * Le montant total recu est saisi en haut ; le bouton « Repartir » propose
 * une ventilation en commencant par la facture la plus ancienne. Chaque
 * ligne reste modifiable : c'est l'agence qui decide, le logiciel ne fait
 * que lui epargner la division.
 *
 * Le total affecte est recalcule a chaque frappe. Sans ce retour immediat,
 * l'agence ne decouvrirait son erreur de calcul qu'apres validation.
 */

export type LigneArriere = {
  id: number;
  numero: string;
  periode: string;
  reste: number;
  joursRetard: number;
};

export function RepartitionAcompte({ lignes }: { lignes: LigneArriere[] }) {
  const [recu, setRecu] = useState("");
  const [parts, setParts] = useState<Record<number, string>>({});

  const nombre = (v: string) => {
    const n = Number(String(v).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const totalDu = lignes.reduce((s, l) => s + l.reste, 0);
  const totalAffecte = lignes.reduce((s, l) => s + nombre(parts[l.id] ?? ""), 0);
  const montantRecu = nombre(recu);
  const restePlacer = montantRecu - totalAffecte;

  /** Impute le montant recu sur les dettes, la plus ancienne d'abord. */
  const repartir = () => {
    let reste = montantRecu;
    const nouveau: Record<number, string> = {};
    for (const ligne of lignes) {
      const part = Math.min(reste, ligne.reste);
      nouveau[ligne.id] = part > 0 ? String(part) : "";
      reste -= part;
    }
    setParts(nouveau);
  };

  const trop = lignes.filter((l) => nombre(parts[l.id] ?? "") > l.reste);

  return (
    <>
      <div className="carte p-5">
        <label className="etiquette" htmlFor="recu">Montant remis par le locataire (FCFA)</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="recu"
            inputMode="numeric"
            value={recu}
            onChange={(e) => setRecu(e.target.value)}
            placeholder="100000"
            className="champ w-auto flex-1"
          />
          <button type="button" onClick={repartir} className="btn-secondaire shrink-0">
            Répartir automatiquement
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          La répartition proposée commence par le mois le plus ancien. Vous
          pouvez ensuite corriger chaque ligne à la main.
        </p>
      </div>

      <div className="carte mt-4 overflow-hidden">
        <table className="tableau">
          <thead>
            <tr>
              <th>Facture</th>
              <th>Retard</th>
              <th className="text-right">Reste dû</th>
              <th className="text-right">À imputer</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const saisi = nombre(parts[l.id] ?? "");
              return (
                <tr key={l.id}>
                  <td>
                    <span className="font-medium text-slate-900">{periodeLisible(l.periode)}</span>
                    <span className="block text-xs text-slate-400">{l.numero}</span>
                  </td>
                  <td className="text-slate-600">{l.joursRetard} j</td>
                  <td className="text-right tabular-nums">{fcfa(l.reste)}</td>
                  <td className="text-right">
                    <input
                      name={`montant_${l.id}`}
                      inputMode="numeric"
                      value={parts[l.id] ?? ""}
                      onChange={(e) => setParts({ ...parts, [l.id]: e.target.value })}
                      placeholder="0"
                      aria-label={`Montant imputé sur la facture ${l.numero}`}
                      className={`champ w-32 text-right tabular-nums ${saisi > l.reste ? "border-rose-400" : ""}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
              <td colSpan={2}>Total</td>
              <td className="text-right tabular-nums">{fcfa(totalDu)}</td>
              <td className="text-right tabular-nums">{fcfa(totalAffecte)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {trop.length > 0 && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Une ligne dépasse ce qu&apos;il reste à payer sur cette facture. Corrigez-la
          avant d&apos;enregistrer — le logiciel refusera sinon.
        </p>
      )}

      {montantRecu > 0 && restePlacer !== 0 && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {restePlacer > 0
            ? <>Il reste <strong>{fcfa(restePlacer)}</strong> à placer sur une facture.</>
            : <>Vous avez réparti <strong>{fcfa(-restePlacer)}</strong> de plus que le montant remis.</>}
        </p>
      )}
    </>
  );
}
