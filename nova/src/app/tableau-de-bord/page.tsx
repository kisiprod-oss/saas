import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { resume, alertesStock, commandes, derniersJours, nombreProduits } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { offreEnVigueur, quotaIa } from "@/lib/offres";
import { montant, depuis, pluriel } from "@/lib/format";
import { libelle, STATUTS_COMMANDE } from "@/lib/commandes";
import { EcranVide } from "@/components/ui";
import { Partage } from "@/components/partage";
import { Panier, Boite, Plus, Crayon, Alerte, Fleche, Whatsapp } from "@/components/icones";

/**
 * L'accueil du commercant.
 *
 * Les quatre chiffres du haut ne sont pas decoratifs : ils repondent aux
 * quatre questions qu'on se pose en ouvrant son telephone le matin.
 * « Qu'est-ce que je dois traiter ? », « Combien est reellement rentre ? »,
 * « Qui me doit de l'argent ? », « Qu'est-ce qui va manquer ? ».
 *
 * AUCUNE donnee de demonstration ici. Une boutique neuve affiche des zeros et
 * des ecrans vides qui disent quoi faire — c'est plus honnete, et plus utile,
 * qu'un graphique invente.
 */
export default async function AccueilMarchand() {
  const { utilisateur, boutique } = await exigerSession();
  const pays = paysDe(boutique.pays);
  const devise = pays.devise_libelle;

  const chiffres = resume(boutique.id);
  const alertes = alertesStock(boutique.id);
  const dernieres = commandes(boutique.id, { limite: 6 });
  const semaine = derniersJours(boutique.id);
  const produits = nombreProduits(boutique.id);
  const offre = offreEnVigueur(boutique);
  const quota = quotaIa(boutique);

  const prenom = utilisateur.nom.split(" ")[0];
  const maxSemaine = Math.max(1, ...semaine.map((j) => j.commandes));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="titre-page">Bonjour {prenom}</h1>
        <p className="mt-1 text-encre-600">
          {chiffres.aTraiter > 0
            ? `${chiffres.aTraiter} ${pluriel(chiffres.aTraiter, "commande")} ${pluriel(chiffres.aTraiter, "attend", "attendent")} d'être traitée${chiffres.aTraiter > 1 ? "s" : ""}.`
            : "Rien à traiter pour le moment."}
        </p>
      </header>

      {/* ----------------------- Les trois actions ----------------------- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/tableau-de-bord/produits/nouveau" className="btn-principal">
          <Plus className="size-4" /> Ajouter un produit
        </Link>
        <Link href="/tableau-de-bord/boutique" className="btn-secondaire">
          <Crayon className="size-4" /> Modifier ma boutique
        </Link>
        <Partage boutique={{ slug: boutique.slug, nom: boutique.nom, publiee: Boolean(boutique.publiee_le) }} />
      </div>

      {/* --------------------------- Chiffres --------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tuile
          titre="À traiter"
          valeur={String(chiffres.aTraiter)}
          detail={chiffres.aTraiter > 0 ? "Commandes nouvelles ou confirmées" : "Tout est à jour"}
          href="/tableau-de-bord/commandes?statut=nouvelle"
          accent={chiffres.aTraiter > 0}
        />
        <Tuile
          titre="Encaissé"
          valeur={montant(chiffres.encaisse, devise)}
          detail="Argent réellement reçu, depuis l'ouverture"
          ton="text-vert-700"
        />
        <Tuile
          titre="Non payé"
          valeur={montant(chiffres.nonPaye, devise)}
          detail={`${chiffres.nonPayeNombre} ${pluriel(chiffres.nonPayeNombre, "commande")} en attente de règlement`}
          href="/tableau-de-bord/commandes?paiement=en_attente"
          ton={chiffres.nonPaye > 0 ? "text-terre-600" : undefined}
        />
        <Tuile
          titre="Alertes de stock"
          valeur={String(chiffres.alertes)}
          detail={chiffres.alertes > 0 ? "Produits sous votre seuil" : "Aucun produit en tension"}
          href="/tableau-de-bord/produits?filtre=stock"
          accent={chiffres.alertes > 0}
        />
      </div>

      <p className="text-xs text-encre-500">
        « Encaissé » n&apos;additionne que les montants que vous avez marqués comme reçus,
        ou qu&apos;un prestataire de paiement a confirmés. Une commande arrivée n&apos;est
        pas de l&apos;argent arrivé.
      </p>

      {/* ------------------------- Deux colonnes ------------------------- */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Dernières commandes */}
        <section className="carte overflow-hidden">
          <div className="flex items-center justify-between border-b border-encre-200 px-4 py-3">
            <h2 className="titre-section">Dernières commandes</h2>
            <Link href="/tableau-de-bord/commandes" className="text-sm font-medium text-vert-700 hover:underline">
              Toutes
            </Link>
          </div>

          {dernieres.length === 0 ? (
            <div className="p-4">
              <EcranVide
                icone={<Panier className="size-6" />}
                titre="Aucune commande pour l'instant"
                texte={
                  produits === 0
                    ? "Ajoutez un premier produit, puis publiez votre boutique pour recevoir des commandes."
                    : boutique.publiee_le
                      ? "Partagez l'adresse de votre boutique pour recevoir vos premières commandes."
                      : "Votre boutique n'est pas encore publiée : personne ne peut commander."
                }
                action={
                  produits === 0 ? (
                    <Link href="/tableau-de-bord/produits/nouveau" className="btn-principal">
                      <Plus className="size-4" /> Ajouter un produit
                    </Link>
                  ) : !boutique.publiee_le ? (
                    <Link href="/tableau-de-bord/boutique" className="btn-principal">
                      Publier ma boutique
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-encre-100">
              {dernieres.map((commande) => (
                <li key={commande.id}>
                  <Link href={`/tableau-de-bord/commandes/${commande.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-encre-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-encre-900">
                        {commande.client_nom}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-encre-500">
                        {commande.reference} · {depuis(commande.cree_le)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-encre-900">
                        {montant(commande.total, devise)}
                      </p>
                      <p className="mt-0.5 text-xs">
                        <span className={`puce ${commande.statut_paiement === "paye" ? "puce-vert" : "puce-neutre"}`}>
                          {commande.statut_paiement === "paye" ? "Payée" : libelle(STATUTS_COMMANDE, commande.statut)}
                        </span>
                      </p>
                    </div>
                    <Fleche className="size-4 shrink-0 text-encre-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          {/* Sept derniers jours */}
          <section className="carte p-4">
            <h2 className="titre-section">Sept derniers jours</h2>
            <div className="mt-4 flex h-24 items-end gap-1.5" role="img"
              aria-label={`Commandes des sept derniers jours : ${semaine.map((j) => j.commandes).join(", ")}`}>
              {semaine.map((jour) => (
                <div key={jour.jour} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={`w-full rounded-t ${jour.commandes > 0 ? "bg-vert-600" : "bg-encre-200"}`}
                    style={{ height: `${Math.max(4, (jour.commandes / maxSemaine) * 76)}px` }}
                  />
                  <span className="text-[10px] text-encre-500">
                    {new Date(`${jour.jour}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-encre-500">
              {semaine.reduce((t, j) => t + j.commandes, 0)} commandes sur la période.
            </p>
          </section>

          {/* Alertes de stock */}
          {alertes.length > 0 ? (
            <section className="carte overflow-hidden">
              <div className="flex items-center gap-2 border-b border-terre-200 bg-terre-50 px-4 py-2.5">
                <Alerte className="size-4 text-terre-600" />
                <h2 className="text-sm font-semibold text-terre-700">Stock bas</h2>
              </div>
              <ul className="divide-y divide-encre-100">
                {alertes.slice(0, 5).map((produit) => (
                  <li key={produit.id}>
                    <Link href={`/tableau-de-bord/produits/${produit.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-encre-50">
                      <span className="truncate text-sm text-encre-800">{produit.nom}</span>
                      <span className={`puce ${produit.stock === 0 ? "puce-rouge" : "puce-terre"}`}>
                        {produit.stock === 0 ? "Épuisé" : `${produit.stock} restant${produit.stock > 1 ? "s" : ""}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Demandes WhatsApp, comptees a part des commandes */}
          {chiffres.demandesWhatsapp > 0 ? (
            <section className="carte p-4">
              <div className="flex items-start gap-3">
                <Whatsapp className="mt-0.5 size-5 shrink-0 text-vert-700" />
                <div>
                  <h2 className="text-sm font-semibold text-encre-900">
                    {chiffres.demandesWhatsapp} {pluriel(chiffres.demandesWhatsapp, "demande")} WhatsApp
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-encre-600">
                    Des visiteurs ont ouvert WhatsApp depuis votre boutique. Ce n&apos;est ni
                    un message envoyé, ni une commande : vérifiez votre WhatsApp.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Formule et quota */}
          <section className="carte p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="titre-section">Formule {offre.nom}</h2>
              <Link href="/tableau-de-bord/abonnement" className="text-sm font-medium text-vert-700 hover:underline">
                Gérer
              </Link>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-encre-600">Produits</dt>
                <dd className="font-medium text-encre-900">{produits} / {offre.max_produits}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-encre-600">Générations IA ce mois</dt>
                <dd className="font-medium text-encre-900">{quota.utilise} / {quota.maximum}</dd>
              </div>
            </dl>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-encre-200">
              <div className="h-full rounded-full bg-vert-600"
                style={{ width: `${Math.min(100, (quota.utilise / Math.max(1, quota.maximum)) * 100)}%` }} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Tuile({
  titre, valeur, detail, href, ton = "text-encre-900", accent,
}: {
  titre: string; valeur: string; detail: string; href?: string;
  ton?: string; accent?: boolean;
}) {
  const contenu = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-encre-500">{titre}</p>
      <p className={`mt-1.5 text-2xl font-bold ${ton}`}>{valeur}</p>
      <p className="mt-1 text-xs text-encre-500">{detail}</p>
    </>
  );
  const classe = `carte p-4 ${accent ? "ring-1 ring-terre-200" : ""}`;
  return href
    ? <Link href={href} className={`${classe} block transition-shadow hover:shadow-sm`}>{contenu}</Link>
    : <div className={classe}>{contenu}</div>;
}
