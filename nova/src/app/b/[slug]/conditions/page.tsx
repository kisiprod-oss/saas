import { notFound } from "next/navigation";
import { chargerBoutique } from "@/lib/boutique-publique";
import { zones } from "@/lib/requetes";
import { apparenceDe } from "@/lib/modeles";
import { montant } from "@/lib/format";
import { Alerte } from "@/components/icones";

export const metadata = { title: "Informations et conditions" };

/**
 * Les conditions de la boutique.
 *
 * Elles sont REDIGEES PAR LE COMMERCANT, et la page le dit. NOVA Boutique ne
 * fabrique pas de conditions generales a sa place : ce serait un engagement
 * juridique pris au nom de quelqu'un d'autre, sur des delais et des retours
 * que nous ne connaissons pas.
 *
 * Tant qu'il ne les a pas validees, un bandeau l'indique franchement au
 * visiteur plutot que d'afficher une page vide.
 */
export default async function PageConditions({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();

  const { boutique, contexte } = chargee;
  const apparence = apparenceDe(boutique.modele);
  const zonesActives = zones(boutique.id, true);
  const validees = Boolean(boutique.conditions_validees_le);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className={apparence.titre}>Informations et conditions</h1>

      {!validees ? (
        <div className="message message-alerte mt-5">
          <Alerte className="mt-0.5 size-4.5 shrink-0" />
          <div>
            Cette boutique n&apos;a pas encore publié ses conditions de vente.
            Demandez-lui directement avant de commander si un point vous importe.
          </div>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-semibold">Qui vend</h2>
        <address className="mt-2 space-y-0.5 text-sm not-italic text-encre-700">
          <p className="font-medium text-encre-900">{boutique.nom}</p>
          {boutique.adresse ? <p>{boutique.adresse}</p> : null}
          {boutique.ville ? <p>{boutique.ville}</p> : null}
          {boutique.telephone ? <p>Téléphone : {boutique.telephone}</p> : null}
          {boutique.email ? <p>Courriel : {boutique.email}</p> : null}
        </address>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Livraison et retrait</h2>
        <div className="mt-2 space-y-2 text-sm text-encre-700">
          {boutique.retrait_actif ? (
            <p>
              <strong>Retrait sur place :</strong>{" "}
              {boutique.retrait_adresse ?? boutique.adresse ?? "à l'adresse ci-dessus"}
              {boutique.retrait_horaires ? ` — ${boutique.retrait_horaires}` : ""}
            </p>
          ) : null}
          {boutique.livraison_active && zonesActives.length > 0 ? (
            <div>
              <p><strong>Zones livrées :</strong></p>
              <ul className="mt-1.5 divide-y divide-encre-100 border-y border-encre-100">
                {zonesActives.map((zone) => (
                  <li key={zone.id} className="flex justify-between gap-4 py-2">
                    <span>{zone.nom}{zone.delai ? ` · ${zone.delai}` : ""}</span>
                    <span className="font-medium">
                      {zone.frais === 0 ? "Offert" : montant(zone.frais, contexte.devise, contexte.decimales)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!boutique.retrait_actif && (!boutique.livraison_active || zonesActives.length === 0) ? (
            <p>Aucun mode de réception n&apos;est configuré pour l&apos;instant.</p>
          ) : null}
        </div>
        {boutique.conditions_livraison ? (
          <Texte contenu={boutique.conditions_livraison} />
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Paiement</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-encre-700">
          {boutique.paiement_livraison ? (
            <li>Paiement à la livraison ou au retrait, en espèces.</li>
          ) : null}
          {boutique.paiement_en_ligne && boutique.paiement_mode === "reel" ? (
            <li>Paiement en ligne avant expédition.</li>
          ) : null}
          {!boutique.paiement_livraison && !(boutique.paiement_en_ligne && boutique.paiement_mode === "reel") ? (
            <li>Contactez la boutique pour connaître les moyens de paiement acceptés.</li>
          ) : null}
        </ul>
      </section>

      {boutique.conditions_vente ? (
        <section className="mt-8">
          <h2 className="font-semibold">Conditions de vente</h2>
          <Texte contenu={boutique.conditions_vente} />
        </section>
      ) : null}

      {boutique.conditions_retour ? (
        <section className="mt-8">
          <h2 className="font-semibold">Retours et échanges</h2>
          <Texte contenu={boutique.conditions_retour} />
        </section>
      ) : null}

      <p className="mt-10 border-t border-encre-200 pt-5 text-xs leading-relaxed text-encre-500">
        Ces informations sont fournies et tenues à jour par {boutique.nom}. NOVA Boutique
        fournit l&apos;outil qui héberge cette boutique et n&apos;est pas partie au contrat
        de vente.
        {validees ? ` Conditions validées par le commerçant le ${boutique.conditions_validees_le?.slice(0, 10).split("-").reverse().join("/")}.` : ""}
      </p>
    </div>
  );
}

function Texte({ contenu }: { contenu: string }) {
  return (
    <div className="mt-2.5 space-y-2.5 text-sm leading-relaxed text-encre-700">
      {contenu.split(/\n{2,}/).filter(Boolean).map((bloc, i) => <p key={i}>{bloc}</p>)}
    </div>
  );
}
