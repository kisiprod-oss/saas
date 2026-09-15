type Props = {
  nomEtablissement: string;
  demo: boolean;
  role: string;
  nomUtilisateur: string;
};

const libelleRole: Record<string, string> = {
  direction: "Direction",
  enseignant: "Enseignant",
  parent: "Parent",
  eleve: "Élève",
};

export function EnteteEtablissement({
  nomEtablissement,
  demo,
  role,
  nomUtilisateur,
}: Props) {
  return (
    <header className="border-b border-bordure bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-texte">{nomEtablissement}</p>
            {demo && <span className="badge-demo">Démo</span>}
          </div>
          <p className="text-sm text-texte-attenue">
            {libelleRole[role] ?? role} — {nomUtilisateur}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/tableau-de-bord"
            className="text-sm font-medium text-bleu hover:underline"
          >
            Changer d&apos;espace
          </a>
          <form action="/deconnexion" method="post">
            <button
              type="submit"
              className="rounded-lg border border-bordure px-3 py-1.5 text-sm font-medium text-texte-attenue hover:bg-fond"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
