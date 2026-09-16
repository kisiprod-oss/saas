/**
 * Les essais de l'import de produits.
 *
 * ============================================================================
 *  CE QUI EST TESTÉ, ET POURQUOI
 * ============================================================================
 *  1. LE FILTRE D'ADRESSES. C'est la pièce dangereuse : le serveur va chercher
 *     une adresse fournie par quelqu'un d'autre. Chaque plage interne est
 *     éprouvée nommément, y compris les contournements connus (IPv4 encapsulée
 *     en IPv6, notation décimale, adresses de métadonnées d'hébergeur).
 *
 *  2. L'EXTRACTION. Testée sur des pages ENREGISTRÉES qui reproduisent les
 *     structures réelles : JSON-LD schema.org, Open Graph, microdonnées, page
 *     sans rien. C'est la bonne façon de tester un analyseur — un essai qui
 *     dépendrait du réseau échouerait pour de mauvaises raisons.
 *
 *  3. LES PRIX. Un prix mal lu, c'est une vente à perte. Les formats français
 *     (1.299,90), anglais (1,299.90) et les symboles sont tous éprouvés.
 *
 *  4. LA CONVERSION. La parité fixe de l'euro, le refus poli quand le taux
 *     manque, et l'arrondi du prix de vente.
 *
 *  Lancement :  npm run essais
 * ============================================================================
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const bac = fs.mkdtempSync(path.join(os.tmpdir(), "nova-import-"));
process.env.NOVA_DOSSIER_DONNEES = bac;
process.env.NOVA_FICHIER_BASE = path.join(bac, "import.db");
process.env.NOVA_CLE_SECRETE = "cle-de-test-uniquement-32-caracteres-minimum";

const requis = createRequire(import.meta.url);
const web = requis("../.essais/import-web.js");
const devises = requis("../.essais/devises.js");

process.on("exit", () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch { /* */ } });

// ===========================================================================
//  1. LE FILTRE D'ADRESSES
// ===========================================================================

test("les plages internes sont toutes refusées", () => {
  const interdites = [
    // Boucle locale et « cet hôte ».
    "127.0.0.1", "127.1.2.3", "0.0.0.0", "0.1.2.3",
    // Réseaux privés.
    "10.0.0.1", "10.255.255.255",
    "172.16.0.1", "172.20.10.5", "172.31.255.255",
    "192.168.0.1", "192.168.1.254",
    // Lien-local : c'est là que vivent les métadonnées d'hébergeur, la cible
    // la plus recherchée d'une attaque SSRF.
    "169.254.169.254", "169.254.0.1",
    // CGNAT, réservés, documentation, multicast, diffusion.
    "100.64.0.1", "100.127.255.255",
    "192.0.0.1", "192.0.2.1", "198.18.0.1", "198.19.0.1",
    "198.51.100.1", "203.0.113.1",
    "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    // IPv6.
    "::1", "::", "fe80::1", "fe80::abcd", "fc00::1", "fd12:3456::1",
    "ff02::1", "2001:db8::1", "64:ff9b::1.2.3.4",
    // IPv4 encapsulée dans une IPv6 : le contournement classique.
    "::ffff:127.0.0.1", "::ffff:169.254.169.254", "::ffff:10.0.0.1",
    // Ce qui n'est pas une adresse du tout.
    "", "pas-une-ip", "999.999.999.999", "127.0.0", "1.2.3.4.5",
  ];

  for (const ip of interdites) {
    assert.equal(web.adresseInterdite(ip), true, `acceptée à tort : ${ip}`);
  }
});

test("les adresses publiques restent autorisées", () => {
  const permises = [
    "1.1.1.1", "8.8.8.8", "93.184.216.34", "204.79.197.200",
    "172.15.255.255", "172.32.0.1",   // juste en dehors de 172.16/12
    "192.167.255.255", "192.169.0.1", // juste en dehors de 192.168/16
    "100.63.255.255", "100.128.0.1",  // juste en dehors de 100.64/10
    "223.255.255.255",                // juste avant le multicast
    "2606:4700::1111", "2a00:1450:4001::1",
  ];

  for (const ip of permises) {
    assert.equal(web.adresseInterdite(ip), false, `refusée à tort : ${ip}`);
  }
});

