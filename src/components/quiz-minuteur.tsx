"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Compte a rebours du quiz, et envoi automatique a l'expiration.
 *
 * Ce minuteur est un CONFORT, pas une securite : il vit dans le navigateur,
 * donc n'importe qui peut le trafiquer. C'est le serveur qui refuse une copie
 * rendue en retard, en comparant a l'heure limite enregistree a l'ouverture.
 *
 * L'envoi automatique evite qu'un candidat perde tout son travail parce qu'il
 * n'a pas vu le temps passer.
 */
export function QuizMinuteur({ expireLe }: { expireLe: string }) {
  const limite = new Date(expireLe).getTime();
  const [restant, setRestant] = useState(() => Math.max(0, limite - Date.now()));
  const envoye = useRef(false);

  useEffect(() => {
    const battement = setInterval(() => {
      const reste = Math.max(0, limite - Date.now());
      setRestant(reste);

      if (reste === 0 && !envoye.current) {
        envoye.current = true;
        // requestSubmit, et non submit() : c'est le seul qui declenche
        // l'action React attachee au formulaire.
        (document.getElementById("copie-quiz") as HTMLFormElement | null)?.requestSubmit();
      }
    }, 250);
    return () => clearInterval(battement);
  }, [limite]);

  const secondes = Math.ceil(restant / 1000);
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  const urgent = secondes <= 60;

  return (
    <div
      role="timer"
      aria-live={urgent ? "assertive" : "off"}
      className={`sticky top-3 z-20 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm ${
        urgent
          ? "border-rose-300 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span className="text-sm font-medium">
        {secondes === 0 ? "Temps écoulé — envoi en cours…" : "Temps restant"}
      </span>
      <span className={`font-mono text-xl font-bold tabular-nums ${urgent ? "text-rose-700" : "text-slate-900"}`}>
        {String(minutes).padStart(2, "0")}:{String(reste).padStart(2, "0")}
      </span>
    </div>
  );
}
