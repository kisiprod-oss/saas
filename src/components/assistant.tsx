"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bulle d'assistance : une fenetre de discussion posee en bas a droite.
 *
 * La reponse arrive au fil de l'eau, mot par mot, pour ne pas laisser
 * l'utilisateur devant un ecran fige pendant plusieurs secondes.
 */

type Message = { role: "user" | "assistant"; content: string };

const MAX_CARACTERES = 1000;

const SUGGESTIONS = [
  "Que fait Sen Gestion ?",
  "Combien ça coûte ?",
  "Comment relancer un locataire en retard ?",
  "Le locataire peut-il payer en ligne ?",
];

const ACCUEIL =
  "Bonjour 👋 Je suis l'assistant de Sen Gestion. Posez-moi vos questions sur"
  + " le logiciel, les formules ou la gestion de vos loyers.";

export function Assistant() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const filRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);

  // Garde la derniere ligne visible pendant que la reponse s'ecrit.
  useEffect(() => {
    filRef.current?.scrollTo({ top: filRef.current.scrollHeight });
  }, [messages, ouvert]);

  useEffect(() => {
    if (ouvert) champRef.current?.focus();
  }, [ouvert]);

  // La touche Echap referme la fenetre, comme partout ailleurs.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert]);

  async function envoyer(texte: string) {
    const question = texte.trim();
    if (!question || enCours) return;

    const suite: Message[] = [...messages, { role: "user", content: question }];
    setMessages(suite);
    setSaisie("");
    setEnCours(true);

    try {
      const reponse = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: suite }),
      });

      if (!reponse.ok || !reponse.body) {
        const message = (await reponse.text())
          || "L'assistant est momentanément indisponible. Réessayez plus tard.";
        setMessages([...suite, { role: "assistant", content: message }]);
        return;
      }

      // On ajoute une reponse vide, puis on la complete a chaque morceau recu.
      setMessages([...suite, { role: "assistant", content: "" }]);
      const lecteur = reponse.body.getReader();
      const decodeur = new TextDecoder();
      let accumule = "";

      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        accumule += decodeur.decode(value, { stream: true });
        setMessages([...suite, { role: "assistant", content: accumule }]);
      }
    } catch {
      setMessages([...suite, {
        role: "assistant",
        content: "La connexion a été interrompue. Vérifiez votre réseau et réessayez.",
      }]);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="sans-impression">
      {ouvert && (
        <div
          role="dialog"
          aria-label="Assistant Sen Gestion"
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl
                     border border-slate-200 bg-white shadow-2xl
                     sm:inset-x-auto sm:right-5 sm:bottom-24 sm:h-[560px] sm:w-96"
        >
          <div className="flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold">Assistant Sen Gestion</p>
              <p className="text-xs text-brand-100">Réponses immédiates, 24 h/24</p>
            </div>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              aria-label="Fermer l'assistant"
              className="cursor-pointer rounded-lg p-1.5 text-brand-100 transition hover:bg-brand-600 hover:text-white"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          <div ref={filRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            <Bulle role="assistant">{ACCUEIL}</Bulle>

            {messages.map((m, i) => (
              <Bulle key={i} role={m.role}>
                {m.content || (enCours && i === messages.length - 1 ? <Points /> : null)}
              </Bulle>
            ))}

            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => envoyer(s)}
                    className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2
                               text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}
            className="border-t border-slate-200 bg-white p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={champRef}
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => {
                  // Entree envoie, Maj+Entree passe a la ligne.
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(saisie); }
                }}
                rows={1}
                maxLength={MAX_CARACTERES}
                placeholder="Écrivez votre question…"
                aria-label="Votre question"
                className="champ max-h-28 min-h-[44px] resize-none py-2.5"
              />
              <button
                type="submit"
                disabled={enCours || !saisie.trim()}
                aria-label="Envoyer"
                className="btn-primaire h-11 w-11 shrink-0 !px-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M3.4 2.6a.75.75 0 0 0-1.02.93l1.9 5.22a.75.75 0 0 0 .62.49l7.3.9c.3.04.3.48 0 .52l-7.3.9a.75.75 0 0 0-.62.49l-1.9 5.22a.75.75 0 0 0 1.02.93l14-7a.75.75 0 0 0 0-1.34l-14-7Z" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-tight text-slate-400">
              Assistant automatique. Ne communiquez jamais de mot de passe ni de code de paiement.
            </p>
          </form>
        </div>
      )}

      {/* Le lisere blanc detache la bulle des pages a fond vert, ou sa couleur
          se confondrait avec l'arriere-plan. */}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-label={ouvert ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        className={`fixed right-5 bottom-5 z-40 h-14 w-14 cursor-pointer items-center justify-center
                    rounded-full bg-brand-600 text-white shadow-lg ring-2 ring-white/80 transition
                    hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-white
                    ${ouvert ? "hidden sm:flex" : "flex"}`}
      >
        {ouvert ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden="true">
            <path d="M12 3c-4.97 0-9 3.36-9 7.5 0 2.3 1.25 4.36 3.2 5.73-.13 1.2-.6 2.3-1.4 3.2a.5.5 0 0 0 .45.83c1.9-.3 3.4-1.05 4.5-1.9.72.15 1.48.24 2.25.24 4.97 0 9-3.36 9-7.6S16.97 3 12 3Z" />
          </svg>
        )}
      </button>

    </div>
  );
}

function Bulle({ role, children }: { role: Message["role"]; children: React.ReactNode }) {
  if (children === null) return null;
  const mien = role === "user";
  return (
    <div className={mien ? "flex justify-end" : "flex justify-start"}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          mien
            ? "rounded-br-sm bg-brand-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** Trois points animes pendant que la reponse se prepare. */
function Points() {
  return (
    <span className="flex gap-1 py-1" aria-label="L'assistant écrit">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </span>
  );
}
