import { adressesAdminVisibles, equipeAdmin, exigerAdmin, ROLES } from "@/lib/admin";
import {
  actionDesactiverMembre, actionEnregistrerMembre, actionReinitialiserDoubleFacteur,
} from "@/lib/actions-admin";
import { FUSEAU } from "@/lib/admin-donnees";
import { dateHeureFr } from "@/lib/format";
import { Carte, Etiquette, Message, Tableau, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Équipe" };

type Params = { [c: string]: string | string[] | undefined };
const lire = (p: Params, c: string) => (Array.isArray(p[c]) ? p[c][0] : p[c]) ?? "";

export default async function PageEquipe({ searchParams }: { searchParams: Promise<Params> }) {
  const { admin } = await exigerAdmin("admins.gerer");
  const params = await searchParams;
  const racine = adressesAdminVisibles();
  const membres = equipeAdmin();

  return (
    <>
      <TitrePage titre="Équipe d'administration" sous={`Heures en ${FUSEAU}.`} />
      <Message ok={lire(params, "ok")} erreur={lire(params, "erreur")} />

      <Carte className="mb-6 p-5">
        <h2 className="font-semibold text-[var(--adm-encre)]">D&apos;où viennent les droits</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--adm-encre-2)]">
          Les <strong>super administrateurs</strong> sont désignés par la variable{" "}
          <code className="rounded bg-black/5 px-1">ADMIN_EMAILS</code>, chez l&apos;hébergeur.
          Cette liste ne se modifie pas depuis cette page, et c&apos;est délibéré : aucune
          faille de l&apos;application ne peut donner à quelqu&apos;un les pleins droits, et
          personne ne peut se retirer les siens par mégarde.
        </p>
        <p className="mt-2 text-sm text-[var(--adm-encre-2)]">
          Actuellement : {racine.length === 0
            ? <Etiquette ton="rouge">Aucune adresse racine — l&apos;administration est fermée</Etiquette>
            : <strong>{racine.join(", ")}</strong>}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--adm-encre-2)]">
          Les autres rôles s&apos;accordent ci-dessous. Chacun n&apos;ouvre que ce dont il a
          besoin, et chaque changement part au journal.
        </p>
      </Carte>

      {/* `min-w-0` : sans lui, une colonne de grille refuse de descendre sous
          la largeur de son contenu, et le tableau — large par nature — poussait
          la page entière à déborder latéralement, à toutes les tailles. */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Carte className="min-w-0">
          <div className="border-b border-[var(--adm-bord)] px-5 py-4">
            <h2 className="font-semibold text-[var(--adm-encre)]">Membres</h2>
          </div>
          <Tableau entetes={["Adresse", "Rôle", "2ᵉ vérification", "Dernière entrée", "Actions"]}>
            {membres.map((m) => {
              const estRacine = racine.includes(m.email);
              return (
                <tr key={m.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--adm-encre)]">{m.email}</p>
                    {m.nom && <p className="text-xs text-[var(--adm-encre-2)]">{m.nom}</p>}
                    {!m.actif && <p className="mt-1"><Etiquette ton="gris">Accès retiré</Etiquette></p>}
                  </td>
                  <td className="px-4 py-3">
                    {estRacine
                      ? <Etiquette ton="ambre">Super administrateur (variable)</Etiquette>
                      : ROLES[m.role as keyof typeof ROLES]?.libelle ?? m.role}
                  </td>
                  <td className="px-4 py-3">
                    {m.totp_actif
                      ? <Etiquette ton="vert">Active</Etiquette>
                      : <Etiquette ton="rouge">À activer</Etiquette>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--adm-encre-2)]">
                    {m.derniere_connexion_le ? dateHeureFr(m.derniere_connexion_le) : "Jamais"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <form action={actionReinitialiserDoubleFacteur}>
                        <input type="hidden" name="email" value={m.email} />
                        <button type="submit" className="text-left text-xs font-semibold text-[var(--adm-encre-2)] hover:underline">
                          Réinitialiser la 2ᵉ vérification
                        </button>
                      </form>
                      {!estRacine && m.actif && m.email !== admin.email && (
                        <form action={actionDesactiverMembre}>
                          <input type="hidden" name="email" value={m.email} />
                          <button type="submit" className="text-left text-xs font-semibold text-[#7d1a15] hover:underline">
                            Retirer l&apos;accès
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        </Carte>

        <Carte className="p-5">
          <h2 className="font-semibold text-[var(--adm-encre)]">Accorder un accès</h2>
          <form action={actionEnregistrerMembre} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="email">
                Adresse e-mail
              </label>
              <input id="email" name="email" type="email" required placeholder="prenom@sengestion.sn"
                     className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="nom">Nom</label>
              <input id="nom" name="nom" placeholder="Facultatif"
                     className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--adm-encre-2)]" htmlFor="role">Rôle</label>
              <select id="role" name="role" required defaultValue="support"
                      className="w-full rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm">
                {(["support", "moderateur", "facturation"] as const).map((r) => (
                  <option key={r} value={r}>{ROLES[r].libelle}</option>
                ))}
              </select>
            </div>
            <button type="submit"
                    className="w-full rounded-lg bg-[var(--adm-dore)] px-4 py-2.5 text-sm font-semibold text-[var(--adm-vert-nuit)] hover:bg-[#f6d492]">
              Enregistrer
            </button>
          </form>
          <dl className="mt-5 space-y-3 border-t border-[var(--adm-bord)] pt-4">
            {(["support", "moderateur", "facturation"] as const).map((r) => (
              <div key={r}>
                <dt className="text-xs font-semibold text-[var(--adm-encre)]">{ROLES[r].libelle}</dt>
                <dd className="text-xs text-[var(--adm-encre-2)]">{ROLES[r].description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--adm-encre-2)]">
            La personne devra d&apos;abord avoir un compte d&apos;agence à cette adresse,
            puis activer sa seconde vérification à sa première entrée.
          </p>
        </Carte>
      </div>
    </>
  );
}
