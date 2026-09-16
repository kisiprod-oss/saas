import { exigerSession } from "@/lib/auth";
import { clients } from "@/lib/requetes";
import { paysDe } from "@/lib/pays";
import { montant, dateFr } from "@/lib/format";
import { EcranVide } from "@/components/ui";
import { Personnes, Recherche, Whatsapp, Telephone } from "@/components/icones";

export const metadata = { title: "Clients" };

/**
 * Le carnet de clients.
 *
 * Il se remplit tout seul a partir des commandes : un client, c'est un numero
 * de telephone qui a commande. Aucune saisie manuelle, aucune inscription
 * demandee au client — c'est justement ce qui fait passer les commandes.
 */
export default async function PageClients({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const { boutique } = await exigerSession();
  const { q } = await searchParams;
  const pays = paysDe(boutique.pays);

  const liste = clients(boutique.id, q);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="titre-page">Clients</h1>
        <p className="mt-1 text-sm text-encre-600">
          {liste.length} client{liste.length > 1 ? "s" : ""}. Cette liste se construit
          à partir de vos commandes.
        </p>
      </header>

      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Recherche className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-encre-400" />
          <input name="q" defaultValue={q} className="champ pl-9"
            placeholder="Nom ou téléphone" aria-label="Chercher un client" />
        </div>
        <button type="submit" className="btn-secondaire">Chercher</button>
      </form>

      {liste.length === 0 ? (
        <EcranVide
          icone={<Personnes className="size-6" />}
          titre={q ? "Aucun client ne correspond" : "Aucun client pour l'instant"}
          texte={q
            ? "Essayez avec un autre nom ou un autre numéro."
            : "Dès votre première commande, le client apparaît ici."}
        />
      ) : (
        <ul className="space-y-2">
          {liste.map((client) => {
            const chiffres = client.telephone.replace(/\D/g, "");
            return (
              <li key={client.id} className="carte flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-encre-900">{client.nom}</p>
                  <p className="mt-0.5 text-sm text-encre-600">{client.telephone}</p>
                  <p className="mt-0.5 text-xs text-encre-500">
                    {[client.quartier, client.ville].filter(Boolean).join(", ") || "Adresse non renseignée"}
                    {client.derniere_commande_le ? ` · dernière commande le ${dateFr(client.derniere_commande_le)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-encre-900">
                    {client.nb_commandes} commande{client.nb_commandes > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-vert-700">
                    {montant(client.total_encaisse, pays.devise_libelle)} encaissés
                  </p>
                  {client.total_commande > client.total_encaisse ? (
                    <p className="text-xs text-terre-600">
                      {montant(client.total_commande - client.total_encaisse, pays.devise_libelle)} dus
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <a href={`tel:${client.telephone}`} className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
                    aria-label={`Appeler ${client.nom}`}>
                    <Telephone className="size-4" />
                  </a>
                  {chiffres.length >= 8 ? (
                    <a href={`https://wa.me/${chiffres}`} target="_blank" rel="noopener"
                      className="rounded-lg p-2 text-encre-500 hover:bg-encre-100"
                      aria-label={`Écrire à ${client.nom} sur WhatsApp`}>
                      <Whatsapp className="size-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
