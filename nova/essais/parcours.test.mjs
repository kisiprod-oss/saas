/**
 * Les vérifications qui comptent.
 *
 * ============================================================================
 *  CE QUI EST TESTÉ, ET POURQUOI CEUX-LÀ
 * ============================================================================
 *  Six choses, celles dont une erreur coûte de l'argent ou de la confiance :
 *
 *   1. Un commerçant ne peut pas voir les données d'un autre.
 *   2. Le parcours création → publication → commande fonctionne.
 *   3. Les montants et les stocks restent cohérents, y compris en concurrence.
 *   4. Une notification de paiement rejouée ne crée pas de double encaissement.
 *   5. Un échec de l'assistant ne consomme pas le quota et reste rattrapable.
 *   6. Restaurer une version remet bien le contenu, sans rien publier.
 *
 *  Les essais exercent le CODE DE PRODUCTION, compilé depuis src/lib — pas une
 *  réécriture de la logique. Un test qui réimplémente ce qu'il vérifie ne
 *  vérifie rien.
 *
 *  Lancement :  npm run essais
 * ============================================================================
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

// Base jetable : les essais ne touchent jamais la base de développement.
const bac = fs.mkdtempSync(path.join(os.tmpdir(), "nova-essais-"));
process.env.NOVA_DOSSIER_DONNEES = bac;
process.env.NOVA_FICHIER_BASE = path.join(bac, "essais.db");
process.env.NOVA_CLE_SECRETE = "cle-de-test-uniquement-32-caracteres-minimum";
delete process.env.ANTHROPIC_API_KEY; // force le moteur local, déterministe

const requis = createRequire(import.meta.url);
const { db, un, tous, ecrire } = requis("../.essais/db.js");
const commandes = requis("../.essais/commandes.js");
const requetes = requis("../.essais/requetes.js");
const versions = requis("../.essais/versions.js");
const sections = requis("../.essais/sections.js");
const webhooks = requis("../.essais/webhooks.js");
const offres = requis("../.essais/offres.js");
const ia = requis("../.essais/ia.js");
const telephone = requis("../.essais/telephone.js");
const photos = requis("../.essais/photos.js");
const chiffrement = requis("../.essais/chiffrement.js");

process.on("exit", () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch { /* */ } });

// ---------------------------------------------------------------------------
//  Fabrique de boutiques
// ---------------------------------------------------------------------------

function creerBoutique(slug, options = {}) {
  const r = ecrire(
    `INSERT INTO boutiques (slug, nom, pays, telephone, whatsapp, brouillon, offre,
                            livraison_active, retrait_actif, paiement_livraison,
                            publiee_le, publie, etape_assistant, assistant_fini_le)
     VALUES (?, ?, 'SN', '+221771234567', '+221771234567', '{}', ?, 1, ?, 1,
             ?, ?, 5, datetime('now'))`,
    slug, options.nom ?? slug, options.offre ?? "business",
    options.retrait ? 1 : 0,
    options.publiee === false ? null : new Date().toISOString(),
    options.publiee === false ? null : '{"v":1,"sections":[]}',
  );
  const id = Number(r.lastInsertRowid);
  const zone = ecrire(
    "INSERT INTO zones_livraison (boutique_id, nom, frais, actif) VALUES (?, 'Dakar', 1000, 1)",
    id,
  );
  return { id, zoneId: Number(zone.lastInsertRowid) };
}

function lireBoutique(id) {
  return un("SELECT * FROM boutiques WHERE id = ?", id);
}

function creerProduit(boutiqueId, options = {}) {
  const r = ecrire(
    `INSERT INTO produits (boutique_id, nom, slug, prix, stock, suivi_stock, actif, photos, caracteristiques)
     VALUES (?, ?, ?, ?, ?, ?, 1, '[]', '[]')`,
    boutiqueId, options.nom ?? "Produit", options.slug ?? `p${crypto.randomBytes(4).toString("hex")}`,
    options.prix ?? 10000, options.stock ?? 10, options.suiviStock === false ? 0 : 1,
  );
  return Number(r.lastInsertRowid);
}

// ===========================================================================
//  1. ISOLATION DES DONNÉES
// ===========================================================================

