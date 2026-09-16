"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePanier } from "./panier";
import {
  actionChiffrer, actionCommander, actionOptionsLivraison,
} from "@/lib/actions-boutique";
import { montant } from "@/lib/format";
import { Camion, Boutique as IconeBoutique, Carte, Alerte } from "./icones";
import { Rondelle } from "./ui";
import type { Devis } from "@/lib/commandes";

type Options = Awaited<ReturnType<typeof actionOptionsLivraison>>;

/**
 * La page de commande.
 *
 * ============================================================================
 *  CE QU'ON DEMANDE, ET RIEN DE PLUS
 * ============================================================================
 *  Nom, téléphone, ville, quartier, repère. C'est ce qu'un livreur utilise
 *  réellement à Dakar : il appelle, on lui dit « après la pharmacie ».
 *  L'adresse détaillée existe, mais en champ facultatif, replié.
 *
 *  Pas de compte, pas de mot de passe, pas d'e-mail obligatoire. Chaque champ
 *  supplémentaire est un client de moins.
 * ============================================================================
 *
 *  Contre le double envoi, deux verrous :
 *   — le bouton se désactive dès le premier clic ;
 *   — une clé d'idempotence, tirée une fois à l'ouverture de la page, part
 *     avec la commande. Le serveur s'en sert pour reconnaître un renvoi
 *     (rechargement, retour arrière, réseau qui bégaie) et rendre la commande
 *     déjà créée au lieu d'en faire une seconde.
 */
