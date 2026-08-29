import {
  actionEnvoyerCodeWhatsApp, actionEnvoyerDocumentEmail, actionRemiseMainPropre,
} from "@/lib/actions";
import { dateHeureFr } from "@/lib/format";
import { Carte } from "@/components/ui";
import type { Envoi } from "@/lib/envois";

/**
 * Remise d'une quittance a son locataire, cote agence.
 *
 * Les deux canaux ne portent pas la meme chose, et l'ordre compte : le
 * document part par e-mail, le code de reception par WhatsApp. C'est parce
 * qu'ils sont separes que l'accuse a une valeur — d'ou les libelles, qui
 * disent explicitement ce que chaque bouton envoie.
 */
export function RemiseDocument({
  factureId, envoi, emailLocataire, telephoneLocataire,
}: {
  factureId: number;
  envoi: Envoi | undefined;
  emailLocataire: string | null;
  telephoneLocataire: string | null;
}) {
  const champ = <input type="hidden" name="facture_id" value={factureId} />;

  return (
    <Carte className="p-5">
      <h2 className="font-semibold text-slate-900">Remettre au locataire</h2>

      {envoi?.accuse_le ? (
        <div className="mt-3 rounded-lg bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-900">Réception confirmée</p>
          <p className="mt-0.5 text-sm text-brand-800">
            Le {dateHeureFr(envoi.accuse_le)}
            {envoi.accuse_voie === "espace_locataire"
              ? ", depuis son espace locataire."
              : ", avec le code envoyé sur WhatsApp."}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          Envoyez le document par e-mail, puis le code par WhatsApp. Le locataire
          confirme la réception avec ce code.
        </p>
      )}

      <div className="mt-4 space-y-2">
        <form action={actionEnvoyerDocumentEmail}>
          {champ}
          <button type="submit" className="btn-secondaire w-full justify-start" disabled={!emailLocataire}>
            ✉️ Envoyer le document par e-mail
          </button>
        </form>
        {!emailLocataire && (
          <p className="text-xs text-amber-700">
            Ce locataire n&apos;a pas d&apos;adresse e-mail sur sa fiche.
          </p>
        )}
        {envoi?.envoye_email_le && (
          <p className="text-xs text-slate-500">
            Envoyé le {dateHeureFr(envoi.envoye_email_le)}
            {envoi.destinataire_email && ` à ${envoi.destinataire_email}`}.
          </p>
        )}

        <form action={actionEnvoyerCodeWhatsApp}>
          {champ}
          <button type="submit" className="btn-sable w-full justify-start" disabled={!telephoneLocataire}>
            💬 Envoyer le code sur WhatsApp
          </button>
        </form>
        {envoi?.envoye_whatsapp_le && (
          <p className="text-xs text-slate-500">
            Code transmis le {dateHeureFr(envoi.envoye_whatsapp_le)}.
          </p>
        )}

        <form action={actionRemiseMainPropre}>
          {champ}
          <button type="submit" className="btn-secondaire w-full justify-start">
            🤝 Noter une remise en main propre
          </button>
        </form>
        {envoi?.remis_main_propre_le && (
          <p className="text-xs text-slate-500">
            Remis en main propre le {dateHeureFr(envoi.remis_main_propre_le)}.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        L&apos;accusé établit qu&apos;à une date donnée, quelqu&apos;un détenant le code
        l&apos;a saisi. C&apos;est un commencement de preuve entre gens de bonne foi, pas
        une signature électronique : il n&apos;identifie pas formellement la personne.
      </p>
    </Carte>
  );
}