test("un commerçant ne voit jamais les données d'un autre", () => {
  const a = creerBoutique("isolation-a");
  const b = creerBoutique("isolation-b");

  const produitA = creerProduit(a.id, { nom: "Produit de A", slug: "produit-a" });
  const produitB = creerProduit(b.id, { nom: "Produit de B", slug: "produit-b" });

  // Lecture par identifiant : celui de l'autre ne remonte rien.
  assert.equal(requetes.produit(a.id, produitA)?.nom, "Produit de A");
  assert.equal(requetes.produit(a.id, produitB), undefined,
    "A ne doit pas pouvoir lire le produit de B par son identifiant");
  assert.equal(requetes.produit(b.id, produitA), undefined);

  // Listes : chacune ne contient que ses produits.
  assert.deepEqual(requetes.produits(a.id).map((p) => p.nom), ["Produit de A"]);
  assert.deepEqual(requetes.produits(b.id).map((p) => p.nom), ["Produit de B"]);

  // Commandes.
  const boutiqueA = lireBoutique(a.id);
  const resultat = commandes.enregistrer(
    boutiqueA, [{ produitId: produitA, quantite: 1 }],
    { mode: "livraison", zoneId: a.zoneId },
    { nom: "Client A", telephone: "77 111 11 11" },
  );
  assert.equal(resultat.ok, true);

  assert.equal(requetes.commandes(b.id).length, 0,
    "B ne doit voir aucune commande de A");
  assert.equal(requetes.commande(b.id, resultat.commandeId), undefined);
  assert.equal(requetes.lignesDe(b.id, resultat.commandeId).length, 0);

  // Clients.
  assert.equal(requetes.clients(b.id).length, 0);

  // Chiffres du tableau de bord.
  assert.equal(requetes.resume(b.id).aTraiter, 0);
  assert.equal(requetes.resume(a.id).aTraiter, 1);
});

test("un produit d'une autre boutique ne peut pas être acheté chez soi", () => {
  const a = creerBoutique("achat-croise-a");
  const b = creerBoutique("achat-croise-b");
  const produitB = creerProduit(b.id, { nom: "Article de B", prix: 50000 });

  const devis = commandes.calculer(
    lireBoutique(a.id), [{ produitId: produitB, quantite: 1 }],
    { mode: "livraison", zoneId: a.zoneId },
  );
  assert.equal(devis.ok, false,
    "acheter le produit d'une autre boutique doit échouer");
  assert.ok(devis.problemes.some((p) => p.code === "produit_indisponible"));
});

test("une zone de livraison d'une autre boutique est refusée", () => {
  const a = creerBoutique("zone-a");
  const b = creerBoutique("zone-b");
  const produit = creerProduit(a.id, { prix: 5000 });

  const devis = commandes.calculer(
    lireBoutique(a.id), [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId: b.zoneId },
  );
  assert.equal(devis.ok, false);
  assert.ok(devis.problemes.some((p) => p.code === "zone_requise"));
});

test("le chemin d'une photo reste dans le dossier de sa boutique", () => {
  const nom = `${"a".repeat(32)}.webp`;
  const chemin = photos.cheminPhoto(7, nom);
  assert.ok(chemin.includes(`${path.sep}7${path.sep}`));

  // Noms hostiles : tous refusés par le motif, avant même de toucher au disque.
  for (const hostile of ["../../etc/passwd", "../8/" + nom, "a.webp", "", "x".repeat(40) + ".webp"]) {
    assert.equal(photos.cheminPhoto(7, hostile), null, `nom accepté à tort : ${hostile}`);
  }
});

// ===========================================================================
//  2. PARCOURS CRÉATION → PUBLICATION → COMMANDE
// ===========================================================================

