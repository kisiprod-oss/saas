import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/admin";
import { lireCandidature, listerAvis, noteArtisan } from "@/lib/requetes";
import { actionStatuerCandidature } from "@/lib/actions";
import { libelle, METIERS } from "@/lib/constantes";
import { dateFr, telephoneBrut, telephoneFr } from "@/lib/format";
import { Alerte, Carte, MessagesUrl } from "@/components/ui";
import { BadgeCandidature } from "@/components/badge-candidature";
import { Etoiles } from "@/components/etoiles";
import { IconeRetour } from "@/components/icones";

export const metadata = { title: "Examiner une candidature" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

export default async function PageCandidature({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  await exigerAdmin();
  const { id } = await params;
  const requete = await searchParams;

  const c = lireCandidature(Number(id));
  if (!c) notFound();

  const pieces = (c.documents ?? "").split("\n").map((d) => d.trim()).filter(Boolean);
  const note = noteArtisan(c.id);
  const avis = listerAvis(c.id, 10);

  return (
    <>
      <Link href="/admin/candidatures" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-700">
        <IconeRetour className="h-4 w-4" /> Retour aux candidatures
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        {c.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={c.photo_url}
            alt={c.nom}
            className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-300 bg-amber-50 text-xs font-medium text-amber-700">
            Sans<br />photo
          </span>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{c.nom}</h1>
          <BadgeCandidature statut={c.statut_candidature} />
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {libelle(METIERS, c.metier)} · candidature reçue le {dateFr(c.cree_le)}
      </p>

      <div className="mt-5 space-y-4"><MessagesUrl params={requete} /></div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Le dossier</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              {[
                ["Métier", libelle(METIERS, c.metier)],
                ["Expérience", c.experience_annees > 0 ? `${c.experience_annees} an(s)` : "Non précisée"],
                ["Ville", [c.quartier, c.ville].filter(Boolean).join(", ")],
                ["Téléphone", telephoneFr(c.telephone)],
                ...(c.telephone2 ? [["Second téléphone", telephoneFr(c.telephone2)] as const] : []),
                ["E-mail", c.email ?? "—"],
                ...(c.tarif_indicatif ? [["Tarif indicatif", c.tarif_indicatif] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>

            {c.description && (
              <>
                <p className="mt-5 text-sm font-medium text-slate-700">Sa présentation</p>
                <p className="mt-1.5 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {c.description}
                </p>
              </>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Pièces jointes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ces fichiers sont privés : seul vous y avez accès depuis cette page.
            </p>

            {!c.cv_url && pieces.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Aucune pièce transmise.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {c.cv_url && (
                  <li>
                    <a href={c.cv_url} className="btn-secondaire w-full justify-start" download>
                      📄 Curriculum vitae
                    </a>
                  </li>
                )}
                {pieces.map((p, i) => (
                  <li key={p}>
                    <a href={p} className="btn-secondaire w-full justify-start" download>
                      📎 Pièce {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              <strong>À vérifier vous-même :</strong> un diplôme ou une attestation
              peut être falsifié. En cas de doute, appelez le candidat ou l&apos;organisme
              qui a délivré le document avant de valider.
            </p>
          </Carte>

          {note.nombre > 0 && (
            <Carte className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Avis clients</h2>
                <Etoiles note={note.moyenne} nombre={note.nombre} />
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {avis.map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Etoiles note={a.note} />
                      <span className="text-xs text-slate-400">{dateFr(a.cree_le)}</span>
                    </div>
                    {a.commentaire && <p className="mt-1.5 text-sm text-slate-600">{a.commentaire}</p>}
                  </li>
                ))}
              </ul>
            </Carte>
          )}
        </div>

        {/* ----------------------------- Décision ----------------------------- */}
        <aside className="space-y-5">
          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Test de compétence</h2>
            {c.quiz_passe_le ? (
              <>
                <p className={`mt-2 text-2xl font-bold ${c.quiz_reussi ? "text-brand-700" : "text-slate-900"}`}>
                  {c.quiz_score}/{c.quiz_total}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {c.quiz_reussi === 1 ? "Badge obtenu" : "Badge non obtenu"} ·
                  {" "}passé le {dateFr(c.quiz_passe_le)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Pas encore passé. Le test devient accessible dès que vous validez
                la candidature.
              </p>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Votre décision</h2>

            {c.statut_candidature !== "valide" && (
              <form action={actionStatuerCandidature} className="mt-4">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="valide" />
                <button type="submit" className="btn-primaire w-full">Valider la candidature</button>
              </form>
            )}

            <form action={actionStatuerCandidature} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="decision" value="refuse" />
              <div>
                <label className="etiquette" htmlFor="motif">Motif du refus</label>
                <textarea
                  id="motif" name="motif" rows={3} defaultValue={c.motif_refus ?? ""}
                  placeholder="Ce message sera lu par le candidat."
                  className="champ"
                />
              </div>
              <button type="submit" className="btn-danger w-full">Refuser</button>
            </form>

            {c.statut_candidature !== "en_attente" && (
              <form action={actionStatuerCandidature} className="mt-3">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="decision" value="en_attente" />
                <button type="submit" className="btn-secondaire w-full">Remettre à l&apos;examen</button>
              </form>
            )}
          </Carte>

          <Carte className="p-5">
            <h2 className="font-semibold text-slate-900">Le joindre</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:+${telephoneBrut(c.telephone)}`} className="btn-secondaire">Appeler</a>
              <a
                href={`https://wa.me/${telephoneBrut(c.telephone)}`}
                target="_blank" rel="noopener noreferrer" className="btn-sable"
              >
                WhatsApp
              </a>
            </div>
          </Carte>

          {c.statut_candidature === "valide" && (
            <Alerte type="succes">
              Ce professionnel apparaît dans l&apos;annuaire public.
            </Alerte>
          )}
        </aside>
      </div>
    </>
  );
}
