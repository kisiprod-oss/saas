import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerReservations } from "@/lib/requetes";
import { fcfa, periodeSejour, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";
import { BadgeReservation } from "@/components/badge-reservation";

export const metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

const ETATS = [
  { valeur: "", libelle: "Toutes" },
  { valeur: "demande", libelle: "À traiter" },
  { valeur: "confirmee", libelle: "Confirmées" },
  { valeur: "terminee", libelle: "Terminées" },
  { valeur: "annulee", libelle: "Annulées" },
] as const;

export default async function PageReservations({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const filtre = (Array.isArray(params.statut) ? params.statut[0] : params.statut) ?? "";

  const reservations = listerReservations(agence.id, filtre || undefined);
  const aTraiter = reservations.filter((r) => r.statut === "demande").length;

  return (
    <>
      <EnTetePage
        titre="Réservations"
        sousTitre="Les séjours courte durée demandés depuis vos annonces."
      />

      <div className="mt-5 space-y-4"><MessagesUrl params={params} /></div>

      <div className="mb-5 mt-5 flex flex-wrap gap-2">
        {ETATS.map((e) => (
          <Link
            key={e.valeur}
            href={e.valeur ? `/dashboard/reservations?statut=${e.valeur}` : "/dashboard/reservations"}
            className={filtre === e.valeur ? "btn-primaire px-3 py-2 text-sm" : "btn-secondaire px-3 py-2 text-sm"}
          >
            {e.libelle}
            {e.valeur === "demande" && aTraiter > 0 && !filtre && (
              <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-xs font-bold text-white">{aTraiter}</span>
            )}
          </Link>
        ))}
      </div>

      {reservations.length === 0 ? (
        <EtatVide
          titre="Aucune réservation"
          description={
            filtre
              ? "Aucune réservation dans cette catégorie."
              : "Activez « Location courte durée » sur un bien pour recevoir des réservations depuis votre vitrine."
          }
        />
      ) : (
        <Carte className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {reservations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/reservations/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{r.nom}</p>
                      <BadgeReservation statut={r.statut} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{r.bien_titre}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {periodeSejour(r.date_arrivee, r.date_depart)} · {r.nuits} nuit{r.nuits > 1 ? "s" : ""} ·
                      {" "}{telephoneFr(r.telephone)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-slate-900">{fcfa(r.montant_total)}</p>
                    {r.montant_paye > 0 && (
                      <p className="text-xs text-brand-700">{fcfa(r.montant_paye)} reçu</p>
                    )}
                    <p className="text-xs text-slate-400">{r.reference}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}
