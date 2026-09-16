import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth";
import { paysServis, paysDe } from "@/lib/pays";
import { quotaIa, peutPublier, offreEnVigueur } from "@/lib/offres";
import { brouillon, modificationsEnAttente } from "@/lib/versions";
import { produits, categories } from "@/lib/requetes";
import { iaDistanteDisponible } from "@/lib/ia";
import { lireTaux } from "@/lib/devises";
import { couleurSure } from "@/lib/modeles";
import { Etape1, Etape2, Etape3, Etape4, BoutonGenerer } from "@/components/assistant";
import { RenduSections } from "@/components/sections-rendu";
import { PublierBoutique } from "@/components/publier";
import { Logo } from "@/components/marque";
import { Coche, Oeil } from "@/components/icones";
import { actionTerminerAssistant, actionRevenirEtape } from "@/lib/actions-assistant";
import { actionDeconnexion } from "@/lib/actions-compte";

export const metadata = { title: "Créer ma boutique" };

const TITRES = [
  { titre: "Votre activité", texte: "Commençons par l'essentiel : qui vous êtes et ce que vous vendez." },
  { titre: "Où vous trouver", texte: "Le pays fixe votre devise et vos moyens de paiement." },
  { titre: "L'allure de votre boutique", texte: "Un style, une couleur. Vous pourrez tout changer plus tard." },
  { titre: "Votre premier produit", texte: "Une photo, un nom, un prix. Le reste peut attendre." },
  { titre: "Votre boutique est prête", texte: "Regardez-la, puis décidez de la publier." },
];

/**
 * L'assistant de creation.
 *
 * L'etape affichee vient de l'URL, bornee par `etape_assistant` : impossible
 * de sauter a l'etape 5 en changeant l'adresse sans avoir rempli les
 * precedentes. Revenir en arriere reste libre.
 */
