import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { tous, un } from "@/lib/db";
import { resume, derniersJours } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { montant, nombre } from "@/lib/format";
import { EcranVide } from "@/components/ui";
import { Graphique } from "@/components/icones";

export const metadata = { title: "Statistiques" };

/**
 * Les statistiques.
 *
 * ============================================================================
 *  AUCUN CHIFFRE INVENTE
 * ============================================================================
 *  Tout vient de `commandes` et de `lignes_commande`. Une boutique sans
 *  commande n'affiche pas un graphique de demonstration : elle affiche un
 *  ecran vide qui dit pourquoi. Un faux graphique donnerait l'impression que
 *  l'outil marche, puis ferait douter de tous les chiffres le jour ou les
 *  vraies commandes arrivent.
 *
 *  « Encaisse » additionne `montant_encaisse`, jamais `total` : c'est la
 *  caisse, pas le chiffre d'affaires espere.
 * ============================================================================
 */
export default async function PageStatistiques() {
  const { boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);
  const devise = pays.devise_libelle;

  const chiffres = resume(boutique.id);
  const semaine = derniersJours(boutique.id);

  const total = un<{ n: number }>(
    "SELECT COUNT(*) n FROM commandes WHERE boutique_id = ? AND annulee_le IS NULL", boutique.id,
  )?.n ?? 0;

  if (total === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <h1 className="titre-page">Statistiques</h1>
        <EcranVide
          icone={<Graphique className="size-6" />}
          titre="Pas encore de chiffres"
          texte="Les statistiques apparaîtront dès votre première commande. Nous n'affichons
                 pas de données d'exemple : les chiffres de cette page sont toujours les vôtres."
          action={
            boutique.publiee_le
              ? <Link href="/tableau-de-bord" className="btn-secondaire">Retour à l&apos;accueil</Link>
              : <Link href="/tableau-de-bord/boutique" className="btn-principal">Publier ma boutique</Link>
          }
        />
      </div>
    );
  }

  const meilleurs = tous<{ nom: string; quantite: number; chiffre: number }>(
    `SELECT l.nom, SUM(l.quantite) quantite, SUM(l.total_ligne) chiffre
       FROM lignes_commande l
       JOIN commandes c ON c.id = l.commande_id AND c.boutique_id = l.boutique_id
      WHERE l.boutique_id = ? AND c.annulee_le IS NULL
      GROUP BY l.nom ORDER BY quantite DESC LIMIT 8`,
    boutique.id,
  );

  const parMois = tous<{ mois: string; commandes: number; encaisse: number }>(
    `SELECT substr(cree_le, 1, 7) mois, COUNT(*) commandes,
            COALESCE(SUM(montant_encaisse), 0) encaisse
       FROM commandes WHERE boutique_id = ? AND annulee_le IS NULL
      GROUP BY mois ORDER BY mois DESC LIMIT 6`,
    boutique.id,
  );

  const parZone = tous<{ zone: string; commandes: number }>(
    `SELECT COALESCE(zone_nom, CASE WHEN mode_livraison = 'retrait' THEN 'Retrait' ELSE 'Sans zone' END) zone,
            COUNT(*) commandes
       FROM commandes WHERE boutique_id = ? AND annulee_le IS NULL
      GROUP BY zone ORDER BY commandes DESC LIMIT 8`,
    boutique.id,
  );

  const panierMoyen = un<{ n: number }>(
    `SELECT COALESCE(AVG(total), 0) n FROM commandes
      WHERE boutique_id = ? AND annulee_le IS NULL`, boutique.id,
  )?.n ?? 0;

  const maxSemaine = Math.max(1, ...semaine.map((j) => j.commandes));
  const maxProduit = Math.max(1, ...meilleurs.map((m) => m.quantite));

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="titre-page">Statistiques</h1>
        <p className="mt-1 text-sm text-encre-600">
          Depuis l&apos;ouverture de votre boutique. Commandes annulées exclues.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile titre="Commandes" valeur={nombre(total)} />
        <Tuile titre="Encaissé" valeur={montant(chiffres.encaisse, devise)} ton="text-vert-700" />
        <Tuile titre="En attente de règlement" valeur={montant(chiffres.nonPaye, devise)}
          ton={chiffres.nonPaye > 0 ? "text-terre-600" : undefined} />
        <Tuile titre="Panier moyen" valeur={montant(panierMoyen, devise)} />
      </div>

      <section className="carte p-5">
        <h2 className="titre-section">Sept derniers jours</h2>
        <div className="mt-4 flex h-32 items-end gap-2" role="img"
          aria-label={`Commandes par jour : ${semaine.map((j) => `${j.jour} ${j.commandes}`).join(", ")}`}>
          {semaine.map((jour) => (
            <div key={jour.jour} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-medium text-encre-600">{jour.commandes || ""}</span>
              <div className={`w-full rounded-t ${jour.commandes > 0 ? "bg-vert-600" : "bg-encre-200"}`}
                style={{ height: `${Math.max(4, (jour.commandes / maxSemaine) * 90)}px` }} />
              <span className="text-[10px] text-encre-500">
                {new Date(`${jour.jour}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="carte p-5">
          <h2 className="titre-section">Produits les plus commandés</h2>
          <ul className="mt-4 space-y-2.5">
            {meilleurs.map((produit) => (
              <li key={produit.nom}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{produit.nom}</span>
                  <span className="shrink-0 font-medium">{produit.quantite}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-encre-100">
                  <div className="h-full rounded-full bg-vert-500"
                    style={{ width: `${(produit.quantite / maxProduit) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="carte p-5">
          <h2 className="titre-section">Par zone</h2>
          <ul className="mt-4 divide-y divide-encre-100 text-sm">
            {parZone.map((zone) => (
              <li key={zone.zone} className="flex justify-between gap-3 py-2">
                <span className="truncate">{zone.zone}</span>
                <span className="font-medium">{zone.commandes}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="carte p-5">
        <h2 className="titre-section">Par mois</h2>
        <ul className="mt-4 divide-y divide-encre-100 text-sm">
          {parMois.map((mois) => (
            <li key={mois.mois} className="flex flex-wrap justify-between gap-3 py-2.5">
              <span className="font-medium">
                {new Date(`${mois.mois}-01T12:00:00Z`).toLocaleDateString("fr-FR", {
                  month: "long", year: "numeric",
                })}
              </span>
              <span className="text-encre-600">
                {mois.commandes} commande{mois.commandes > 1 ? "s" : ""} ·{" "}
                <span className="font-medium text-vert-700">
                  {montant(mois.encaisse, devise)}
                </span> encaissés
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-encre-500">
        « Encaissé » n&apos;additionne que ce que vous avez marqué comme reçu, ou ce
        qu&apos;un prestataire de paiement a confirmé. Ce n&apos;est pas le total des
        commandes.
      </p>
    </div>
  );
}

function Tuile({ titre, valeur, ton = "text-encre-900" }: { titre: string; valeur: string; ton?: string }) {
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-encre-500">{titre}</p>
      <p className={`mt-1.5 text-xl font-bold ${ton}`}>{valeur}</p>
    </div>
  );
}
