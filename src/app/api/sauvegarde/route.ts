import { exigerSession } from "@/lib/auth";
import { exporterAgence } from "@/lib/export-agence";

/**
 * Telechargement par une agence de SES donnees.
 *
 * ATTENTION — CE QUE CETTE ROUTE NE DOIT PLUS JAMAIS FAIRE.
 *
 * Elle renvoyait auparavant une copie du fichier SQLite. Or ce fichier porte
 * TOUTES les agences. Le seul controle etait `role === "proprietaire"`, un
 * role que `inscrireAgence()` donne au premier utilisateur de CHAQUE agence :
 * autrement dit, a tout inscrit. N'importe qui pouvait donc creer un compte
 * gratuit et repartir avec les locataires, les baux, les numeros de piece
 * d'identite, les empreintes de mots de passe et les jetons de session de
 * toutes les autres agences. Verifie en conditions reelles avant correction.
 *
 * La lecon tient en une phrase : un role ne dit pas QUELLES donnees on peut
 * lire. Ici, seule `agence_id` le dit — et c'est desormais `exporterAgence()`
 * qui l'applique, table par table.
 */
export async function GET() {
  // exigerSession() garantit une session valide ET fournit l'agence a laquelle
  // l'export sera borne. On ne lit pas l'identifiant d'agence dans la requete.
  const { utilisateur, agence } = await exigerSession();

  // Second verrou, et non le premier : le cloisonnement vient de agence_id
  // ci-dessous. Celui-ci limite en plus l'export au titulaire du compte —
  // une agence peut compter plusieurs utilisateurs, et le fichier des
  // locataires n'a pas a partir dans la poche de chacun d'eux.
  if (utilisateur.role !== "proprietaire") {
    return new Response("Seul le titulaire du compte peut exporter les données.", { status: 403 });
  }

  const contenu = JSON.stringify(exporterAgence(agence.id), null, 2);
  const nom = `sen-gestion-${agence.slug}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(contenu, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
