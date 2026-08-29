import { telephoneFr } from "@/lib/format";
import { codeLisible } from "@/lib/verification";
import type { Agence } from "@/lib/auth";

/**
 * Le papier a en-tete de l'agence, commun a la quittance et au bail.
 *
 * Trois elements y jouent des roles differents, et il vaut mieux ne pas les
 * confondre :
 *
 *  • le filigrane et le cachet sont des ORNEMENTS DISSUASIFS. Ils rendent
 *    l'imitation penible et le document reconnaissable au premier coup
 *    d'oeil. Ils ne prouvent rien : une photocopie les reproduit.
 *
 *  • le code de verification et son QR sont la SEULE VRAIE PREUVE. Ils
 *    renvoient a une page publique servie par le site de l'agence, ou
 *    n'importe qui peut confirmer que le document existe et que les
 *    montants concordent.
 *
 *  • la signature reste MANUSCRITE. Le cachet marque l'agence ; il ne
 *    signe pas a la place d'une personne. On imprime un trait a signer,
 *    jamais une signature toute faite.
 */

/** Filigrane : le logo de l'agence, tres pale, derriere tout le document. */
export function Filigrane({ agence }: { agence: Agence }) {
  if (!agence.logo_url) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={agence.logo_url}
        alt=""
        className="w-[75%] max-w-none opacity-[0.06] impression-couleurs"
      />
    </div>
  );
}

/** En-tete : logo en couleur a gauche, identite legale de l'agence. */
export function EnTeteAgence({ agence }: { agence: Agence }) {
  return (
    <div>
      {agence.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agence.logo_url}
          alt={agence.nom}
          className="mb-3 h-14 object-contain impression-couleurs"
        />
      ) : null}
      <h1 className="text-xl font-bold text-slate-900">{agence.nom}</h1>
      <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
        {agence.adresse && <p>{agence.adresse}</p>}
        {agence.ville && <p>{agence.ville}, Sénégal</p>}
        {agence.telephone && <p>Tél. {telephoneFr(agence.telephone)}</p>}
        {agence.email && <p>{agence.email}</p>}
        {agence.ninea && <p>NINEA : {agence.ninea}</p>}
        {agence.rccm && <p>RCCM : {agence.rccm}</p>}
      </div>
    </div>
  );
}

/**
 * Cachet circulaire de l'agence.
 *
 * Marque l'agence, pas une personne : il ne remplace pas une signature et
 * ne prouve rien a lui seul. Le nom est tronque a ce que le disque peut
 * contenir sans devenir illisible.
 */
export function CachetAgence({ agence }: { agence: Agence }) {
  const nom = agence.nom.length > 22 ? `${agence.nom.slice(0, 21)}…` : agence.nom;
  return (
    <div
      aria-hidden
      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-brand-700/60 p-1 impression-couleurs"
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-brand-700/40 px-2 text-center">
        {agence.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={agence.logo_url} alt="" className="mb-0.5 h-6 object-contain opacity-80" />
        ) : null}
        <span className="text-[7px] font-bold uppercase leading-tight tracking-wide text-brand-800">
          {nom}
        </span>
        {agence.ville && (
          <span className="text-[6px] uppercase tracking-widest text-brand-700/70">
            {agence.ville}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Bloc de verification : QR code et code en clair.
 *
 * Le code est ecrit en toutes lettres a cote du QR — beaucoup de gens n'ont
 * pas de lecteur de QR sous la main, et le code doit rester utilisable
 * depuis un telephone basique, en le tapant sur la page de verification.
 */
export function BlocVerification({
  code, qr, lien,
}: { code: string; qr: string; lien: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-20 w-20 shrink-0 impression-couleurs [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qr }}
      />
      <div className="text-[9px] leading-snug text-slate-600">
        <p className="font-semibold text-slate-800">Vérifier ce document</p>
        <p className="mt-0.5">Scannez, ou saisissez le code sur&nbsp;:</p>
        <p className="break-all">{lien.replace(/^https?:\/\//, "").replace(/\/verifier\/.*$/, "/verifier")}</p>
        <p className="mt-1 font-mono text-[10px] font-bold tracking-wider text-slate-900">
          {codeLisible(code)}
        </p>
      </div>
    </div>
  );
}

/**
 * Bande de bas de page.
 *
 * Elle dit ce que le document est reellement : emis par l'agence, et
 * verifiable en ligne. Elle ne dit PAS qu'il est « infalsifiable » — ce
 * serait faux, un papier se copie, et le locataire qui s'y fierait serait
 * trompe. La verification en ligne, elle, est verifiable.
 */
export function BandeSecurite({ agence }: { agence: Agence }) {
  return (
    <div className="mt-6 rounded bg-brand-800 px-4 py-2 text-center text-[9px] leading-snug text-white impression-couleurs">
      Document généré électroniquement par {agence.nom}. Son authenticité se
      vérifie en ligne avec le code ci-dessus : sans cette vérification, une
      copie papier ne prouve rien.
    </div>
  );
}