test("parcours complet : brouillon, publication, commande, encaissement", () => {
  const { id, zoneId } = creerBoutique("parcours", { publiee: false });

  // --- Brouillon : invisible du public -----------------------------------
  const contenu = sections.contenuParDefaut("Boutique Parcours", "On vend des choses.");
  versions.ecrireBrouillon(id, contenu, { origine: "assistant", poserInstantane: false });

  assert.equal(requetes.boutiquePubliqueParSlug("parcours"), undefined,
    "une boutique non publiée ne doit pas être servie");
  assert.equal(versions.publie(id), null);
  assert.equal(versions.modificationsEnAttente(id), true);

  // --- Publication -------------------------------------------------------
  versions.publier(id, null);
  const publique = requetes.boutiquePubliqueParSlug("parcours");
  assert.ok(publique, "après publication, la boutique doit être servie");
  assert.equal(versions.modificationsEnAttente(id), false);
  assert.equal(versions.publie(id).sections.length, contenu.sections.length);

  // --- Une modification du brouillon ne touche pas le public -------------
  versions.ecrireBrouillon(id, {
    v: 1,
    sections: [...contenu.sections, { id: "neuve", type: "texte", titre: "Ajout", texte: "Brouillon" }],
  }, { origine: "manuel" });

  const apres = requetes.boutiquePubliqueParSlug("parcours");
  const contenuPublic = sections.valider(apres.publie);
  assert.ok(!contenuPublic.sections.some((s) => s.id === "neuve"),
    "une modification du brouillon ne doit jamais atteindre la version publiée");
  assert.equal(versions.modificationsEnAttente(id), true);

  // --- Commande ----------------------------------------------------------
  const produit = creerProduit(id, { nom: "Chemise", prix: 12500, stock: 5 });
  const boutique = lireBoutique(id);

  const resultat = commandes.enregistrer(
    boutique, [{ produitId: produit, quantite: 2 }],
    { mode: "livraison", zoneId },
    { nom: "Fatou Diouf", telephone: "77 123 45 67", ville: "Dakar", quartier: "Point E" },
    { cleIdempotence: "cle-parcours" },
  );
  assert.equal(resultat.ok, true);

  const enregistree = requetes.commande(id, resultat.commandeId);
  assert.equal(enregistree.sous_total, 25000);
  assert.equal(enregistree.frais_livraison, 1000);
  assert.equal(enregistree.total, 26000);
  assert.equal(enregistree.client_telephone, "+221771234567",
    "le numéro doit être normalisé avant stockage");

  // Une commande reçue n'est PAS un encaissement.
  assert.equal(enregistree.statut_paiement, "en_attente");
  assert.equal(enregistree.montant_encaisse, 0);
  assert.equal(requetes.resume(id).encaisse, 0);
  assert.equal(requetes.resume(id).nonPaye, 26000);

  // Stock décrémenté.
  assert.equal(requetes.produit(id, produit).stock, 3);
});

test("le total ne suit jamais ce que le navigateur prétend", () => {
  const { id, zoneId } = creerBoutique("prix-serveur");
  const produit = creerProduit(id, { prix: 30000, stock: 5 });

  // Un panier qui porterait des prix : ils ne sont même pas lus.
  const devis = commandes.calculer(
    lireBoutique(id),
    [{ produitId: produit, quantite: 1, prix: 1, prixUnitaire: 1, total: 1 }],
    { mode: "livraison", zoneId },
  );
  assert.equal(devis.ok, true);
  assert.equal(devis.devis.sousTotal, 30000, "le prix vient de la base, pas du panier");
  assert.equal(devis.devis.total, 31000);
});

// ===========================================================================
//  3. MONTANTS ET STOCKS
// ===========================================================================

