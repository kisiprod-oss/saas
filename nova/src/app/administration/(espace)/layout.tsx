import Link from "next/link";
import { exigerAdmin, chiffres } from "@/lib/admin";
import { actionDeconnexionAdmin } from "@/lib/actions-admin";
import { Embleme } from "@/components/marque";

/**
 * La coque de l'administration.
 *
 * `exigerAdmin()` est appele ici : toute page placee sous /administration est
 * protegee, sauf /administration/connexion qui a son propre layout (elle est
 * hors de ce dossier de groupe).
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await exigerAdmin();
  const c = chiffres();

  const liens = [
    { href: "/administration", libelle: "Vue d'ensemble" },
    { href: "/administration/boutiques", libelle: "Boutiques", badge: c.suspendues },
    { href: "/administration/abonnements", libelle: "Abonnements", badge: c.abonnementsEnAttente },
    { href: "/administration/offres", libelle: "Offres" },
    { href: "/administration/integrations", libelle: "Intégrations" },
    { href: "/administration/assistance", libelle: "Assistance", badge: c.assistanceOuverte },
    { href: "/administration/erreurs", libelle: "Erreurs", badge: c.erreurs7j },
    { href: "/administration/journal", libelle: "Journal" },
  ];

  return (
    <div className="min-h-dvh bg-craie">
      <header className="border-b border-encre-800 bg-encre-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Embleme className="size-7" />
          <span className="font-bold">Administration NOVA</span>
          <span className="ml-auto hidden text-sm text-encre-300 sm:block">{admin.email}</span>
          <form action={actionDeconnexionAdmin}>
            <button type="submit"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-encre-200 hover:bg-white/10">
              Quitter
            </button>
          </form>
        </div>

        <nav aria-label="Administration"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          {liens.map((lien) => (
            <Link key={lien.href} href={lien.href}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-encre-200 hover:bg-white/10">
              {lien.libelle}
              {lien.badge ? (
                <span className="rounded-full bg-terre-500 px-1.5 text-[11px] font-bold">
                  {lien.badge > 99 ? "99+" : lien.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>

      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
