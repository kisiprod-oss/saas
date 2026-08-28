import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { listerDemandes } from "@/lib/requetes";
import { actionStatutDemande } from "@/lib/actions";
import { telephoneBrut, telephoneFr } from "@/lib/format";
import { Carte, EnTetePage, EtatVide, MessagesUrl } from "@/components/ui";

export const metadata = { title: "Demandes" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => {
  const v = p[c];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

const ONGLETS = [
  { valeur: "nouvelle", libelle: "Nouvelles" },
  { valeur: "traitee",  libelle: "Traitées" },
  { valeur: "archivee", libelle: "Archivées" },
  { valeur: "",         libelle: "Toutes" },
];

function dateHeure(iso: string) {
  const [d, h] = iso.split(" ");
  const [a, m, j] = (d ?? "").split("-");
  return `${j}/${m}/${a} à ${(h ?? "").slice(0, 5)}`;
}

export default async function PageDemandes({ searchParams }: { searchParams: Promise<Params> }) {
  const { agence } = await exigerSession();
  const params = await searchParams;
  const statut = params.statut === undefined ? "nouvelle" : lire(params, "statut");
  const demandes = listerDemandes(agence.id, statut);

  return (
    <>
      <EnTetePage
        titre="Demandes de visite"
        sousTitre="Les messages reçus depuis vos annonces sur la vitrine publique."
      />

      <MessagesUrl params={params} />

      <div className="mb-5 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Link
            key={o.libelle}
            href={`/dashboard/demandes?statut=${o.valeur}`}
            className={`btn-secondaire ${statut === o.valeur ? "border-brand-500 text-brand-700" : ""}`}
          >
            {o.libelle}
          </Link>
        ))}
      </div>

      {demandes.length === 0 ? (
        <EtatVide
          titre="Aucune demande dans cette catégorie"
          description="Dès qu'un visiteur remplit le formulaire d'une de vos annonces, la demande apparaît ici."
          action={{ href: "/", libelle: "Voir la vitrine publique" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {demandes.map((d) => (
            <Carte key={d.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{d.nom}</p>
                  <p className="text-sm text-slate-500">{telephoneFr(d.telephone)}</p>
                  {d.email && <p className="truncate text-sm text-slate-500">{d.email}</p>}
                </div>
                <span className={`badge shrink-0 ${
                  d.statut === "nouvelle" ? "bg-rose-100 text-rose-800 ring-rose-600/20"
                  : d.statut === "traitee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
                  : "bg-slate-100 text-slate-500 ring-slate-500/20"}`}>
                  {d.statut === "nouvelle" ? "Nouvelle" : d.statut === "traitee" ? "Traitée" : "Archivée"}
                </span>
              </div>

              {d.bien_id && (
                <Link
                  href={`/dashboard/biens/${d.bien_id}`}
                  className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  🏠 {d.bien_titre} <span className="text-xs text-slate-400">({d.bien_reference})</span>
                </Link>
              )}

              {d.message && (
                <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{d.message}</p>
              )}

              <p className="mt-3 text-xs text-slate-400">Reçue le {dateHeure(d.cree_le)}</p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <a href={`tel:+${telephoneBrut(d.telephone)}`} className="btn-secondaire px-3 py-2 text-xs">
                  Appeler
                </a>
                <a
                  href={`https://wa.me/${telephoneBrut(d.telephone)}?text=${encodeURIComponent(`Bonjour ${d.nom}, ${agence.nom} vous recontacte au sujet de votre demande.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-sable px-3 py-2 text-xs"
                >
                  WhatsApp
                </a>
                {d.statut !== "traitee" && (
                  <form action={actionStatutDemande}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="statut" value="traitee" />
                    <button type="submit" className="btn-primaire px-3 py-2 text-xs">Marquer traitée</button>
                  </form>
                )}
                {d.statut !== "archivee" && (
                  <form action={actionStatutDemande}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="statut" value="archivee" />
                    <button type="submit" className="btn-secondaire px-3 py-2 text-xs">Archiver</button>
                  </form>
                )}
              </div>
            </Carte>
          ))}
        </div>
      )}
    </>
  );
}