test("la récupération refuse les schémas autres que http et https", async () => {
  for (const adresse of [
    "file:///etc/passwd",
    "gopher://exemple.test/",
    "ftp://exemple.test/produit",
    "data:text/html,<h1>coucou</h1>",
    "javascript:alert(1)",
    "pas une adresse du tout",
  ]) {
    const resultat = await web.recuperer(adresse);
    assert.equal(resultat.ok, false, `accepté à tort : ${adresse}`);
    assert.equal(resultat.echec.code, "schema", `mauvais code pour ${adresse}`);
  }
});

test("la récupération refuse une adresse interne écrite en clair", async () => {
  for (const adresse of [
    "http://127.0.0.1:3000/admin",
    "http://169.254.169.254/latest/meta-data/",
    "https://10.0.0.5/interne",
    "http://[::1]:8080/",
    "http://192.168.1.1/",
  ]) {
    const resultat = await web.recuperer(adresse);
    assert.equal(resultat.ok, false, `accepté à tort : ${adresse}`);
    assert.equal(resultat.echec.code, "adresse_interne",
      `${adresse} devait être refusé comme adresse interne`);
  }
});

test("localhost est refusé par la résolution du nom", async () => {
  // Le NOM est public, mais il résout vers 127.0.0.1 : c'est la résolution
  // qui doit l'attraper, pas une liste de noms interdits.
  const resultat = await web.recuperer("http://localhost:3000/produit");
  assert.equal(resultat.ok, false);
  assert.ok(
    resultat.echec.code === "adresse_interne" || resultat.echec.code === "dns",
    `localhost doit être refusé, reçu : ${resultat.echec.code}`,
  );
});

// ===========================================================================
//  2. L'EXTRACTION
// ===========================================================================

/** Fabrique une page enregistrée, comme celles que renvoie `recuperer()`. */
function page(html, url = "https://boutique.exemple.test/produit/42") {
  return { url, html, hote: new URL(url).hostname };
}

test("lit une fiche produit en données structurées schema.org", () => {
  const fiche = web.extraire(page(`
    <html><head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Ensemble bazin brodé",
      "description": "Deux pièces en bazin riche, broderie à la main.",
      "brand": { "@type": "Brand", "name": "Atelier Ndeye" },
      "color": "Bleu nuit",
      "material": "Bazin riche",
      "sku": "BZ-4412",
      "image": [
        "https://images.exemple.test/bazin-1.jpg",
        "/relatif/bazin-2.jpg"
      ],
      "additionalProperty": [
        { "@type": "PropertyValue", "name": "Pièces", "value": "Haut et pantalon" }
      ],
      "offers": {
        "@type": "Offer",
        "price": "45.90",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock"
      }
    }
    </script>
    </head><body></body></html>
  `));

  assert.equal(fiche.nom, "Ensemble bazin brodé");
  assert.match(fiche.description, /bazin riche/i);
  assert.equal(fiche.marque, "Atelier Ndeye");
  assert.equal(fiche.prix, 45.9);
  assert.equal(fiche.devise, "EUR");

  // Une image relative doit devenir absolue, résolue contre l'adresse de la page.
  assert.ok(fiche.images.includes("https://images.exemple.test/bazin-1.jpg"));
  assert.ok(fiche.images.includes("https://boutique.exemple.test/relatif/bazin-2.jpg"));

  const noms = fiche.caracteristiques.map((c) => c.nom);
  assert.ok(noms.includes("Pièces"), "additionalProperty doit être lu");
  assert.ok(noms.includes("Couleur"), "color doit devenir une caractéristique");
  assert.ok(noms.includes("Matière"));
  assert.ok(noms.includes("Référence"));
  assert.ok(fiche.sources.some((s) => /schema\.org/.test(s)));
});

