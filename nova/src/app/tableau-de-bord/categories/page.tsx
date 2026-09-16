import { exigerSession } from "@/lib/auth";
import { categories, produits } from "@/lib/requetes";
import { GestionCategories } from "@/components/gestion-categories";

export const metadata = { title: "Catégories" };

export default async function PageCategories() {
  const { boutique } = await exigerSession();
  const liste = categories(boutique.id);
  const tous = produits(boutique.id, { limite: 500 });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="titre-page">Catégories</h1>
        <p className="mt-1 text-sm text-encre-600">
          Les rayons de votre boutique. Vos clients les retrouvent en haut du catalogue.
        </p>
      </header>

      <GestionCategories
        categories={liste.map((c) => ({
          id: c.id, nom: c.nom, slug: c.slug,
          nombre: tous.filter((p) => p.categorie_id === c.id).length,
        }))}
        sansCategorie={tous.filter((p) => !p.categorie_id).length}
      />
    </div>
  );
}