export default async function PageCreer({
  searchParams,
}: { searchParams: Promise<{ etape?: string }> }) {
  const { boutique, utilisateur } = await exigerSession();
  const { etape: etapeBrute } = await searchParams;

  // L'assistant termine : on n'y revient pas par accident.
  if (boutique.assistant_fini_le) redirect("/tableau-de-bord");

  const demandee = Number(etapeBrute) || 1;
  const etape = Math.min(Math.max(1, demandee), boutique.etape_assistant);
  const pays = paysDe(boutique.pays);
  const quota = quotaIa(boutique);
  const publication = peutPublier(boutique);
  const offre = offreEnVigueur(boutique);

  return (
    <div className="min-h-dvh bg-craie">
      <header className="border-b border-encre-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo lien={null} />
          <form action={actionDeconnexion}>
            <button type="submit" className="btn-discret btn-petit">Quitter</button>
          </form>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-3xl px-4 py-8">
        {/* Progression : cinq pastilles, cliquables vers l'arriere. */}
        <ol className="flex items-center gap-1.5" aria-label={`Étape ${etape} sur 5`}>
          {TITRES.map((_, i) => {
            const numero = i + 1;
            const atteinte = numero <= boutique.etape_assistant;
            const courante = numero === etape;
            return (
              <li key={numero} className="flex-1">
                {atteinte && !courante ? (
                  <form action={actionRevenirEtape}>
                    <input type="hidden" name="etape" value={numero} />
                    <button type="submit"
                      className="block h-1.5 w-full rounded-full bg-vert-400 hover:bg-vert-600"
                      aria-label={`Revenir à l'étape ${numero}`} />
                  </form>
                ) : (
                  <span className={`block h-1.5 w-full rounded-full ${courante ? "bg-vert-700" : "bg-encre-200"}`} />
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-sm font-medium text-vert-700">Étape {etape} sur 5</p>
        <h1 className="mt-1 titre-page">{TITRES[etape - 1].titre}</h1>
        <p className="mt-2 text-encre-600">{TITRES[etape - 1].texte}</p>

        <div className="mt-7">
          {etape === 1 ? (
            <Etape1 defauts={{
              nom: boutique.nom, activite: boutique.activite, description: boutique.description,
            }} />
          ) : null}

          {etape === 2 ? (
            <Etape2
              pays={paysServis().map((p) => ({
                code: p.code, nom: p.nom, indicatif: p.indicatif, villes: p.villes,
              }))}
              defauts={{
                pays: boutique.pays, ville: boutique.ville, quartier: boutique.quartier,
                adresse: boutique.adresse, telephone: boutique.telephone,
                whatsapp: boutique.whatsapp, email: boutique.email,
              }}
            />
          ) : null}

          {etape === 3 ? (
            <Etape3 boutiqueId={boutique.id} defauts={{
              modele: boutique.modele, couleur: couleurSure(boutique.couleur), logo: boutique.logo_url,
            }} />
          ) : null}

          {etape === 4 ? (
            <Etape4
              devise={pays.devise_libelle}
              categories={categories(boutique.id).map((c) => ({ id: c.id, nom: c.nom }))}
              iaDisponible={iaDistanteDisponible()}
              tauxSaisis={Object.keys(lireTaux(boutique.taux_change))}
              marge={boutique.marge_import}
              paysDevise={pays.devise}
            />
          ) : null}

          {etape === 5 ? (
            <Etape5
              boutique={boutique}
              utilisateurId={utilisateur.id}
              quotaRestant={quota.restant}
              publicationPermise={publication.ok}
              raisonPublication={publication.ok ? null : publication.raison}
              nomOffre={offre.nom}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

async function Etape5({
  boutique, quotaRestant, publicationPermise, raisonPublication, nomOffre,
}: {
  boutique: Awaited<ReturnType<typeof exigerSession>>["boutique"];
  utilisateurId: number;
  quotaRestant: number;
  publicationPermise: boolean;
  raisonPublication: string | null;
  nomOffre: string;
}) {
  const contenu = brouillon(boutique.id);
  const pays = paysDe(boutique.pays);
  const listeProduits = produits(boutique.id, { actifsSeulement: true, limite: 12 });
  const enAttente = modificationsEnAttente(boutique.id);

  return (
    <div className="space-y-7">
      <BoutonGenerer quotaRestant={quotaRestant} />

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="titre-section">Aperçu</h2>
          <a href={`/b/${boutique.slug}?apercu=1`} target="_blank" rel="noopener"
            className="btn-secondaire btn-petit">
            <Oeil className="size-4" /> Plein écran
          </a>
        </div>
        <p className="mt-1 text-sm text-encre-600">
          Voilà ce que verront vos clients. Rien n&apos;est en ligne pour l&apos;instant.
        </p>

        {/* L'apercu est rendu avec le MEME composant que la boutique
            publique : ce qui est montre ici est exactement ce qui sera servi. */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-encre-200 bg-white">
          <div className="max-h-[28rem] overflow-y-auto">
            <div className="boutique origin-top scale-[0.82]"
              style={{ ["--couleur" as string]: couleurSure(boutique.couleur) }}>
              <RenduSections contenu={contenu} contexte={{
                boutiqueId: boutique.id, slug: boutique.slug, nom: boutique.nom,
                couleur: couleurSure(boutique.couleur), modele: boutique.modele,
                devise: pays.devise_libelle, decimales: pays.decimales,
                produits: listeProduits, categories: categories(boutique.id),
                telephone: boutique.telephone, whatsapp: boutique.whatsapp,
                adresse: boutique.adresse, ville: boutique.ville,
                apercu: true,
              }} />
            </div>
          </div>
        </div>
      </section>

      <section className="carte p-5">
        <h2 className="titre-section">Avant de publier</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
          <Verification faite={listeProduits.length > 0}
            texte={listeProduits.length > 0
              ? `${listeProduits.length} produit${listeProduits.length > 1 ? "s" : ""} en vente`
              : "Aucun produit en vente : votre boutique sera vide"} />
          <Verification faite={Boolean(boutique.telephone)}
            texte={boutique.telephone ? "Vos clients peuvent vous joindre" : "Aucun téléphone renseigné"} />
          <Verification faite={contenu.sections.length > 0}
            texte={`${contenu.sections.length} section${contenu.sections.length > 1 ? "s" : ""} sur votre page d'accueil`} />
          <Verification faite={Boolean(boutique.conditions_validees_le)}
            obligatoire={false}
            texte={boutique.conditions_validees_le
              ? "Conditions de vente validées"
              : "Conditions de vente à rédiger (vous pourrez le faire depuis Paramètres)"} />
        </ul>
      </section>

      <PublierBoutique
        slug={boutique.slug}
        publiee={Boolean(boutique.publiee_le)}
        enAttente={enAttente}
        permise={publicationPermise}
        raison={raisonPublication}
        nomOffre={nomOffre}
        depuisAssistant
      />

      <form action={actionTerminerAssistant}>
        <button type="submit" className="btn-secondaire w-full">
          Aller à mon tableau de bord
        </button>
      </form>

      <p className="text-center text-xs text-encre-500">
        Vous pourrez revenir sur tout cela depuis{" "}
        <Link href="/tableau-de-bord/boutique" className="lien">Ma boutique</Link>.
      </p>
    </div>
  );
}

function Verification({
  faite, texte, obligatoire = true,
}: { faite: boolean; texte: string; obligatoire?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full
        ${faite ? "bg-vert-100 text-vert-700" : obligatoire ? "bg-terre-100 text-terre-600" : "bg-encre-100 text-encre-400"}`}>
        {faite ? <Coche className="size-3" /> : <span className="text-[10px] font-bold">!</span>}
      </span>
      <span className={faite ? "text-encre-700" : "text-encre-600"}>{texte}</span>
    </li>
  );
}
