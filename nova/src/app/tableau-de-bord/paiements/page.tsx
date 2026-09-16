import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { tous } from "@/lib/db";
import { paysDe } from "@/lib/pays";
import { fournisseursPour, fournisseurPar, ETATS_LIBELLES } from "@/lib/paiements";
import { chiffrementPret, masquer } from "@/lib/chiffrement";
import { montant, dateHeureFr } from "@/lib/format";
import { GestionPaiement } from "@/components/gestion-paiement";
import { SimulateurPaiement } from "@/components/simulateur-paiement";

export const metadata = { title: "Paiements" };

/**
 * Le branchement du paiement en ligne.
 *
 * Trois choses y sont dites sans detour :
 *   — l'argent des clients va sur LE compte du commercant, pas sur le notre ;
 *   — l'etat reel de chaque integration (voir src/lib/paiements.ts) ;
 *   — le mode test n'encaisse rien, et la boutique ne l'affiche pas aux clients.
 */
export default async function PagePaiements() {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);
  const disponibles = fournisseursPour(boutique.pays);
  const actuel = fournisseurPar(boutique.paiement_fournisseur);

  const derniers = tous<{
    id: number; fournisseur: string; montant: number; statut: string;
    mode: string; cree_le: string; reference_externe: string | null;
  }>(
    `SELECT id, fournisseur, montant, statut, mode, cree_le, reference_externe
       FROM paiements WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT 15`,
    boutique.id,
  );

  const evenements = tous<{ identifiant: string; resultat: string; recu_le: string; fournisseur: string }>(
    `SELECT identifiant, resultat, recu_le, fournisseur FROM evenements_paiement
      WHERE boutique_id = ? ORDER BY recu_le DESC LIMIT 10`,
    boutique.id,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="titre-page">Paiements</h1>
        <p className="mt-1 text-sm text-encre-600">
          Le paiement à la réception fonctionne sans rien brancher. Le paiement
          en ligne demande votre compte marchand.
        </p>
      </header>

      <div className="message message-info">
        <div>
          <p className="font-semibold">L&apos;argent de vos ventes va chez vous</p>
          <p className="mt-0.5">
            Les paiements de vos clients arrivent directement sur votre compte
            marchand, avec vos propres clés. NOVA Boutique ne les touche pas.
            Votre abonnement à NOVA est facturé à part, dans{" "}
            <Link href="/tableau-de-bord/abonnement" className="underline">Abonnement</Link>.
          </p>
        </div>
      </div>

      {!chiffrementPret() ? (
        <div className="message message-alerte">
          Ce serveur n&apos;a pas de clé de chiffrement configurée
          (<code className="font-mono text-xs">NOVA_CLE_SECRETE</code>). Vos clés de
          paiement ne peuvent pas être stockées en sécurité : le mode réel est
          refusé tant que ce n&apos;est pas réglé.
        </div>
      ) : null}

      <GestionPaiement
        boutiqueId={boutique.id}
        pays={pays.nom}
        fournisseurs={disponibles.map((f) => ({
          code: f.code, nom: f.nom, etat: f.etat,
          etatTexte: ETATS_LIBELLES[f.etat].texte, etatTon: ETATS_LIBELLES[f.etat].ton,
          identifiants: f.identifiants, ou: f.ou, note: f.note,
        }))}
        actuel={{
          actif: boutique.paiement_en_ligne === 1,
          code: boutique.paiement_fournisseur,
          mode: boutique.paiement_mode,
          clePublique: boutique.paiement_cle_publique,
          clePriveeEnregistree: Boolean(boutique.paiement_cle_privee),
          secretEnregistre: Boolean(boutique.paiement_secret_webhook),
          masquePrivee: masquer(boutique.paiement_cle_privee),
        }}
        chiffrementPret={chiffrementPret()}
      />

      {boutique.paiement_en_ligne && actuel && actuel.code !== "test" ? (
        <section className="carte p-5">
          <h2 className="titre-section">Adresse de notification</h2>
          <p className="mt-1 text-sm text-encre-600">
            À coller dans le tableau de bord de {actuel.nom}, à l&apos;endroit prévu
            pour le webhook (ou IPN).
          </p>
          <p className="mt-3 break-all rounded-xl bg-ivoire px-3 py-2.5 font-mono text-xs text-encre-700">
            {(process.env.NOVA_URL_PUBLIQUE ?? "https://votre-domaine")}/api/paiements/{actuel.code}/{boutique.id}
          </p>
          <p className="mt-2 text-xs text-encre-500">
            Nous vérifions la signature <code className="font-mono">x-nova-signature</code>{" "}
            (HMAC-SHA256 du corps, avec votre secret) et ignorons tout événement déjà reçu.
          </p>
        </section>
      ) : null}

      {boutique.paiement_en_ligne && boutique.paiement_mode === "test" ? (
        <SimulateurPaiement boutiqueId={boutique.id} devise={pays.devise_libelle} />
      ) : null}

      {derniers.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Derniers mouvements</h2>
          <ul className="mt-3 divide-y divide-encre-100">
            {derniers.map((paiement) => (
              <li key={paiement.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="flex-1">
                  <span className="font-medium">
                    {paiement.fournisseur === "caisse" ? "Encaissement manuel" : paiement.fournisseur}
                  </span>
                  <span className="block text-xs text-encre-500">
                    {dateHeureFr(paiement.cree_le)}
                    {paiement.reference_externe ? ` · ${paiement.reference_externe.slice(0, 20)}` : ""}
                  </span>
                </span>
                <span className={`puce ${paiement.statut === "paye" ? "puce-vert" : paiement.statut === "echoue" ? "puce-rouge" : "puce-neutre"}`}>
                  {paiement.statut}
                </span>
                <span className="font-semibold">{montant(paiement.montant, pays.devise_libelle)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {evenements.length > 0 ? (
        <section className="carte p-5">
          <h2 className="titre-section">Notifications reçues</h2>
          <p className="mt-1 text-xs text-encre-500">
            Chaque événement n&apos;est traité qu&apos;une fois, même si le prestataire
            le renvoie.
          </p>
          <ul className="mt-3 divide-y divide-encre-100 text-xs">
            {evenements.map((evenement) => (
              <li key={evenement.identifiant} className="flex gap-3 py-2">
                <span className="flex-1 truncate font-mono text-encre-600">
                  {evenement.identifiant}
                </span>
                <span className="text-encre-500">{evenement.resultat}</span>
                <span className="text-encre-400">{dateHeureFr(evenement.recu_le)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
