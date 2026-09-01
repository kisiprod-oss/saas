"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeAgence, IconeArgent, IconeBoiteReception, IconeCalendrier, IconeCarte,
  IconeContrat, IconeFacture, IconeGraphique, IconeMaison, IconeOutils, IconeRelance,
  IconeTableauBord, IconeUtilisateurs,
} from "./icones";

const LIENS = [
  { href: "/dashboard",             libelle: "Tableau de bord", Icone: IconeTableauBord },
  { href: "/dashboard/biens",       libelle: "Biens",           Icone: IconeMaison },
  { href: "/dashboard/locataires",  libelle: "Locataires",      Icone: IconeUtilisateurs },
  { href: "/dashboard/contrats",    libelle: "Contrats de bail",Icone: IconeContrat },
  { href: "/dashboard/factures",    libelle: "Factures",        Icone: IconeFacture },
  { href: "/dashboard/paiements",   libelle: "Paiements",       Icone: IconeArgent },
  { href: "/dashboard/comptabilite", libelle: "Comptabilité",   Icone: IconeGraphique },
  { href: "/dashboard/documents",   libelle: "Documents émis",  Icone: IconeContrat },
  { href: "/dashboard/encaissement", libelle: "Encaissement",   Icone: IconeCarte },
  { href: "/dashboard/relances",    libelle: "Relances",        Icone: IconeRelance },
  { href: "/dashboard/reservations", libelle: "Réservations",   Icone: IconeCalendrier },
  { href: "/dashboard/demandes",    libelle: "Demandes",        Icone: IconeBoiteReception },
  { href: "/dashboard/artisans",    libelle: "Artisans",        Icone: IconeOutils },
  { href: "/dashboard/agence",      libelle: "Mon agence",      Icone: IconeAgence },
  { href: "/dashboard/abonnement",  libelle: "Mon abonnement",  Icone: IconeCarte },
];

export function NavLaterale({
  nouvellesDemandes, aRelancer, paiementsEnAttente, reservations,
}: {
  nouvellesDemandes: number; aRelancer: number;
  paiementsEnAttente: number; reservations: number;
}) {
  const chemin = usePathname();

  const estActif = (href: string) =>
    href === "/dashboard" ? chemin === "/dashboard" : chemin.startsWith(href);

  return (
    <div className="relative">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LIENS.map(({ href, libelle, Icone }) => (
        <Link
          key={href}
          href={href}
          className={`lien-nav shrink-0 ${estActif(href) ? "lien-nav-actif" : ""}`}
        >
          <Icone className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">{libelle}</span>
          {href === "/dashboard/reservations" && reservations > 0 && (
            <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
              {reservations}
            </span>
          )}
          {href === "/dashboard/demandes" && nouvellesDemandes > 0 && (
            <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
              {nouvellesDemandes}
            </span>
          )}
          {href === "/dashboard/relances" && aRelancer > 0 && (
            <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
              {aRelancer}
            </span>
          )}
          {href === "/dashboard/paiements" && paiementsEnAttente > 0 && (
            <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {paiementsEnAttente}
            </span>
          )}
        </Link>
      ))}
      </nav>
      {/* Signale qu'il reste des sections a droite quand la barre defile
          horizontalement sur mobile ; sans JS, disparait dans la colonne
          fixe du bureau ou tout est deja visible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent lg:hidden"
      />
    </div>
  );
}
