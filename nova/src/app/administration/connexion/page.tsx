import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminCourant, preparerAdministrateur } from "@/lib/admin";
import { FormulaireAdmin } from "@/components/formulaire-admin";
import { Embleme } from "@/components/marque";
import { Cadenas } from "@/components/icones";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

/**
 * La connexion a l'administration.
 *
 * Hors du groupe (espace) : c'est la seule page de /administration qui ne
 * passe pas par `exigerAdmin()`, sinon elle se redirigerait vers elle-meme.
 *
 * Si aucune variable d'environnement d'administrateur n'est posee, la page le
 * dit franchement au lieu d'afficher un formulaire qui ne marchera jamais.
 */
export default async function PageConnexionAdmin() {
  if (await adminCourant()) redirect("/administration");
  const configure = preparerAdministrateur();

  return (
    <div className="flex min-h-dvh items-center justify-center bg-encre-900 px-4">
      <main id="contenu" className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 text-white">
          <Embleme className="size-8" />
          <span className="font-bold">Administration NOVA</span>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6">
          <h1 className="flex items-center gap-2 text-lg font-bold text-encre-900">
            <Cadenas className="size-5 text-encre-400" /> Accès réservé
          </h1>

          {configure ? (
            <div className="mt-5">
              <FormulaireAdmin />
            </div>
          ) : (
            <div className="mt-4 message message-alerte">
              <div>
                <p className="font-semibold">Aucun compte administrateur</p>
                <p className="mt-1">
                  Posez <code className="font-mono text-xs">NOVA_ADMIN_EMAIL</code> et{" "}
                  <code className="font-mono text-xs">NOVA_ADMIN_MOTDEPASSE</code>{" "}
                  (12 caractères minimum) dans l&apos;environnement du serveur, puis
                  redémarrez. Le compte est créé au premier chargement de cette page.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-encre-400">
          Toute action est enregistrée au journal.
        </p>
      </main>
    </div>
  );
}
