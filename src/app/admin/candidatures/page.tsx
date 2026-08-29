import Link from "next/link";
import { exigerAdmin } from "@/lib/admin";
import { listerCandidatures } from "@/lib/requetes";
import { libelle, METIERS } from "@/lib/constantes";
import { dateFr, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { BadgeCandidature } from "@/components/badge-candidature";

export const metadata = { title: "Candidatures" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

const ETATS = [
  { valeur: "en_attente", libelle: "À examiner" },
  { valeur: "valide",     libelle: "Validées" },
  { valeur: "refuse",     libelle: "Refusées" },
  { valeur: "",           libelle: "Toutes" },
] as const;

export default async function PageCandidatures({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerAdmin();
  const params = await searchParams;
  const brut = Array.isArray(params.statut) ? params.statut[0] : params.statut;
  const filtre = brut ?? "en_attente";

  const candidatures = listerCandidatures(filtre || undefined);

  return (
    <>
      <EnTetePage
        titre="Candidatures des professionnels"
        sousTitre="Vérifiez le dossier avant de valider. Un profil validé devient visible publiquement."
      />

      <div className="mt-5 space-y-4"><MessagesUrl params={params} /></div>

      <div className="mb-5 mt-5 flex flex-wrap gap-2">
        {ETATS.map((e) => (
          <Link
            key={e.libelle}
            href={e.valeur ? `/admin/candidatures?statut=${e.valeur}` : "/admin/candidatures?statut="}
            className={filtre === e.valeur ? "btn-primaire px-3 py-2 text-sm" : "btn-secondaire px-3 py-2 text-sm"}
          >
            {e.libelle}
          </Link>
        ))}
      </div>

      {candidatures.length === 0 ? (
        <EtatVide
          titre="Aucune candidature"
          description="Les professionnels qui postulent depuis la vitrine apparaîtront ici."
        />
      ) : (
        <Carte className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {candidatures.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/candidatures/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{c.nom}</p>
                      <BadgeCandidature statut={c.statut_candidature} />
                      {c.quiz_reussi === 1 && (
                        <span className="badge bg-brand-100 text-brand-800 ring-brand-600/20">
                          Quiz {c.quiz_score}/{c.quiz_total}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {libelle(METIERS, c.metier)} · {c.ville}
                      {c.experience_annees > 0 && ` · ${c.experience_annees} an(s) d'expérience`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {telephoneFr(c.telephone)} · {c.email}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{dateFr(c.cree_le)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}
