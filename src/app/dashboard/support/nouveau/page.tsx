import { exigerSession } from "@/lib/auth";
import { actionOuvrirTicket } from "@/lib/actions";
import { CATEGORIES } from "@/lib/support";
import { Carte, Champ, EnTetePage, MessagesUrl, Selection, ZoneTexte } from "@/components/ui";

export const metadata = { title: "Nouveau ticket" };

type Params = { [c: string]: string | string[] | undefined };

export default async function PageNouveauTicket({ searchParams }: { searchParams: Promise<Params> }) {
  await exigerSession();
  const params = await searchParams;

  return (
    <>
      <EnTetePage
        titre="Ouvrir un ticket"
        sousTitre="Décrivez votre problème ou votre question, l'équipe Sen Gestion vous répond ici."
      />
      <MessagesUrl params={params} />

      <Carte className="max-w-xl p-5">
        <form action={actionOuvrirTicket} className="grid gap-4">
          <Champ label="Sujet" nom="sujet" obligatoire placeholder="Ex. : Je n'arrive pas à générer une facture" />
          <Selection
            label="Catégorie" nom="categorie" obligatoire
            options={CATEGORIES.map((c) => ({ valeur: c.valeur, libelle: c.libelle }))}
          />
          <ZoneTexte
            label="Votre message" nom="corps" lignes={6}
            placeholder="Décrivez ce qui se passe, ce que vous avez essayé, et depuis quand."
          />
          <button type="submit" className="btn-primaire">Envoyer</button>
        </form>
      </Carte>
    </>
  );
}
