import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { historiqueRelances, listerRelances, type LigneRelance } from "@/lib/requetes";
import { dateFr, fcfa, periodeLisible, telephoneBrut, telephoneFr } from "@/lib/format";
import {
  construireMessage, infosNiveau, MODELES_PAR_DEFAUT, NIVEAUX, type Niveau,
} from "@/lib/relances";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { ActionsRelance } from "@/components/actions-relance";

export const metadata = { title: "Relances" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

function CarteLocataire({
  ligne, message, autresImpayes, totalLocataire,
}: {
  ligne: LigneRelance;
  message: string;
  autresImpayes: number;
  totalLocataire: number;
}) {
  const niveau = infosNiveau(ligne.niveau);

  return (
    <Carte className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {ligne.locataire_prenom} {ligne.locataire_nom}
          </p>
          <p className="text-sm text-slate-500">{telephoneFr(ligne.locataire_telephone)}</p>
          <p className="mt-1 truncate text-sm text-slate-600">{ligne.bien_titre}</p>
        </div>
        <span className={`badge ${niveau.couleur}`}>{niveau.libelle}</span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-500">Période</dt>
          <dd className="font-medium text-slate-900">{periodeLisible(ligne.periode)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Restant dû</dt>
          <dd className="font-semibold text-rose-600">{fcfa(ligne.reste)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Échéance</dt>
          <dd className="font-medium text-slate-900">{dateFr(ligne.date_echeance)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Retard</dt>
          <dd className="font-medium text-slate-900">{ligne.jours_retard} jours</dd>
        </div>
      </dl>

      {autresImpayes > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          ⚠️ Ce locataire a {autresImpayes} autre(s) facture(s) impayée(s) —
          soit {fcfa(totalLocataire)} au total. Pensez à en parler en une seule fois.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {ligne.nb_relances === 0
          ? "Jamais relancé pour cette facture."
          : `${ligne.nb_relances} relance(s) déjà envoyée(s) — la dernière ${
              ligne.jours_depuis_relance === 0 ? "aujourd'hui" : `il y a ${ligne.jours_depuis_relance} jour(s)`
            } par ${ligne.derniere_relance_canal === "sms" ? "SMS" : ligne.derniere_relance_canal === "appel" ? "téléphone" : "WhatsApp"}.`}
        {" · "}
        <Link href={`/dashboard/factures/${ligne.facture_id}`} className="font-medium text-brand-700 hover:underline">
          Facture {ligne.numero}
        </Link>
      </p>

      <ActionsRelance
        factureId={ligne.facture_id}
        niveau={ligne.niveau}
        telephone={telephoneBrut(ligne.locataire_telephone)}
        messageInitial={message}
      />
    </Carte>
  );
}

export default async function PageRelances({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;

  const lignes = listerRelances(agence.id);
  const aRelancer = lignes.filter((l) => l.a_relancer);
  const dejaFaites = lignes.filter((l) => !l.a_relancer);
  const historique = historiqueRelances(agence.id, 12);

  const modeles: Record<Niveau, string> = {
    rappel: agence.modele_rappel || MODELES_PAR_DEFAUT.rappel,
    relance: agence.modele_relance || MODELES_PAR_DEFAUT.relance,
    mise_en_demeure: agence.modele_mise_en_demeure || MODELES_PAR_DEFAUT.mise_en_demeure,
  };

  /** Prepare le message personnalise d'une ligne. */
  const messagePour = (l: LigneRelance) =>
    construireMessage(modeles[l.niveau], {
      prenom: l.locataire_prenom,
      locataire: `${l.locataire_prenom} ${l.locataire_nom}`,
      bien: l.bien_titre,
      periode: periodeLisible(l.periode),
      montant: fcfa(l.reste),
      echeance: dateFr(l.date_echeance),
      jours: l.jours_retard,
      agence: agence.nom,
      telephone: telephoneFr(agence.telephone),
      bail: l.contrat_reference,
      facture: l.numero,
    });

  const totalDu = lignes.reduce((s, l) => s + l.reste, 0);

  // Un locataire peut cumuler plusieurs mois impayes : on le signale
  // pour eviter d'envoyer trois messages separes a la meme personne.
  const parLocataire = new Map<number, { nombre: number; total: number }>();
  for (const l of lignes) {
    const actuel = parLocataire.get(l.locataire_id) ?? { nombre: 0, total: 0 };
    parLocataire.set(l.locataire_id, {
      nombre: actuel.nombre + 1,
      total: actuel.total + l.reste,
    });
  }
  const parNiveau = NIVEAUX.map((n) => ({
    ...n,
    nombre: aRelancer.filter((l) => l.niveau === n.valeur).length,
  }));

  return (
    <>
      <EnTetePage
        titre="Relances des impayés"
        sousTitre="Le logiciel repère qui relancer et prépare le message. Vous n'avez qu'à l'envoyer."
      >
        <Link href="/dashboard/relances/modeles" className="btn-secondaire">
          Modifier mes messages
        </Link>
      </EnTetePage>

      <MessagesUrl params={params} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Carte className="p-5">
          <p className="text-sm text-slate-500">À relancer aujourd&apos;hui</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{aRelancer.length}</p>
          <p className="mt-1 text-xs text-slate-400">sur {lignes.length} facture(s) en retard</p>
        </Carte>
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Montant impayé</p>
          <p className="mt-1.5 text-2xl font-bold text-rose-600">{fcfa(totalDu)}</p>
          <p className="mt-1 text-xs text-slate-400">toutes périodes confondues</p>
        </Carte>
        {parNiveau.map((n) => (
          <Carte key={n.valeur} className="p-5">
            <p className="text-sm text-slate-500">{n.libelle}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{n.nombre}</p>
            <p className="mt-1 text-xs text-slate-400">{n.description}</p>
          </Carte>
        ))}
      </div>

      {lignes.length === 0 ? (
        <EtatVide
          titre="Aucun loyer en retard"
          description="Tous les loyers échus ont été réglés. Rien à relancer aujourd'hui."
          action={{ href: "/dashboard/factures", libelle: "Voir les factures" }}
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-bold text-slate-900">
              À relancer aujourd&apos;hui{" "}
              <span className="text-sm font-normal text-slate-500">({aRelancer.length})</span>
            </h2>

            {aRelancer.length === 0 ? (
              <Carte className="px-5 py-10 text-center text-sm text-slate-500">
                Tout le monde a déjà été relancé récemment. Revenez dans quelques jours.
              </Carte>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {aRelancer.map((l) => {
                  const cumul = parLocataire.get(l.locataire_id);
                  return (
                    <CarteLocataire
                      key={l.facture_id}
                      ligne={l}
                      message={messagePour(l)}
                      autresImpayes={(cumul?.nombre ?? 1) - 1}
                      totalLocataire={cumul?.total ?? l.reste}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {dejaFaites.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold text-slate-900">
                Relancés récemment{" "}
                <span className="text-sm font-normal text-slate-500">({dejaFaites.length})</span>
              </h2>
              <Carte className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="tableau">
                    <thead>
                      <tr>
                        <th>Locataire</th><th>Bien</th><th>Période</th>
                        <th className="text-right">Restant dû</th><th>Dernière relance</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dejaFaites.map((l) => (
                        <tr key={l.facture_id}>
                          <td className="whitespace-nowrap font-medium text-slate-900">
                            {l.locataire_prenom} {l.locataire_nom}
                          </td>
                          <td className="max-w-[14rem] truncate">{l.bien_titre}</td>
                          <td className="whitespace-nowrap">{periodeLisible(l.periode)}</td>
                          <td className="whitespace-nowrap text-right font-semibold text-rose-600">
                            {fcfa(l.reste)}
                          </td>
                          <td className="whitespace-nowrap text-slate-500">
                            {l.jours_depuis_relance === 0
                              ? "aujourd'hui"
                              : `il y a ${l.jours_depuis_relance} j`}
                          </td>
                          <td className="whitespace-nowrap text-right">
                            <Link href={`/dashboard/factures/${l.facture_id}`}
                                  className="text-sm font-semibold text-brand-700 hover:underline">
                              Facture
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Carte>
            </section>
          )}
        </>
      )}

      {historique.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Historique des relances</h2>
          <Carte className="overflow-hidden">
            <table className="tableau">
              <thead>
                <tr><th>Date</th><th>Locataire</th><th>Facture</th><th>Niveau</th><th>Canal</th></tr>
              </thead>
              <tbody>
                {historique.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap">{dateFr(h.envoye_le)}</td>
                    <td className="whitespace-nowrap">{h.locataire_prenom} {h.locataire_nom}</td>
                    <td className="whitespace-nowrap text-slate-500">
                      {h.numero} · {periodeLisible(h.periode)}
                    </td>
                    <td>
                      <span className={`badge ${infosNiveau(h.niveau).couleur}`}>
                        {infosNiveau(h.niveau).libelle}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-slate-500">
                      {h.canal === "sms" ? "SMS" : h.canal === "appel" ? "Téléphone" : "WhatsApp"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Carte>
        </section>
      )}
    </>
  );
}
