import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { paysServis } from "@/lib/pays";
import { peutDomainePersonnalise } from "@/lib/offres";
import { tous } from "@/lib/db";
import { couleurSure } from "@/lib/modeles";
import { dateHeureFr } from "@/lib/format";
import { FormulaireIdentite } from "@/components/formulaire-identite";
import { FormulaireConditions } from "@/components/formulaire-conditions";
import { FormulaireDomaine } from "@/components/formulaire-domaine";
import { FormulaireMotDePasse, FormulaireAssistance } from "@/components/formulaires-parametres";

export const metadata = { title: "Paramètres" };

export default async function PageParametres() {
  const { boutique, utilisateur } = await exigerSession();
  const domaine = peutDomainePersonnalise(boutique);

  const demandes = tous<{ id: number; sujet: string; statut: string; reponse: string | null; cree_le: string }>(
    `SELECT id, sujet, statut, reponse, cree_le FROM demandes_assistance
      WHERE boutique_id = ? ORDER BY cree_le DESC LIMIT 5`,
    boutique.id,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="titre-page">Paramètres</h1>
        <p className="mt-1 text-sm text-encre-600">
          Votre boutique, vos conditions, votre compte.
        </p>
      </header>

      <FormulaireIdentite
        boutique={{
          id: boutique.id, nom: boutique.nom, description: boutique.description,
          pays: boutique.pays, ville: boutique.ville, quartier: boutique.quartier,
          adresse: boutique.adresse, telephone: boutique.telephone,
          whatsapp: boutique.whatsapp, email: boutique.email,
          modele: boutique.modele, couleur: couleurSure(boutique.couleur),
          logo: boutique.logo_url, slug: boutique.slug,
          titrePartage: boutique.titre_partage, descriptionPartage: boutique.description_partage,
        }}
        pays={paysServis().map((p) => ({ code: p.code, nom: p.nom, villes: p.villes }))}
      />

      <FormulaireConditions
        conditions={{
          vente: boutique.conditions_vente,
          livraison: boutique.conditions_livraison,
          retour: boutique.conditions_retour,
          valideesLe: boutique.conditions_validees_le,
        }}
        slug={boutique.slug}
      />

      <FormulaireDomaine
        permis={domaine.ok}
        raison={domaine.ok ? null : domaine.raison}
        domaine={boutique.domaine}
        jeton={boutique.domaine_jeton}
        verifieLe={boutique.domaine_verifie_le}
        slug={boutique.slug}
      />

      <section className="carte p-5">
        <h2 className="titre-section">Votre compte</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-encre-600">Nom</dt>
            <dd className="font-medium">{utilisateur.nom}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-encre-600">Adresse e-mail</dt>
            <dd className="font-medium">{utilisateur.email}</dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-encre-100 pt-4">
          <FormulaireMotDePasse />
        </div>
      </section>

      <section className="carte p-5">
        <h2 className="titre-section">Assistance</h2>
        <p className="mt-1 text-sm text-encre-600">
          Une question, un problème ? Écrivez-nous.
        </p>

        {demandes.length > 0 ? (
          <ul className="mt-3 divide-y divide-encre-100 text-sm">
            {demandes.map((demande) => (
              <li key={demande.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 font-medium">{demande.sujet}</span>
                  <span className={`puce ${demande.statut === "repondue" ? "puce-vert" : "puce-neutre"}`}>
                    {demande.statut === "repondue" ? "Répondue" : "En attente"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-encre-500">{dateHeureFr(demande.cree_le)}</p>
                {demande.reponse ? (
                  <p className="mt-2 rounded-xl bg-ivoire p-3 text-sm text-encre-700">
                    {demande.reponse}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4">
          <FormulaireAssistance />
        </div>
      </section>

      <p className="text-center text-xs text-encre-500">
        <Link href="/tableau-de-bord/abonnement" className="lien">Gérer mon abonnement</Link>
      </p>
    </div>
  );
}
