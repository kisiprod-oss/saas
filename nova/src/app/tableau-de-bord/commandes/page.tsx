import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { commandes } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { montant, dateHeureFr } from "@/lib/format";
import { libelle, tonCommande, tonPaiement, STATUTS_COMMANDE, STATUTS_PAIEMENT } from "@/lib/statuts";
import { EcranVide } from "@/components/ui";
import { ExportCommandes } from "@/components/export-commandes";
import { Panier, Recherche, Fleche } from "@/components/icones";

export const metadata = { title: "Commandes" };

/**
 * La liste des commandes.
 *
 * Trois colonnes d'etat plutot qu'une : on voit d'un coup d'oeil ce qui est
 * a preparer, ce qui est parti, et ce qui reste a encaisser. Melanger les
 * trois dans un seul badge obligerait a ouvrir chaque commande pour savoir
 * si l'argent est rentre.
 */
export default async function PageCommandes({
  searchParams,
}: {
  searchParams: Promise<{
    statut?: string; paiement?: string; q?: string; depuis?: string; jusqua?: string;
  }>;
}) {
  const { boutique } = await exigerSession();
  const filtres = await searchParams;
  const pays = paysDe(boutique.pays);

  const liste = commandes(boutique.id, {
    statut: filtres.statut, paiement: filtres.paiement,
    recherche: filtres.q, depuis: filtres.depuis, jusqua: filtres.jusqua,
  });

  const totalEncaisse = liste.reduce((n, c) => n + c.montant_encaisse, 0);
  const totalDu = liste.reduce((n, c) => n + (c.annulee_le ? 0 : c.total - c.montant_encaisse), 0);
  const filtreActif = Boolean(filtres.statut || filtres.paiement || filtres.q || filtres.depuis || filtres.jusqua);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titre-page">Commandes</h1>
          <p className="mt-1 text-sm text-encre-600">
            {liste.length} commande{liste.length > 1 ? "s" : ""}
            {filtreActif ? " (filtrées)" : ""} · {montant(totalEncaisse, pays.devise_libelle)} encaissés
            {totalDu > 0 ? ` · ${montant(totalDu, pays.devise_libelle)} en attente` : ""}
          </p>
        </div>
        <ExportCommandes filtre={filtres} />
      </header>

      <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <div className="relative">
          <Recherche className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-encre-400" />
          <input name="q" defaultValue={filtres.q} className="champ pl-9"
            placeholder="Référence, nom ou téléphone" aria-label="Chercher une commande" />
        </div>
        <select name="statut" defaultValue={filtres.statut ?? ""} className="champ w-auto"
          aria-label="Filtrer par statut de commande">
          <option value="">Tous les statuts</option>
          {STATUTS_COMMANDE.map(([code, texte]) => (
            <option key={code} value={code}>{texte}</option>
          ))}
        </select>
        <select name="paiement" defaultValue={filtres.paiement ?? ""} className="champ w-auto"
          aria-label="Filtrer par paiement">
          <option value="">Tous les paiements</option>
          {STATUTS_PAIEMENT.map(([code, texte]) => (
            <option key={code} value={code}>{texte}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondaire">Filtrer</button>

        <details className="sm:col-span-4">
          <summary className="cursor-pointer text-sm text-encre-600">Filtrer par période</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="text-sm">
              <span className="etiquette">Du</span>
              <input type="date" name="depuis" defaultValue={filtres.depuis} className="champ w-auto" />
            </label>
            <label className="text-sm">
              <span className="etiquette">Au</span>
              <input type="date" name="jusqua" defaultValue={filtres.jusqua} className="champ w-auto" />
            </label>
          </div>
        </details>
      </form>

      {liste.length === 0 ? (
        <EcranVide
          icone={<Panier className="size-6" />}
          titre={filtreActif ? "Aucune commande ne correspond" : "Aucune commande pour l'instant"}
          texte={filtreActif
            ? "Essayez avec d'autres filtres."
            : boutique.publiee_le
              ? "Partagez l'adresse de votre boutique : c'est ce qui déclenche les premières commandes."
              : "Votre boutique n'est pas publiée : personne ne peut encore commander."}
          action={filtreActif
            ? <Link href="/tableau-de-bord/commandes" className="btn-secondaire">Tout afficher</Link>
            : !boutique.publiee_le
              ? <Link href="/tableau-de-bord/boutique" className="btn-principal">Publier ma boutique</Link>
              : null}
        />
      ) : (
        <ul className="space-y-2">
          {liste.map((commande) => {
            const reste = commande.total - commande.montant_encaisse;
            return (
              <li key={commande.id}>
                <Link href={`/tableau-de-bord/commandes/${commande.id}`}
                  className="carte flex flex-wrap items-center gap-3 p-4 transition-shadow hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-encre-900">
                        {commande.reference}
                      </span>
                      <span className={`puce ${tonCommande(commande.statut)}`}>
                        {libelle(STATUTS_COMMANDE, commande.statut)}
                      </span>
                      {commande.annulee_le ? null : (
                        <span className={`puce ${tonPaiement(commande.statut_paiement)}`}>
                          {commande.statut_paiement === "en_attente" && reste > 0
                            ? `${montant(reste, pays.devise_libelle)} à encaisser`
                            : libelle(STATUTS_PAIEMENT, commande.statut_paiement)}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-sm text-encre-700">
                      {commande.client_nom} · {commande.client_telephone}
                    </p>
                    <p className="mt-0.5 text-xs text-encre-500">
                      {dateHeureFr(commande.cree_le)}
                      {commande.mode_livraison === "retrait"
                        ? " · Retrait"
                        : ` · ${commande.zone_nom ?? "Livraison"}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-encre-900">
                      {montant(commande.total, pays.devise_libelle)}
                    </p>
                    {commande.montant_encaisse > 0 && reste > 0 ? (
                      <p className="text-xs text-terre-600">
                        {montant(commande.montant_encaisse, pays.devise_libelle)} reçus
                      </p>
                    ) : null}
                  </div>
                  <Fleche className="size-4 shrink-0 text-encre-300" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
