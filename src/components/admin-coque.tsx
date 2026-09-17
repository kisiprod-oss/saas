"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { actionQuitterAdministration } from "@/lib/actions-admin";

/**
 * La coque de l'espace d'administration : barre laterale repliable, barre
 * du haut, fil d'Ariane.
 *
 * Seule la coque est envoyee au navigateur. Tout le contenu des pages reste
 * rendu sur le serveur — c'est lui qui detient les donnees, et lui qui
 * verifie les droits.
 *
 * LE MENU NE DECIDE DE RIEN. Les liens qu'il affiche sont ceux que le
 * serveur a juges permis ; masquer un lien n'est pas une protection, c'est
 * un confort. Chaque page et chaque action verifie sa propre permission.
 */

export type LienAdmin = {
  href: string;
  libelle: string;
  /** Nom du pictogramme, resolu ci-dessous : le client ne recoit pas de composant. */
  icone: keyof typeof PICTOS;
  badge?: number;
};

const PICTOS = {
  tableau: "M4 5h6v6H4zM14 5h6v4h-6zM14 13h6v6h-6zM4 15h6v4H4z",
  agences: "M4 21h16M6 21V7l6-3 6 3v14M10 11h1M14 11h1M10 15h1M14 15h1",
  utilisateurs: "M16 20v-1a4 4 0 0 0-8 0v1M12 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4M20 20v-1a3.4 3.4 0 0 0-2.6-3.3",
  annonces: "M4 6h16M4 12h16M4 18h10",
  artisans: "M14.5 5.5a3.5 3.5 0 0 0 4.6 4.6l-8 8a2.3 2.3 0 0 1-3.2-3.2z",
  facturation: "M6 3h9l4 4v14H6zM15 3v4h4M9.5 12h5M9.5 15.5h5",
  support: "M12 21c-4.5-2.4-8-6.5-8-11.2V6.5L12 3l8 3.5v3.3c0 4.7-3.5 8.8-8 11.2zM9.5 12l2 2 3.5-4",
  signalements: "M5 21V4.5h9l-.8 3 .8 3H5M12 9.5h7.5l-1 3 1 3H12",
  journal: "M6 3h12v18l-6-3-6 3zM9.5 8h5M9.5 11.5h5",
  equipe: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20v-1a5 5 0 0 1 10 0v1M16.5 11.5a2.5 2.5 0 1 0 0-5M21 20v-1a4.2 4.2 0 0 0-3.2-4",
  parametres: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.8 14H3.6a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.8v-.2a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.2.6z",
} as const;

function Picto({ nom, className }: { nom: keyof typeof PICTOS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={PICTOS[nom]} />
    </svg>
  );
}

/** Le fil d'Ariane, deduit de l'adresse courante. */
const NOMS: Record<string, string> = {
  admin: "Administration", agences: "Agences", utilisateurs: "Utilisateurs",
  annonces: "Annonces", candidatures: "Artisans", plateforme: "Plateforme",
  support: "Support", signalements: "Signalements", journal: "Journal",
  equipe: "Équipe", parametres: "Paramètres",
  "courte-duree": "Courte durée", quiz: "Questions", securite: "Sécurité",
};

