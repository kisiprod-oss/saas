"use client";

import { useState } from "react";
import {
  actionEnregistrerBrouillon, actionDemanderModification,
  actionAppliquerProposition, actionAjouterSection,
  type EtatProposition,
} from "@/lib/actions-editeur";
import { RenduSections, type ContexteRendu } from "./sections-rendu";
import { Message, Rondelle } from "./ui";
import { Etincelle, Plus, Croix, Crayon, Coche, Oeil } from "./icones";
import {
  SECTIONS_LIBELLES, TYPES_SECTION, MAX_SECTIONS,
  type ContenuBoutique, type Section, type TypeSection,
} from "@/lib/sections";

/**
 * L'éditeur de la page d'accueil.
 *
 * ============================================================================
 *  LE PRINCIPE : ON VOIT AVANT D'APPLIQUER
 * ============================================================================
 *  Une demande faite à l'assistant ne modifie rien tout de suite. Elle revient
 *  sous forme de PROPOSITION, affichée dans l'aperçu à la place du brouillon,
 *  avec le compte de ce qui bouge. Deux boutons : « Garder » écrit dans le
 *  brouillon, « Annuler » jette la proposition.
 *
 *  Et même « Garder » ne publie rien : le brouillon reste privé jusqu'à la
 *  publication.
 *
 *  L'aperçu utilise `RenduSections`, le composant EXACT de la boutique
 *  publique. Ce qu'on voit ici est ce qui sera servi — pas une approximation.
 * ============================================================================
 */

