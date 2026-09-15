import type { Metadata } from "next";
import { exigerAdmin, peut, ROLES, type Permission } from "@/lib/admin";
import { AdminCoque, type LienAdmin } from "@/components/admin-coque";
import { un } from "@/lib/db";
import { NON_INDEXABLE } from "@/lib/seo";

export const metadata: Metadata = NON_INDEXABLE;

/**
 * La coque de l'espace d'administration, et son gardien.
 *
 * LE CONTROLE EST ICI, dans la mise en page, donc sur TOUT ce qui est range
 * dessous — y compris les pages ajoutees demain. Chaque page nomme en plus
 * sa propre permission : une mise en page ne protege pas contre l'oubli d'un
 * appel direct a une action.
 *
 * Les deux pages de seconde verification vivent hors de ce groupe : elles
 * seraient sinon renvoyees vers elles-memes sans fin.
 */

const MENU: { href: string; libelle: string; icone: LienAdmin["icone"]; permission: Permission }[] = [
  { href: "/admin", libelle: "Tableau de bord", icone: "tableau", permission: "tableau.lire" },
  { href: "/admin/agences", libelle: "Agences", icone: "agences", permission: "agences.lire" },
  { href: "/admin/utilisateurs", libelle: "Utilisateurs", icone: "utilisateurs", permission: "utilisateurs.lire" },
  { href: "/admin/annonces", libelle: "Annonces", icone: "annonces", permission: "annonces.lire" },
  { href: "/admin/artisans", libelle: "Artisans", icone: "artisans", permission: "artisans.lire" },
  { href: "/admin/plateforme", libelle: "Facturation", icone: "facturation", permission: "facturation.lire" },
  { href: "/admin/journal", libelle: "Journal", icone: "journal", permission: "journal.lire" },
  { href: "/admin/equipe", libelle: "Équipe", icone: "equipe", permission: "admins.gerer" },
  { href: "/admin/parametres", libelle: "Paramètres", icone: "parametres", permission: "parametres.lire" },
];

export default async function LayoutEspaceAdmin({ children }: { children: React.ReactNode }) {
  const { admin } = await exigerAdmin();

  const aModerer = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM biens WHERE moderation = 'en_attente'")?.n ?? 0;
  const candidatures = un<{ n: number }>(
    "SELECT COUNT(*) AS n FROM artisans WHERE statut_candidature = 'en_attente'")?.n ?? 0;

  const liens: LienAdmin[] = MENU
    .filter((m) => peut(admin, m.permission))
    .map((m) => ({
      href: m.href, libelle: m.libelle, icone: m.icone,
      badge: m.href === "/admin/annonces" ? aModerer
        : m.href === "/admin/artisans" ? candidatures
        : undefined,
    }));

  return (
    <AdminCoque liens={liens} email={admin.email} role={ROLES[admin.role].libelle}>
      {children}
    </AdminCoque>
  );
}
