import Link from "next/link";
import { Photo } from "./ui";
import { ICONES_SECTION } from "./icones";
import { montant } from "@/lib/format";
import { apparenceDe, texteSur } from "@/lib/modeles";
import type { Section, ContenuBoutique } from "@/lib/sections";
import type { Produit, Categorie } from "@/lib/requetes";

/**
 * Le rendu des sections d'une boutique.
 *
 * ============================================================================
 *  LA BARRIÈRE
 * ============================================================================
 *  Ce fichier ne sait afficher que les huit types de `src/lib/sections.ts`.
 *  Le `switch` du bas n'a pas de branche « par défaut qui affiche quand
 *  même » : un type inconnu ne rend RIEN.
 *
 *  Aucun `dangerouslySetInnerHTML` n'existe ici, ni ailleurs dans
 *  l'application. Tout texte passe par du JSX, donc est échappé par React.
 *  Une section qui contiendrait une balise s'afficherait comme du texte, pas
 *  comme du code — et de toute façon `valider()` a déjà retiré les chevrons
 *  avant l'écriture en base.
 * ============================================================================
 */

export type ContexteRendu = {
  boutiqueId: number;
  slug: string;
  nom: string;
  couleur: string;
  modele: string;
  devise: string;
  decimales: number;
  produits: Produit[];
  categories: Categorie[];
  telephone: string | null;
  whatsapp: string | null;
  adresse: string | null;
  ville: string | null;
  /** Aperçu : les liens d'achat ne mènent nulle part dans l'éditeur. */
  apercu?: boolean;
};

export function RenduSections({
  contenu, contexte,
}: { contenu: ContenuBoutique; contexte: ContexteRendu }) {
  if (contenu.sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-encre-500">
        Cette page n&apos;a pas encore de contenu.
      </div>
    );
  }
  return (
    <>
      {contenu.sections.map((section) => (
        <RenduSection key={section.id} section={section} contexte={contexte} />
      ))}
    </>
  );
}

