import { notFound } from "next/navigation";
import Link from "next/link";
import { chargerBoutique, messageWhatsapp, lienWhatsapp } from "@/lib/boutique-publique";
import { un, tous } from "@/lib/db";
import { montant, dateHeureFr } from "@/lib/format";
import { apparenceDe } from "@/lib/modeles";
import { libelle, STATUTS_COMMANDE, STATUTS_LIVRAISON, STATUTS_PAIEMENT } from "@/lib/commandes";
import { Coche, Whatsapp, Telephone } from "@/components/icones";
import { BoutonCopier } from "@/components/ui";
import type { Commande, LigneCommande } from "@/lib/requetes";

export const metadata = { title: "Commande confirmée" };

/**
 * La page de confirmation, aussi utilisee comme page de suivi.
 *
 * Elle exige le JETON passe en parametre (`?j=`). La reference seule ne
 * suffit pas : elle fait cinq caracteres et se devine. Le jeton fait
 * 32 caracteres hexadecimaux, tire au hasard a la creation.
 *
 * Ce qu'elle n'affiche jamais : « paye ». Une commande a la livraison est
 * « a regler a la reception » tant que le commercant n'a pas encaisse.
 */
export default async function PageConfirmation({
  params, searchParams,
}: {
  params: Promise<{ slug: string; reference: string }>;
  searchParams: Promise<{ j?: string }>;
}) {
  const { slug, reference } = await params;
  const { j } = await searchParams;

  const chargee = await chargerBoutique(slug);
  if (!chargee) notFound();
  const { boutique } = chargee;

  const commande = un<Commande>(
    "SELECT * FROM commandes WHERE boutique_id = ? AND reference = ? AND jeton_suivi = ?",
    boutique.id, reference.toUpperCase(), j ?? "",
  );
  if (!commande) notFound();

  const lignes = tous<LigneCommande>(
    "SELECT * FROM lignes_commande WHERE boutique_id = ? AND commande_id = ? ORDER BY id",
    boutique.id, commande.id,
  );
  const apparence = apparenceDe(boutique.modele);
  const devise = commande.devise === "XOF" || commande.devise === "XAF" ? "FCFA" : commande.devise;

  const lien = lienWhatsapp(boutique.whatsapp, messageWhatsapp({
    nomBoutique: boutique.nom,
    reference: commande.reference,
    lignes: lignes.map((l) => ({ nom: l.nom, quantite: l.quantite, variante: l.variante_texte })),
    total: montant(commande.total, devise),
    adresse: commande.mode_livraison === "livraison"
      ? [commande.client_quartier, commande.client_ville, commande.client_repere]
          .filter(Boolean).join(", ")
      : "Retrait en boutique",
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex size-14 items-center justify-center rounded-full bg-vert-100 text-vert-700">
        <Coche className="size-7" />
      </div>

      <h1 className={`mt-5 ${apparence.titre}`}>Commande reçue</h1>
      <p className="mt-2 text-encre-600">
        {boutique.nom} a bien reçu votre commande et va vous appeler au{" "}
        {commande.client_telephone} pour la confirmer.
      </p>

      <div className={`mt-6 border border-encre-200 bg-white p-5 ${apparence.arrondi}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-encre-500">Votre référence</p>
            <p className="font-mono text-xl font-bold">{commande.reference}</p>
          </div>
          <BoutonCopier valeur={commande.reference} libelle="Copier la référence" />
        </div>
        <p className="mt-3 text-xs text-encre-500">
          Notez-la : elle sert à suivre votre commande et à en parler à la boutique.
          Passée le {dateHeureFr(commande.cree_le)}.
        </p>
      </div>

      {/* Trois etats separes, jamais melanges. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Etat titre="Commande" valeur={libelle(STATUTS_COMMANDE, commande.statut)} />
        <Etat titre="Livraison" valeur={libelle(STATUTS_LIVRAISON, commande.statut_livraison)} />
        <Etat
          titre="Paiement"
          valeur={
            commande.statut_paiement === "en_attente" && commande.moyen_paiement === "livraison"
              ? "À régler à la réception"
              : libelle(STATUTS_PAIEMENT, commande.statut_paiement)
          }
          ton={commande.statut_paiement === "paye" ? "text-vert-700" : undefined}
        />
      </div>

      <div className={`mt-5 border border-encre-200 bg-white p-5 ${apparence.arrondi}`}>
        <h2 className="font-semibold">Le détail</h2>
        <ul className="mt-3 divide-y divide-encre-100">
          {lignes.map((ligne) => (
            <li key={ligne.id} className="flex gap-3 py-2.5 text-sm">
              <span className="flex-1">
                {ligne.quantite} × {ligne.nom}
                {ligne.variante_texte ? (
                  <span className="block text-xs text-encre-500">{ligne.variante_texte}</span>
                ) : null}
              </span>
              <span className="font-medium">{montant(ligne.total_ligne, devise)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-encre-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-encre-600">Sous-total</dt>
            <dd>{montant(commande.sous_total, devise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-encre-600">
              {commande.mode_livraison === "retrait"
                ? "Retrait en boutique"
                : `Livraison${commande.zone_nom ? ` · ${commande.zone_nom}` : ""}`}
            </dt>
            <dd>{commande.frais_livraison === 0 ? "Offert" : montant(commande.frais_livraison, devise)}</dd>
          </div>
          <div className="flex justify-between border-t border-encre-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{montant(commande.total, devise)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-encre-200 pt-3 text-sm text-encre-600">
          <p className="font-medium text-encre-900">
            {commande.mode_livraison === "retrait" ? "Retrait" : "Livraison"}
          </p>
          {commande.mode_livraison === "retrait" ? (
            <p>{boutique.retrait_adresse ?? boutique.adresse ?? boutique.ville}</p>
          ) : (
            <p>
              {[commande.client_quartier, commande.client_ville].filter(Boolean).join(", ")}
              {commande.client_repere ? <><br />{commande.client_repere}</> : null}
              {commande.client_adresse ? <><br />{commande.client_adresse}</> : null}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {lien ? (
          <a href={lien} target="_blank" rel="noopener" className="btn-principal">
            <Whatsapp className="size-4" /> Écrire à la boutique
          </a>
        ) : null}
        {boutique.telephone ? (
          <a href={`tel:${boutique.telephone}`} className="btn-secondaire">
            <Telephone className="size-4" /> Appeler
          </a>
        ) : null}
        <Link href={`/b/${slug}/catalogue`} className="btn-secondaire">Continuer mes achats</Link>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-encre-500">
        Gardez cette page en favori pour suivre votre commande, ou retrouvez-la depuis{" "}
        <Link href={`/b/${slug}/suivi`} className="underline">la page de suivi</Link> avec
        votre référence et votre numéro de téléphone.
      </p>
    </div>
  );
}

function Etat({ titre, valeur, ton }: { titre: string; valeur: string; ton?: string }) {
  return (
    <div className="rounded-xl border border-encre-200 bg-white p-3.5">
      <p className="text-xs uppercase tracking-wide text-encre-500">{titre}</p>
      <p className={`mt-1 font-semibold ${ton ?? "text-encre-900"}`}>{valeur}</p>
    </div>
  );
}