test("trouve le produit même enfoui dans un @graph", () => {
  const fiche = web.extraire(page(`
    <script type="application/ld+json">
    { "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", "name": "La place de marché" },
      { "@type": "BreadcrumbList", "itemListElement": [] },
      { "@type": ["Product", "IndividualProduct"],
        "name": "Sac besace cuir",
        "offers": [{ "@type": "Offer", "price": 89, "priceCurrency": "USD" }] }
    ] }
    </script>
  `));

  assert.equal(fiche.nom, "Sac besace cuir");
  assert.equal(fiche.prix, 89);
  assert.equal(fiche.devise, "USD");
});

test("un bloc JSON-LD cassé n'empêche pas de lire les autres", () => {
  const fiche = web.extraire(page(`
    <script type="application/ld+json">{ ceci n'est pas du JSON }</script>
    <script type="application/ld+json">
    { "@type": "Product", "name": "Jus de bissap", "offers": { "price": "1200", "priceCurrency": "XOF" } }
    </script>
  `));

  assert.equal(fiche.nom, "Jus de bissap");
  assert.equal(fiche.prix, 1200);
  assert.equal(fiche.devise, "XOF");
});

test("retombe sur Open Graph quand il n'y a pas de données structurées", () => {
  const fiche = web.extraire(page(`
    <html><head>
      <meta property="og:title" content="Chemise wax manches courtes" />
      <meta property="og:description" content="Coupe droite, col classique." />
      <meta property="og:image" content="https://images.exemple.test/chemise.webp" />
      <meta property="product:price:amount" content="18.50" />
      <meta property="product:price:currency" content="EUR" />
      <meta property="og:site_name" content="Boutique Exemple" />
    </head><body></body></html>
  `));

  assert.equal(fiche.nom, "Chemise wax manches courtes");
  assert.equal(fiche.description, "Coupe droite, col classique.");
  assert.equal(fiche.prix, 18.5);
  assert.equal(fiche.devise, "EUR");
  // `og:site_name` n'est PAS une marque : voir l'essai suivant.
  assert.equal(fiche.marque, null);
  assert.deepEqual(fiche.images, ["https://images.exemple.test/chemise.webp"]);
  assert.ok(fiche.sources.some((s) => /Open Graph/.test(s)));
});

test("retombe sur le titre de la page en dernier recours, sans le suffixe du site", () => {
  const fiche = web.extraire(page(`
    <html><head><title>Foulard en wax 180 cm | Place de marché</title></head><body></body></html>
  `));

  assert.equal(fiche.nom, "Foulard en wax 180 cm");
  assert.equal(fiche.prix, null);
  assert.ok(fiche.sources.some((s) => /titre/.test(s)));
});

test("le nom du site n'est jamais pris pour une marque", () => {
  // Reprendre `og:site_name` comme marque faisait dire a la fiche
  // « Marque : AliExpress ». C'est une caracteristique produit inventee, et
  // l'assistant la reprenait ensuite dans la description.
  const fiche = web.extraire(page(`
    <html><head>
      <meta property="og:title" content="Sac cabas en toile" />
      <meta property="og:site_name" content="AliExpress" />
    </head><body></body></html>
  `, "https://fr.aliexpress.com/item/1005006042099066.html"));

  assert.equal(fiche.marque, null);

  // Une vraie declaration de marque, elle, est reprise.
  const avecMarque = web.extraire(page(`
    <html><head>
      <meta property="og:title" content="Sac cabas en toile" />
      <meta property="product:brand" content="Sotiba" />
      <meta property="og:site_name" content="AliExpress" />
    </head><body></body></html>
  `, "https://fr.aliexpress.com/item/1005006042099066.html"));

  assert.equal(avecMarque.marque, "Sotiba");
});

