import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth";
import { googleConfigure, lienAutorisationGoogle } from "@/lib/google";

/** Point de depart de la connexion Google : on envoie l'agence chez Google. */
export async function GET() {
  if (await utilisateurCourant()) redirect("/dashboard");

  if (!googleConfigure()) {
    redirect("/connexion?erreur=" + encodeURIComponent(
      "La connexion Google n'est pas encore activée sur ce site.",
    ));
  }

  redirect(await lienAutorisationGoogle());
}
