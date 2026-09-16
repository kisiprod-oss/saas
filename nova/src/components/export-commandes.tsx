"use client";

import { useState } from "react";
import { actionExporterCommandes } from "@/lib/actions-commandes";
import { Telecharger } from "./icones";
import { Rondelle } from "./ui";

/**
 * Le bouton d'export.
 *
 * Le CSV est fabrique cote serveur (ou vivent les donnees et les regles
 * d'echappement) puis remis au navigateur sous forme de fichier. Passer par
 * un `Blob` plutot que par une route de telechargement evite d'exposer une
 * adresse qui rendrait des commandes sans verifier la session.
 */
export function ExportCommandes({
  filtre,
}: { filtre: { statut?: string; paiement?: string; q?: string; depuis?: string; jusqua?: string } }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function exporter() {
    setEnCours(true);
    setErreur(null);
    try {
      const fichier = await actionExporterCommandes({
        statut: filtre.statut, paiement: filtre.paiement,
        recherche: filtre.q, depuis: filtre.depuis, jusqua: filtre.jusqua,
      });
      const blob = new Blob([fichier.contenu], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = fichier.nom;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErreur("L'export a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="text-right">
      <button type="button" className="btn-secondaire" onClick={exporter} disabled={enCours}>
        {enCours ? <Rondelle className="size-4" /> : <Telecharger className="size-4" />}
        Exporter
      </button>
      {erreur ? <p className="mt-1 text-xs text-red-700">{erreur}</p> : null}
    </div>
  );
}
