/**
 * Données de démonstration.
 *
 *   npm run seed
 *
 * Crée deux boutiques d'exemple, publiées et marquées `demonstration = 1`, et
 * un compte marchand d'essai pour parcourir l'application.
 *
 * ============================================================================
 *  CES DONNÉES SONT MARQUÉES COMME FAUSSES
 * ============================================================================
 *  `demonstration = 1` fait afficher « Démonstration » sur la page d'accueil,
 *  sur la page des démonstrations et dans la liste de l'administration. Un
 *  visiteur ne doit jamais croire qu'il regarde le commerce de quelqu'un, et
 *  l'équipe ne doit jamais compter ces boutiques dans ses chiffres.
 *
 *  Le script est IDEMPOTENT : relancé, il ne crée pas de doublon. Il ne touche
 *  à aucune boutique réelle.
 * ============================================================================
 */

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const dossier = process.env.NOVA_DOSSIER_DONNEES ?? path.join(racine, "donnees");
const chemin = process.env.NOVA_FICHIER_BASE ?? path.join(dossier, "nova.db");

fs.mkdirSync(path.dirname(chemin), { recursive: true });
const db = new Database(chemin);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8"));

function hacher(motDePasse) {
  const sel = crypto.randomBytes(16).toString("hex");
  return `${sel}:${crypto.scryptSync(motDePasse, sel, 64).toString("hex")}`;
}

function jeton() {
  return crypto.randomBytes(16).toString("hex");
}

// --- Données de référence, si la base est neuve --------------------------
if (db.prepare("SELECT COUNT(*) n FROM pays").get().n === 0) {
  db.prepare(
    `INSERT INTO pays (code, nom, devise, devise_libelle, decimales, indicatif,
                       longueur_nationale, villes, moyens_paiement, actif, ordre)
     VALUES ('SN', 'Sénégal', 'XOF', 'FCFA', 0, '+221', 9, ?, ?, 1, 1)`,
  ).run(
    JSON.stringify(["Dakar", "Pikine", "Guédiawaye", "Rufisque", "Thiès", "Mbour",
      "Saint-Louis", "Kaolack", "Ziguinchor", "Touba", "Diourbel", "Louga"]),
    JSON.stringify(["paydunya", "wave", "orange_money"]),
  );
}
if (db.prepare("SELECT COUNT(*) n FROM offres").get().n === 0) {
  const ins = db.prepare(
    `INSERT INTO offres (code, nom, prix_mensuel, devise, max_produits, quota_ia,
                         max_membres, domaine_personnalise, publication, accroche, ordre, actif)
     VALUES (?, ?, ?, 'XOF', ?, ?, ?, ?, ?, ?, ?, 1)`,
  );
  ins.run("decouverte", "Découverte", 0, 5, 10, 1, 0, 0,
    "Construisez et essayez votre boutique. La publication demande une formule payante.", 1);
  ins.run("essentiel", "Essentiel", 5000, 30, 100, 1, 0, 1,
    "Votre boutique en ligne, publiée sur une adresse nova.shop.", 2);
  ins.run("business", "Business", 12500, 300, 400, 3, 1, 1,
    "Plus de produits, votre propre nom de domaine.", 3);
  ins.run("pro", "Pro", 25000, 3000, 1500, 10, 1, 1,
    "Pour une équipe, avec des quotas confortables.", 4);
}

// -------------------------------------------------------------------------
//  Les boutiques de démonstration
// -------------------------------------------------------------------------

