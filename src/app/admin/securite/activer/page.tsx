import QRCode from "qrcode";
import { exigerAdminSansSecondeVerification, lireSecretTotp } from "@/lib/admin";
import { actionActiverDoubleFacteur, actionPreparerDoubleFacteur } from "@/lib/actions-admin";
import { chiffrementConfigure, dechiffrer } from "@/lib/chiffrement";
import { adresseOtpauth, secretLisible } from "@/lib/totp";
import { NON_INDEXABLE } from "@/lib/seo";
import { redirect } from "next/navigation";

export const metadata = { ...NON_INDEXABLE, title: "Activer la seconde vérification" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

/**
 * Activation de la seconde verification.
 *
 * Cette page vit HORS de la coque d'administration, a dessein : la coque
 * exige justement une seconde verification faite, et s'y ranger la ferait
 * se renvoyer vers elle-meme sans fin.
 */
export default async function PageActiver({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdminSansSecondeVerification();
  const params = await searchParams;
  const erreur = lire(params, "erreur");

  const { secret: stocke, actif } = lireSecretTotp(admin.email);
  if (stocke && actif) redirect("/admin/securite/verifier");

  const secret = stocke ? (stocke.includes(":") ? dechiffrer(stocke) : stocke) : null;
  const qr = secret
    ? await QRCode.toDataURL(adresseOtpauth(secret, admin.email), { margin: 1, width: 220 })
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#083c32] px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-[#f8f7f2] p-7 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a5f26]">
          Administration
        </p>
        <h1 className="mt-4 text-2xl font-bold text-[#122f29]">
          Activez la seconde vérification
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#4f635c]">
          L&apos;espace d&apos;administration ne s&apos;ouvre pas avec le seul mot de passe.
          Il faut en plus un code à usage unique, lu dans une application
          d&apos;authentification sur votre téléphone (Google Authenticator, FreeOTP,
          ou votre gestionnaire de mots de passe).
        </p>

        {erreur && (
          <p role="alert" className="mt-5 rounded-lg border border-[#b3261e]/30 bg-[#b3261e]/10 px-4 py-3 text-sm text-[#7d1a15]">
            {erreur}
          </p>
        )}

        {!chiffrementConfigure() && (
          <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>CLE_CHIFFREMENT n&apos;est pas posée.</strong> Le secret sera
            enregistré en clair dans la base. Posez cette variable chez
            l&apos;hébergeur pour qu&apos;il soit chiffré au repos.
          </p>
        )}

        {!secret ? (
          <form action={actionPreparerDoubleFacteur} className="mt-7">
            <button type="submit"
                    className="w-full rounded-lg bg-[#eec477] px-6 py-3.5 text-[15px] font-semibold text-[#05271f] hover:bg-[#f6d492]">
              Créer mon secret
            </button>
          </form>
        ) : (
          <>
            <div className="mt-7 flex flex-col items-center gap-4 rounded-xl border border-[#dfe3da] bg-white p-5">
              {qr && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qr} alt="QR code à scanner avec votre application d'authentification"
                     width={220} height={220} className="h-[220px] w-[220px]" />
              )}
              <div className="text-center">
                <p className="text-xs text-[#4f635c]">Ou saisissez ce code à la main :</p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-[#122f29]">
                  {secretLisible(secret)}
                </p>
              </div>
            </div>

            <form action={actionActiverDoubleFacteur} className="mt-6">
              <label className="block text-sm font-semibold text-[#122f29]" htmlFor="code">
                Code affiché par l&apos;application
              </label>
              <input
                id="code" name="code" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" maxLength={6} required autoFocus
                placeholder="000000"
                className="mt-2 w-full rounded-lg border border-[#dfe3da] bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-[#122f29] outline-offset-2"
              />
              <button type="submit"
                      className="mt-4 w-full rounded-lg bg-[#eec477] px-6 py-3.5 text-[15px] font-semibold text-[#05271f] hover:bg-[#f6d492]">
                Activer
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs text-[#4f635c]">
          Connecté comme {admin.email}
        </p>
      </div>
    </div>
  );
}
