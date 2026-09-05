import Link from "next/link";
import { notFound } from "next/navigation";
import { lireBienPublic, prochainsSejours } from "@/lib/requetes";
import { aujourdhui, fcfa, periodeSejour, telephoneBrut, telephoneFr } from "@/lib/format";
import { libelle, TYPES_BIEN } from "@/lib/constantes";
import { actionEnvoyerDemande } from "@/lib/actions";
import { toutesPhotos } from "@/components/carte-bien";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { Alerte } from "@/components/ui";
import { FormulaireReservation } from "@/components/formulaire-reservation";
import {
  IconeDouche, IconeLieu, IconeLit, IconeRetour, IconeSurface, IconeTelephone,
} from "@/components/icones";
import { ChampTelephone } from "@/components/champ-telephone";
import { description as couper, url } from "@/lib/seo";
import type { Metadata } from "next";

type Params = { [cle: string]: string | string[] | undefined };

const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

/**
 * Titre et description propres a cette annonce.
 *
 * C'est ici que se joue l'essentiel du referencement du site. Une annonce
 * porte un type de bien, un nombre de chambres, un quartier, une ville et un
 * prix : autant de mots que les gens tapent reellement (« appartement 3
 * chambres Almadies »). Sans ces metadonnees, les vingt annonces du site
 * partageaient le meme titre generique et se faisaient concurrence entre
 * elles sans qu'aucune ne ressorte.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const bien = lireBienPublic(Number(id));
  if (!bien) return { title: "Bien introuvable", robots: { index: false, follow: false } };

  const lieu = [bien.quartier, bien.ville].filter(Boolean).join(", ");
  const nature = libelle(TYPES_BIEN, bien.type);
  const prix = bien.courte_duree === 1
    ? `${fcfa(bien.prix_nuit)} la nuit`
    : `${fcfa(bien.loyer + bien.charges)} par mois`;

  const titre = `${nature}${bien.chambres > 0 ? ` ${bien.chambres} chambres` : ""} à louer`
    + `${lieu ? ` à ${lieu}` : ""} — ${prix}`;

  const details = [
    bien.chambres > 0 && `${bien.chambres} chambre(s)`,
    bien.salles_bain > 0 && `${bien.salles_bain} salle(s) d'eau`,
    bien.surface && `${bien.surface} m²`,
    bien.meuble === 1 && "meublé",
  ].filter(Boolean).join(", ");

  const texte = bien.description?.trim()
    || `${nature} à louer${lieu ? ` à ${lieu}` : ""}${details ? `. ${details}` : ""}. `
       + `${prix}. Contactez ${bien.agence_nom} sur Sen Gestion.`;

  const photos = toutesPhotos(bien.photos);

  return {
    title: titre,
    description: couper(texte),
    alternates: { canonical: `/biens/${bien.id}` },
    openGraph: {
      type: "article",
      title: titre,
      description: couper(texte),
      url: url(`/biens/${bien.id}`),
      images: photos.length > 0 ? [{ url: photos[0], alt: bien.titre }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: titre,
      description: couper(texte),
      images: photos.length > 0 ? [photos[0]] : undefined,
    },
  };
}

export default async function PageBienPublic({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const { id } = await params;
  const requete = await searchParams;
  const bien = lireBienPublic(Number(id));
  if (!bien) notFound();

  const photos = toutesPhotos(bien.photos);
  const equipements = (bien.equipements ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const caution = bien.loyer * bien.caution_mois;
  const envoye = lire(requete, "envoye") === "1";
  const erreur = lire(requete, "erreur");

  const courteDuree = bien.courte_duree === 1;
  const sejours = courteDuree ? prochainsSejours(bien.id) : [];
  const reserve = lire(requete, "reserve");

  // Fiche structuree de l'annonce : c'est elle qui permet a Google d'afficher
  // le prix, le nombre de pieces et la photo dans ses resultats, au lieu d'un
  // simple lien. Les valeurs viennent toutes de l'annonce reelle — rien n'y
  // est inventé.
  const fiche = {
    "@context": "https://schema.org",
    "@type": courteDuree ? "Accommodation" : "Apartment",
    name: bien.titre,
    description: bien.description ?? undefined,
    url: url(`/biens/${bien.id}`),
    image: photos.length > 0 ? photos.map((ph) => url(ph)) : undefined,
    numberOfRooms: bien.chambres > 0 ? bien.chambres : undefined,
    numberOfBathroomsTotal: bien.salles_bain > 0 ? bien.salles_bain : undefined,
    floorSize: bien.surface
      ? { "@type": "QuantitativeValue", value: bien.surface, unitCode: "MTK" }
      : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: bien.ville,
      addressRegion: bien.quartier ?? undefined,
      addressCountry: "SN",
    },
    ...(courteDuree
      ? { occupancy: { "@type": "QuantitativeValue", value: bien.capacite } }
      : {}),
    offers: {
      "@type": "Offer",
      price: courteDuree ? bien.prix_nuit : bien.loyer + bien.charges,
      priceCurrency: "XOF",
      availability: bien.statut === "disponible"
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "RealEstateAgent", name: bien.agence_nom },
    },
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fiche) }}
      />
      <EntetePublic />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
          <IconeRetour className="h-4 w-4" /> Retour aux annonces
        </Link>

        {/* -------------------------------- Galerie -------------------------------- */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 via-sable-100 to-brand-50">
          {photos.length > 0 ? (
            <div className={`grid gap-1 ${photos.length > 1 ? "sm:grid-cols-3" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[0]}
                alt={bien.titre}
                className={`aspect-[16/10] w-full object-cover ${photos.length > 1 ? "sm:col-span-2 sm:aspect-auto sm:h-full" : ""}`}
              />
              {photos.length > 1 && (
                <div className="hidden gap-1 sm:grid">
                  {photos.slice(1, 3).map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={p} alt={`${bien.titre} ${i + 2}`} className="h-full w-full object-cover" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex aspect-[16/7] items-center justify-center text-7xl opacity-40">🏠</div>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* --------------------------- Colonne principale --------------------------- */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">
                {libelle(TYPES_BIEN, bien.type)}
              </span>
              {bien.meuble === 1 && (
                <span className="badge bg-sable-100 text-sable-700 ring-sable-600/20">Meublé</span>
              )}
              {bien.statut === "reserve" && (
                <span className="badge bg-amber-100 text-amber-800 ring-amber-600/20">Réservé</span>
              )}
              <span className="text-xs text-slate-400">Réf. {bien.reference}</span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{bien.titre}</h1>

            <p className="mt-2 flex items-center gap-1.5 text-slate-500">
              <IconeLieu className="h-4 w-4" />
              {[bien.quartier, bien.ville].filter(Boolean).join(", ")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {[
                bien.chambres > 0 && { icone: <IconeLit className="h-5 w-5" />, valeur: `${bien.chambres}`, label: bien.chambres > 1 ? "chambres" : "chambre" },
                bien.salles_bain > 0 && { icone: <IconeDouche className="h-5 w-5" />, valeur: `${bien.salles_bain}`, label: bien.salles_bain > 1 ? "salles de bain" : "salle de bain" },
                bien.surface && { icone: <IconeSurface className="h-5 w-5" />, valeur: `${bien.surface}`, label: "m² habitables" },
              ].filter(Boolean).map((c, i) => {
                const carte = c as { icone: React.ReactNode; valeur: string; label: string };
                return (
                  <div key={i} className="carte flex min-w-[8rem] flex-1 items-center gap-3 p-4">
                    <span className="text-brand-600">{carte.icone}</span>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{carte.valeur}</p>
                      <p className="text-xs text-slate-500">{carte.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {bien.description && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900">Description</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{bien.description}</p>
              </section>
            )}

            {equipements.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900">Équipements et services</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {equipements.map((e) => (
                    <li key={e} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs text-brand-700">✓</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">
                {courteDuree ? "Conditions du séjour" : "Conditions de location"}
              </h2>
              <dl className="carte mt-3 divide-y divide-slate-100">
                {(courteDuree ? [
                  ["Prix par nuit", fcfa(bien.prix_nuit)],
                  ["Séjour minimum", `${bien.nuits_min} nuit${bien.nuits_min > 1 ? "s" : ""}`],
                  ["Capacité", `${bien.capacite} voyageur${bien.capacite > 1 ? "s" : ""}`],
                  ["Pour une semaine", fcfa(bien.prix_nuit * 7)],
                ] : [
                  ["Loyer mensuel", fcfa(bien.loyer)],
                  ...(bien.charges > 0 ? [["Charges mensuelles", fcfa(bien.charges)] as const] : []),
                  ["Caution", `${fcfa(caution)} (${bien.caution_mois} mois de loyer)`],
                  ["Total à l'entrée", fcfa(caution + bien.loyer + bien.charges)],
                ]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {courteDuree && sejours.length > 0 && (
              <section className="mt-8">
                <h2 className="text-lg font-bold text-slate-900">Dates déjà réservées</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Le logement est occupé sur ces périodes. Le jour du départ, il est
                  de nouveau disponible.
                </p>
                <ul className="carte mt-3 divide-y divide-slate-100">
                  {sejours.map((s) => (
                    <li key={`${s.date_arrivee}-${s.date_depart}`} className="px-4 py-3 text-sm text-slate-600">
                      Occupé {periodeSejour(s.date_arrivee, s.date_depart)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* --------------------------- Colonne de contact --------------------------- */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <div className="carte p-5">
                <p className="text-3xl font-extrabold text-brand-700">
                  {fcfa(courteDuree ? bien.prix_nuit : bien.loyer)}
                </p>
                <p className="text-sm text-slate-500">
                  {courteDuree
                    ? `par nuit · ${bien.nuits_min} nuit${bien.nuits_min > 1 ? "s" : ""} minimum`
                    : `par mois ${bien.charges > 0 ? `+ ${fcfa(bien.charges)} de charges` : ""}`}
                </p>

                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{bien.agence_nom}</p>
                  {bien.agence_telephone && (
                    <p className="mt-1 flex items-center gap-1.5 text-slate-500">
                      <IconeTelephone className="h-4 w-4" />
                      {telephoneFr(bien.agence_telephone)}
                    </p>
                  )}
                </div>

                {bien.agence_telephone && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a href={`tel:+${telephoneBrut(bien.agence_telephone)}`} className="btn-secondaire">Appeler</a>
                    <a
                      href={`https://wa.me/${telephoneBrut(bien.agence_telephone)}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par l'annonce ${bien.reference} : ${bien.titre}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-sable"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {courteDuree && (
                <div className="carte p-5">
                  <h3 className="font-semibold text-slate-900">Réserver ce logement</h3>

                  {reserve && (
                    <div className="mt-4">
                      <Alerte type="succes">
                        Demande enregistrée sous la référence <strong>{reserve}</strong>.
                        L&apos;agence vous rappelle pour confirmer.
                      </Alerte>
                    </div>
                  )}

                  <div className="mt-4">
                    <FormulaireReservation
                      bienId={bien.id}
                      prixNuit={bien.prix_nuit}
                      nuitsMin={bien.nuits_min}
                      capacite={bien.capacite}
                      sejours={sejours}
                      aujourdhui={aujourdhui()}
                    />
                  </div>
                </div>
              )}

              <div className="carte p-5">
                <h3 className="font-semibold text-slate-900">
                  {courteDuree ? "Une question ?" : "Demander une visite"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  L&apos;agence vous rappelle pour organiser la visite.
                </p>

                {envoye && (
                  <div className="mt-4">
                    <Alerte type="succes">
                      Votre demande a bien été envoyée. L&apos;agence vous contactera très bientôt.
                    </Alerte>
                  </div>
                )}
                {erreur && <div className="mt-4"><Alerte type="erreur">{erreur}</Alerte></div>}

                <form action={actionEnvoyerDemande} className="mt-4 space-y-3">
                  <input type="hidden" name="bien_id" value={bien.id} />
                  <input name="nom" required placeholder="Votre nom complet *" className="champ" />
                  <ChampTelephone obligatoire label="Téléphone" aide="Sénégal ou étranger." />
                  <input name="email" type="email" placeholder="E-mail (facultatif)" className="champ" />
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Votre message…"
                    className="champ"
                    defaultValue={`Bonjour, je suis intéressé(e) par l'annonce ${bien.reference}.`}
                  />
                  <button type="submit" className="btn-primaire w-full">Envoyer ma demande</button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <PiedPublic />
    </div>
  );
}
