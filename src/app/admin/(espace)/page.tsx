import Link from "next/link";
import { exigerAdmin, peut } from "@/lib/admin";
import {
  FUSEAU, indicateurs, inscriptionsParMois, repartitionComptes,
} from "@/lib/admin-donnees";
import { lireJournal } from "@/lib/admin";
import { Carte, Etiquette, ListeVide, Message, TitrePage } from "@/components/admin-ui";
import { dateHeureFr } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

const PERIODES = [
  { valeur: "7", libelle: "7 jours" },
  { valeur: "30", libelle: "30 jours" },
  { valeur: "90", libelle: "90 jours" },
  { valeur: "365", libelle: "12 mois" },
];

export default async function PageTableauAdmin({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("tableau.lire");
  const params = await searchParams;
  const refus = lire(params, "refus") === "1";
  const periode = PERIODES.find((p) => p.valeur === lire(params, "periode")) ?? PERIODES[1];
  const jours = Number(periode.valeur);

  const mesures = indicateurs(jours);
  const mois = inscriptionsParMois();
  const repartition = repartitionComptes();
  const journal = peut(admin, "journal.lire") ? lireJournal({ limite: 8 }).lignes : [];

  const maxMois = Math.max(1, ...mois.map((m) => m.nombre));
  const totalComptes = repartition.reduce((s, r) => s + r.nombre, 0);

  return (
    <>
      <TitrePage
        titre="Tableau de bord"
        sous={`Chiffres lus dans la base, sur ${periode.libelle.toLowerCase()}. Heures en ${FUSEAU}.`}
        action={
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Période">
            {PERIODES.map((p) => (
              <Link
                key={p.valeur}
                href={`/admin?periode=${p.valeur}`}
                aria-current={p.valeur === periode.valeur ? "true" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  p.valeur === periode.valeur
                    ? "bg-[var(--adm-vert)] text-white"
                    : "border border-[var(--adm-bord)] bg-white text-[var(--adm-encre)] hover:bg-black/5"
                }`}
              >
                {p.libelle}
              </Link>
            ))}
          </div>
        }
      />

      {refus && (
        <Message erreur="Votre rôle ne donne pas accès à cette page." />
      )}

      {/* ---------------------------- Les indicateurs ---------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mesures.map((m) => {
          const contenu = (
            <>
              <p className="text-sm font-semibold text-[var(--adm-encre)]">{m.libelle}</p>
              {m.disponible ? (
                <>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-[var(--adm-vert)]">
                    {(m.valeur ?? 0).toLocaleString("fr-FR").replace(/ | /g, " ")}
                  </p>
                  {m.detail && <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">{m.detail}</p>}
                </>
              ) : (
                <p className="mt-2">
                  <Etiquette ton="gris">Pas encore construit</Etiquette>
                </p>
              )}
              <p className="mt-3 text-xs leading-relaxed text-[var(--adm-encre-2)]">{m.definition}</p>
            </>
          );
          return (
            <Carte key={m.cle} className="p-5">
              {m.href && m.disponible ? (
                <Link href={m.href} className="block outline-offset-4">{contenu}</Link>
              ) : contenu}
            </Carte>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* --------------------------- Évolution --------------------------- */}
        <Carte className="p-5">
          <h2 className="font-semibold text-[var(--adm-encre)]">Inscriptions d&apos;agences</h2>
          <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
            Nombre de comptes d&apos;agence créés par mois, sur douze mois.
          </p>
          {mois.length === 0 ? (
            <ListeVide titre="Aucune inscription" texte="Aucun compte d'agence n'a encore été créé." />
          ) : (
            <ul className="mt-5 space-y-2">
              {mois.map((m) => (
                <li key={m.mois} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-[var(--adm-encre-2)]">{m.mois}</span>
                  <span className="h-5 flex-1 overflow-hidden rounded bg-black/5">
                    <span
                      className="block h-full rounded bg-[var(--adm-vert)]"
                      style={{ width: `${Math.round((m.nombre / maxMois) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold">{m.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        {/* -------------------------- Répartition -------------------------- */}
        <Carte className="p-5">
          <h2 className="font-semibold text-[var(--adm-encre)]">Répartition des comptes</h2>
          <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
            Toutes natures confondues, à l&apos;instant présent.
          </p>
          {repartition.length === 0 ? (
            <ListeVide titre="Aucun compte" texte="La base ne contient encore aucun compte." />
          ) : (
            <ul className="mt-5 space-y-3">
              {repartition.map((r) => (
                <li key={r.libelle}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-[var(--adm-encre)]">{r.libelle}</span>
                    <span className="text-sm font-semibold">
                      {r.nombre} <span className="text-xs font-normal text-[var(--adm-encre-2)]">
                        ({Math.round((r.nombre / totalComptes) * 100)} %)
                      </span>
                    </span>
                  </div>
                  <span className="mt-1 block h-2 overflow-hidden rounded bg-black/5">
                    <span className="block h-full rounded bg-[var(--adm-dore)]"
                          style={{ width: `${Math.round((r.nombre / totalComptes) * 100)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>

      {/* ---------------------------- Activité récente ---------------------------- */}
      {peut(admin, "journal.lire") && (
        <Carte className="mt-6">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--adm-bord)] px-5 py-4">
            <div>
              <h2 className="font-semibold text-[var(--adm-encre)]">Activité récente</h2>
              <p className="mt-0.5 text-xs text-[var(--adm-encre-2)]">
                Les huit derniers gestes de l&apos;équipe. Heures en {FUSEAU}.
              </p>
            </div>
            <Link href="/admin/journal" className="shrink-0 text-sm font-semibold text-[var(--adm-vert)] hover:underline">
              Tout le journal
            </Link>
          </div>
          {journal.length === 0 ? (
            <ListeVide titre="Journal vide" texte="Aucune action d'administration n'a encore été enregistrée." />
          ) : (
            <ul className="divide-y divide-[var(--adm-bord)]">
              {journal.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="font-mono text-xs text-[var(--adm-encre-2)]">{dateHeureFr(l.cree_le)}</span>
                  <span className="font-semibold text-[var(--adm-encre)]">{l.action}</span>
                  {l.details && <span className="text-[var(--adm-encre-2)]">{l.details}</span>}
                  <span className="ml-auto text-xs text-[var(--adm-encre-2)]">{l.acteur}</span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      )}
    </>
  );
}
