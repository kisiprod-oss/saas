import { adressesAdminVisibles, exigerAdmin } from "@/lib/admin";
import { collaborateurs, plateforme } from "@/lib/plateforme";
import { dateFr, fcfa, moisCourt } from "@/lib/format";
import { plan } from "@/lib/tarifs";
import { Carte, EnTetePage } from "@/components/ui";
import { COULEUR_ENCAISSE, GraphiqueBarres } from "@/components/graphique-barres";

export const metadata = { title: "Vue d'ensemble" };
export const dynamic = "force-dynamic";

export default async function PagePlateforme() {
  const { utilisateur } = await exigerAdmin();
  const p = plateforme();
  const equipe = collaborateurs();
  const admins = adressesAdminVisibles();

  return (
    <>
      <EnTetePage
        titre="Vue d'ensemble"
        sousTitre="L'état de Sen Gestion : vos adhérents, vos abonnements, vos comptes."
      />

      {/* ------------------------------- Adhérents ------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { libelle: "Agences inscrites", valeur: String(p.nbAgences), detail: `dont ${p.nouvellesCeMois} ce mois-ci` },
          { libelle: "Agences payantes", valeur: String(p.nbPayantes), detail: `${p.nbGratuites} sur la formule gratuite` },
          { libelle: "Actives (30 j)", valeur: String(p.nbActives), detail: `${p.nbDormantes} sans facture récente` },
          { libelle: "Comptes ouverts", valeur: String(p.nbUtilisateurs), detail: `${p.nbLocataires} locataires · ${p.nbArtisans} artisans` },
        ].map((c) => (
          <Carte key={c.libelle} className="p-4">
            <p className="text-xs text-slate-500">{c.libelle}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{c.valeur}</p>
            <p className="mt-0.5 text-xs text-slate-400">{c.detail}</p>
          </Carte>
        ))}
      </div>

      {/* ------------------------------ Abonnements ------------------------------ */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Carte className="border-succes-300 bg-succes-50/50 p-5">
          <p className="text-sm font-medium text-succes-800">Réellement encaissé</p>
          <p className="mt-1 text-3xl font-bold text-succes-900">{fcfa(p.encaisseTotal)}</p>
          <p className="mt-1 text-xs text-succes-800">
            {p.nbReglements} règlement(s) confirmé(s) · {fcfa(p.encaisseCeMois)} ce mois-ci
          </p>
          <p className="mt-2 text-xs text-succes-800">
            C&apos;est votre chiffre d&apos;affaires : de l&apos;argent arrivé sur
            votre compte marchand, vérifié auprès de l&apos;opérateur.
          </p>
        </Carte>

        <Carte className="p-5">
          <p className="text-sm text-slate-500">Attendu si tous payaient</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{fcfa(p.abonnementTheorique)}<span className="text-base font-medium text-slate-500"> / mois</span></p>
          <p className="mt-2 text-xs text-slate-500">
            Somme des formules en cours. <strong>Théorique</strong> : une agence
            peut être inscrite sur une formule sans l&apos;avoir réglée. L&apos;écart
            avec la case verte, c&apos;est ce qu&apos;il reste à recouvrer.
          </p>
        </Carte>
      </div>

      <Carte className="mt-4 p-5">
        <h2 className="font-semibold text-slate-900">Répartition des formules</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Formule</th>
                <th className="text-right">Prix / mois</th>
                <th className="text-right">Agences</th>
                <th className="text-right">Total théorique</th>
              </tr>
            </thead>
            <tbody>
              {p.parPlan.map((f) => (
                <tr key={f.code}>
                  <td className="font-medium text-slate-900">{f.nom}</td>
                  <td className="text-right tabular-nums">{f.prixMois === 0 ? "Gratuit" : fcfa(f.prixMois)}</td>
                  <td className="text-right tabular-nums">{f.nombre}</td>
                  <td className="text-right font-semibold tabular-nums text-brand-700">{fcfa(f.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>

      {/* ------------------------------- Croissance ------------------------------ */}
      <Carte className="mt-4 p-5">
        <GraphiqueBarres
          titre="Nouvelles agences, mois par mois"
          sousTitre="Douze derniers mois, d'après la date d'inscription."
          etiquettes={p.historique.map((h) => moisCourt(h.periode))}
          series={[{ nom: "Inscriptions", couleur: COULEUR_ENCAISSE, valeurs: p.historique.map((h) => h.inscriptions) }]}
        />
      </Carte>

      {/* -------------------------------- Adhérents ------------------------------ */}
      <Carte className="mt-6 p-5">
        <h2 className="font-semibold text-slate-900">Vos adhérents</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Une agence « dormante » n&apos;a émis aucune facture depuis 30 jours :
          c&apos;est elle qu&apos;il faut appeler avant qu&apos;elle ne parte.
        </p>

        {p.adherents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune agence inscrite pour l&apos;instant.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Agence</th>
                  <th>Formule</th>
                  <th>Inscrite le</th>
                  <th className="text-right">Biens</th>
                  <th className="text-right">Locataires</th>
                  <th className="text-right">Factures 30 j</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {p.adherents.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="font-medium text-slate-900">{a.nom}</span>
                      <span className="block text-xs text-slate-400">
                        {[a.ville, a.email].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td>{plan(a.plan).nom}</td>
                    <td className="whitespace-nowrap text-slate-600">{dateFr(a.cree_le)}</td>
                    <td className="text-right tabular-nums">{a.nb_biens}</td>
                    <td className="text-right tabular-nums">{a.nb_locataires}</td>
                    <td className="text-right tabular-nums">{a.factures_recentes}</td>
                    <td>
                      {a.factures_recentes > 0 ? (
                        <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Active</span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600 ring-slate-500/20">Dormante</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      {/* ------------------------------ Collaborateurs --------------------------- */}
      <Carte className="mt-6 p-5">
        <h2 className="font-semibold text-slate-900">Administrateurs de la plateforme</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ces adresses ont accès à cet espace : candidatures, questions du test,
          et cette page. Ce sont les seules.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm">
          {admins.map((a) => (
            <li key={a} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-800">{a}</span>
              {a === utilisateur.email.trim().toLowerCase() && (
                <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">vous</span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <strong>Pour ajouter ou retirer un administrateur</strong>, modifiez la
          variable <code className="font-mono text-xs">ADMIN_EMAILS</code> chez
          votre hébergeur (hPanel → Variables d&apos;environnement), en séparant
          les adresses par des virgules. Ce réglage vit volontairement
          <em> hors </em> du logiciel : aucun compte, même piraté, ne peut
          s&apos;octroyer l&apos;administration en modifiant une ligne en base.
        </p>
      </Carte>

      <Carte className="mt-4 p-5">
        <h2 className="font-semibold text-slate-900">Tous les comptes agence</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Les personnes qui se connectent au logiciel, agence par agence.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Personne</th>
                <th>Agence</th>
                <th>Rôle</th>
                <th>Créé le</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {equipe.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="font-medium text-slate-900">{c.nom}</span>
                    <span className="block text-xs text-slate-400">{c.email}</span>
                  </td>
                  <td className="text-slate-600">{c.agence_nom}</td>
                  <td className="text-slate-600">{c.role === "proprietaire" ? "Titulaire" : "Agent"}</td>
                  <td className="whitespace-nowrap text-slate-600">{dateFr(c.cree_le)}</td>
                  <td>
                    {c.actif ? (
                      <span className="badge bg-emerald-100 text-emerald-800 ring-emerald-600/20">Actif</span>
                    ) : (
                      <span className="badge bg-rose-100 text-rose-800 ring-rose-600/20">Coupé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Carte>
    </>
  );
}
