import Link from "next/link";

/**
 * L'emblème de NOVA : une étoile à quatre branches dans un cercle.
 *
 * Dessinée ici plutôt que chargée en image : c'est 600 octets dans le HTML,
 * elle reste nette à toutes les tailles, et elle prend la couleur du texte
 * quand elle est posée sur fond vert (pied de page, en-tête du tableau de
 * bord) sans qu'il faille un second fichier.
 *
 * La forme dit ce que fait le produit — une étincelle, un point de départ —
 * sans emprunter à personne.
 */
export function Embleme({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" className="fill-vert-700" />
      <path
        d="M16 6.5c.5 4.3 1.8 6.9 5.2 8.1-3.4 1.2-4.7 3.8-5.2 8.1-.5-4.3-1.8-6.9-5.2-8.1 3.4-1.2 4.7-3.8 5.2-8.1Z"
        fill="#fff"
      />
      <circle cx="22.5" cy="22" r="2.2" fill="#fff" fillOpacity="0.85" />
    </svg>
  );
}

export function Logo({
  className = "", couleurTexte = "text-encre-900", lien = "/",
}: { className?: string; couleurTexte?: string; lien?: string | null }) {
  const contenu = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Embleme className="size-8 shrink-0" />
      <span className={`text-lg font-bold tracking-tight ${couleurTexte}`}>
        NOVA<span className="font-normal opacity-70"> Boutique</span>
      </span>
    </span>
  );
  if (!lien) return contenu;
  return (
    <Link href={lien} className="rounded-lg" aria-label="NOVA Boutique, accueil">
      {contenu}
    </Link>
  );
}