const DEMOS = [
  {
    slug: "chez-awa",
    nom: "Chez Awa",
    activite: "mode",
    description: "Tenues sur mesure et prêt-à-porter en bazin et en wax, cousues à Dakar.",
    ville: "Dakar",
    quartier: "Sacré-Cœur 3",
    adresse: "Villa 218, Sacré-Cœur 3",
    telephone: "+221770000001",
    couleur: "#1F2933",
    modele: "elegant",
    offre: "business",
    zones: [
      ["Dakar centre", 1000, "Sous 24 h"],
      ["Dakar banlieue", 2000, "24 à 48 h"],
      ["Thiès et Mbour", 3500, "2 à 3 jours"],
    ],
    categories: ["Bazin", "Wax", "Accessoires"],
    produits: [
      { nom: "Ensemble bazin brodé", categorie: "Bazin", prix: 45000, stock: 6,
        description: "Ensemble deux pièces en bazin riche, broderie faite à la main.\n\nCousu à Dakar dans notre atelier.",
        caracteristiques: [["Matière", "Bazin riche"], ["Pièces", "Haut et pantalon"], ["Entretien", "Lavage à la main"]],
        variantes: ["S", "M", "L", "XL"] },
      { nom: "Boubou wax femme", categorie: "Wax", prix: 28000, stock: 11,
        description: "Boubou long en wax, coupe droite, manches trois-quarts.",
        caracteristiques: [["Matière", "Wax 100 % coton"], ["Longueur", "140 cm"]],
        variantes: ["Taille unique"] },
      { nom: "Chemise wax homme", categorie: "Wax", prix: 18500, prixBarre: 22000, stock: 14,
        description: "Chemise manches courtes, col classique, poche poitrine.",
        caracteristiques: [["Matière", "Wax 100 % coton"], ["Coupe", "Droite"]],
        variantes: ["M", "L", "XL"] },
      { nom: "Sac en tissu tressé", categorie: "Accessoires", prix: 12000, stock: 4,
        description: "Sac à main en tissu tressé, doublure intérieure, fermeture aimantée.",
        caracteristiques: [["Dimensions", "30 × 24 cm"], ["Doublure", "Coton"]] },
      { nom: "Foulard assorti", categorie: "Accessoires", prix: 5000, stock: 22,
        description: "Foulard en wax, à assortir à un boubou ou à porter en turban.",
        caracteristiques: [["Dimensions", "180 × 60 cm"]] },
      { nom: "Caftan de cérémonie", categorie: "Bazin", prix: 65000, stock: 2,
        description: "Caftan de cérémonie, bazin teint main, broderie or au col et aux manches.",
        caracteristiques: [["Matière", "Bazin riche teint main"], ["Délai", "Sur commande, 10 jours"]],
        variantes: ["M", "L"] },
    ],
  },
  {
    slug: "epicerie-teranga",
    nom: "Épicerie Teranga",
    activite: "alimentaire",
    description: "Produits du terroir sénégalais : céréales, épices, jus et condiments.",
    ville: "Thiès",
    quartier: "Cité Malick Sy",
    adresse: "Marché central, allée B",
    telephone: "+221770000002",
    couleur: "#0E5C3F",
    modele: "colore",
    offre: "essentiel",
    retrait: true,
    zones: [
      ["Thiès ville", 500, "Le jour même"],
      ["Dakar", 2500, "48 h"],
    ],
    categories: ["Céréales", "Épices", "Boissons"],
    produits: [
      { nom: "Thiacry (1 kg)", categorie: "Céréales", prix: 2500, stock: 40,
        description: "Semoule de mil roulée à la main, prête à cuire.",
        caracteristiques: [["Poids", "1 kg"], ["Origine", "Thiès"]] },
      { nom: "Fonio décortiqué (1 kg)", categorie: "Céréales", prix: 3200, stock: 25,
        description: "Fonio décortiqué, trié à la main.",
        caracteristiques: [["Poids", "1 kg"]] },
      { nom: "Nététou (200 g)", categorie: "Épices", prix: 1500, stock: 0,
        description: "Graines de néré fermentées, en pot refermable.",
        caracteristiques: [["Poids", "200 g"], ["Conservation", "À l'abri de l'humidité"]] },
      { nom: "Poivre de Selim (100 g)", categorie: "Épices", prix: 2000, stock: 18,
        description: "Poivre de Selim entier, pour le café Touba et les bouillons.",
        caracteristiques: [["Poids", "100 g"]] },
      { nom: "Jus de bissap (1 L)", categorie: "Boissons", prix: 1200, stock: 60,
        description: "Jus d'hibiscus préparé à l'atelier, sans colorant.",
        caracteristiques: [["Contenance", "1 litre"], ["Conservation", "5 jours au frais"]] },
      { nom: "Jus de bouye (1 L)", categorie: "Boissons", prix: 1500, stock: 35,
        description: "Jus de pain de singe, onctueux, légèrement sucré.",
        caracteristiques: [["Contenance", "1 litre"]] },
    ],
  },
];

