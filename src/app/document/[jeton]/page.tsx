import { notFound } from "next/navigation";
import { un } from "@/lib/db";
import { envoiParJeton } from "@/lib/envois";
import { lireFacture, listerPaiementsFacture, lireContrat } from "@/lib/requetes";
import { adresseDuSite } from "@/lib/email";
import { codeVerification, lienVerification, qrSvg } from "@/lib/verification";
import { dateHeureFr } from "@/lib/format";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { BoutonImprimer } from "@/components/bouton-imprimer";
import { DocumentQuittance } from "@/components/document-quittance";
import { FormulaireAccuse } from "@/components/formulaire-accuse";
import type { Agence } from "@/lib/auth";

export const metadata = { title: "Votre document" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

/**
 * La page que le locataire ouvre depuis le lien recu par e-mail.
 *
 * Elle n'exige pas de compte : beaucoup de locataires n'en ont pas, et leur
 * demander d'en creer un pour lire leur propre quittance serait absurde.
 * L'adresse porte un jeton long tire au hasard — c'est lui qui fait office
 * de cle.
 */
export default async function PageDocumentPartage({
  params, searchParams,
}: { params: Promise<{ jeton: string }>; searchParams: Promise<Params> }) {
  const { jeton } = await params;
  const requete = await searchParams;
  const envoi = envoiParJeton(jeton);
  if (!envoi) notFound();

  const agence = un<Agence>("SELECT * FROM agences WHERE id = ?", envoi.agence_id);
  const facture = agence ? lireFacture(agence.id, envoi.document_id) : undefined;
  if (!agence || !facture) notFound();

  const contrat = lireContrat(agence.id, facture.contrat_id);
  const paiements = listerPaiementsFacture(facture.id);
  const code = codeVerification("quittance", facture.id);
  const lien = lienVerification(await adresseDuSite(), code);
  const verification = { code, lien, qr: await qrSvg(lien) };

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="sans-impression mx-auto mb-6 max-w-[210mm] space-y-4 px-4">
        <MessagesUrl params={requete} />

        {envoi.accuse_le ? (
          <Alerte type="succes">
            <strong>Réception confirmée</strong> le {dateHeureFr(envoi.accuse_le)}.
            {envoi.accuse_voie === "espace_locataire"
              ? " Vous l'avez confirmée depuis votre espace locataire."
              : " Elle a été confirmée avec le code reçu sur WhatsApp."}
          </Alerte>
        ) : (
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Confirmez que vous avez bien reçu ce document</h2>
            <p className="mt-1 text-sm text-slate-600">
              {agence.nom} vous a envoyé un code sur WhatsApp. Saisissez-le ci-dessous :
              votre agence saura que le document vous est parvenu, et vous n&apos;aurez
              pas à le prouver plus tard.
            </p>
            <FormulaireAccuse jeton={envoi.jeton} />
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Ce code arrive par WhatsApp et le document par e-mail : il faut avoir reçu
              les deux pour confirmer. Ne le communiquez à personne.
            </p>
          </Carte>
        )}

        <div className="flex justify-end">
          <BoutonImprimer />
        </div>
      </div>

      <DocumentQuittance
        agence={agence} facture={facture} contrat={contrat}
        paiements={paiements} verification={verification}
      />
    </div>
  );
}
