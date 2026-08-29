"use client";

import { useMemo, useState } from "react";
import { actionDemanderReservation } from "@/lib/actions";

/**
 * Demande de reservation pour un meuble touristique.
 *
 * Le total se recalcule a chaque changement de date : un voyageur qui voit
 * « 3 nuits x 35 000 = 105 000 FCFA » avant d'envoyer sa demande ne
 * decouvre pas le prix par telephone deux jours plus tard.
 *
 * Les dates deja prises sont refusees ici ET revalidees sur le serveur : ce
 * controle est un confort d'affichage, jamais une securite.
 */

type Sejour = { date_arrivee: string; date_depart: string };

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

function jourSuivant(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function nuitsEntre(a: string, d: string): number {
  const t1 = Date.parse(`${a}T00:00:00Z`);
  const t2 = Date.parse(`${d}T00:00:00Z`);
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 0;
  return Math.round((t2 - t1) / 86400_000);
}

export function FormulaireReservation({
  bienId, prixNuit, nuitsMin, capacite, sejours, aujourdhui,
}: {
  bienId: number; prixNuit: number; nuitsMin: number; capacite: number;
  sejours: Sejour[]; aujourdhui: string;
}) {
  const [arrivee, setArrivee] = useState("");
  const [depart, setDepart] = useState("");

  const nuits = arrivee && depart ? nuitsEntre(arrivee, depart) : 0;
  const total = nuits > 0 ? nuits * prixNuit : 0;

  const chevauche = useMemo(
    () => nuits > 0 && sejours.some((s) => arrivee < s.date_depart && depart > s.date_arrivee),
    [arrivee, depart, nuits, sejours],
  );

  const trop = nuits > 0 && nuits < nuitsMin;
  const valide = nuits > 0 && !chevauche && !trop;

  return (
    <form action={actionDemanderReservation} className="space-y-4">
      <input type="hidden" name="bien_id" value={bienId} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiquette" htmlFor="date_arrivee">Arrivée</label>
          <input
            id="date_arrivee" name="date_arrivee" type="date" required
            min={aujourdhui} value={arrivee} className="champ"
            onChange={(e) => {
              setArrivee(e.target.value);
              // Un depart avant l'arrivee n'a pas de sens : on le repousse.
              if (depart && depart <= e.target.value) setDepart(jourSuivant(e.target.value));
            }}
          />
        </div>
        <div>
          <label className="etiquette" htmlFor="date_depart">Départ</label>
          <input
            id="date_depart" name="date_depart" type="date" required
            min={arrivee ? jourSuivant(arrivee) : aujourdhui}
            value={depart} className="champ"
            onChange={(e) => setDepart(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="voyageurs">Voyageurs</label>
        <select id="voyageurs" name="voyageurs" defaultValue={1} className="champ">
          {Array.from({ length: capacite }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} voyageur{n > 1 ? "s" : ""}</option>
          ))}
        </select>
      </div>

      {nuits > 0 && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          {chevauche ? (
            <p className="font-medium text-rose-700">
              Ces dates sont déjà réservées. Choisissez une autre période.
            </p>
          ) : trop ? (
            <p className="font-medium text-amber-700">
              Séjour minimum : {nuitsMin} nuit{nuitsMin > 1 ? "s" : ""}.
            </p>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>{fcfa(prixNuit)} × {nuits} nuit{nuits > 1 ? "s" : ""}</span>
                <span>{fcfa(total)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{fcfa(total)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="etiquette" htmlFor="nom">Votre nom <span className="text-rose-500">*</span></label>
          <input id="nom" name="nom" required placeholder="Awa Diop" className="champ" />
        </div>
        <div>
          <label className="etiquette" htmlFor="telephone">Téléphone <span className="text-rose-500">*</span></label>
          <input id="telephone" name="telephone" required placeholder="77 123 45 67" className="champ" />
        </div>
      </div>

      <div>
        <label className="etiquette" htmlFor="email">E-mail (facultatif)</label>
        <input id="email" name="email" type="email" placeholder="vous@exemple.com" className="champ" />
      </div>

      <div>
        <label className="etiquette" htmlFor="message">Message (facultatif)</label>
        <textarea id="message" name="message" rows={2}
                  placeholder="Heure d'arrivée prévue, questions…" className="champ" />
      </div>

      <button type="submit" disabled={!valide} className="btn-primaire w-full py-3">
        Demander à réserver
      </button>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        Vous ne payez rien maintenant. L&apos;agence vous rappelle pour confirmer
        les dates et convenir du règlement.
      </p>
    </form>
  );
}