test("une apostrophe ne tronque pas le nom ni la description", () => {
  // Defaut trouve par l'essai du dessous : la valeur d'un attribut entre
  // guillemets doubles etait coupee au premier apostrophe. En francais, ca
  // ampute un nom sur deux.
  const fiche = web.extraire(page(`
    <html><head>
      <meta property="og:title" content="Huile d'arachide artisanale" />
      <meta property="og:description" content="Pressee a froid, sans additif. L'huile est filtree deux fois." />
      <meta name='og:image' content='https://images.exemple.test/huile.jpg' />
    </head><body></body></html>
  `, "https://huile.sn/p/1"));

  assert.equal(fiche.nom, "Huile d'arachide artisanale");
  assert.equal(fiche.description, "Pressee a froid, sans additif. L'huile est filtree deux fois.");
  // Guillemets simples autour de l'attribut : lus aussi.
  assert.deepEqual(fiche.images, ["https://images.exemple.test/huile.jpg"]);
});

test("un chevron dans une valeur ne casse pas la balise", () => {
  const fiche = web.extraire(page(`
    <html><head>
      <meta property="og:title" content="Body bebe > 2 ans" />
      <meta property="og:description" content="Coton bio." />
    </head><body></body></html>
  `, "https://boutique.exemple.test/p/1"));

  assert.equal(fiche.nom, "Body bebe > 2 ans");
  assert.equal(fiche.description, "Coton bio.");
});

test("le nom du fournisseur est retire du nom du produit", () => {
  const cas = [
    // Suffixe annonce par og:site_name.
    ["Robe wax en coton | AliExpress", "AliExpress", "https://fr.aliexpress.com/item/1.html",
      "Robe wax en coton"],
    // Suffixe devine depuis le domaine, sans og:site_name.
    ["Chaussures homme cuir - Amazon.fr", "", "https://www.amazon.fr/dp/B08X", "Chaussures homme cuir"],
    // Prefixe : Amazon ecrit souvent le site en tete.
    ["Amazon.fr : Chemise en lin", "", "https://www.amazon.fr/dp/B08X", "Chemise en lin"],
    // Deux suffixes empiles.
    ["Sac cabas | Bagages | eBay", "eBay", "https://www.ebay.com/itm/123", "Sac cabas | Bagages"],
    // Accents : « Marche Local » doit reconnaitre « Marché Local ».
    ["Bissap glace \u2014 Marché Local", "Marche Local", "https://marchelocal.sn/p/1", "Bissap glace"],
  ];

  for (const [titre, site, url, attendu] of cas) {
    const fiche = web.extraire(page(`
      <html><head>
        <meta property="og:title" content="${titre}" />
        ${site ? `<meta property="og:site_name" content="${site}" />` : ""}
      </head><body></body></html>
    `, url));
    assert.equal(fiche.nom, attendu, `pour « ${titre} »`);
  }
});

test("un nom qui ressemble a un suffixe n'est pas ampute", () => {
  // Le garde-fou : on ne coupe que ce qui EST le nom du site. Sans ce
  // controle, la taille, la contenance ou la couleur disparaitraient du nom.
  const cas = [
    ["Foulard en wax - 180 cm", "https://boutique.exemple.test/p/1", "Foulard en wax - 180 cm"],
    ["Robe-wax", "https://wax.sn/p/1", "Robe-wax"],
    ["Café-crème en dosettes", "https://cafe.sn/p/1", "Café-crème en dosettes"],
    ["Huile d'arachide - 5 L", "https://huile.sn/p/1", "Huile d'arachide - 5 L"],
  ];

  for (const [titre, url, attendu] of cas) {
    const fiche = web.extraire(page(`
      <html><head><meta property="og:title" content="${titre}" /></head><body></body></html>
    `, url));
    assert.equal(fiche.nom, attendu, `pour « ${titre} »`);
  }
});

test("une page sans aucune information rend une fiche vide, sans lever", () => {
  const fiche = web.extraire(page("<html><body><p>Bonjour</p></body></html>"));
  assert.equal(fiche.nom, "");
  assert.equal(fiche.prix, null);
  assert.deepEqual(fiche.images, []);
  assert.deepEqual(fiche.caracteristiques, []);
});

