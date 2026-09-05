import Link from "next/link";
import { actionEtreRappele } from "@/lib/actions";
import { imagesCourteDuree } from "@/lib/vitrine";
import { fcfa } from "@/lib/format";
import { plan } from "@/lib/tarifs";
import { EntetePublic, PiedPublic } from "@/components/entete-public";
import { Alerte } from "@/components/ui";
import { ChampTelephone } from "@/components/champ-telephone";
import {
  IllustrationCalendrier, IllustrationPrixNuit, IllustrationRecu, IllustrationRelance,
  IllustrationRevenus, IllustrationSansCommission,
} from "@/components/illustrations";

export const metadata = {
  title: "Location courte durée au Sénégal — gérer son meublé à la nuitée",
  description:
    "Vous louez un appartement meublé à la nuitée à Dakar, Saly ou ailleurs ? "
    + "Sen Gestion tient votre calendrier, vos réservations et vos revenus.",
  alternates: { canonical: "/courte-duree" },
};
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

/** Visuel de remplacement tant qu'aucune photo n'a été ajoutée. */
function Illustration({ variante }: { variante: number }) {
  const fonds = ["bg-brand-50", "bg-sable-50", "bg-sky-50"];
  return (
    <div className={`flex aspect-[4/3] items-center justify-center rounded-xl ${fonds[variante % 3]}`}>
      <svg viewBox="0 0 120 90" className="h-2/3 w-2/3 text-brand-600/40" fill="none"
           stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {variante % 3 === 0 && (
          <>
            <path d="M12 42 60 12l48 30" /><path d="M24 38v40h72V38" />
            <rect x="42" y="52" width="16" height="26" rx="1.5" />
            <rect x="68" y="52" width="14" height="12" rx="1.5" />
          </>
        )}
        {variante % 3 === 1 && (
          <>
            <rect x="18" y="20" width="84" height="58" rx="4" />
            <path d="M18 36h84M38 20v-8M82 20v-8" />
            <path d="M34 50h10M56 50h10M78 50h10M34 64h10M56 64h10" />
          </>
        )}
        {variante % 3 === 2 && (
          <>
            <path d="M22 70V34l38-20 38 20v36" /><path d="M14 70h92" />
            <circle cx="60" cy="44" r="9" />
            <path d="M45 70a15 15 0 0 1 30 0" />
          </>
        )}
      </svg>
    </div>
  );
}

