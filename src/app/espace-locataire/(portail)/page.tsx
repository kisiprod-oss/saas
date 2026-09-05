import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { exigerSessionLocataire } from "@/lib/auth-locataire";
import {
  contratActifLocataire, listerFacturesLocataire, paiementsEnAttenteLocataire,
} from "@/lib/requetes";
import { fcfa, periodeLisible, telephoneBrut } from "@/lib/format";
import { un } from "@/lib/db";
import { Alerte, Carte, EtatVide } from "@/components/ui";
import { IconeAlerte } from "@/components/icones";

export const metadata = { title: "Mon espace" };
export const dynamic = "force-dynamic";

function BadgeEtat({ etat, enRetard }: { etat: string; enRetard: boolean }) {
  const style = etat === "payee" ? "bg-emerald-100 text-emerald-800 ring-emerald-600/20"
    : etat === "partielle" ? "bg-amber-100 text-amber-800 ring-amber-600/20"
    : enRetard ? "bg-rose-100 text-rose-800 ring-rose-600/20"
    : "bg-sky-100 text-sky-800 ring-sky-600/20";
  const texte = etat === "payee" ? "Payée" : etat === "partielle" ? "Partielle"
    : enRetard ? "En retard" : "À payer";
  return <span className={`badge ${style}`}>{texte}</span>;
}

export default async function PageEspaceLocataire() {
  const locataire = await exigerSessionLocataire();
  const contrat = contratActifLocataire(locataire.id);
  const factures = listerFacturesLocataire(locataire.id);
  const enAttente = paiementsEnAttenteLocataire(locataire.id);

  const soldeDu = factures.reduce((s, f) => s + Math.max(0, f.reste), 0);
  const facturesIdsEnAttente = new Set(enAttente.map((p) => p.facture_id));

  // Premiere visite sans photo : on la demande avant tout le reste. Le
  // locataire peut passer — bloquer l'acces a ses propres quittances pour une
  // photo serait disproportionne — mais la demande revient a chaque connexion.
  const reportee = (await cookies()).get("sen_photo_reportee")?.value === "1";
  if (!locataire.photo_url && !reportee) redirect("/espace-locataire/profil?bienvenue=1");

  // Dossier pas encore relie a un bail : on ACCUEILLE quand meme.
  //
  // Ce cas renvoyait auparavant vers l'ecran de connexion avec un message
  // d'erreur. C'etait un piege : la personne venait de taper les bons
  // identifiants, se retrouvait devant le formulaire, croyait s'etre trompee,
  // et recommencait sans fin. Elle ne pouvait rien y faire — creer le bail est
  // le travail de l'agence, pas le sien.
  //
  // On lui montre donc où elle en est, et de quoi joindre son agence.
  if (!contrat && factures.length === 0) {
    const agence = un<{ nom: string; telephone: string | null }>(
      "SELECT nom, telephone FROM agences WHERE id = ?", locataire.agence_id,
    );
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Bonjour {locataire.prenom}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Votre compte est bien ouvert{agence?.nom ? ` chez ${agence.nom}` : ""}.
        </p>

        <Carte className="mt-6 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-2xl">
            📋
          </div>
          <h2 className="font-semibold text-slate-900">Votre bail n&apos;est pas encore enregistré</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Votre connexion a bien fonctionné. Il ne manque plus que votre contrat
            de location, que votre agence doit enregistrer. Dès que ce sera fait,
            vous verrez ici vos quittances, votre solde et vos règlements.
          </p>

          {agence?.telephone && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <a href={`tel:+${telephoneBrut(agence.telephone)}`} className="btn-secondaire">
                Appeler {agence.nom}
              </a>
              <a
                href={`https://wa.me/${telephoneBrut(agence.telephone)}?text=${encodeURIComponent(
                  `Bonjour, je suis ${locataire.prenom} ${locataire.nom}. J'ai bien accès à mon espace locataire, mais mon bail n'y apparaît pas encore.`,
                )}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-primaire"
              >
                Écrire sur WhatsApp
              </a>
            </div>
          )}
        </Carte>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Bonjour {locataire.prenom}
      </h1>
      {contrat && (
        <p className="mt-1 text-sm text-slate-500">
          {contrat.bien_titre} — géré par {contrat.agence_nom}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Carte className="p-5">
          <p className="text-sm text-slate-500">Solde restant dû</p>
          <p className={`mt-1.5 text-2xl font-bold ${soldeDu > 0 ? "text-rose-600" : "text-brand-700"}`}>
            {fcfa(soldeDu)}
          </p>
          {soldeDu === 0 && <p className="mt-1 text-xs text-slate-400">Votre loyer est à jour.</p>}
        </Carte>
        {contrat && (
          <Carte className="p-5">
            <p className="text-sm text-slate-500">Loyer mensuel</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{fcfa(contrat.loyer + contrat.charges)}</p>
            <p className="mt-1 text-xs text-slate-400">Échéance le {contrat.jour_echeance} de chaque mois</p>
          </Carte>
        )}
      </div>

      {soldeDu > 0 && (
        <div className="mt-4">
          <Link href="/espace-locataire/payer" className="btn-primaire w-full py-3 text-base">
            Payer mon loyer
          </Link>
        </div>
      )}

      {!locataire.photo_url && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>Votre photo manque.</strong> Elle permet à votre agence de vous
            reconnaître lors de vos échanges et de la remise des clés.
          </p>
          <Link href="/espace-locataire/profil" className="btn-sable shrink-0 px-3 py-2 text-sm">
            Ajouter ma photo
          </Link>
        </div>
      )}

      {enAttente.length > 0 && (
        <div className="mt-6">
          <Alerte type="info">
            <span className="flex items-start gap-2">
              <IconeAlerte className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {enAttente.length === 1 ? "Un règlement est" : `${enAttente.length} règlements sont`} en attente
                de vérification par votre agence. Vous serez à jour dès sa confirmation.
              </span>
            </span>
          </Alerte>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Mes quittances</h2>

      {factures.length === 0 ? (
        <EtatVide
          titre="Aucune facture pour le moment"
          description="Vos quittances de loyer apparaîtront ici dès qu'elles seront émises."
        />
      ) : (
        <Carte className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {factures.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/espace-locataire/factures/${f.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{periodeLisible(f.periode)}</p>
                    <p className="truncate text-xs text-slate-500">
                      {f.numero}
                      {facturesIdsEnAttente.has(f.id) && (
                        <span className="ml-2 text-amber-700">· règlement en attente</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`text-sm font-semibold ${f.reste > 0 ? "text-rose-600" : "text-slate-900"}`}>
                      {f.reste > 0 ? `${fcfa(f.reste)} dû` : fcfa(f.montant_total)}
                    </span>
                    <BadgeEtat etat={f.etat} enRetard={Boolean(f.en_retard)} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </>
  );
}