export function TunnelCommande({
  slug, nomBoutique, couleur, texteCouleur, arrondi,
}: {
  slug: string; nomBoutique: string; couleur: string; texteCouleur: string; arrondi: string;
}) {
  const routeur = useRouter();
  const { articles, charge, vider } = usePanier(slug);

  const [options, setOptions] = useState<Options | null>(null);
  const [mode, setMode] = useState<"livraison" | "retrait">("livraison");
  const [zoneId, setZoneId] = useState<number | null>(null);
  const [moyen, setMoyen] = useState<"livraison" | "en_ligne">("livraison");
  const [devis, setDevis] = useState<Devis | null>(null);
  const [problemes, setProblemes] = useState<{ code: string; message: string }[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [adresseOuverte, setAdresseOuverte] = useState(false);

  // Tirée UNE fois, au premier rendu, et conservée pour toute la vie de la
  // page. C'est elle qui rend l'envoi idempotent.
  const cle = useRef<string>("");
  if (!cle.current) {
    cle.current = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  useEffect(() => {
    actionOptionsLivraison(slug).then((o) => {
      setOptions(o);
      // On propose ce que la boutique fait vraiment : si elle ne livre pas,
      // le retrait est choisi d'office.
      if (!o.livraison && o.retrait) setMode("retrait");
      if (o.zones.length === 1) setZoneId(o.zones[0].id);
      if (!o.paiementLivraison && o.paiementEnLigne) setMoyen("en_ligne");
    });
  }, [slug]);

  // Rechiffrage à chaque changement de mode, de zone ou de panier.
  useEffect(() => {
    if (!charge || articles.length === 0) return;
    if (mode === "livraison" && !zoneId) { setDevis(null); return; }
    let annule = false;
    actionChiffrer(slug, articles, { mode, zoneId }).then((resultat) => {
      if (annule) return;
      if (resultat.ok) { setDevis(resultat.devis); setProblemes([]); }
      else { setDevis(null); setProblemes(resultat.problemes); }
    });
    return () => { annule = true; };
  }, [slug, articles, mode, zoneId, charge]);

  const zoneChoisie = useMemo(
    () => options?.zones.find((z) => z.id === zoneId) ?? null,
    [options, zoneId],
  );

  if (charge && articles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-encre-300 px-6 py-14 text-center">
        <p className="font-medium">Votre panier est vide</p>
        <Link href={`/b/${slug}/catalogue`} className="btn-secondaire mt-5">
          Voir le catalogue
        </Link>
      </div>
    );
  }

  if (!options || !charge) {
    return <div className="space-y-3" aria-busy="true"><div className="squelette h-64" /></div>;
  }

  async function envoyer(formulaire: FormData) {
    setEnvoi(true);
    setProblemes([]);
    try {
      const resultat = await actionCommander(
        slug,
        articles,
        { mode, zoneId },
        {
          nom: String(formulaire.get("nom") ?? ""),
          telephone: String(formulaire.get("telephone") ?? ""),
          ville: String(formulaire.get("ville") ?? ""),
          quartier: String(formulaire.get("quartier") ?? ""),
          repere: String(formulaire.get("repere") ?? ""),
          adresse: String(formulaire.get("adresse") ?? ""),
          note: String(formulaire.get("note") ?? ""),
        },
        cle.current,
        moyen,
      );

      if (!resultat.ok) {
        setProblemes(resultat.problemes);
        setEnvoi(false);
        return;
      }
      // Le panier n'est vidé qu'une fois la commande écrite en base : si
      // l'envoi échoue, le client retrouve ses articles.
      vider();
      routeur.push(`/b/${slug}/commande/${resultat.reference}?j=${resultat.jeton}`);
    } catch {
      setProblemes([{
        code: "reseau",
        message: "L'envoi a échoué. Votre panier est conservé : réessayez.",
      }]);
      setEnvoi(false);
    }
  }

  const peutEnvoyer = Boolean(devis) && !envoi;

  return (
    <form action={envoyer} className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        {problemes.length > 0 ? (
          <div className="message message-erreur" role="alert">
            <Alerte className="mt-0.5 size-4.5 shrink-0" />
            <ul className="space-y-0.5">
              {problemes.map((p, i) => <li key={i}>{p.message}</li>)}
            </ul>
          </div>
        ) : null}

        {/* ----------------------- Comment recevoir ----------------------- */}
        <section>
          <h2 className="font-semibold">Comment souhaitez-vous recevoir ?</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {options.livraison ? (
              <ChoixCarte
                actif={mode === "livraison"} couleur={couleur}
                onClick={() => setMode("livraison")} arrondi={arrondi}
                icone={<Camion className="size-5" />}
                titre="Livraison"
                texte="Nous vous livrons à l'adresse indiquée."
              />
            ) : null}
            {options.retrait ? (
              <ChoixCarte
                actif={mode === "retrait"} couleur={couleur}
                onClick={() => setMode("retrait")} arrondi={arrondi}
                icone={<IconeBoutique className="size-5" />}
                titre="Retrait en boutique"
                texte={options.retraitAdresse ?? "Vous venez chercher votre commande."}
              />
            ) : null}
          </div>

          {mode === "retrait" && (options.retraitAdresse || options.retraitHoraires) ? (
            <div className="mt-3 rounded-xl bg-ivoire p-3.5 text-sm">
              {options.retraitAdresse ? <p className="font-medium">{options.retraitAdresse}</p> : null}
              {options.retraitHoraires ? (
                <p className="mt-0.5 text-encre-600">{options.retraitHoraires}</p>
              ) : null}
            </div>
          ) : null}

          {mode === "livraison" ? (
            <div className="mt-4">
              <label className="etiquette" htmlFor="zone">Zone de livraison</label>
              {options.zones.length === 0 ? (
                <p className="message message-alerte">
                  Cette boutique n&apos;a pas encore défini de zone de livraison.
                  Choisissez le retrait, ou contactez-la directement.
                </p>
              ) : (
                <select id="zone" className="champ" required
                  value={zoneId ?? ""}
                  onChange={(e) => setZoneId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Choisissez votre zone</option>
                  {options.zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.nom} — {montant(zone.frais, options.devise, options.decimales)}
                      {zone.delai ? ` · ${zone.delai}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : null}
        </section>

        {/* -------------------------- Coordonnées -------------------------- */}
        <section>
          <h2 className="font-semibold">Vos coordonnées</h2>

          <div className="mt-3 space-y-4">
            <div>
              <label className="etiquette" htmlFor="nom">Votre nom</label>
              <input id="nom" name="nom" className="champ" required maxLength={120}
                autoComplete="name" placeholder="Fatou Diouf" />
            </div>

            <div>
              <label className="etiquette" htmlFor="telephone">Téléphone</label>
              <input id="telephone" name="telephone" className="champ" required
                type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67" />
              <p className="aide">
                {nomBoutique} vous appellera sur ce numéro pour confirmer.
              </p>
            </div>

            {mode === "livraison" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="etiquette" htmlFor="ville">Ville</label>
                    {options.villes.length > 0 ? (
                      <input id="ville" name="ville" className="champ" list="villes"
                        maxLength={80} required autoComplete="address-level2" />
                    ) : (
                      <input id="ville" name="ville" className="champ" maxLength={80}
                        required autoComplete="address-level2" />
                    )}
                    <datalist id="villes">
                      {options.villes.map((ville) => <option key={ville} value={ville} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="etiquette" htmlFor="quartier">Quartier</label>
                    <input id="quartier" name="quartier" className="champ" maxLength={80}
                      required placeholder="Sacré-Cœur 3" />
                  </div>
                </div>

                <div>
                  <label className="etiquette" htmlFor="repere">Un repère</label>
                  <input id="repere" name="repere" className="champ" maxLength={160}
                    placeholder="En face de la pharmacie du Point E" />
                  <p className="aide">
                    C&apos;est ce qui aide le plus le livreur à vous trouver.
                  </p>
                </div>

                {/* Repliée : elle sert rarement, et un champ de plus visible
                    fait abandonner. */}
                <div>
                  <button type="button"
                    className="text-sm font-medium text-encre-600 underline-offset-4 hover:underline"
                    onClick={() => setAdresseOuverte(!adresseOuverte)}>
                    {adresseOuverte ? "Masquer" : "Ajouter"} une adresse détaillée (facultatif)
                  </button>
                  {adresseOuverte ? (
                    <input name="adresse" className="champ mt-2" maxLength={240}
                      placeholder="Villa 42, rue MZ-108" autoComplete="street-address" />
                  ) : null}
                </div>
              </>
            ) : null}

            <div>
              <label className="etiquette" htmlFor="note">
                Un mot pour la boutique <span className="font-normal text-encre-500">(facultatif)</span>
              </label>
              <textarea id="note" name="note" className="zone-texte" rows={2} maxLength={500}
                placeholder="Livrer après 17 h si possible" />
            </div>
          </div>
        </section>

        {/* --------------------------- Paiement --------------------------- */}
        <section>
          <h2 className="font-semibold">Paiement</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {options.paiementLivraison ? (
              <ChoixCarte
                actif={moyen === "livraison"} couleur={couleur} arrondi={arrondi}
                onClick={() => setMoyen("livraison")}
                icone={<Carte className="size-5" />}
                titre={mode === "retrait" ? "Paiement au retrait" : "Paiement à la livraison"}
                texte="Vous payez en recevant votre commande."
              />
            ) : null}
            {options.paiementEnLigne ? (
              <ChoixCarte
                actif={moyen === "en_ligne"} couleur={couleur} arrondi={arrondi}
                onClick={() => setMoyen("en_ligne")}
                icone={<Carte className="size-5" />}
                titre="Payer maintenant"
                texte="Vous serez redirigé vers le paiement sécurisé."
              />
            ) : null}
          </div>
          {!options.paiementLivraison && !options.paiementEnLigne ? (
            <p className="message message-alerte mt-3">
              Cette boutique n&apos;a activé aucun moyen de paiement. Contactez-la
              directement pour commander.
            </p>
          ) : null}
        </section>
      </div>

      {/* ------------------------- Récapitulatif ------------------------- */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className={`border border-encre-200 bg-white p-5 ${arrondi}`}>
          <h2 className="font-semibold">Votre commande</h2>

          {devis ? (
            <>
              <ul className="mt-3 space-y-2 text-sm">
                {devis.articles.map((article) => (
                  <li key={`${article.produitId}-${article.varianteId ?? 0}`} className="flex gap-3">
                    <span className="flex-1">
                      {article.quantite} × {article.nom}
                      {article.varianteTexte ? (
                        <span className="block text-xs text-encre-500">{article.varianteTexte}</span>
                      ) : null}
                    </span>
                    <span className="font-medium">
                      {montant(article.totalLigne, devis.devise_libelle, options.decimales)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1.5 border-t border-encre-200 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-encre-600">Sous-total</dt>
                  <dd>{montant(devis.sousTotal, devis.devise_libelle, options.decimales)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-encre-600">
                    {devis.modeLivraison === "retrait" ? "Retrait en boutique" : `Livraison${zoneChoisie ? ` · ${zoneChoisie.nom}` : ""}`}
                  </dt>
                  <dd>
                    {devis.fraisLivraison === 0
                      ? "Offert"
                      : montant(devis.fraisLivraison, devis.devise_libelle, options.decimales)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-encre-200 pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{montant(devis.total, devis.devise_libelle, options.decimales)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-encre-500">
              {mode === "livraison" && !zoneId
                ? "Choisissez votre zone de livraison pour voir le total."
                : "Calcul du total…"}
            </p>
          )}

          <button type="submit" disabled={!peutEnvoyer}
            className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 px-6
                        text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${arrondi}`}
            style={{ backgroundColor: couleur, color: texteCouleur }}>
            {envoi ? <><Rondelle className="size-4" /> Envoi de votre commande…</> : "Confirmer ma commande"}
          </button>

          <p className="mt-3 text-xs leading-relaxed text-encre-500">
            En confirmant, vous transmettez votre commande à {nomBoutique}. Le montant
            est calculé et vérifié par NOVA Boutique.{" "}
            <Link href={`/b/${slug}/conditions`} className="underline">
              Conditions de vente
            </Link>
          </p>
        </div>
      </aside>
    </form>
  );
}

function ChoixCarte({
  actif, onClick, icone, titre, texte, couleur, arrondi,
}: {
  actif: boolean; onClick: () => void; icone: React.ReactNode;
  titre: string; texte: string; couleur: string; arrondi: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      className={`flex items-start gap-3 border p-3.5 text-left transition-colors ${arrondi}
        ${actif ? "bg-white" : "border-encre-200 bg-white hover:bg-encre-50"}`}
      style={actif ? { borderColor: couleur, boxShadow: `inset 0 0 0 1px ${couleur}` } : undefined}>
      <span className="mt-0.5 shrink-0" style={{ color: actif ? couleur : undefined }}>{icone}</span>
      <span>
        <span className="block text-sm font-semibold">{titre}</span>
        <span className="mt-0.5 block text-xs text-encre-600">{texte}</span>
      </span>
    </button>
  );
}