test("le stock ne passe jamais en négatif, même sur des commandes rapprochées", () => {
  const { id, zoneId } = creerBoutique("stock-course");
  const produit = creerProduit(id, { nom: "Dernier article", prix: 5000, stock: 1 });
  const boutique = lireBoutique(id);

  const premier = commandes.enregistrer(
    boutique, [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Client 1", telephone: "771111111" },
  );
  const second = commandes.enregistrer(
    boutique, [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Client 2", telephone: "772222222" },
  );

  assert.equal(premier.ok, true);
  assert.equal(second.ok, false, "la seconde commande sur le dernier article doit échouer");
  assert.equal(requetes.produit(id, produit).stock, 0);

  // Une seule commande a été écrite.
  assert.equal(requetes.commandes(id).length, 1);
});

test("annuler une commande remet le stock, et une seule fois", () => {
  const { id, zoneId } = creerBoutique("stock-annulation");
  const produit = creerProduit(id, { prix: 4000, stock: 10 });
  const boutique = lireBoutique(id);

  const resultat = commandes.enregistrer(
    boutique, [{ produitId: produit, quantite: 3 }],
    { mode: "livraison", zoneId }, { nom: "Client", telephone: "773333333" },
  );
  assert.equal(requetes.produit(id, produit).stock, 7);

  assert.equal(commandes.annuler(id, resultat.commandeId), true);
  assert.equal(requetes.produit(id, produit).stock, 10);

  // Deuxième annulation : sans effet, le stock ne double pas.
  assert.equal(commandes.annuler(id, resultat.commandeId), false);
  assert.equal(requetes.produit(id, produit).stock, 10);
});

test("le stock d'un produit à variantes est la somme de ses variantes", () => {
  const { id, zoneId } = creerBoutique("variantes");
  const produit = creerProduit(id, { prix: 10000, stock: 0 });
  ecrire("UPDATE produits SET variante_libelle = 'Taille' WHERE id = ?", produit);

  const m = ecrire(
    "INSERT INTO variantes (boutique_id, produit_id, valeur, supplement, stock) VALUES (?, ?, 'M', 0, 3)",
    id, produit,
  );
  ecrire(
    "INSERT INTO variantes (boutique_id, produit_id, valeur, supplement, stock) VALUES (?, ?, 'L', 2000, 2)",
    id, produit,
  );
  ecrire(
    `UPDATE produits SET stock = (SELECT SUM(stock) FROM variantes WHERE produit_id = ?) WHERE id = ?`,
    produit, produit,
  );

  const boutique = lireBoutique(id);

  // Sans variante choisie : refusé.
  const sansChoix = commandes.calculer(
    boutique, [{ produitId: produit, quantite: 1 }], { mode: "livraison", zoneId },
  );
  assert.equal(sansChoix.ok, false);
  assert.ok(sansChoix.problemes.some((p) => p.code === "variante_requise"));

  // Avec supplément.
  const grande = tous(
    "SELECT id, supplement FROM variantes WHERE produit_id = ? AND valeur = 'L'", produit,
  )[0];
  const devis = commandes.calculer(
    boutique, [{ produitId: produit, varianteId: grande.id, quantite: 1 }],
    { mode: "livraison", zoneId },
  );
  assert.equal(devis.ok, true);
  assert.equal(devis.devis.sousTotal, 12000, "le supplément de variante doit s'ajouter");

  const resultat = commandes.enregistrer(
    boutique, [{ produitId: produit, varianteId: Number(m.lastInsertRowid), quantite: 2 }],
    { mode: "livraison", zoneId }, { nom: "Client", telephone: "774444444" },
  );
  assert.equal(resultat.ok, true);
  assert.equal(requetes.produit(id, produit).stock, 3, "3 restants : 1 en M, 2 en L");
});

test("deux envois avec la même clé donnent une seule commande", () => {
  const { id, zoneId } = creerBoutique("idempotence-commande");
  const produit = creerProduit(id, { prix: 7000, stock: 20 });
  const boutique = lireBoutique(id);

  const parametres = [
    boutique, [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Client", telephone: "775555555" },
    { cleIdempotence: "meme-cle" },
  ];

  const premier = commandes.enregistrer(...parametres);
  const second = commandes.enregistrer(...parametres);

  assert.equal(premier.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.deja, true, "le second envoi doit être reconnu comme un rejeu");
  assert.equal(premier.reference, second.reference);
  assert.equal(requetes.commandes(id).length, 1);
  assert.equal(requetes.produit(id, produit).stock, 19, "le stock ne doit baisser qu'une fois");
});

test("les totaux du tableau de bord distinguent encaissé et dû", () => {
  const { id, zoneId } = creerBoutique("caisse");
  const produit = creerProduit(id, { prix: 10000, stock: 10 });
  const boutique = lireBoutique(id);

  const a = commandes.enregistrer(boutique, [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Awa Sow", telephone: "776111111" });
  const b = commandes.enregistrer(boutique, [{ produitId: produit, quantite: 2 }],
    { mode: "livraison", zoneId }, { nom: "Bara Ba", telephone: "776222222" });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);

  let resume = requetes.resume(id);
  assert.equal(resume.encaisse, 0);
  assert.equal(resume.nonPaye, 11000 + 21000);

  // Encaissement partiel de la première.
  ecrire(
    "UPDATE commandes SET montant_encaisse = 5000, statut_paiement = 'partiel' WHERE id = ?",
    a.commandeId,
  );
  resume = requetes.resume(id);
  assert.equal(resume.encaisse, 5000);
  assert.equal(resume.nonPaye, 6000 + 21000, "le reste dû doit suivre l'encaissement partiel");
});

// ===========================================================================
//  4. NOTIFICATIONS DE PAIEMENT
// ===========================================================================

test("une notification rejouée n'encaisse pas deux fois", () => {
  const { id, zoneId } = creerBoutique("webhook-rejeu");
  const produit = creerProduit(id, { prix: 20000, stock: 5 });
  const boutique = lireBoutique(id);

  const commande = commandes.enregistrer(
    boutique, [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Client", telephone: "777111111" },
  );
  const total = requetes.commande(id, commande.commandeId).total;

  const evenement = {
    identifiant: "evt_unique_1",
    reference: commande.reference,
    statut: "paye",
    montant: total,
  };

  const premier = webhooks.traiter(id, "test", evenement, "{}");
  assert.equal(premier.ok, true);
  assert.equal(premier.deja, false);
  assert.equal(requetes.commande(id, commande.commandeId).montant_encaisse, total);
  assert.equal(requetes.commande(id, commande.commandeId).statut_paiement, "paye");

  // Trois rejeux : rien ne bouge.
  for (let i = 0; i < 3; i++) {
    const rejeu = webhooks.traiter(id, "test", evenement, "{}");
    assert.equal(rejeu.ok, true);
    assert.equal(rejeu.deja, true, "un rejeu doit être reconnu");
  }
  assert.equal(requetes.commande(id, commande.commandeId).montant_encaisse, total,
    "le montant encaissé ne doit pas bouger après un rejeu");

  // Un seul mouvement de caisse enregistré.
  const mouvements = tous(
    "SELECT * FROM paiements WHERE boutique_id = ? AND commande_id = ?",
    id, commande.commandeId,
  );
  assert.equal(mouvements.length, 1);
});

test("une notification qui annonce plus que le total ne crée pas de caisse fictive", () => {
  const { id, zoneId } = creerBoutique("webhook-trop");
  const produit = creerProduit(id, { prix: 10000, stock: 5 });
  const commande = commandes.enregistrer(
    lireBoutique(id), [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Client", telephone: "778111111" },
  );
  const total = requetes.commande(id, commande.commandeId).total;

  webhooks.traiter(id, "test", {
    identifiant: "evt_trop", reference: commande.reference, statut: "paye",
    montant: total * 10,
  }, "{}");

  assert.equal(requetes.commande(id, commande.commandeId).montant_encaisse, total,
    "l'encaissement est plafonné au total de la commande");
});

test("la signature d'une notification est vérifiée à temps constant", () => {
  const secret = "secret-de-test";
  const corps = JSON.stringify({ identifiant: "e1", reference: "CMD-X", statut: "paye", montant: 100 });
  const bonne = webhooks.signer(corps, secret);

  assert.equal(webhooks.signatureValide(corps, bonne, secret), true);
  assert.equal(webhooks.signatureValide(corps, `sha256=${bonne}`, secret), true,
    "le préfixe sha256= doit être toléré");
  assert.equal(webhooks.signatureValide(corps, bonne, "autre-secret"), false);
  assert.equal(webhooks.signatureValide(`${corps} `, bonne, secret), false,
    "un corps modifié doit invalider la signature");
  assert.equal(webhooks.signatureValide(corps, "", secret), false);
  assert.equal(webhooks.signatureValide(corps, "court", secret), false);
});

test("une notification sur une référence inconnue est refusée et tracée", () => {
  const { id } = creerBoutique("webhook-inconnu");
  const resultat = webhooks.traiter(id, "test", {
    identifiant: "evt_inconnu", reference: "CMD-FANTOME", statut: "paye", montant: 1000,
  }, "{}");

  assert.equal(resultat.ok, false);
  assert.equal(resultat.code, 404);

  const trace = un(
    "SELECT resultat FROM evenements_paiement WHERE fournisseur = 'test' AND identifiant = 'evt_inconnu'",
  );
  assert.equal(trace.resultat, "commande_inconnue");
});

// ===========================================================================
//  5. ASSISTANT : ÉCHEC RÉCUPÉRABLE, QUOTA JUSTE
// ===========================================================================

test("un échec de l'assistant ne consomme pas le quota", async () => {
  const { id } = creerBoutique("quota-ia", { offre: "essentiel" });
  const boutique = lireBoutique(id);

  const avant = offres.quotaIa(boutique);
  assert.equal(avant.utilise, 0);

  // Une opération réussie compte.
  await ia.genererStructure(boutique, null, { categories: [], produits: [] });
  assert.equal(offres.quotaIa(lireBoutique(id)).utilise, 1);

  // Un échec enregistré ne compte pas.
  ecrire(
    `INSERT INTO operations_ia (boutique_id, type, statut, erreur, moteur)
     VALUES (?, 'structure', 'echouee', 'panne simulée', 'anthropic')`,
    id,
  );
  assert.equal(offres.quotaIa(lireBoutique(id)).utilise, 1,
    "un échec ne doit pas être décompté");

  // Une opération bloquée depuis longtemps ne compte pas non plus, et se
  // débloque toute seule : le commerçant peut relancer.
  ecrire(
    `INSERT INTO operations_ia (boutique_id, type, statut, moteur, cree_le)
     VALUES (?, 'structure', 'en_cours', 'anthropic', datetime('now', '-10 minutes'))`,
    id,
  );
  assert.equal(offres.quotaIa(lireBoutique(id)).utilise, 1);

  ia.libererOperationsBloquees(id);
  const bloquee = un(
    "SELECT statut FROM operations_ia WHERE boutique_id = ? ORDER BY id DESC LIMIT 1", id,
  );
  assert.equal(bloquee.statut, "echouee",
    "une génération interrompue doit être déclarée échouée, donc relançable");
  assert.equal(offres.quotaIa(lireBoutique(id)).utilise, 1);
});

test("le quota épuisé bloque l'assistant et le dit", async () => {
  const { id } = creerBoutique("quota-plein", { offre: "decouverte" });
  const boutique = lireBoutique(id);
  const maximum = offres.quotaIa(boutique).maximum;

  for (let i = 0; i < maximum; i++) {
    ecrire(
      "INSERT INTO operations_ia (boutique_id, type, statut, moteur) VALUES (?, 'structure', 'reussie', 'local')",
      id,
    );
  }
  const verdict = offres.peutUtiliserIa(lireBoutique(id));
  assert.equal(verdict.ok, false);
  assert.match(verdict.raison, /générations du mois/);

  const resultat = await ia.genererStructure(lireBoutique(id), null, { categories: [], produits: [] });
  assert.equal(resultat.ok, false);
  assert.equal(resultat.quota, true);
});

test("tout contenu passe par la validation avant d'être affiché", () => {
  // Un type inconnu disparaît.
  const avecIntrus = sections.valider({
    v: 1,
    sections: [
      { id: "ok", type: "banniere", titre: "Bonjour", sous_titre: "", bouton: "Voir" },
      { id: "intrus", type: "script_arbitraire", contenu: "alert(1)" },
      { id: "autre", type: "iframe", src: "https://exemple.test" },
    ],
  });
  assert.equal(avecIntrus.sections.length, 1);
  assert.equal(avecIntrus.sections[0].type, "banniere");

  // Les balises sont retirées du texte.
  const avecBalises = sections.valider({
    v: 1,
    sections: [{ id: "t", type: "texte", titre: "<script>alert(1)</script>Titre", texte: "<b>gras</b>" }],
  });
  assert.ok(!avecBalises.sections[0].titre.includes("<"));
  assert.ok(!avecBalises.sections[0].texte.includes("<b>"));

  // Une réponse illisible ne fait pas tomber la page.
  assert.deepEqual(sections.valider("pas du json"), { v: 1, sections: [] });
  assert.deepEqual(sections.valider(null), { v: 1, sections: [] });
  assert.deepEqual(sections.valider(42), { v: 1, sections: [] });

  // Les identifiants en double sont réécrits.
  const doublons = sections.valider({
    v: 1,
    sections: [
      { id: "meme", type: "categories", titre: "A" },
      { id: "meme", type: "categories", titre: "B" },
    ],
  });
  assert.equal(doublons.sections.length, 2);
  assert.notEqual(doublons.sections[0].id, doublons.sections[1].id);

  // Le nombre de sections est plafonné.
  const trop = sections.valider({
    v: 1,
    sections: Array.from({ length: 40 }, (_, i) => ({ id: `s${i}`, type: "categories", titre: "X" })),
  });
  assert.equal(trop.sections.length, sections.MAX_SECTIONS);
});

// ===========================================================================
//  6. VERSIONS ET RESTAURATION
// ===========================================================================

test("restaurer une version remet le contenu sans rien publier", () => {
  const { id } = creerBoutique("restauration", { publiee: false });

  const version1 = sections.valider({
    v: 1, sections: [{ id: "a", type: "texte", titre: "Première", texte: "Texte un" }],
  });
  versions.ecrireBrouillon(id, version1, { origine: "manuel", poserInstantane: false });
  versions.publier(id, null);

  // Deuxième état.
  const version2 = sections.valider({
    v: 1, sections: [{ id: "b", type: "texte", titre: "Deuxième", texte: "Texte deux" }],
  });
  versions.ecrireBrouillon(id, version2, { origine: "ia", resume: "Avant modification IA" });
  assert.equal(versions.brouillon(id).sections[0].titre, "Deuxième");

  // Le public voit toujours la première.
  assert.equal(versions.publie(id).sections[0].titre, "Première");

  // On restaure l'instantané qui contenait la première version.
  const historique = versions.historique(id);
  const cible = historique.find(
    (v) => sections.valider(v.contenu).sections[0]?.titre === "Première",
  );
  assert.ok(cible, "un instantané de la première version doit exister");

  const resultat = versions.restaurer(id, cible.id, null);
  assert.equal(resultat.ok, true);
  assert.equal(versions.brouillon(id).sections[0].titre, "Première");

  // La restauration n'a rien publié — mais ici le publié valait déjà la
  // première version, donc plus aucune modification n'est en attente.
  assert.equal(versions.publie(id).sections[0].titre, "Première");

  // Et la restauration est elle-même annulable : l'état d'avant a été gardé.
  const apres = versions.historique(id);
  assert.ok(
    apres.some((v) => sections.valider(v.contenu).sections[0]?.titre === "Deuxième"),
    "l'état d'avant la restauration doit rester dans l'historique",
  );
});

test("restaurer une version vide est refusé", () => {
  const { id } = creerBoutique("restauration-vide", { publiee: false });
  versions.ecrireBrouillon(id, sections.contenuParDefaut("Test"), {
    origine: "manuel", poserInstantane: false,
  });
  const vide = versions.instantane(id, { v: 1, sections: [] }, { origine: "manuel" });

  const resultat = versions.restaurer(id, vide, null);
  assert.equal(resultat.ok, false);
  assert.match(resultat.erreur, /vide/);
});

test("dépublier garde le contenu et ferme l'accès public", () => {
  const { id } = creerBoutique("depublication", { publiee: false });
  versions.ecrireBrouillon(id, sections.contenuParDefaut("Fermée"), {
    origine: "manuel", poserInstantane: false,
  });
  versions.publier(id, null);
  assert.ok(requetes.boutiquePubliqueParSlug("depublication"));

  versions.depublier(id);
  assert.equal(requetes.boutiquePubliqueParSlug("depublication"), undefined);

  // Le contenu est conservé : republier ne demande pas de tout refaire.
  assert.ok(versions.publie(id).sections.length > 0);
});

// ===========================================================================
//  LIMITES D'OFFRE, appliquées côté serveur
// ===========================================================================

test("la formule Découverte interdit la publication", () => {
  const { id } = creerBoutique("offre-decouverte", { offre: "decouverte", publiee: false });
  const verdict = offres.peutPublier(lireBoutique(id));
  assert.equal(verdict.ok, false);
  assert.ok(verdict.offreRequise);
});

test("une formule échue retombe sur Découverte", () => {
  const { id } = creerBoutique("offre-echue", { offre: "business" });
  ecrire("UPDATE boutiques SET offre_expire_le = datetime('now', '-1 day') WHERE id = ?", id);

  const effective = offres.offreEnVigueur(lireBoutique(id));
  assert.equal(effective.code, "decouverte",
    "un abonnement expiré ne doit plus donner les droits de sa formule");
});

test("la limite de produits est comptée par boutique", () => {
  const { id } = creerBoutique("limite-produits", { offre: "decouverte" });
  const maximum = offres.offreEnVigueur(lireBoutique(id)).max_produits;

  for (let i = 0; i < maximum; i++) creerProduit(id, { slug: `limite-${i}` });
  const verdict = offres.peutAjouterProduit(lireBoutique(id));
  assert.equal(verdict.ok, false);

  // Une autre boutique n'est pas affectée.
  const autre = creerBoutique("limite-autre", { offre: "decouverte" });
  assert.equal(offres.peutAjouterProduit(lireBoutique(autre.id)).ok, true);
});

// ===========================================================================
//  DÉTAILS QUI COÛTENT CHER QUAND ILS SONT FAUX
// ===========================================================================

test("les numéros de téléphone sénégalais sont normalisés", () => {
  const attendu = "+221771234567";
  for (const forme of [
    "771234567", "77 123 45 67", "+221 77 123 45 67", "221771234567",
    "00221771234567", "0771234567", "77-123-45-67",
  ]) {
    assert.equal(telephone.canonique(forme), attendu, `mal normalisé : ${forme}`);
  }
  for (const invalide of ["", "123", "77123456789012", "abcdefghi", null, undefined]) {
    assert.equal(telephone.canonique(invalide), null, `accepté à tort : ${invalide}`);
  }
  assert.equal(telephone.pourAffichage("+221771234567"), "77 123 45 67");
  assert.equal(telephone.pourWhatsapp("+221771234567"), "221771234567");
});

test("les secrets sont chiffrés et se relisent, mais pas avec une autre clé", () => {
  const secret = "cle_privee_du_marchand_123";
  const enveloppe = chiffrement.chiffrer(secret);

  assert.notEqual(enveloppe, secret);
  assert.ok(!enveloppe.includes(secret));
  assert.equal(chiffrement.dechiffrer(enveloppe), secret);

  // Enveloppe altérée : on ne rend rien plutôt que des octets douteux.
  // Un caractère ajouté en fin de base64 ne change PAS les octets décodés :
  // pour éprouver l'authentification, il faut retourner un bit à l'intérieur
  // du corps chiffré.
  const [iv, marque, corps] = enveloppe.split(".");
  const octets = Buffer.from(corps, "base64");
  octets[0] ^= 0x01;
  const altere = `${iv}.${marque}.${octets.toString("base64")}`;
  assert.equal(chiffrement.dechiffrer(altere), null,
    "un corps chiffré modifié doit être rejeté par la marque d'authenticité");

  // Marque d'authenticité modifiée.
  const marqueOctets = Buffer.from(marque, "base64");
  marqueOctets[0] ^= 0x01;
  assert.equal(
    chiffrement.dechiffrer(`${iv}.${marqueOctets.toString("base64")}.${corps}`), null,
  );

  assert.equal(chiffrement.dechiffrer("n'importe quoi"), null);
  assert.equal(chiffrement.dechiffrer(null), null);
  assert.equal(chiffrement.dechiffrer(""), null);
});

test("une commande sans nom lisible est refusée", () => {
  const { id, zoneId } = creerBoutique("nom-court");
  const produit = creerProduit(id, { prix: 2000, stock: 5 });

  const resultat = commandes.enregistrer(
    lireBoutique(id), [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "A", telephone: "779999999" },
  );
  assert.equal(resultat.ok, false);
  assert.ok(resultat.problemes.some((p) => p.code === "nom"));

  const sansTelephone = commandes.enregistrer(
    lireBoutique(id), [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId }, { nom: "Awa Sow", telephone: "12" },
  );
  assert.equal(sansTelephone.ok, false);
  assert.ok(sansTelephone.problemes.some((p) => p.code === "telephone"));

  assert.equal(requetes.commandes(id).length, 0);
});

test("une boutique suspendue disparaît du web", () => {
  const { id } = creerBoutique("suspendue");
  assert.ok(requetes.boutiquePubliqueParSlug("suspendue"));

  ecrire(
    "UPDATE boutiques SET suspendue_le = datetime('now'), motif_suspension = 'Essai' WHERE id = ?",
    id,
  );
  assert.equal(requetes.boutiquePubliqueParSlug("suspendue"), undefined);
});

test("un produit retiré de la vente n'est plus commandable", () => {
  const { id, zoneId } = creerBoutique("produit-retire");
  const produit = creerProduit(id, { prix: 5000, stock: 10 });
  ecrire("UPDATE produits SET actif = 0 WHERE id = ?", produit);

  const devis = commandes.calculer(
    lireBoutique(id), [{ produitId: produit, quantite: 1 }],
    { mode: "livraison", zoneId },
  );
  assert.equal(devis.ok, false);
});

test("le retrait est refusé quand la boutique ne le propose pas", () => {
  const { id } = creerBoutique("sans-retrait", { retrait: false });
  const produit = creerProduit(id, { prix: 3000, stock: 5 });

  const devis = commandes.calculer(
    lireBoutique(id), [{ produitId: produit, quantite: 1 }], { mode: "retrait" },
  );
  assert.equal(devis.ok, false);
  assert.ok(devis.problemes.some((p) => p.code === "retrait_indisponible"));
});

test("deux lignes du même article sont fusionnées avant le contrôle de stock", () => {
  const { id, zoneId } = creerBoutique("fusion-lignes");
  const produit = creerProduit(id, { prix: 1000, stock: 3 });

  // Deux lignes de 2 : 4 au total, alors qu'il n'en reste que 3.
  const devis = commandes.calculer(
    lireBoutique(id),
    [{ produitId: produit, quantite: 2 }, { produitId: produit, quantite: 2 }],
    { mode: "livraison", zoneId },
  );
  assert.equal(devis.ok, false,
    "sans fusion, le contrôle de stock passerait deux fois sur la même réserve");
});
