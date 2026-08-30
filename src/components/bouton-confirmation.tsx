"use client";

/**
 * Bouton de formulaire qui demande confirmation avant de soumettre.
 * Pour les actions qui suppriment ou annulent quelque chose sans retour
 * possible : un clic malheureux ne doit jamais suffire.
 */
export function BoutonConfirmation({
  message, className, children,
}: { message: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
