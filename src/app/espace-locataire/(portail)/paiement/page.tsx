import Link from "next/link";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import { un } from "@/lib/db";
import { confirmerParJeton } from "@/lib/confirmation-paiement";
import { fcfa } from "@/lib/format";
import { Alerte, Carte } from "@/components/ui";

export const metadata = { title: "Paiement" };
export const dynamic = "force-dynamic";

type Params = { [cle: string]: string | string[] | undefined };

/**
 * Retour du locataire apres un paiement en ligne.
 *
 * Le fournisseur previent le serveur de son cote (webhook), mais cette
 * notification peut arriver avec du retard, ou se perdre. On reverifie donc
 * ici aussi : le locataire voit le bon resultat tout de suite, sans avoir a
 * rafraichir en esperant.
 *
 * La verification est la meme fonction que celle du webhook, donc les memes
 * garde-fous s'appliquent — et un second passage ne credite rien deux fois.
 */
export default async function PageRetourPaiement({ searchParams }: { searchParams: Promise<Params> }) {
  const locataire = await exigerSessionLocataire();
  const params = await searchParams;
  const jeton = (Array.isArray(params.token) ? params.token[0] : params.token) ?? "";

  let etat: "payee" | "en_attente" | "abandonnee" | "inconnu" = "inconnu";
  let montant = 0;

  if (jeton) {
    // On ne confirme que si ce jeton appartient bien a ce locataire :
    // un jeton copie d'ailleurs ne doit rien declencher ici.
    const transaction = un<{ montant: number }>(
      "SELECT montant FROM transactions WHERE jeton = ? AND locataire_id = ?",
      jeton, locataire.id,
    );

    if (transaction) {
      montant = transaction.montant;
      const resultat = await confirmerParJeton(jeton);
      if (resultat.ok) {
        etat = resultat.statut === "deja_traitee" ? "payee" : resultat.statut;
      }
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {etat === "payee" ? "Paiement confirmé" : "Suivi de votre paiement"}
      </h1>

      <div className="mt-5">
        {etat === "payee" && (
          <Alerte type="succes">
            Votre règlement de <strong>{fcfa(montant)}</strong> a bien été encaissé.
            Votre quittance est à jour : vous n&apos;avez rien d&apos;autre à faire.
          </Alerte>
        )}
        {etat === "en_attente" && (
          <Alerte type="info">
            Votre paiement est en cours de traitement par l&apos;opérateur. Cela prend
            en général moins d&apos;une minute. Revenez sur cette page dans un instant :
            votre quittance se mettra à jour toute seule.
          </Alerte>
        )}
        {etat === "abandonnee" && (
          <Alerte type="erreur">
            Le paiement n&apos;a pas abouti — il a été annulé, ou l&apos;opérateur
            l&apos;a refusé. Aucun montant n&apos;a été prélevé. Vous pouvez réessayer.
          </Alerte>
        )}
        {etat === "inconnu" && (
          <Alerte type="info">
            Nous n&apos;avons pas retrouvé ce paiement. S&apos;il a bien été débité,
            il apparaîtra sur votre quittance dès sa confirmation par l&apos;opérateur.
          </Alerte>
        )}
      </div>

      <Carte className="mt-5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/espace-locataire" className="btn-primaire flex-1 py-3">
            Voir mes quittances
          </Link>
          {etat !== "payee" && (
            <Link href="/espace-locataire/payer" className="btn-secondaire flex-1 py-3">
              Retourner au paiement
            </Link>
          )}
        </div>
      </Carte>
    </>
  );
}