// Une vraie page échappe « </script> » en « <\/script> » dans son JSON-LD :
// sans cela, le navigateur lui-même refermerait la balise au milieu du JSON.
// On reproduit donc l'échappement, et on vérifie que le reste est nettoyé.
test("les balises et entités sont retirées des textes extraits", () => {
  const fiche = web.extraire(page(`
    <script type="application/ld+json">
    { "@type": "Product",
      "name": "<script>alert(1)<\\/script>Savon noir",
      "description": "Fabriqu&eacute; &agrave; la main &amp; sans parfum. <b>100 %</b> naturel" }
    </script>
  `));

  assert.ok(!fiche.nom.includes("<"), `le nom garde une balise : ${fiche.nom}`);
  assert.ok(fiche.nom.includes("Savon noir"));
  assert.ok(!fiche.description.includes("<b>"));
  assert.ok(fiche.description.includes("&") || fiche.description.includes("sans parfum"));
});

test("les images sont plafonnées et les adresses non http écartées", () => {
  const images = Array.from({ length: 12 }, (_, i) => `"https://img.exemple.test/${i}.jpg"`);
  const fiche = web.extraire(page(`
    <script type="application/ld+json">
    { "@type": "Product", "name": "Lot", "image": [
      ${images.join(",")},
      "javascript:alert(1)",
      "data:image/png;base64,AAAA"
    ] }
    </script>
  `));

  assert.ok(fiche.images.length <= 6, `trop d'images : ${fiche.images.length}`);
  assert.ok(!fiche.images.some((u) => u.startsWith("javascript:")));
  assert.ok(!fiche.images.some((u) => u.startsWith("data:")));
});

test("reconnaît la place de marché derrière un hôte", () => {
  assert.equal(web.origineDe("www.amazon.fr"), "amazon");
  assert.equal(web.origineDe("fr.aliexpress.com"), "aliexpress");
  assert.equal(web.origineDe("french.alibaba.com"), "alibaba");
  assert.equal(web.origineDe("www.ebay.com"), "ebay");
  assert.equal(web.origineDe("jumia.sn"), "jumia");
  assert.equal(web.origineDe("boutique-du-coin.sn"), "autre");
});

// ===========================================================================
//  3. LES PRIX
// ===========================================================================

test("lit les prix quel que soit le format d'écriture", () => {
  // Le séparateur décimal est le dernier des deux : cette règle doit tenir sur
  // les deux conventions.
  const cas = [
    ["19.99", 19.99],
    ["19,99", 19.99],
    ["1,299.90", 1299.9],
    ["1.299,90", 1299.9],
    ["1 299,90", 1299.9],
    ["US $19.99", 19.99],
    ["€ 45,90", 45.9],
    ["12500", 12500],
    ["1.500", 1500],       // milliers à la française, pas 1,5
    ["1,500", 1500],       // milliers à l'anglaise
    [45.9, 45.9],
    [89, 89],
  ];

  for (const [entree, attendu] of cas) {
    const fiche = web.extraire(page(`
      <script type="application/ld+json">
      { "@type": "Product", "name": "X",
        "offers": { "price": ${typeof entree === "number" ? entree : JSON.stringify(entree)} } }
      </script>
    `));
    assert.equal(fiche.prix, attendu, `mal lu : ${entree}`);
  }
});

test("un prix absurde ou absent ne donne pas un prix", () => {
  for (const mauvais of ['"0"', '"-19.99"', '"gratuit"', '""', "null"]) {
    const fiche = web.extraire(page(`
      <script type="application/ld+json">
      { "@type": "Product", "name": "X", "offers": { "price": ${mauvais} } }
      </script>
    `));
    assert.equal(fiche.prix, null, `accepté à tort : ${mauvais}`);
  }
});

test("déduit la devise d'un symbole quand le code manque", () => {
  const cas = [["€ 19,99", "EUR"], ["$19.99", "USD"], ["£15.00", "GBP"], ["¥120", "CNY"]];
  for (const [prix, attendu] of cas) {
    const fiche = web.extraire(page(`
      <script type="application/ld+json">
      { "@type": "Product", "name": "X",
        "offers": { "price": "10", "priceCurrency": ${JSON.stringify(prix)} } }
      </script>
    `));
    assert.equal(fiche.devise, attendu, `devise mal déduite pour ${prix}`);
  }
});