export default async function PageCourteDuree({ searchParams }: { searchParams: Promise<Params> }) {
  const requete = await searchParams;
  const images = imagesCourteDuree();
  const lire = (c: string) => {
    const v = requete[c];
    return Array.isArray(v) ? v[0] : v;
  };
  const bailleur = plan("bailleur");

  const atouts = [
    {
      titre: "Un calendrier qui se bloque tout seul",
      Image: IllustrationCalendrier,
      texte: "Dès qu'un séjour est confirmé, les dates disparaissent des disponibilités. "
        + "Plus de double réservation le jour où deux voyageurs demandent la même semaine.",
    },
    {
      titre: "Prix à la nuitée, séjour minimum, capacité",
      Image: IllustrationPrixNuit,
      texte: "Vous fixez votre prix par nuit, le nombre de nuits minimum et le nombre "
        + "de voyageurs. Le total se calcule tout seul devant le voyageur.",
    },
    {
      titre: "Réservation en ligne, sans commission",
      Image: IllustrationSansCommission,
      texte: "Votre logement a sa page publique. Le voyageur choisit ses dates et vous "
        + "envoie sa demande. Aucun pourcentage prélevé sur vos nuitées.",
    },
    {
      titre: "Vos revenus, mois par mois",
      Image: IllustrationRevenus,
      texte: "Encaissé, reste dû, taux de remplissage de vos logements : "
        + "un état imprimable que vous pouvez remettre à votre comptable.",
    },
    {
      titre: "Reçus et quittances à votre nom",
      Image: IllustrationRecu,
      texte: "Un document A4 avec votre logo, vos mentions et un code de vérification "
        + "en ligne. Utile pour un voyageur en déplacement professionnel.",
    },
    {
      titre: "Relances automatiques des impayés",
      Image: IllustrationRelance,
      texte: "Le logiciel repère les acomptes en retard, prépare le message et vous "
        + "n'avez qu'à l'envoyer sur WhatsApp.",
    },
  ];

  return (
    <>
      <EntetePublic />

      <main>
        {/* ---------------------------------- Bandeau ---------------------------------- */}
        <section className="bg-gradient-to-b from-brand-50/70 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
            <div>
              <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">
                Pour les particuliers
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Vous louez un meublé à la nuitée&nbsp;?
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Un studio à Ngor, un appartement aux Almadies, une villa à Saly.
                Sen Gestion tient votre calendrier, vos réservations et vos revenus
                — sans prélever un centime sur vos nuitées.
                <span className="mt-2 block">
                  <strong className="text-slate-900">Vous vivez à l&apos;étranger&nbsp;?</strong>{" "}
                  C&apos;est fait pour vous : vous suivez tout depuis chez vous, et vos
                  voyageurs réservent avec leur propre numéro, d&apos;où qu&apos;ils viennent.
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-500">
                Pas besoin d&apos;être une agence : la formule <strong>{bailleur.nom}</strong> à{" "}
                {fcfa(bailleur.prixMois)} par mois est faite pour les propriétaires
                particuliers. Vous pouvez commencer gratuitement.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#rappel" className="btn-primaire">Être rappelé</a>
                <Link href="/inscription" className="btn-secondaire">Créer mon compte</Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={i === 0 ? "col-span-2" : ""}>
                  {images[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={images[i]}
                      alt=""
                      className={`w-full rounded-xl object-cover ${i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
                    />
                  ) : (
                    <Illustration variante={i} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------- Les atouts --------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Ce que le logiciel fait pour vous
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Les mêmes outils que les agences, ramenés à ce qu&apos;un particulier
            utilise vraiment.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {atouts.map((a) => (
              <div key={a.titre} className="carte overflow-hidden">
                <a.Image />
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900">{a.titre}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.texte}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------- Ce que ce n'est pas ------------------------------- */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="text-xl font-bold text-slate-900">À dire franchement</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Sen Gestion <strong>n&apos;est pas une plateforme de voyageurs</strong> : il
              ne vous apporte pas de clients comme le ferait un site de réservation
              international. C&apos;est votre outil de gestion — il tient votre
              calendrier, vos documents et vos comptes, et donne une page publique à
              vos logements. Beaucoup de propriétaires l&apos;utilisent <em>à côté</em> des
              plateformes, justement pour garder leurs réservations directes sans
              commission.
            </p>
          </div>
        </section>

        {/* --------------------------------- Être rappelé --------------------------------- */}
        <section id="rappel" className="mx-auto max-w-3xl scroll-mt-8 px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Vous préférez qu&apos;on vous explique&nbsp;?
          </h2>
          <p className="mt-2 text-slate-600">
            Laissez votre numéro : on vous rappelle et on met en place votre premier
            logement avec vous. Sans engagement.
          </p>

          {lire("rappel") && (
            <div className="mt-6">
              <Alerte type="succes">
                C&apos;est noté, merci. Nous vous rappelons très vite au numéro indiqué.
              </Alerte>
            </div>
          )}
          {lire("erreur") && (
            <div className="mt-6"><Alerte type="erreur">{lire("erreur")}</Alerte></div>
          )}

          <form action={actionEtreRappele} className="carte mt-6 space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="etiquette" htmlFor="nom">Votre nom *</label>
                <input id="nom" name="nom" required className="champ" placeholder="Awa Ndiaye" />
              </div>
              <ChampTelephone obligatoire label="Téléphone"
                              aide="Nous vous rappelons, où que vous viviez." />
              <div>
                <label className="etiquette" htmlFor="email">E-mail (facultatif)</label>
                <input id="email" name="email" type="email" className="champ" placeholder="vous@exemple.sn" />
              </div>
              <div>
                <label className="etiquette" htmlFor="ville">Ville</label>
                <input id="ville" name="ville" className="champ" placeholder="Dakar, Saly…" />
              </div>
            </div>

            <div>
              <label className="etiquette" htmlFor="nb_logements">Combien de logements&nbsp;?</label>
              <select id="nb_logements" name="nb_logements" className="champ" defaultValue="1">
                <option value="1">1 logement</option>
                <option value="2 à 5">2 à 5 logements</option>
                <option value="6 à 15">6 à 15 logements</option>
                <option value="plus de 15">Plus de 15</option>
              </select>
            </div>

            <div>
              <label className="etiquette" htmlFor="message">Votre message (facultatif)</label>
              <textarea
                id="message" name="message" rows={4} className="champ"
                placeholder="Dites-nous où se trouvent vos logements et ce que vous cherchez."
              />
            </div>

            <button type="submit" className="btn-primaire w-full sm:w-auto">
              Je veux être rappelé
            </button>
            <p className="text-xs text-slate-500">
              Votre numéro sert uniquement à vous rappeler. Il n&apos;est ni revendu,
              ni transmis à une agence.
            </p>
          </form>
        </section>
      </main>

      <PiedPublic />
    </>
  );
}
