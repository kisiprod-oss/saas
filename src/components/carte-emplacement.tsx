import { Carte } from "@/components/ui";
import { BoutonCopier } from "@/components/bouton-copier";
import { octetsLisibles, type EmplacementDonnees } from "@/lib/emplacement-donnees";

/**
 * Ou vivent les donnees, et que faire si l'endroit n'est pas sur.
 *
 * Ce cadre existe parce que la question « mes donnees survivront-elles a la
 * prochaine mise a jour ? » ne se repond pas de tete : il faut connaitre le
 * chemin reel utilise par le serveur. Plutot que de demander a quelqu'un
 * d'aller le lire dans un gestionnaire de fichiers, l'application le dit,
 * et propose la valeur exacte a coller — calculee sur ce serveur, donc
 * jamais a cote de la plaque.
 */

/** Un chemin de serveur : long, precieux, et a recopier sans faute. */
function Chemin({ valeur, libelle }: { valeur: string; libelle: string }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-xs font-medium text-slate-500">{libelle}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-900">{valeur}</p>
      <BoutonCopier
        texte={valeur}
        className="btn-secondaire mt-2 py-1.5 text-xs"
        label="Copier ce chemin"
        labelCopie="Copié ✓"
      />
    </div>
  );
}

export function CarteEmplacement({ e }: { e: EmplacementDonnees }) {
  const aDesDonnees = e.octetsBase > 0 || e.fichiers > 0;
  const contenu = e.existe
    ? `${e.fichiers}${e.plafonne ? " et plus" : ""} fichier(s) · ${octetsLisibles(e.octets)}` +
      (e.octetsBase > 0 ? ` · base : ${octetsLisibles(e.octetsBase)}` : "")
    : "dossier pas encore créé";

  // ------------------------------ Tout va bien ------------------------------
  if (!e.dansApplication) {
    return (
      <Carte className="border-succes-300 bg-succes-50/50 p-5">
        <h2 className="font-semibold text-succes-900">Vos données sont à l&apos;abri</h2>
        <p className="mt-1 text-sm text-succes-800">
          Elles sont rangées <strong>hors du dossier de l&apos;application</strong>,
          là où les mises à jour ne passent pas. Vous pouvez déployer une nouvelle
          version quand vous voulez : <strong>aucune agence ne perd quoi que ce
          soit</strong>, et personne n&apos;a rien à ressaisir.
        </p>
        <Chemin libelle="Dossier des données" valeur={e.chemin} />
        <p className="mt-3 text-xs text-succes-800">
          Contient aujourd&apos;hui : {contenu}. Une sauvegarde complète, c&apos;est
          la copie de ce seul dossier — ou la commande{" "}
          <code className="rounded bg-succes-100 px-1">npm run sauvegarde</code>,
          à programmer chaque nuit.
        </p>
      </Carte>
    );
  }

  // --------------------------- Emplacement risque ---------------------------
  return (
    <Carte className="border-amber-300 bg-amber-50 p-5">
      <h2 className="font-semibold text-amber-900">
        À faire : mettre vos données hors d&apos;atteinte des mises à jour
      </h2>
      <p className="mt-1 text-sm text-amber-900">
        Tout ce que le logiciel enregistre — la base, les photos, les documents —
        se trouve <strong>à l&apos;intérieur du dossier de l&apos;application</strong>.
        Or c&apos;est ce dossier-là que votre hébergeur remplace à chaque mise en
        ligne. Tant que le réglage ci-dessous n&apos;est pas fait, une mise à jour
        peut effacer vos données.
      </p>

      <Chemin libelle="Dossier des données aujourd'hui" valeur={e.chemin} />
      <p className="mt-2 text-xs text-amber-900">
        Contient : {contenu}.
        {e.configure && (
          <>
            {" "}
            <strong>Attention</strong> : la variable <code className="font-mono">DOSSIER_DONNEES</code>{" "}
            est bien renseignée, mais elle désigne un dossier situé dans
            l&apos;application. Il faut la corriger.
          </>
        )}
      </p>

      <h3 className="mt-5 font-semibold text-amber-900">
        {aDesDonnees ? "Marche à suivre, dans cet ordre" : "Deux minutes suffisent"}
      </h3>

      {aDesDonnees ? (
        <ol className="mt-2 space-y-3 text-sm text-amber-900">
          <li>
            <strong>1. Sauvegardez d&apos;abord.</strong> Dans le logiciel :
            Réglages → Sauvegarde → téléchargez le fichier, et gardez-le sur votre
            téléphone. Ne faites aucune des étapes suivantes sans cette copie.
          </li>
          <li>
            <strong>2. Créez le nouveau dossier.</strong> hPanel → Gestionnaire de
            fichiers. Placez-vous dans le dossier ci-dessous et créez-y un dossier
            nommé <code className="font-mono text-xs">donnees-sen-gestion</code>.
            {e.proposeeExiste && (
              <span className="block text-xs">
                (Il semble exister déjà : dans ce cas, passez directement à l&apos;étape 3.)
              </span>
            )}
          </li>
          <li>
            <strong>3. Recopiez le contenu.</strong> Ouvrez le dossier des données
            actuel, sélectionnez tout ce qu&apos;il contient, <em>Copier</em>, puis
            collez-le dans le nouveau dossier. Vérifiez que les deux dossiers ont
            le même poids avant de continuer.
          </li>
          <li>
            <strong>4. Déclarez l&apos;emplacement.</strong> hPanel → Variables
            d&apos;environnement → <em>Ajouter une variable</em> (le bouton
            « Ajouter », jamais le crayon d&apos;une ligne existante). Clé :{" "}
            <code className="font-mono text-xs">DOSSIER_DONNEES</code>. Valeur : le
            chemin ci-dessous. Puis <em>Enregistrer</em>.
          </li>
          <li>
            <strong>5. Vérifiez.</strong> Attendez deux minutes, rechargez cette
            page. Ce cadre doit passer au vert, afficher le nouveau chemin, et le
            même poids qu&apos;à l&apos;étape 3. Vos biens et vos locataires doivent
            toujours être là.
          </li>
        </ol>
      ) : (
        <ol className="mt-2 space-y-3 text-sm text-amber-900">
          <li>
            <strong>1.</strong> hPanel → Variables d&apos;environnement →{" "}
            <em>Ajouter une variable</em> (le bouton « Ajouter », jamais le crayon
            d&apos;une ligne existante). Clé :{" "}
            <code className="font-mono text-xs">DOSSIER_DONNEES</code>. Valeur : le
            chemin ci-dessous. Puis <em>Enregistrer</em>.
          </li>
          <li>
            <strong>2.</strong> Attendez deux minutes, rechargez cette page : ce
            cadre doit passer au vert. Le dossier se crée tout seul au premier
            enregistrement — il n&apos;y a rien à déplacer, puisqu&apos;il n&apos;y
            a pas encore de données.
          </li>
        </ol>
      )}

      <Chemin libelle="Valeur à coller dans DOSSIER_DONNEES" valeur={e.valeurProposee} />

      <p className="mt-3 text-xs text-amber-800">
        Ce chemin est calculé sur votre serveur : il n&apos;y a rien à deviner.
        Ne mettez pas une autre valeur au hasard — le logiciel repartirait sur une
        base vide en laissant vos vraies données derrière lui.
      </p>
    </Carte>
  );
}