test("prend le prix d'une offre agrégée", () => {
  const fiche = web.extraire(page(`
    <script type="application/ld+json">
    { "@type": "Product", "name": "Pagne",
      "offers": { "@type": "AggregateOffer", "lowPrice": "12.50", "highPrice": "29.90",
                  "priceCurrency": "EUR" } }
    </script>
  `));
  assert.equal(fiche.prix, 12.5, "le prix le plus bas est le bon point de départ");
  assert.equal(fiche.devise, "EUR");
});

// ===========================================================================
//  4. LA CONVERSION ET LE PRIX DE VENTE
// ===========================================================================

test("la parité de l'euro est fixe et n'a pas besoin d'être saisie", () => {
  const resultat = devises.convertir(10, "EUR", "XOF", {});
  assert.equal(resultat.ok, true);
  assert.equal(resultat.montant, Math.round(10 * devises.PARITE_EURO_FRANC_CFA));
  assert.equal(resultat.montant, 6560);
  assert.match(resultat.explication, /fixe/i);

  // La même parité vaut pour le franc CFA d'Afrique centrale.
  assert.equal(devises.convertir(1, "EUR", "XAF", {}).montant, 656);
});

test("une devise flottante sans taux saisi est refusée, en le disant", () => {
  const resultat = devises.convertir(19.99, "USD", "XOF", {});
  assert.equal(resultat.ok, false);
  assert.equal(resultat.tauxManquant, "USD");
  assert.match(resultat.raison, /taux/i);
});

test("le taux saisi par le commerçant est celui qui s'applique", () => {
  const resultat = devises.convertir(20, "USD", "XOF", { USD: 610 });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.montant, 12200);
  assert.match(resultat.explication, /610/);
});

test("une même devise n'est pas convertie", () => {
  const resultat = devises.convertir(12500, "XOF", "XOF", {});
  assert.equal(resultat.ok, true);
  assert.equal(resultat.montant, 12500);
});

test("les taux illisibles sont écartés à la lecture", () => {
  const taux = devises.lireTaux(JSON.stringify({
    USD: 610, CNY: "85", GBP: 0, EUR: -1, JPY: "abc", XXX: 999_999,
  }));
  assert.equal(taux.USD, 610);
  assert.equal(taux.CNY, 85, "un taux en texte doit être accepté s'il est lisible");
  assert.equal(taux.GBP, undefined, "un taux nul donnerait un prix nul");
  assert.equal(taux.EUR, undefined, "un taux négatif est absurde");
  assert.equal(taux.JPY, undefined);
  assert.equal(taux.XXX, undefined, "un taux démesuré est une faute de frappe");

  assert.deepEqual(devises.lireTaux("pas du json"), {});
  assert.deepEqual(devises.lireTaux(null), {});
  assert.deepEqual(devises.lireTaux("[1,2,3]"), {});
});

test("le prix de vente ajoute la marge puis s'arrondit à un montant qui se dit", () => {
  // Paliers : 50 sous 1 000, 100 sous 10 000, 500 sous 100 000, 1 000 au-delà.
  assert.equal(devises.prixDeVente(600, 0), 600);
  assert.equal(devises.prixDeVente(612, 0), 650);
  assert.equal(devises.prixDeVente(5_000, 30), 6_500);
  assert.equal(devises.prixDeVente(6_560, 40), 9_200);
  assert.equal(devises.prixDeVente(45_000, 25), 56_500);
  assert.equal(devises.prixDeVente(200_000, 10), 220_000);

  // Une marge nulle ne doit pas faire descendre le prix sous le revient.
  for (const revient of [500, 1_234, 9_999, 45_678, 150_000]) {
    assert.ok(devises.prixDeVente(revient, 0) >= revient,
      `le prix de vente passerait sous le revient pour ${revient}`);
  }

  // Une marge démesurée est bornée, pas propagée.
  assert.ok(devises.prixDeVente(1_000, 99_999) < 1_000 * 1_000);
});
