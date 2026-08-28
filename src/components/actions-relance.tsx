"use client";

import { useRef, useState } from "react";
import { actionEnregistrerRelance } from "@/lib/actions";

/**
 * Message de relance modifiable + envoi en un clic.
 *
 * Le clic sur « WhatsApp » ouvre la conversation avec le message deja ecrit,
 * ET enregistre la relance dans l'historique : l'agent n'a rien a cocher.
 */
export function ActionsRelance({
  factureId, niveau, telephone, messageInitial,
}: {
  factureId: number;
  niveau: string;
  telephone: string;
  messageInitial: string;
}) {
  const [message, setMessage] = useState(messageInitial);
  const formulaire = useRef<HTMLFormElement>(null);
  const champCanal = useRef<HTMLInputElement>(null);

  const texte = encodeURIComponent(message);
  const lienWhatsApp = `https://wa.me/${telephone}?text=${texte}`;
  const lienSms = `sms:+${telephone}?body=${texte}`;

  /** Note la relance dans l'historique. */
  function noter(canal: string) {
    if (champCanal.current) champCanal.current.value = canal;
    formulaire.current?.requestSubmit();
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {/* <details> plutot qu'un bouton React : le depliage fonctionne des
          l'affichage de la page, sans attendre le chargement du JavaScript. */}
      <details className="mb-3">
        <summary className="cursor-pointer list-none text-sm font-medium text-slate-500 hover:text-brand-700">
          Voir et modifier le message
        </summary>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={12}
          className="champ mt-2 font-mono text-xs leading-relaxed"
          aria-label="Message de relance"
        />
      </details>

      <form ref={formulaire} action={actionEnregistrerRelance}>
        <input type="hidden" name="facture_id" value={factureId} />
        <input type="hidden" name="niveau" value={niveau} />
        <input type="hidden" name="canal" ref={champCanal} defaultValue="whatsapp" />
        <input type="hidden" name="message" value={message} />
      </form>

      <div className="flex flex-wrap gap-2">
        <a
          href={lienWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => noter("whatsapp")}
          className="btn-sable px-3 py-2 text-xs"
        >
          Envoyer sur WhatsApp
        </a>
        <a
          href={lienSms}
          onClick={() => noter("sms")}
          className="btn-secondaire px-3 py-2 text-xs"
        >
          Par SMS
        </a>
        <a href={`tel:+${telephone}`} className="btn-secondaire px-3 py-2 text-xs">
          Appeler
        </a>
        <button
          type="button"
          onClick={() => noter("appel")}
          className="btn-secondaire px-3 py-2 text-xs"
        >
          Noter comme relancé
        </button>
      </div>
    </div>
  );
}
