import Link from "next/link";
import { exigerSession } from "@/lib/auth";
import { adminPour, administrationConfiguree, lireSecretTotp } from "@/lib/admin";
import { chiffrementConfigure } from "@/lib/chiffrement";
import { NON_INDEXABLE } from "@/lib/seo";

export const metadata = { ...NON_INDEXABLE, title: "Accès à l'administration" };

/**
 * « Pourquoi je n'ai pas l'administration ? »
 *
 * Cette page existe parce que la question s'est posée trois fois, et qu'a
 * chaque fois il a fallu comparer a la main une adresse affichee nulle part
 * avec une variable posee chez l'hebergeur. Un renvoi silencieux vers le
 * tableau de bord ne dit rien ; celui qui cherche ne peut pas savoir ce qui
 * manque. La page repond a sa place.
 *
 * CE QU'ELLE NE DIT PAS : la liste des administrateurs. Elle repond
 * seulement « votre adresse en fait-elle partie, oui ou non » — ce que la
 * personne apprend de toute facon en etant refusee. Savoir QUI est
 * administrateur n'aiderait personne a se depanner, et aiderait quelqu'un a
 * choisir sa cible.
 */
export default async function PageAccesAdmin() {
  const { utilisateur } = await exigerSession();
  const admin = adminPour(utilisateur.email);
  const configuree = administrationConfiguree();
  const totp = admin ? lireSecretTotp(admin.email) : { secret: null, actif: false };

  const etapes = [
    {
      titre: "La variable ADMIN_EMAILS est posée chez l'hébergeur",
      ok: configuree,
      quoi: configuree
        ? "Au moins une adresse y figure."
        : "Elle est vide ou absente : personne ne peut entrer dans l'administration.",
      comment: configuree ? null : (
        <>
          Dans hPanel, ouvrez votre site puis <strong>Variables d&apos;environnement</strong>.
          Créez une ligne dont le champ <strong>Nom</strong> contient exactement{" "}
          <code className="rounded bg-black/5 px-1">ADMIN_EMAILS</code> et dont le champ{" "}
          <strong>Valeur</strong> contient votre adresse e-mail, en minuscules. Puis
          relancez un déploiement.
        </>
      ),
    },
    {
      titre: "Votre adresse figure dans cette liste",
      ok: Boolean(admin),
      quoi: admin
        ? `Reconnue : ${admin.email}.`
        : `L'adresse avec laquelle vous êtes connecté — ${utilisateur.email} — n'y est pas.`,
      comment: admin ? null : (
        <>
          Deux causes possibles. Soit la valeur de{" "}
          <code className="rounded bg-black/5 px-1">ADMIN_EMAILS</code> ne contient pas{" "}
          <strong>{utilisateur.email}</strong> : corrigez-la chez l&apos;hébergeur, en
          minuscules, sans espace avant ni après, et redéployez. Soit vous êtes connecté
          avec un autre compte : déconnectez-vous et reconnectez-vous avec la bonne adresse.
        </>
      ),
    },
    {
      titre: "La seconde vérification est activée",
      ok: Boolean(admin && totp.secret && totp.actif),
      quoi: !admin
        ? "À faire une fois les deux points ci-dessus réglés."
        : totp.secret && totp.actif
          ? "Active. Un code vous sera demandé à chaque entrée."
          : "Pas encore activée. C'est la dernière étape.",
      comment: admin && !(totp.secret && totp.actif) ? (
        <>
          Installez <strong>Google Authenticator</strong> sur votre téléphone, puis ouvrez{" "}
          <Link href="/admin" className="font-semibold text-brand-700 hover:underline">
            l&apos;espace d&apos;administration
          </Link>{" "}
          : il vous proposera de scanner un QR code.
        </>
      ) : null,
    },
  ];

  const tout = etapes.every((e) => e.ok);

  return (
    <div className="min-h-screen bg-[#f8f7f2] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-[#dfe3da] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5f26]">
            Administration
          </p>
          <h1 className="mt-4 text-2xl font-bold text-[#122f29]">
            {tout ? "Tout est en place" : "Il manque quelque chose"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#4f635c]">
            Vous êtes connecté avec <strong className="text-[#122f29]">{utilisateur.email}</strong>.
            Voici ce qui décide de l&apos;accès à l&apos;espace d&apos;administration, point
            par point.
          </p>

          <ol className="mt-7 space-y-5">
            {etapes.map((e, i) => (
              <li key={e.titre} className="flex gap-4">
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    e.ok ? "bg-[#0f5546] text-white" : "bg-[#b3261e]/12 text-[#7d1a15]"
                  }`}
                >
                  {e.ok ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#122f29]">{e.titre}</p>
                  <p className="mt-0.5 text-sm text-[#4f635c]">
                    <span className="sr-only">{e.ok ? "Fait. " : "À faire. "}</span>
                    {e.quoi}
                  </p>
                  {e.comment && (
                    <div className="mt-2 rounded-lg bg-[#eec477]/15 px-4 py-3 text-sm leading-relaxed text-[#6b4a12]">
                      {e.comment}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {tout && (
            <Link
              href="/admin"
              className="mt-8 inline-flex rounded-lg bg-[#eec477] px-6 py-3.5 text-[15px] font-semibold text-[#05271f] hover:bg-[#f6d492]"
            >
              Ouvrir l&apos;administration
            </Link>
          )}

          {admin && !chiffrementConfigure() && (
            <p className="mt-7 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              <strong>CLE_CHIFFREMENT n&apos;est pas posée.</strong> Ce n&apos;est pas
              bloquant, mais le secret de votre seconde vérification sera enregistré en
              clair dans la base. Posez cette variable chez l&apos;hébergeur avant
              d&apos;activer le code.
            </p>
          )}

          <p className="mt-7 border-t border-[#dfe3da] pt-5 text-xs leading-relaxed text-[#4f635c]">
            Après chaque modification d&apos;une variable chez l&apos;hébergeur, il faut
            <strong> relancer un déploiement</strong> : le site ne relit ces valeurs qu&apos;au
            démarrage. Rechargez ensuite cette page.
          </p>

          <Link href="/dashboard" className="mt-5 inline-block text-sm font-semibold text-brand-700 hover:underline">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
