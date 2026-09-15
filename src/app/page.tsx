import Link from "next/link";

const fonctionnalites = [
  {
    titre: "Scolarité",
    description:
      "Années scolaires, classes, matières, élèves et responsables légaux, avec import CSV.",
  },
  {
    titre: "Devoirs",
    description:
      "L'enseignant publie un devoir avec échéance et pièces jointes ; la famille voit le statut : à faire, remis, en retard, corrigé.",
  },
  {
    titre: "Notes et bulletins",
    description:
      "Saisie, vérification puis publication des résultats. Une note manquante n'est jamais transformée en zéro.",
  },
  {
    titre: "Communication",
    description:
      "Annonces ciblées par classe ou par rôle, et suivi des absences et retards.",
  },
];

export default function PageAccueil() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-fond">
      <header className="flex items-center justify-between border-b border-bordure px-6 py-4 sm:px-10">
        <span className="text-xl font-bold text-bleu">SamaÉcole</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/connexion"
            className="rounded-lg px-4 py-2 text-sm font-medium text-bleu hover:bg-bleu/5"
          >
            Connexion
          </Link>
          <Link
            href="#demonstration"
            className="rounded-lg bg-vert px-4 py-2 text-sm font-semibold text-white hover:bg-vert-fonce"
          >
            Demander une démonstration
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10">
          <span className="badge-demo mb-4">Version de démonstration</span>
          <h1 className="text-4xl font-bold tracking-tight text-texte sm:text-5xl">
            La gestion scolaire, pensée pour le Sénégal
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-texte-attenue">
            Une plateforme unique pour la direction, les enseignants, les
            parents et les élèves : devoirs, notes, absences et bulletins,
            avec des droits d&apos;accès réellement appliqués établissement
            par établissement.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/connexion"
              className="w-full rounded-lg bg-bleu px-6 py-3 text-base font-semibold text-white hover:bg-bleu-fonce sm:w-auto"
            >
              Essayer la démonstration
            </Link>
          </div>
          <p className="mt-4 text-xs text-texte-attenue">
            SamaÉcole est en développement actif. Les tarifs affichés sont
            provisoires et les fonctionnalités listées correspondent à ce qui
            est réellement construit — aucune donnée fictive n&apos;est
            présentée comme un client réel.
          </p>
        </section>

        <section className="border-t border-bordure bg-white py-16">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 sm:grid-cols-2 sm:px-10">
            {fonctionnalites.map((f) => (
              <div
                key={f.titre}
                className="rounded-2xl border border-bordure p-6"
              >
                <h3 className="mb-2 text-lg font-semibold text-bleu">
                  {f.titre}
                </h3>
                <p className="text-sm text-texte-attenue">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="demonstration"
          className="mx-auto max-w-2xl px-6 py-16 text-center sm:px-10"
        >
          <h2 className="text-2xl font-semibold text-texte">
            Envie d&apos;une démonstration pour votre établissement ?
          </h2>
          <p className="mt-3 text-texte-attenue">
            Écrivez-nous à{" "}
            <a
              href="mailto:contact@demo.samaecole.sn"
              className="text-bleu underline"
            >
              contact@demo.samaecole.sn
            </a>{" "}
            — le formulaire de demande en ligne arrive dans une prochaine
            étape.
          </p>
        </section>
      </main>

      <footer className="border-t border-bordure px-6 py-6 text-center text-xs text-texte-attenue sm:px-10">
        © {new Date().getFullYear()} SamaÉcole — projet en développement,
        Sénégal.
      </footer>
    </div>
  );
}