export function RenduSection({
  section, contexte,
}: { section: Section; contexte: ContexteRendu }) {
  const apparence = apparenceDe(contexte.modele);

  switch (section.type) {
    // ----------------------------------------------------------------- bandeau
    case "banniere": {
      const fondMarque = apparence.bannierefond === "marque";
      const fondSombre = apparence.bannierefond === "sombre";
      const surMarque = texteSur(contexte.couleur);

      return (
        <section
          className={`px-4 py-14 sm:py-20 ${fondSombre ? "bg-encre-900 text-white" : fondMarque ? "" : "bg-ivoire"}`}
          style={fondMarque ? { backgroundColor: contexte.couleur, color: surMarque } : undefined}
        >
          <div className="mx-auto max-w-4xl text-center">
            <h1 className={apparence.banniere}>{section.titre}</h1>
            {section.sous_titre ? (
              <p className={`mx-auto mt-4 max-w-2xl text-base sm:text-lg ${
                fondSombre || fondMarque ? "opacity-85" : "text-encre-600"}`}>
                {section.sous_titre}
              </p>
            ) : null}
            <Lien contexte={contexte} href={`/b/${contexte.slug}/catalogue`}
              className={`mt-7 inline-flex min-h-11 items-center px-6 py-3 text-sm font-semibold ${apparence.bouton}`}
              style={
                fondMarque
                  ? { backgroundColor: surMarque, color: contexte.couleur }
                  : { backgroundColor: contexte.couleur, color: texteSur(contexte.couleur) }
              }
            >
              {section.bouton}
            </Lien>
          </div>
        </section>
      );
    }

    // ------------------------------------------------------------ présentation
    case "presentation":
      if (!section.texte) return null;
      return (
        <Bloc>
          <h2 className={apparence.titre}>{section.titre}</h2>
          <Paragraphes texte={section.texte} className="mt-4 max-w-2xl" />
        </Bloc>
      );

    // ----------------------------------------------------------------- produits
    case "produits": {
      const categorie = section.source === "categorie" && section.categorie
        ? contexte.categories.find(
            (c) => c.nom.toLowerCase() === section.categorie!.toLowerCase()
              || c.slug === section.categorie,
          )
        : undefined;

      const liste = (categorie
        ? contexte.produits.filter((p) => p.categorie_id === categorie.id)
        : contexte.produits
      ).slice(0, section.limite);

      if (liste.length === 0) {
        return (
          <Bloc>
            <h2 className={apparence.titre}>{section.titre}</h2>
            <p className="mt-3 text-sm text-encre-500">
              Aucun produit à afficher ici pour le moment.
            </p>
          </Bloc>
        );
      }

      return (
        <Bloc>
          <div className="flex items-end justify-between gap-4">
            <h2 className={apparence.titre}>{section.titre}</h2>
            {contexte.produits.length > section.limite ? (
              <Lien contexte={contexte} href={`/b/${contexte.slug}/catalogue`}
                className="text-sm font-medium underline-offset-4 hover:underline"
                style={{ color: contexte.couleur }}>
                Tout voir
              </Lien>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {liste.map((produit) => (
              <CarteProduit key={produit.id} produit={produit} contexte={contexte} />
            ))}
          </div>
        </Bloc>
      );
    }

    // --------------------------------------------------------------- catégories
    case "categories": {
      if (contexte.categories.length === 0) return null;
      return (
        <Bloc>
          <h2 className={apparence.titre}>{section.titre}</h2>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {contexte.categories.map((categorie) => (
              <Lien key={categorie.id} contexte={contexte}
                href={`/b/${contexte.slug}/catalogue?c=${categorie.slug}`}
                className={`inline-flex min-h-11 items-center border px-5 text-sm font-medium ${apparence.bouton}`}
                style={{ borderColor: contexte.couleur, color: contexte.couleur }}>
                {categorie.nom}
              </Lien>
            ))}
          </div>
        </Bloc>
      );
    }

    // ---------------------------------------------------------------- avantages
    case "avantages": {
      if (section.points.length === 0) return null;
      return (
        <Bloc fond="bg-ivoire">
          <h2 className={apparence.titre}>{section.titre}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {section.points.map((point, i) => {
              const Icone = ICONES_SECTION[point.icone] ?? ICONES_SECTION.etoile;
              return (
                <div key={i} className="flex gap-3.5">
                  <div className={`flex size-10 shrink-0 items-center justify-center ${apparence.arrondi}`}
                    style={{ backgroundColor: `${contexte.couleur}14`, color: contexte.couleur }}>
                    <Icone className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{point.titre}</h3>
                    {point.texte ? (
                      <p className="mt-1 text-sm leading-relaxed text-encre-600">{point.texte}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Bloc>
      );
    }

    // -------------------------------------------------------------------- texte
    case "texte":
      if (!section.texte) return null;
      return (
        <Bloc>
          {section.titre ? <h2 className={apparence.titre}>{section.titre}</h2> : null}
          <Paragraphes texte={section.texte} className={section.titre ? "mt-4 max-w-2xl" : "max-w-2xl"} />
        </Bloc>
      );

    // ---------------------------------------------------------------- questions
    case "questions": {
      if (section.questions.length === 0) return null;
      return (
        <Bloc>
          <h2 className={apparence.titre}>{section.titre}</h2>
          <div className="mt-5 max-w-2xl divide-y divide-encre-200 border-y border-encre-200">
            {section.questions.map((q, i) => (
              // <details> natif : il fonctionne sans JavaScript, il est
              // accessible au clavier, et il se replie tout seul à l'impression.
              <details key={i} className="group py-3.5">
                <summary className="cursor-pointer list-none font-medium marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {q.question}
                    <span aria-hidden className="mt-0.5 shrink-0 text-encre-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <Paragraphes texte={q.reponse} className="mt-2.5 text-sm" />
              </details>
            ))}
          </div>
        </Bloc>
      );
    }

    // ------------------------------------------------------------------ contact
    case "contact": {
      const lienWhatsapp = contexte.whatsapp
        ? `https://wa.me/${contexte.whatsapp.replace(/\D/g, "")}`
        : null;
      return (
        <Bloc fond="bg-ivoire">
          <h2 className={apparence.titre}>{section.titre}</h2>
          {section.texte ? <Paragraphes texte={section.texte} className="mt-3 max-w-2xl" /> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {section.whatsapp && lienWhatsapp ? (
              <a href={lienWhatsapp} target="_blank" rel="noopener"
                className={`inline-flex min-h-11 items-center gap-2 px-5 text-sm font-semibold ${apparence.bouton}`}
                style={{ backgroundColor: contexte.couleur, color: texteSur(contexte.couleur) }}>
                Écrire sur WhatsApp
              </a>
            ) : null}
            {contexte.telephone ? (
              <a href={`tel:${contexte.telephone}`}
                className={`inline-flex min-h-11 items-center border border-encre-300 px-5 text-sm font-semibold ${apparence.bouton}`}>
                Appeler
              </a>
            ) : null}
          </div>

          {section.adresse && (contexte.adresse || contexte.ville) ? (
            <address className="mt-4 text-sm not-italic text-encre-600">
              {contexte.adresse ? <>{contexte.adresse}<br /></> : null}
              {contexte.ville}
            </address>
          ) : null}
        </Bloc>
      );
    }
  }
}

// ---------------------------------------------------------------------------
//  Briques communes
// ---------------------------------------------------------------------------

function Bloc({ children, fond }: { children: React.ReactNode; fond?: string }) {
  return (
    <section className={`px-4 py-12 sm:py-16 ${fond ?? ""}`}>
      <div className="mx-auto max-w-5xl">{children}</div>
    </section>
  );
}

/**
 * Découpe un texte en paragraphes sur les lignes vides.
 *
 * C'est la seule mise en forme autorisée sur du texte libre. Pas de Markdown,
 * pas de HTML : un commerçant qui colle du HTML depuis un autre site verrait
 * ses balises s'afficher telles quelles — ce qui est laid, mais sans danger.
 */
function Paragraphes({ texte, className = "" }: { texte: string; className?: string }) {
  const blocs = texte.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={`space-y-3 leading-relaxed text-encre-700 ${className}`}>
      {blocs.map((bloc, i) => (
        <p key={i}>
          {bloc.split("\n").map((ligne, j, lignes) => (
            <span key={j}>
              {ligne}
              {j < lignes.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

/**
 * Un lien qui ne navigue pas en mode aperçu.
 *
 * Dans l'éditeur, cliquer « Voir les produits » sortirait de l'aperçu et
 * ferait croire à un bug. On rend alors un `<span>` : il a l'air d'un bouton,
 * il ne fait rien.
 */
function Lien({
  contexte, href, className, style, children,
}: {
  contexte: ContexteRendu; href: string; className?: string;
  style?: React.CSSProperties; children: React.ReactNode;
}) {
  if (contexte.apercu) {
    return <span className={className} style={style} aria-disabled>{children}</span>;
  }
  return <Link href={href} className={className} style={style}>{children}</Link>;
}

export function CarteProduit({
  produit, contexte,
}: { produit: Produit; contexte: ContexteRendu }) {
  const apparence = apparenceDe(contexte.modele);
  const epuise = produit.suivi_stock === 1 && produit.stock <= 0;

  return (
    <Lien contexte={contexte} href={`/b/${contexte.slug}/produit/${produit.slug}`}
      className={`group block overflow-hidden ${apparence.carte} ${apparence.arrondi}`}>
      <div className="relative">
        <Photo
          src={produit.photos[0] ? `/api/photo/${contexte.boutiqueId}/v_${produit.photos[0]}` : null}
          alt={produit.nom}
        />
        {epuise ? (
          <span className="absolute left-2 top-2 rounded-full bg-encre-900/85 px-2.5 py-1 text-[11px] font-semibold text-white">
            Épuisé
          </span>
        ) : produit.prix_barre ? (
          <span className="absolute left-2 top-2 rounded-full bg-terre-500 px-2.5 py-1 text-[11px] font-semibold text-white">
            Promo
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{produit.nom}</h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold" style={{ color: contexte.couleur }}>
            {montant(produit.prix, contexte.devise, contexte.decimales)}
          </span>
          {produit.prix_barre ? (
            <span className="text-xs text-encre-400 line-through">
              {montant(produit.prix_barre, contexte.devise, contexte.decimales)}
            </span>
          ) : null}
        </p>
      </div>
    </Lien>
  );
}