function contenuDemo(boutique, categories) {
  return JSON.stringify({
    v: 1,
    sections: [
      { id: "accueil", type: "banniere", titre: boutique.nom,
        sous_titre: boutique.description, bouton: "Voir les produits" },
      { id: "rayons", type: "categories", titre: "Nos rayons" },
      { id: "catalogue", type: "produits", titre: "Nos produits",
        source: "tous", categorie: null, limite: 8 },
      { id: "atouts", type: "avantages", titre: "Comment ça se passe",
        points: [
          { titre: "Livraison", texte: "Nous livrons dans les zones indiquées à la commande.", icone: "livraison" },
          ...(boutique.retrait
            ? [{ titre: "Retrait sur place", texte: boutique.adresse, icone: "panier" }]
            : []),
          { titre: "Paiement à la réception", texte: "Vous payez en recevant votre commande.", icone: "paiement" },
          { titre: "Une question ?", texte: "Écrivez-nous sur WhatsApp.", icone: "telephone" },
        ] },
      { id: "apropos", type: "presentation", titre: "À propos", texte: boutique.description },
      { id: "questions", type: "questions", titre: "Questions fréquentes",
        questions: [
          { question: "Quels sont les délais de livraison ?",
            reponse: "Ils dépendent de votre zone : le délai est indiqué au moment de choisir votre zone de livraison." },
          { question: "Comment payer ?",
            reponse: "À la réception de votre commande, en espèces." },
        ] },
      { id: "contact", type: "contact", titre: "Nous contacter",
        texte: "Appelez-nous ou écrivez-nous sur WhatsApp, nous répondons vite.",
        whatsapp: true, adresse: true },
    ],
  });
}

const enSlug = (texte) => texte.toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "").slice(0, 60);

let creees = 0;
let ignorees = 0;

