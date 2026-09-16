import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { commande as lireCommande, lignesDe } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { montant, dateHeureFr } from "@/lib/format";
import { libelle, tonCommande, tonPaiement, STATUTS_COMMANDE, STATUTS_LIVRAISON, STATUTS_PAIEMENT } from "@/lib/statuts";
import { FlecheGauche, Telephone, Whatsapp } from "@/components/icones";
import { GestionCommande } from "@/components/gestion-commande";
import { actionStatutCommande, actionStatutLivraison } from "@/lib/actions-commandes";

export const metadata = { title: "Commande" };

export default async function PageCommande({ params }: { params: Promise<{ id: string }> }) {
  const { boutique } = await exigerSession();
  const { id } = await params;

  const commande = lireCommande(boutique.id, Number(id));
  if (!commande) notFound();

  const lignes = lignesDe(boutique.id, commande.id);
  const pays = paysDe(boutique.pays);
  const devise = pays.devise_libelle;
  const reste = commande.total - commande.montant_encaisse;
  const chiffres = commande.client_telephone.replace(/\D/g, "");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/tableau-de-bord/commandes"
        className="inline-flex items-center gap-1.5 text-sm text-encre-600 hover:text-vert-700">
        <FlecheGauche className="size-4" /> Commandes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-encre-900">{commande.reference}</h1>
          <p className="mt-1 text-sm text-encre-600">
            Reçue le {dateHeureFr(commande.cree_le)}
            {commande.annulee_le ? ` · annulée le ${dateHeureFr(commande.annulee_le)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`puce ${tonCommande(commande.statut)}`}>
            {libelle(STATUTS_COMMANDE, commande.statut)}
          </span>
          <span className={`puce ${tonPaiement(commande.statut_paiement)}`}>
            {libelle(STATUTS_PAIEMENT, commande.statut_paiement)}
          </span>
        </div>
      </header>

      {/* --------------------------- Le client --------------------------- */}
      <section className="carte p-5">
        <h2 className="titre-section">Le client</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Ligne titre="Nom" valeur={commande.client_nom} />
          <Ligne titre="Téléphone" valeur={commande.client_telephone} />
          <Ligne titre="Réception"
            valeur={commande.mode_livraison === "retrait"
              ? "Retrait en boutique"
              : `Livraison${commande.zone_nom ? ` · ${commande.zone_nom}` : ""}`} />
          {commande.client_ville ? <Ligne titre="Ville" valeur={commande.client_ville} /> : null}
          {commande.client_quartier ? <Ligne titre="Quartier" valeur={commande.client_quartier} /> : null}
          {commande.client_repere ? <Ligne titre="Repère" valeur={commande.client_repere} /> : null}
          {commande.client_adresse ? <Ligne titre="Adresse" valeur={commande.client_adresse} /> : null}
          {commande.note_client ? <Ligne titre="Message" valeur={commande.note_client} /> : null}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`tel:${commande.client_telephone}`} className="btn-secondaire btn-petit">
            <Telephone className="size-4" /> Appeler
          </a>
          {chiffres.length >= 8 ? (
            <a href={`https://wa.me/${chiffres}`} target="_blank" rel="noopener"
              className="btn-secondaire btn-petit">
              <Whatsapp className="size-4" /> WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      {/* --------------------------- Le détail --------------------------- */}
      <section className="carte p-5">
        <h2 className="titre-section">Les articles</h2>
        <ul className="mt-3 divide-y divide-encre-100">
          {lignes.map((ligne) => (
            <li key={ligne.id} className="flex gap-3 py-2.5 text-sm">
              <span className="flex-1">
                {ligne.quantite} × {ligne.nom}
                {ligne.variante_texte ? (
                  <span className="block text-xs text-encre-500">{ligne.variante_texte}</span>
                ) : null}
                <span className="block text-xs text-encre-500">
                  {montant(ligne.prix_unitaire, devise)} l&apos;unité
                </span>
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
            <dt className="text-encre-600">Livraison</dt>
            <dd>{commande.frais_livraison === 0 ? "Offert" : montant(commande.frais_livraison, devise)}</dd>
          </div>
          <div className="flex justify-between border-t border-encre-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{montant(commande.total, devise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-encre-600">Encaissé</dt>
            <dd className={commande.montant_encaisse > 0 ? "font-medium text-vert-700" : ""}>
              {montant(commande.montant_encaisse, devise)}
            </dd>
          </div>
          {reste > 0 && !commande.annulee_le ? (
            <div className="flex justify-between">
              <dt className="text-encre-600">Reste dû</dt>
              <dd className="font-medium text-terre-600">{montant(reste, devise)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* ------------------------- Faire avancer ------------------------- */}
      {!commande.annulee_le ? (
        <>
          <section className="carte p-5">
            <h2 className="titre-section">Où en est la commande</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <form action={actionStatutCommande}>
                <input type="hidden" name="id" value={commande.id} />
                <label className="etiquette" htmlFor="statut">Traitement</label>
                <div className="flex gap-2">
                  <select id="statut" name="statut" className="champ" defaultValue={commande.statut}>
                    {STATUTS_COMMANDE.filter(([c]) => c !== "annulee").map(([code, texte]) => (
                      <option key={code} value={code}>{texte}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondaire">Changer</button>
                </div>
              </form>

              <form action={actionStatutLivraison}>
                <input type="hidden" name="id" value={commande.id} />
                <label className="etiquette" htmlFor="livraison">Livraison</label>
                <div className="flex gap-2">
                  <select id="livraison" name="statut" className="champ" defaultValue={commande.statut_livraison}>
                    {STATUTS_LIVRAISON.filter(([c]) => c !== "annulee").map(([code, texte]) => (
                      <option key={code} value={code}>{texte}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondaire">Changer</button>
                </div>
              </form>
            </div>
            <p className="mt-3 text-xs text-encre-500">
              Changer ces statuts ne touche pas au paiement : l&apos;encaissement se
              déclare séparément, ci-dessous.
            </p>
          </section>

          <GestionCommande
            commandeId={commande.id}
            total={commande.total}
            encaisse={commande.montant_encaisse}
            devise={devise}
          />
        </>
      ) : (
        <div className="message message-alerte">
          Cette commande est annulée. Le stock a été remis en rayon.
        </div>
      )}
    </div>
  );
}

function Ligne({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="flex flex-wrap gap-x-4">
      <dt className="w-24 shrink-0 text-encre-500">{titre}</dt>
      <dd className="flex-1 text-encre-900">{valeur}</dd>
    </div>
  );
}
