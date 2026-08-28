import { avantImmatriculation, EDITEUR } from "@/lib/editeur";
import { Article, PageLegale } from "@/components/page-legale";

export const metadata = { title: "Mentions légales" };

export default function PageMentions() {
  return (
    <PageLegale titre="Mentions légales" miseAJour="août 2026">
      <Article titre="Éditeur du service">
        <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {[
            ["Service", EDITEUR.service],
            [avantImmatriculation() ? "Éditeur" : "Raison sociale", EDITEUR.raisonSociale],
            ["Forme juridique", EDITEUR.formeJuridique],
            ["Responsable de la publication", EDITEUR.responsable],
            ...(EDITEUR.ninea ? [["NINEA", EDITEUR.ninea] as const] : []),
            ...(EDITEUR.rccm ? [["RCCM", EDITEUR.rccm] as const] : []),
            [avantImmatriculation() ? "Adresse" : "Siège", `${EDITEUR.adresse}, ${EDITEUR.ville}, ${EDITEUR.pays}`],
            ["Téléphone", EDITEUR.telephone],
            ["Adresse e-mail", EDITEUR.email],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Article>

      {avantImmatriculation() && (
        <Article titre="Situation de l'éditeur">
          <p>
            Le service est actuellement édité par une personne physique, dont
            l&apos;immatriculation au registre du commerce est en cours.
            <strong> Aucune prestation n&apos;est facturée à ce jour :</strong> le
            service est mis à disposition gratuitement, le temps de cette phase.
          </p>
          <p>
            Les mentions d&apos;immatriculation (NINEA, RCCM) seront ajoutées ici dès
            leur obtention, avant toute facturation.
          </p>
        </Article>
      )}

      <Article titre="Hébergement">
        <p>Le service est hébergé par : {EDITEUR.hebergeur}.</p>
      </Article>

      <Article titre="Propriété intellectuelle">
        <p>
          Le logiciel {EDITEUR.service}, son code, sa charte graphique et ses contenus
          sont la propriété de {EDITEUR.raisonSociale}. Toute reproduction ou
          réutilisation sans autorisation écrite est interdite.
        </p>
        <p>
          Les données saisies par les agences et les propriétaires — biens, locataires,
          baux, factures, photos — leur appartiennent. {EDITEUR.service} n&apos;en acquiert
          aucun droit de propriété et ne les exploite à aucune autre fin que la
          fourniture du service.
        </p>
      </Article>

      <Article titre="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la
          politique de confidentialité, et déclaré auprès de la Commission de
          protection des données personnelles (CDP) du Sénégal :
          {" "}{EDITEUR.declarationCdp}.
        </p>
      </Article>

      <Article titre="Nous contacter">
        <p>
          Pour toute question relative au service : {EDITEUR.email} — {EDITEUR.telephone}.
        </p>
      </Article>
    </PageLegale>
  );
}