export function AdminCoque({
  liens, email, role, children,
}: {
  liens: LienAdmin[]; email: string; role: string; children: React.ReactNode;
}) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(true);
  const [tiroir, setTiroir] = useState(false);          // le menu sur téléphone

  // Le choix de repli se retient d'une visite à l'autre. `try` parce qu'un
  // navigateur en navigation privée peut refuser l'accès au stockage.
  useEffect(() => {
    try {
      const v = localStorage.getItem("sen-admin-menu");
      if (v === "replie") setOuvert(false);
    } catch { /* stockage indisponible : le menu reste ouvert */ }
  }, []);
  function basculer() {
    setOuvert((v) => {
      try { localStorage.setItem("sen-admin-menu", v ? "replie" : "ouvert"); } catch {}
      return !v;
    });
  }

  // Le tiroir se referme dès qu'on change de page.
  useEffect(() => { setTiroir(false); }, [chemin]);

  const segments = chemin.split("/").filter(Boolean);
  const fil = segments.map((s, i) => ({
    libelle: NOMS[s] ?? (/^\d+$/.test(s) ? `Fiche ${s}` : s),
    href: "/" + segments.slice(0, i + 1).join("/"),
    dernier: i === segments.length - 1,
  }));

  const actif = (href: string) =>
    href === "/admin" ? chemin === "/admin" : chemin.startsWith(href);

  const menu = (
    <nav className="flex flex-col gap-1 p-3" aria-label="Sections de l'administration">
      {liens.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={actif(l.href) ? "page" : undefined}
          title={!ouvert ? l.libelle : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-offset-2 ${
            actif(l.href)
              ? "bg-[var(--adm-dore)] text-[var(--adm-vert-nuit)]"
              : "text-[#cfe0d9] hover:bg-white/10 hover:text-white"
          }`}
        >
          <Picto nom={l.icone} className="h-5 w-5 shrink-0" />
          <span className={ouvert ? "truncate" : "sr-only"}>{l.libelle}</span>
          {l.badge ? (
            <span className={`ml-auto rounded-full bg-[#b3261e] px-1.5 text-xs font-bold text-white ${ouvert ? "" : "sr-only"}`}>
              {l.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="espace-admin min-h-screen bg-[var(--adm-ivoire)] text-[var(--adm-encre)]"
         data-menu={ouvert ? "ouvert" : "replie"}>
      <div className="lg:flex">
        {/* --------------------------- Barre latérale --------------------------- */}
        <aside
          className={`adm-transition hidden shrink-0 bg-[var(--adm-vert)] lg:flex lg:min-h-screen lg:flex-col ${
            ouvert ? "lg:w-64" : "lg:w-[4.5rem]"
          }`}
        >
          <div className="flex items-center gap-2 px-4 py-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--adm-dore)] text-sm font-extrabold text-[var(--adm-vert-nuit)]">
              SG
            </span>
            {ouvert && <span className="truncate text-sm font-semibold text-white">Administration</span>}
          </div>
          {menu}
          <div className="mt-auto p-3">
            <button
              type="button"
              onClick={basculer}
              aria-expanded={ouvert}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#cfe0d9] hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden
                   className={`h-5 w-5 shrink-0 ${ouvert ? "" : "rotate-180"}`}>
                <path d="M15 6l-6 6 6 6" />
              </svg>
              <span className={ouvert ? "" : "sr-only"}>Replier le menu</span>
            </button>
          </div>
        </aside>

        {/* ------------------------- Tiroir sur téléphone ------------------------- */}
        {tiroir && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" aria-label="Fermer le menu"
                    onClick={() => setTiroir(false)}
                    className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[var(--adm-vert)]">
              <div className="flex items-center justify-between px-4 py-4">
                <span className="text-sm font-semibold text-white">Administration</span>
                <button type="button" onClick={() => setTiroir(false)}
                        className="rounded-lg p-2 text-[#cfe0d9] hover:bg-white/10 hover:text-white"
                        aria-label="Fermer">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                       strokeLinecap="round" aria-hidden className="h-5 w-5">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {menu}
            </div>
          </div>
        )}

        {/* ------------------------------ Contenu ------------------------------ */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[var(--adm-bord)] bg-[var(--adm-ivoire)]/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <button type="button" onClick={() => setTiroir(true)}
                      className="rounded-lg p-2 text-[var(--adm-encre)] hover:bg-black/5 lg:hidden"
                      aria-label="Ouvrir le menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" aria-hidden className="h-5 w-5">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <nav aria-label="Fil d'Ariane" className="min-w-0 flex-1">
                <ol className="flex flex-wrap items-center gap-x-1.5 text-sm">
                  {fil.map((f) => (
                    <li key={f.href} className="flex items-center gap-1.5">
                      {f.dernier ? (
                        <span aria-current="page" className="font-semibold text-[var(--adm-encre)]">{f.libelle}</span>
                      ) : (
                        <>
                          <Link href={f.href} className="text-[var(--adm-encre-2)] hover:underline">{f.libelle}</Link>
                          <span aria-hidden className="text-[var(--adm-encre-2)]">/</span>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>

              <div className="hidden text-right sm:block">
                <p className="truncate text-xs font-semibold text-[var(--adm-encre)]">{email}</p>
                <p className="text-xs text-[var(--adm-encre-2)]">{role}</p>
              </div>
              {/* Ferme la session d'administration, pas celle de l'agence :
                  on revient au tableau de bord habituel, et il faudra un
                  nouveau code pour revenir ici. */}
              <form action={actionQuitterAdministration}>
                <button type="submit"
                        className="rounded-lg border border-[var(--adm-bord)] bg-white px-3 py-2 text-sm font-semibold text-[var(--adm-encre)] hover:bg-black/5">
                  Quitter
                </button>
              </form>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