export function EditeurBoutique({
  contenuInitial, contexte, iaDisponible, quotaRestant,
}: {
  contenuInitial: ContenuBoutique;
  contexte: ContexteRendu;
  iaDisponible: boolean;
  quotaRestant: number;
}) {
  const [contenu, setContenu] = useState<ContenuBoutique>(contenuInitial);
  const [modifie, setModifie] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [etat, setEtat] = useState<{ erreur?: string; message?: string }>({});
  const [enregistrement, setEnregistrement] = useState(false);

  // Proposition de l'assistant, en attente de décision.
  const [proposition, setProposition] = useState<EtatProposition | null>(null);
  const [demande, setDemande] = useState("");
  const [enCoursIa, setEnCoursIa] = useState(false);

  const affiche = proposition?.proposition ?? contenu;

  function majSection(id: string, champs: Partial<Section>) {
    setContenu({
      ...contenu,
      sections: contenu.sections.map((s) => (s.id === id ? { ...s, ...champs } as Section : s)),
    });
    setModifie(true);
  }

  function deplacer(index: number, sens: -1 | 1) {
    const cible = index + sens;
    if (cible < 0 || cible >= contenu.sections.length) return;
    const sections = [...contenu.sections];
    [sections[index], sections[cible]] = [sections[cible], sections[index]];
    setContenu({ ...contenu, sections });
    setModifie(true);
  }

  function supprimer(id: string) {
    setContenu({ ...contenu, sections: contenu.sections.filter((s) => s.id !== id) });
    setModifie(true);
  }

  async function ajouter(type: TypeSection) {
    const resultat = await actionAjouterSection(type);
    if (!resultat.section) {
      setEtat({ erreur: resultat.erreur ?? "Impossible d'ajouter cette section." });
      return;
    }
    setContenu({ ...contenu, sections: [...contenu.sections, resultat.section] });
    setOuverte(resultat.section.id);
    setModifie(true);
  }

  async function enregistrer() {
    setEnregistrement(true);
    setEtat({});
    try {
      const resultat = await actionEnregistrerBrouillon(contenu);
      setEtat(resultat);
      if (!resultat.erreur) setModifie(false);
    } catch {
      setEtat({ erreur: "L'enregistrement a échoué. Vos modifications sont toujours à l'écran." });
    } finally {
      setEnregistrement(false);
    }
  }

  async function demanderIa() {
    setEnCoursIa(true);
    setEtat({});
    setProposition(null);
    try {
      const resultat = await actionDemanderModification(demande);
      if (resultat.erreur) setEtat({ erreur: resultat.erreur });
      else setProposition(resultat);
    } catch {
      setEtat({ erreur: "L'assistant n'a pas répondu. Votre quota n'a pas été décompté." });
    } finally {
      setEnCoursIa(false);
    }
  }

  async function garderProposition() {
    if (!proposition?.proposition) return;
    setEnregistrement(true);
    try {
      const resultat = await actionAppliquerProposition(proposition.proposition, demande);
      if (resultat.erreur) { setEtat({ erreur: resultat.erreur }); return; }
      setContenu(proposition.proposition);
      setProposition(null);
      setDemande("");
      setModifie(false);
      setEtat({ message: resultat.message });
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ------------------------------ Édition ------------------------------ */}
      <div className="space-y-5">
        {etat.erreur ? <Message ton="erreur">{etat.erreur}</Message> : null}
        {etat.message ? <Message ton="succes">{etat.message}</Message> : null}

        {/* Assistant */}
        <section className="carte p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="titre-section flex items-center gap-2">
              <Etincelle className="size-5 text-vert-700" /> Demander à l&apos;assistant
            </h2>
            <span className="text-xs text-encre-500">{quotaRestant} restante{quotaRestant > 1 ? "s" : ""}</span>
          </div>

          {!iaDisponible ? (
            <p className="mt-2 text-sm text-encre-600">
              L&apos;assistant intelligent n&apos;est pas activé sur cette installation
              (clé d&apos;API absente). Vous pouvez modifier chaque section à la main
              ci-dessous.
            </p>
          ) : (
            <>
              <textarea
                className="zone-texte mt-3" rows={2} maxLength={500} value={demande}
                onChange={(e) => setDemande(e.target.value)}
                placeholder="Ajoute une section présentation, et mets les questions fréquentes à la fin"
                aria-label="Ce que vous voulez changer"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" className="btn-principal btn-petit" onClick={demanderIa}
                  disabled={enCoursIa || quotaRestant <= 0 || demande.trim().length < 3}>
                  {enCoursIa
                    ? <><Rondelle className="size-4" /> L&apos;assistant réfléchit…</>
                    : <><Etincelle className="size-4" /> Proposer une modification</>}
                </button>
                {["Ajoute une section présentation", "Change les couleurs des titres", "Ajoute des questions fréquentes"].map((exemple) => (
                  <button key={exemple} type="button"
                    className="rounded-full border border-encre-200 px-3 py-1 text-xs text-encre-600 hover:bg-encre-50"
                    onClick={() => setDemande(exemple)}>
                    {exemple}
                  </button>
                ))}
              </div>
              {quotaRestant <= 0 ? (
                <p className="aide text-terre-600">
                  Quota du mois atteint. La modification à la main reste disponible.
                </p>
              ) : null}
            </>
          )}

          {/* La proposition, avec ce qu'elle change */}
          {proposition?.proposition ? (
            <div className="apparait mt-4 rounded-xl border border-vert-200 bg-vert-50 p-3.5">
              <p className="text-sm font-semibold text-vert-900">
                Proposition affichée dans l&apos;aperçu
              </p>
              <p className="mt-1 text-xs text-vert-800">
                {[
                  proposition.resume?.ajoutees ? `${proposition.resume.ajoutees} section(s) ajoutée(s)` : null,
                  proposition.resume?.modifiees ? `${proposition.resume.modifiees} modifiée(s)` : null,
                  proposition.resume?.retirees ? `${proposition.resume.retirees} retirée(s)` : null,
                ].filter(Boolean).join(" · ")}
                {proposition.moteur === "local" ? " · composée sans assistant intelligent" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-principal btn-petit"
                  onClick={garderProposition} disabled={enregistrement}>
                  <Coche className="size-4" /> Garder cette version
                </button>
                <button type="button" className="btn-secondaire btn-petit"
                  onClick={() => setProposition(null)}>
                  Annuler
                </button>
              </div>
              <p className="mt-2 text-xs text-vert-800">
                Garder l&apos;écrit dans votre brouillon. Vos clients ne verront rien
                tant que vous n&apos;aurez pas publié.
              </p>
            </div>
          ) : null}
        </section>

        {/* Sections */}
        <section className="carte p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="titre-section">Les sections de votre page</h2>
            <span className="text-xs text-encre-500">
              {contenu.sections.length} / {MAX_SECTIONS}
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {contenu.sections.map((section, index) => (
              <li key={section.id} className="rounded-xl border border-encre-200">
                <div className="flex items-center gap-2 p-2.5">
                  <div className="flex flex-col">
                    <button type="button" className="rounded p-0.5 text-encre-400 hover:bg-encre-100 disabled:opacity-30"
                      aria-label="Monter cette section" disabled={index === 0}
                      onClick={() => deplacer(index, -1)}>▲</button>
                    <button type="button" className="rounded p-0.5 text-encre-400 hover:bg-encre-100 disabled:opacity-30"
                      aria-label="Descendre cette section" disabled={index === contenu.sections.length - 1}
                      onClick={() => deplacer(index, 1)}>▼</button>
                  </div>

                  <button type="button" className="min-w-0 flex-1 text-left"
                    onClick={() => setOuverte(ouverte === section.id ? null : section.id)}
                    aria-expanded={ouverte === section.id}>
                    <span className="block text-sm font-medium text-encre-900">
                      {SECTIONS_LIBELLES[section.type]}
                    </span>
                    <span className="block truncate text-xs text-encre-500">
                      {"titre" in section && section.titre ? section.titre : "Sans titre"}
                    </span>
                  </button>

                  <button type="button" className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
                    aria-label="Modifier cette section"
                    onClick={() => setOuverte(ouverte === section.id ? null : section.id)}>
                    <Crayon className="size-4" />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-encre-500 hover:bg-red-50 hover:text-red-700"
                    aria-label="Supprimer cette section" onClick={() => supprimer(section.id)}>
                    <Croix className="size-4" />
                  </button>
                </div>

                {ouverte === section.id ? (
                  <div className="border-t border-encre-100 bg-ivoire/60 p-3.5">
                    <ChampsSection section={section} contexte={contexte}
                      onChange={(champs) => majSection(section.id, champs)} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {contenu.sections.length < MAX_SECTIONS ? (
            <div className="mt-4 border-t border-encre-100 pt-4">
              <p className="etiquette">Ajouter une section</p>
              <div className="flex flex-wrap gap-2">
                {TYPES_SECTION.map((type) => (
                  <button key={type} type="button" className="btn-secondaire btn-petit"
                    onClick={() => ajouter(type)}>
                    <Plus className="size-3.5" /> {SECTIONS_LIBELLES[type]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-encre-500">
              Maximum atteint : {MAX_SECTIONS} sections. Au-delà, une page d&apos;accueil
              devient illisible.
            </p>
          )}
        </section>

        {/* Enregistrement */}
        <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-encre-200 bg-white/95 p-3 backdrop-blur lg:bottom-4">
          <button type="button" className="btn-principal" onClick={enregistrer}
            disabled={!modifie || enregistrement || Boolean(proposition)}>
            {enregistrement
              ? <><Rondelle className="size-4" /> Enregistrement…</>
              : "Enregistrer le brouillon"}
          </button>
          <span className="text-xs text-encre-500">
            {proposition
              ? "Décidez d'abord du sort de la proposition."
              : modifie ? "Modifications non enregistrées" : "Tout est enregistré"}
          </span>
        </div>
      </div>

      {/* ------------------------------ Aperçu ------------------------------ */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="titre-section flex items-center gap-2">
            <Oeil className="size-5" /> Aperçu
          </h2>
          {proposition ? <span className="puce puce-vert">Proposition</span> : null}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-encre-200 bg-white">
          <div className="max-h-[36rem] overflow-y-auto">
            <div className="boutique" style={{ ["--couleur" as string]: contexte.couleur }}>
              <RenduSections contenu={affiche} contexte={{ ...contexte, apercu: true }} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-encre-500">
          Rendu avec le même composant que votre boutique publique. Les liens sont
          désactivés dans l&apos;aperçu.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Les champs de chaque type de section
// ---------------------------------------------------------------------------

function ChampsSection({
  section, contexte, onChange,
}: {
  section: Section;
  contexte: ContexteRendu;
  onChange: (champs: Partial<Section>) => void;
}) {
  switch (section.type) {
    case "banniere":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          <Champ libelle="Sous-titre" valeur={section.sous_titre} max={200}
            onChange={(sous_titre) => onChange({ sous_titre } as Partial<Section>)} />
          <Champ libelle="Texte du bouton" valeur={section.bouton} max={40}
            onChange={(bouton) => onChange({ bouton } as Partial<Section>)} />
        </div>
      );

    case "presentation":
    case "texte":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          <Zone libelle="Texte" valeur={section.texte} max={section.type === "texte" ? 3000 : 1200}
            onChange={(texte) => onChange({ texte } as Partial<Section>)} />
        </div>
      );

    case "produits":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          <div>
            <label className="etiquette">Quels produits ?</label>
            <select className="champ" value={section.source === "categorie" ? (section.categorie ?? "") : ""}
              onChange={(e) => onChange(
                (e.target.value
                  ? { source: "categorie", categorie: e.target.value }
                  : { source: "tous", categorie: null }) as Partial<Section>,
              )}>
              <option value="">Tous les produits</option>
              {contexte.categories.map((c) => (
                <option key={c.id} value={c.nom}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiquette">Combien en afficher</label>
            <input type="number" min={2} max={48} className="champ" value={section.limite}
              onChange={(e) => onChange({ limite: Number(e.target.value) || 8 } as Partial<Section>)} />
          </div>
        </div>
      );

    case "categories":
      return (
        <Champ libelle="Titre" valeur={section.titre} max={90}
          onChange={(titre) => onChange({ titre } as Partial<Section>)} />
      );

    case "avantages":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          {section.points.map((point, i) => (
            <div key={i} className="rounded-lg border border-encre-200 bg-white p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Champ libelle={`Point ${i + 1}`} valeur={point.titre} max={60}
                    onChange={(titre) => onChange({
                      points: section.points.map((p, j) => (j === i ? { ...p, titre } : p)),
                    } as Partial<Section>)} />
                  <Champ libelle="Explication" valeur={point.texte} max={200}
                    onChange={(texte) => onChange({
                      points: section.points.map((p, j) => (j === i ? { ...p, texte } : p)),
                    } as Partial<Section>)} />
                </div>
                <button type="button" className="rounded p-1.5 text-encre-400 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Retirer le point ${i + 1}`}
                  onClick={() => onChange({
                    points: section.points.filter((_, j) => j !== i),
                  } as Partial<Section>)}>
                  <Croix className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {section.points.length < 6 ? (
            <button type="button" className="btn-secondaire btn-petit"
              onClick={() => onChange({
                points: [...section.points, { titre: "", texte: "", icone: "etoile" as const }],
              } as Partial<Section>)}>
              <Plus className="size-3.5" /> Ajouter un point
            </button>
          ) : null}
        </div>
      );

    case "questions":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          {section.questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-encre-200 bg-white p-2.5">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Champ libelle={`Question ${i + 1}`} valeur={q.question} max={160}
                    onChange={(question) => onChange({
                      questions: section.questions.map((x, j) => (j === i ? { ...x, question } : x)),
                    } as Partial<Section>)} />
                  <Zone libelle="Réponse" valeur={q.reponse} max={700}
                    onChange={(reponse) => onChange({
                      questions: section.questions.map((x, j) => (j === i ? { ...x, reponse } : x)),
                    } as Partial<Section>)} />
                </div>
                <button type="button" className="rounded p-1.5 text-encre-400 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Retirer la question ${i + 1}`}
                  onClick={() => onChange({
                    questions: section.questions.filter((_, j) => j !== i),
                  } as Partial<Section>)}>
                  <Croix className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {section.questions.length < 10 ? (
            <button type="button" className="btn-secondaire btn-petit"
              onClick={() => onChange({
                questions: [...section.questions, { question: "", reponse: "" }],
              } as Partial<Section>)}>
              <Plus className="size-3.5" /> Ajouter une question
            </button>
          ) : null}
        </div>
      );

    case "contact":
      return (
        <div className="space-y-3">
          <Champ libelle="Titre" valeur={section.titre} max={90}
            onChange={(titre) => onChange({ titre } as Partial<Section>)} />
          <Zone libelle="Texte" valeur={section.texte} max={400}
            onChange={(texte) => onChange({ texte } as Partial<Section>)} />
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" className="size-4.5 accent-vert-700" checked={section.whatsapp}
              onChange={(e) => onChange({ whatsapp: e.target.checked } as Partial<Section>)} />
            Afficher le bouton WhatsApp
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" className="size-4.5 accent-vert-700" checked={section.adresse}
              onChange={(e) => onChange({ adresse: e.target.checked } as Partial<Section>)} />
            Afficher mon adresse
          </label>
        </div>
      );
  }
}

function Champ({
  libelle, valeur, max, onChange,
}: { libelle: string; valeur: string; max: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="etiquette">{libelle}</label>
      <input className="champ" value={valeur} maxLength={max}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Zone({
  libelle, valeur, max, onChange,
}: { libelle: string; valeur: string; max: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="etiquette">{libelle}</label>
      <textarea className="zone-texte" rows={4} value={valeur} maxLength={max}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
