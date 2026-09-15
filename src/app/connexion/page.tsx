import Link from "next/link";
import { FormulaireConnexion } from "./formulaire-connexion";

export default function PageConnexion() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-fond px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-bleu">
            SamaÉcole
          </Link>
          <p className="mt-2 text-sm text-texte-attenue">
            Connectez-vous à l&apos;espace de votre établissement.
          </p>
        </div>

        <div className="rounded-2xl border border-bordure bg-fond-carte p-6 shadow-sm">
          <FormulaireConnexion />
        </div>

        <div className="mt-6 rounded-xl border border-bordure bg-white/60 p-4 text-xs text-texte-attenue">
          <p className="mb-1 font-semibold text-texte">
            Comptes de démonstration
          </p>
          <p>direction@demo.samaecole.sn — enseignant@demo.samaecole.sn</p>
          <p>parent@demo.samaecole.sn — eleve@demo.samaecole.sn</p>
          <p className="mt-1">Mot de passe : SamaEcoleDemo2026!</p>
        </div>
      </div>
    </div>
  );
}
