import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { libelleCategorie, libellePriorite, libelleStatut, ticketsDeLAgence } from "@/lib/support";
import { dateHeureFr } from "@/lib/format";
import { Badge, Carte, EnTetePage, EtatVide } from "@/components/ui";

export const metadata = { title: "Support" };
export const dynamic = "force-dynamic";

function couleurStatut(statut: string) {
  if (statut === "nouveau") return "bg-rose-100 text-rose-800 ring-rose-600/20";
  if (statut === "en_cours") return "bg-sky-100 text-sky-800 ring-sky-600/20";
  if (statut === "en_attente") return "bg-amber-100 text-amber-800 ring-amber-600/20";
  return "bg-emerald-100 text-emerald-800 ring-emerald-600/20";
}

export default async function PageSupportAgence() {
  const { agence } = await exigerSession();
  const tickets = ticketsDeLAgence(agence.id);

  return (
    <>
      <EnTetePage
        titre="Support"
        sousTitre="Vos demandes d'assistance auprès de l'équipe Sen Gestion."
      >
        <Link href="/dashboard/support/nouveau" className="btn-primaire">Nouveau ticket</Link>
      </EnTetePage>

      {tickets.length === 0 ? (
        <EtatVide
          titre="Aucun ticket"
          description="Un problème, une question sur votre abonnement, un accès à retrouver ? Ouvrez un ticket, l'équipe vous répond ici."
          action={{ href: "/dashboard/support/nouveau", libelle: "Ouvrir un ticket" }}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/dashboard/support/${t.id}`}>
              <Carte className="flex flex-wrap items-center gap-3 p-4 hover:border-brand-300">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{t.sujet}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t.numero} · {libelleCategorie(t.categorie)} · mis à jour le {dateHeureFr(t.maj_le)}
                  </p>
                </div>
                <Badge couleur={couleurStatut(t.statut)}>{libelleStatut(t.statut)}</Badge>
                {t.priorite === "urgente" || t.priorite === "haute" ? (
                  <Badge couleur="bg-slate-100 text-slate-700 ring-slate-500/20">
                    Priorité {libellePriorite(t.priorite).toLowerCase()}
                  </Badge>
                ) : null}
              </Carte>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
