import { exigerAdmin } from "@/lib/admin";
import { etatIntegrations, FUSEAU } from "@/lib/admin-donnees";
import { Carte, Etiquette, TitrePage } from "@/components/admin-ui";

export const metadata = { title: "Paramètres" };

/**
 * Etat des raccordements.
 *
 * ON N'AFFICHE QUE « POSEE » OU « ABSENTE ». Jamais la valeur d'une cle,
 * jamais un extrait, jamais les derniers caracteres : une cle a moitie
 * montree reste une cle a moitie divulguee, et elle finit dans la capture
 * d'ecran qu'on envoie au support. Les secrets restent chez l'hebergeur.
 *
 * Cette page ne DECLENCHE rien non plus : enregistrer un reglage ne doit
 * jamais partir en envoi collectif.
 */
export default async function PageParametres() {
  await exigerAdmin("parametres.lire");
  const integrations = etatIntegrations();
  const manquantes = integrations.filter((i) => !i.configuree);

  return (
    <>
      <TitrePage
        titre="Paramètres et intégrations"
        sous={`État des raccordements, lu dans les variables d'environnement. Heures en ${FUSEAU}.`}
      />

      {manquantes.length > 0 && (
        <Carte className="mb-5 border-[#eec477] bg-[#eec477]/15 p-5">
          <p className="text-sm font-semibold text-[#6b4a12]">
            {manquantes.length} raccordement(s) à configurer
          </p>
          <p className="mt-1 text-sm text-[#6b4a12]">
            Les fonctions qui en dépendent ne marchent pas tant que la variable
            n&apos;est pas posée chez l&apos;hébergeur, puis le site redéployé.
          </p>
        </Carte>
      )}

      <Carte>
        <ul className="divide-y divide-[var(--adm-bord)]">
          {integrations.map((i) => (
            <li key={i.nom} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--adm-encre)]">{i.nom}</p>
                <p className="mt-0.5 text-sm text-[var(--adm-encre-2)]">{i.role}</p>
                <p className="mt-1 text-xs text-[var(--adm-encre-2)]">{i.detail}</p>
              </div>
              {i.configuree
                ? <Etiquette ton="vert">Configurée</Etiquette>
                : <Etiquette ton="rouge">Non configurée</Etiquette>}
            </li>
          ))}
        </ul>
      </Carte>

      <Carte className="mt-6 p-5">
        <h2 className="font-semibold text-[var(--adm-encre)]">Ce qui n&apos;est pas raccordé</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--adm-encre-2)]">
          <li>
            <strong className="text-[var(--adm-encre)]">Brevo.</strong> Le projet envoie ses
            e-mails par SMTP, sans interface Brevo. Si vous utilisez Brevo, ses
            identifiants SMTP suffisent : rien d&apos;autre n&apos;est à brancher.
          </li>
          <li>
            <strong className="text-[var(--adm-encre)]">WhatsApp.</strong> Les relances
            s&apos;ouvrent dans WhatsApp depuis le navigateur de l&apos;agence, avec le
            message pré-écrit. Aucune interface WhatsApp Business n&apos;est connectée :
            c&apos;est l&apos;agence qui appuie sur « envoyer ».
          </li>
          <li>
            <strong className="text-[var(--adm-encre)]">Signalements et tickets.</strong>
            {" "}Aucune table ne les porte encore. Le tableau de bord le dit plutôt que
            d&apos;afficher zéro.
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-[var(--adm-encre-2)]">
          Les variables se posent dans le panneau de l&apos;hébergeur, jamais dans le code
          ni dans cette page. Aucune valeur de secret n&apos;est lisible ici, ni dans les
          journaux.
        </p>
      </Carte>
    </>
  );
}
