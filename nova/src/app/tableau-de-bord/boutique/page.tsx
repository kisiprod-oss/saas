import { exigerSession } from "@/lib/auth";
import { paysDe } from "@/lib/pays";
import { quotaIa, peutPublier, offreEnVigueur } from "@/lib/offres";
import { brouillon, historique, modificationsEnAttente, ORIGINES } from "@/lib/versions";
import { produits, categories } from "@/lib/requetes";
import { couleurSure } from "@/lib/modeles";
import { iaDistanteDisponible } from "@/lib/ia";
import { EditeurBoutique } from "@/components/editeur-boutique";
import { PublierBoutique } from "@/components/publier";
import { HistoriqueVersions } from "@/components/historique-versions";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Ma boutique" };

/**
 * L'editeur : composer, apercevoir, publier, revenir en arriere.
 *
 * Trois blocs dans cet ordre, qui est celui du travail reel : on modifie, on
 * regarde, on publie. L'historique vient en dernier — on ne s'en sert que
 * quand quelque chose s'est mal passe.
 */
export default async function PageBoutique() {
  const { boutique } = await exigerSession();

  const pays = paysDe(boutique.pays);
  const quota = quotaIa(boutique);
  const publication = peutPublier(boutique);
  const offre = offreEnVigueur(boutique);
  const versions = historique(boutique.id, 20);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="titre-page">Ma boutique</h1>
          <p className="mt-1 text-sm text-encre-600">
            Composez votre page d&apos;accueil. Rien n&apos;est visible par vos clients
            tant que vous n&apos;avez pas publié.
          </p>
        </div>
      </header>

      <EditeurBoutique
        contenuInitial={brouillon(boutique.id)}
        iaDisponible={iaDistanteDisponible()}
        quotaRestant={quota.restant}
        contexte={{
          boutiqueId: boutique.id,
          slug: boutique.slug,
          nom: boutique.nom,
          couleur: couleurSure(boutique.couleur),
          modele: boutique.modele,
          devise: pays.devise_libelle,
          decimales: pays.decimales,
          produits: produits(boutique.id, { actifsSeulement: true, limite: 24 }),
          categories: categories(boutique.id),
          telephone: boutique.telephone,
          whatsapp: boutique.whatsapp,
          adresse: boutique.adresse,
          ville: boutique.ville,
        }}
      />

      <PublierBoutique
        slug={boutique.slug}
        publiee={Boolean(boutique.publiee_le)}
        enAttente={modificationsEnAttente(boutique.id)}
        permise={publication.ok}
        raison={publication.ok ? null : publication.raison}
        nomOffre={offre.nom}
      />

      <HistoriqueVersions
        versions={versions.map((v) => ({
          id: v.id,
          numero: v.numero,
          origine: ORIGINES[v.origine] ?? v.origine,
          etat: v.etat,
          resume: v.resume,
          quand: dateHeureFr(v.cree_le),
        }))}
      />
    </div>
  );
}