const installer = db.transaction(() => {
  for (const demo of DEMOS) {
    if (db.prepare("SELECT id FROM boutiques WHERE slug = ?").get(demo.slug)) {
      ignorees++;
      continue;
    }

    const contenu = contenuDemo(demo, demo.categories);
    const r = db.prepare(
      `INSERT INTO boutiques (
         slug, nom, activite, description, pays, ville, quartier, adresse,
         telephone, whatsapp, email, modele, couleur, brouillon, publie, publiee_le,
         retrait_actif, retrait_adresse, retrait_horaires, livraison_active,
         paiement_livraison, etape_assistant, assistant_fini_le, offre,
         conditions_vente, conditions_livraison, conditions_validees_le,
         demonstration)
       VALUES (?, ?, ?, ?, 'SN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'),
               ?, ?, ?, 1, 1, 5, datetime('now'), ?, ?, ?, datetime('now'), 1)`,
    ).run(
      demo.slug, demo.nom, demo.activite, demo.description, demo.ville, demo.quartier,
      demo.adresse, demo.telephone, demo.telephone, `${demo.slug}@exemple.test`,
      demo.modele, demo.couleur, contenu, contenu,
      demo.retrait ? 1 : 0,
      demo.retrait ? demo.adresse : null,
      demo.retrait ? "Lundi au samedi, 9h – 19h" : null,
      demo.offre,
      "Boutique de démonstration : aucune commande passée ici ne sera honorée. "
      + "Les produits, les prix et les délais sont inventés pour l'exemple.",
      "Les zones et les tarifs affichés sont fictifs.",
    );
    const boutiqueId = Number(r.lastInsertRowid);

    // Un compte propriétaire par démonstration, pour pouvoir ouvrir la
    // boutique depuis le tableau de bord et voir à quoi elle ressemble.
    db.prepare(
      `INSERT INTO utilisateurs (boutique_id, nom, email, telephone, mot_de_passe_hash, role)
       VALUES (?, ?, ?, ?, ?, 'proprietaire')`,
    ).run(boutiqueId, `Démo ${demo.nom}`, `${demo.slug}@exemple.test`,
      demo.telephone, hacher("demonstration2026"));

    for (const [i, [nom, frais, delai]] of demo.zones.entries()) {
      db.prepare(
        "INSERT INTO zones_livraison (boutique_id, nom, frais, delai, ordre) VALUES (?, ?, ?, ?, ?)",
      ).run(boutiqueId, nom, frais, delai, i);
    }

    const idsCategories = {};
    for (const [i, nom] of demo.categories.entries()) {
      const cat = db.prepare(
        "INSERT INTO categories (boutique_id, nom, slug, ordre) VALUES (?, ?, ?, ?)",
      ).run(boutiqueId, nom, enSlug(nom), i);
      idsCategories[nom] = Number(cat.lastInsertRowid);
    }

    for (const produit of demo.produits) {
      const aVariantes = Array.isArray(produit.variantes) && produit.variantes.length > 0;
      const p = db.prepare(
        `INSERT INTO produits (boutique_id, categorie_id, nom, slug, description,
                               caracteristiques, prix, prix_barre, stock, suivi_stock,
                               seuil_alerte, photos, variante_libelle, actif)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 3, '[]', ?, 1)`,
      ).run(
        boutiqueId, idsCategories[produit.categorie] ?? null, produit.nom,
        enSlug(produit.nom), produit.description ?? null,
        JSON.stringify((produit.caracteristiques ?? []).map(([n, v]) => ({ nom: n, valeur: v }))),
        produit.prix, produit.prixBarre ?? null, produit.stock,
        aVariantes ? "Taille" : null,
      );
      const produitId = Number(p.lastInsertRowid);

      if (aVariantes) {
        // Le stock du produit est réparti entre ses variantes, puis le total
        // est recalculé : c'est la règle appliquée par l'application.
        const parVariante = Math.floor(produit.stock / produit.variantes.length);
        const reste = produit.stock - parVariante * produit.variantes.length;
        produit.variantes.forEach((valeur, i) => {
          db.prepare(
            "INSERT INTO variantes (boutique_id, produit_id, valeur, supplement, stock, ordre) VALUES (?, ?, ?, 0, ?, ?)",
          ).run(boutiqueId, produitId, valeur, parVariante + (i === 0 ? reste : 0), i);
        });
        db.prepare(
          `UPDATE produits SET stock = (SELECT COALESCE(SUM(stock), 0) FROM variantes
             WHERE boutique_id = ? AND produit_id = ?) WHERE id = ?`,
        ).run(boutiqueId, produitId, produitId);
      }
    }

    // Quelques commandes, pour que le tableau de bord ne soit pas vide. Les
    // stocks sont décrémentés en conséquence, comme le ferait une vraie
    // commande : la démonstration reste cohérente.
    const clients = [
      ["Fatou Diouf", "+221771111101", "Dakar", "Point E", 0],
      ["Moussa Sarr", "+221771111102", "Dakar", "Yoff", 1],
      ["Aïssatou Ndiaye", "+221771111103", "Thiès", "Randoulène", 0],
    ];
    const produitsEnBase = db.prepare(
      "SELECT id, nom, prix, stock, suivi_stock FROM produits WHERE boutique_id = ? LIMIT 4",
    ).all(boutiqueId);
    const zone = db.prepare(
      "SELECT id, nom, frais FROM zones_livraison WHERE boutique_id = ? LIMIT 1",
    ).get(boutiqueId);

    clients.forEach(([nom, telephone, ville, quartier, paye], i) => {
      const article = produitsEnBase[i % produitsEnBase.length];
      if (!article) return;
      const quantite = 1 + (i % 2);
      const sousTotal = article.prix * quantite;
      const total = sousTotal + zone.frais;
      const reference = `CMD-DEMO${i + 1}`;

      const c = db.prepare(
        `INSERT INTO commandes (
           boutique_id, reference, client_nom, client_telephone, client_ville,
           client_quartier, client_repere, mode_livraison, zone_id, zone_nom,
           sous_total, frais_livraison, total, devise, moyen_paiement,
           statut, statut_livraison, statut_paiement, montant_encaisse, jeton_suivi,
           cree_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'livraison', ?, ?, ?, ?, ?, 'XOF', 'livraison',
                 ?, ?, ?, ?, ?, datetime('now', ?))`,
      ).run(
        boutiqueId, reference, nom, telephone, ville, quartier,
        "Près de la station", zone.id, zone.nom, sousTotal, zone.frais, total,
        paye ? "livree" : i === 0 ? "nouvelle" : "confirmee",
        paye ? "remise" : "a_preparer",
        paye ? "paye" : "en_attente",
        paye ? total : 0,
        jeton(), `-${i + 1} days`,
      );
      const commandeId = Number(c.lastInsertRowid);

      db.prepare(
        `INSERT INTO lignes_commande (boutique_id, commande_id, produit_id, nom,
                                      prix_unitaire, quantite, total_ligne)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(boutiqueId, commandeId, article.id, article.nom, article.prix, quantite, sousTotal);

      if (article.suivi_stock) {
        db.prepare(
          "UPDATE produits SET stock = MAX(0, stock - ?) WHERE boutique_id = ? AND id = ?",
        ).run(quantite, boutiqueId, article.id);
      }

      db.prepare(
        `INSERT INTO clients (boutique_id, nom, telephone, ville, quartier,
                              nb_commandes, total_commande, total_encaisse, derniere_commande_le)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
         ON CONFLICT (boutique_id, telephone) DO UPDATE SET
           nb_commandes = clients.nb_commandes + 1,
           total_commande = clients.total_commande + excluded.total_commande,
           total_encaisse = clients.total_encaisse + excluded.total_encaisse`,
      ).run(boutiqueId, nom, telephone, ville, quartier, total, paye ? total : 0);
    });

    creees++;
  }

  // --- Un compte marchand d'essai, vide, pour parcourir l'assistant -----
  if (!db.prepare("SELECT id FROM utilisateurs WHERE email = ?").get("essai@exemple.test")) {
    const r = db.prepare(
      `INSERT INTO boutiques (slug, nom, telephone, whatsapp, email, brouillon, offre)
       VALUES ('boutique-essai', 'Ma boutique d''essai', '+221770000003', '+221770000003',
               'essai@exemple.test', '{}', 'business')`,
    ).run();
    db.prepare(
      `INSERT INTO utilisateurs (boutique_id, nom, email, telephone, mot_de_passe_hash, role)
       VALUES (?, 'Commerçant d''essai', 'essai@exemple.test', '+221770000003', ?, 'proprietaire')`,
    ).run(Number(r.lastInsertRowid), hacher("essai2026nova"));
  }
});

installer();

console.log(`
Données de démonstration installées.

  Boutiques créées  : ${creees}
  Déjà présentes    : ${ignorees}
  Base              : ${chemin}

Comptes d'essai (mots de passe volontairement simples, à ne JAMAIS utiliser
en production) :

  Boutique remplie   chez-awa@exemple.test        / demonstration2026
  Boutique remplie   epicerie-teranga@exemple.test / demonstration2026
  Boutique vide      essai@exemple.test            / essai2026nova
                     (pour parcourir l'assistant de création depuis le début)

Boutiques publiques : /b/chez-awa  et  /b/epicerie-teranga
`);

db.close();
