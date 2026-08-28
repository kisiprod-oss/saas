/**
 * Remplit la base avec un jeu de donnees de demonstration senegalais :
 * une agence a Dakar, ses biens, ses locataires, ses baux, ses factures
 * et ses paiements sur les six derniers mois.
 *
 * Utilisation : npm run seed
 */
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const racine = process.cwd();
const cheminBase = process.env.DATABASE_FILE ?? path.join(racine, "data", "keur-gestion.db");
fs.mkdirSync(path.dirname(cheminBase), { recursive: true });

const db = new Database(cheminBase);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(racine, "db", "schema.sql"), "utf8"));

const hacher = (mdp) => {
  const sel = crypto.randomBytes(16).toString("hex");
  return `${sel}:${crypto.scryptSync(mdp, sel, 64).toString("hex")}`;
};

const moisDecale = (n) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};

const jourDu = (periode, jour) => {
  const [a, m] = periode.split("-").map(Number);
  const dernier = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${periode}-${String(Math.min(jour, dernier)).padStart(2, "0")}`;
};

// --------------------------------------------------------------- nettoyage
db.exec(`
  DELETE FROM relances;
  DELETE FROM paiements; DELETE FROM factures; DELETE FROM contrats;
  DELETE FROM demandes;  DELETE FROM locataires; DELETE FROM biens;
  DELETE FROM sessions;  DELETE FROM utilisateurs; DELETE FROM agences;
  DELETE FROM sqlite_sequence;
`);

// ----------------------------------------------------------------- agence
const agenceId = db.prepare(`
  INSERT INTO agences (nom, slug, ninea, rccm, telephone, email, adresse, ville, commission_pct)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  "Teranga Immobilier", "teranga-immobilier", "005812345 2V2", "SN DKR 2021 B 18342",
  "771234567", "contact@teranga-immo.sn",
  "Rue 10 x Avenue Cheikh Anta Diop, Immeuble Baobab, 2e étage", "Dakar", 10,
).lastInsertRowid;

db.prepare(`
  INSERT INTO utilisateurs (agence_id, nom, email, telephone, mot_de_passe_hash, role)
  VALUES (?, ?, ?, ?, ?, 'proprietaire')
`).run(agenceId, "Awa Diop", "demo@keurgestion.sn", "771234567", hacher("demo1234"));

// ------------------------------------------------------------------ biens
const BIENS = [
  {
    titre: "Appartement 3 chambres avec vue mer — Almadies",
    type: "appartement", quartier: "Almadies", chambres: 3, sdb: 2, surface: 140,
    etage: "4e étage", meuble: 1, loyer: 850000, charges: 50000, caution: 2,
    equipements: "Climatisation, Cuisine équipée, Ascenseur, Parking, Gardien, Sécurité 24h/24, Balcon",
    description:
      "Bel appartement lumineux au 4e étage d'une résidence sécurisée des Almadies, à 5 minutes de la Corniche Ouest.\n" +
      "Séjour double ouvrant sur un large balcon avec vue sur l'océan, cuisine américaine entièrement équipée, " +
      "trois chambres dont une suite parentale.\nRésidence avec ascenseur, gardiennage 24h/24 et parking souterrain.",
    proprietaire: ["Mamadou Sow", "776543210"],
  },
  {
    titre: "Villa 4 chambres avec piscine — Ngor",
    type: "villa", quartier: "Ngor", chambres: 4, sdb: 3, surface: 260,
    etage: "R+1", meuble: 1, loyer: 1500000, charges: 100000, caution: 3,
    equipements: "Climatisation, Piscine, Jardin, Parking, Gardien, Groupe électrogène, Terrasse, Cuisine équipée",
    description:
      "Villa de standing sur deux niveaux, à deux pas de la plage de Ngor.\n" +
      "Vaste séjour, salle à manger, cuisine équipée, quatre chambres climatisées, terrasse sur le toit.\n" +
      "Jardin arboré avec piscine, groupe électrogène et logement de gardien.",
    proprietaire: ["Fatou Ndiaye", "775551212"],
  },
  {
    titre: "Studio meublé — Mermoz",
    type: "studio", quartier: "Mermoz", chambres: 1, sdb: 1, surface: 38,
    etage: "2e étage", meuble: 1, loyer: 200000, charges: 15000, caution: 2,
    equipements: "Climatisation, Internet / Fibre, Cuisine équipée, Eau chaude",
    description:
      "Studio meublé idéal pour un étudiant ou un jeune actif, à proximité de l'UCAD et de la VDN.\n" +
      "Coin nuit séparé, kitchenette équipée, climatisation et fibre optique incluses.",
    proprietaire: ["Ibrahima Fall", "771119988"],
  },
  {
    titre: "Appartement 2 chambres — Sacré-Cœur 3",
    type: "appartement", quartier: "Sacré-Cœur", chambres: 2, sdb: 1, surface: 75,
    etage: "3e étage", meuble: 0, loyer: 350000, charges: 20000, caution: 2,
    equipements: "Climatisation, Parking, Gardien, Balcon",
    description:
      "Appartement non meublé au cœur de Sacré-Cœur 3, proche des commerces et des écoles.\n" +
      "Deux chambres, séjour spacieux, cuisine indépendante, balcon.",
    proprietaire: ["Aïssatou Bâ", "778887766"],
  },
  {
    titre: "Duplex 4 chambres — Point E",
    type: "duplex", quartier: "Point E", chambres: 4, sdb: 3, surface: 180,
    etage: "R+1", meuble: 0, loyer: 750000, charges: 45000, caution: 2,
    equipements: "Climatisation, Cuisine équipée, Parking, Gardien, Terrasse, Eau chaude",
    description:
      "Duplex spacieux dans un quartier résidentiel calme du Point E.\n" +
      "Grand séjour au rez-de-chaussée, quatre chambres à l'étage, terrasse privative.",
    proprietaire: ["Ousmane Diallo", "703334455"],
  },
  {
    titre: "Local commercial en rez-de-chaussée — Plateau",
    type: "local_commercial", quartier: "Plateau", chambres: 0, sdb: 1, surface: 90,
    etage: "RDC", meuble: 0, loyer: 900000, charges: 60000, caution: 3,
    equipements: "Climatisation, Gardien, Sécurité 24h/24",
    description:
      "Local commercial de 90 m² en rez-de-chaussée sur une artère très passante du Plateau.\n" +
      "Vitrine sur rue, réserve, sanitaires. Idéal boutique, agence ou restauration rapide.",
    proprietaire: ["SCI Rufisque Invest", "338211234"],
  },
  {
    titre: "Maison 3 chambres — Parcelles Assainies U15",
    type: "maison", quartier: "Parcelles Assainies", chambres: 3, sdb: 2, surface: 120,
    etage: "RDC", meuble: 0, loyer: 250000, charges: 10000, caution: 2,
    equipements: "Parking, Jardin, Eau chaude",
    description:
      "Maison familiale de plain-pied dans les Parcelles Assainies, unité 15.\n" +
      "Trois chambres, salon, cuisine, cour intérieure avec point d'eau.",
    proprietaire: ["Cheikh Mbaye", "776660011"],
  },
  {
    titre: "Appartement meublé 2 chambres — Saly Portudal",
    type: "appartement", quartier: "Saly", ville: "Mbour", chambres: 2, sdb: 2, surface: 85,
    etage: "1er étage", meuble: 1, loyer: 400000, charges: 35000, caution: 2,
    equipements: "Climatisation, Piscine, Cuisine équipée, Gardien, Terrasse, Internet / Fibre",
    description:
      "Appartement meublé dans une résidence avec piscine à Saly Portudal, à 300 m de la plage.\n" +
      "Parfait pour une location longue durée ou saisonnière.",
    proprietaire: ["Nafissatou Sarr", "774442200"],
  },
  {
    titre: "Chambre meublée avec salle d'eau — Ouakam",
    type: "chambre", quartier: "Ouakam", chambres: 1, sdb: 1, surface: 22,
    etage: "1er étage", meuble: 1, loyer: 120000, charges: 10000, caution: 1,
    equipements: "Climatisation, Internet / Fibre, Eau chaude",
    description:
      "Chambre meublée avec salle d'eau privative dans une villa calme d'Ouakam.\n" +
      "Charges (eau, électricité, internet) comprises dans le forfait mensuel.",
    proprietaire: ["Moussa Kane", "708889900"],
  },
  {
    titre: "Bureau open space 6 postes — Ngor Virage",
    type: "bureau", quartier: "Ngor", chambres: 0, sdb: 1, surface: 65,
    etage: "2e étage", meuble: 1, loyer: 550000, charges: 40000, caution: 2,
    equipements: "Climatisation, Internet / Fibre, Parking, Ascenseur, Sécurité 24h/24",
    description:
      "Plateau de bureaux aménagé pour six postes, dans un immeuble récent de Ngor Virage.\n" +
      "Salle de réunion partagée, fibre optique, parking visiteurs.",
    proprietaire: ["Immo Yaay SARL", "338601122"],
  },
  {
    titre: "Appartement 2 chambres rénové — Ouest Foire",
    type: "appartement", quartier: "Ouest Foire", chambres: 2, sdb: 2, surface: 80,
    etage: "1er étage", meuble: 0, loyer: 300000, charges: 20000, caution: 2,
    equipements: "Climatisation, Parking, Gardien, Balcon, Eau chaude",
    description:
      "Appartement entièrement rénové à Ouest Foire, à 10 minutes de l'aéroport de Diass en voiture.\n" +
      "Deux chambres climatisées, séjour lumineux, cuisine indépendante et balcon.",
    proprietaire: ["Khady Ndoye", "775559090"],
  },
  {
    titre: "Villa 5 chambres avec grand jardin — Fann Résidence",
    type: "villa", quartier: "Fann", chambres: 5, sdb: 4, surface: 340,
    etage: "R+1", meuble: 0, loyer: 2000000, charges: 120000, caution: 3,
    equipements: "Climatisation, Jardin, Parking, Gardien, Groupe électrogène, Terrasse, Cuisine équipée, Sécurité 24h/24",
    description:
      "Vaste villa de maître à Fann Résidence, dans une rue calme et arborée.\n" +
      "Double séjour, bureau, cinq chambres dont deux suites, dépendance et logement de personnel.\n" +
      "Idéale pour une famille ou une résidence de fonction.",
    proprietaire: ["Succession Diagne", "338250099"],
  },
  {
    titre: "Studio meublé tout confort — Liberté 6",
    type: "studio", quartier: "Liberté 6", chambres: 1, sdb: 1, surface: 32,
    etage: "3e étage", meuble: 1, loyer: 175000, charges: 12000, caution: 2,
    equipements: "Climatisation, Internet / Fibre, Cuisine équipée, Eau chaude, Gardien",
    description:
      "Studio meublé prêt à habiter à Liberté 6, proche de la VDN et des transports.\n" +
      "Charges d'eau et d'internet comprises dans le forfait mensuel.",
    proprietaire: ["Abdoulaye Ndour", "776112233"],
  },
  {
    titre: "Appartement neuf 3 chambres — Cité Keur Gorgui",
    type: "appartement", quartier: "Cité Keur Gorgui", chambres: 3, sdb: 2, surface: 110,
    etage: "6e étage", meuble: 0, loyer: 600000, charges: 40000, caution: 2,
    equipements: "Climatisation, Ascenseur, Parking, Gardien, Sécurité 24h/24, Balcon, Cuisine équipée",
    description:
      "Appartement neuf jamais habité dans une résidence récente de la Cité Keur Gorgui.\n" +
      "Trois chambres, deux salles de bain, cuisine équipée et grand balcon avec vue dégagée.",
    proprietaire: ["Ndèye Astou Diop", "770445566"],
  },
  {
    titre: "Magasin sur rue passante — Grand Yoff",
    type: "magasin", quartier: "Grand Yoff", chambres: 0, sdb: 1, surface: 55,
    etage: "RDC", meuble: 0, loyer: 350000, charges: 25000, caution: 3,
    equipements: "Gardien, Sécurité 24h/24",
    description:
      "Magasin de 55 m² avec rideau métallique, situé sur un axe très fréquenté de Grand Yoff.\n" +
      "Réserve à l'arrière et sanitaires. Convient au commerce de détail.",
    proprietaire: ["Mor Talla Seck", "778223344"],
  },
  {
    titre: "Appartement 2 chambres — Thiès centre",
    type: "appartement", quartier: "Centre-ville", ville: "Thiès", chambres: 2, sdb: 1, surface: 70,
    etage: "2e étage", meuble: 0, loyer: 150000, charges: 8000, caution: 2,
    equipements: "Parking, Balcon, Eau chaude",
    description:
      "Appartement lumineux au centre de Thiès, à proximité immédiate du marché et de la gare.\n" +
      "Deux chambres, séjour, cuisine et balcon sur rue.",
    proprietaire: ["Bineta Diagne", "779334455"],
  },
  {
    titre: "Villa meublée à 200 m de la plage — Ngaparou",
    type: "villa", quartier: "Ngaparou", ville: "Mbour", chambres: 3, sdb: 3, surface: 200,
    etage: "RDC", meuble: 1, loyer: 900000, charges: 70000, caution: 2,
    equipements: "Climatisation, Piscine, Jardin, Parking, Gardien, Terrasse, Cuisine équipée, Internet / Fibre",
    description:
      "Villa meublée avec piscine à Ngaparou, à 200 m de la plage et à 10 minutes de Saly.\n" +
      "Trois chambres en suite, grande terrasse ombragée et jardin entretenu.",
    proprietaire: ["Petite Côte Invest", "339571020"],
  },
];

const insererBien = db.prepare(`
  INSERT INTO biens (agence_id, reference, titre, type, description, ville, quartier, adresse,
                     chambres, salles_bain, surface, etage, meuble, equipements, photos,
                     loyer, charges, caution_mois, statut, publie, proprietaire_nom, proprietaire_telephone)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

const idsBiens = BIENS.map((b, i) => {
  const photos = [
    `/photos/bien-${(i % 8) + 1}.svg`,
    `/photos/bien-${((i + 3) % 8) + 1}.svg`,
    `/photos/bien-${((i + 5) % 8) + 1}.svg`,
  ].join("\n");

  return Number(insererBien.run(
    agenceId, `BIEN-${String(i + 1).padStart(4, "0")}`, b.titre, b.type, b.description,
    b.ville ?? "Dakar", b.quartier, `${b.quartier}, ${b.ville ?? "Dakar"}`,
    b.chambres, b.sdb, b.surface, b.etage, b.meuble, b.equipements, photos,
    b.loyer, b.charges, b.caution, "disponible",
    b.proprietaire[0], b.proprietaire[1],
  ).lastInsertRowid);
});

// ------------------------------------------------------------- locataires
const LOCATAIRES = [
  ["Awa", "Ndiaye", "775551001", "1 234 1988 01234", "Comptable", "Sonatel", "Moustapha Ndiaye", "776661001"],
  ["Cheikh", "Gueye", "775551002", "1 234 1985 02345", "Ingénieur", "Eiffage Sénégal", "Bineta Gueye", "776661002"],
  ["Mariama", "Sow", "775551003", "1 234 1992 03456", "Enseignante", "Lycée Blaise Diagne", "Alioune Sow", "776661003"],
  ["Ibrahima", "Diouf", "775551004", "1 234 1990 04567", "Médecin", "Hôpital Principal", "Coumba Diouf", "776661004"],
  ["Fatou", "Camara", "775551005", "1 234 1994 05678", "Consultante", "Indépendante", "Modou Camara", "776661005"],
  ["Serigne", "Fall", "775551006", "1 234 1983 06789", "Commerçant", "Marché Sandaga", "Astou Fall", "776661006"],
  ["Ndèye", "Thiam", "775551007", "1 234 1996 07890", "Étudiante", "UCAD", "Papa Thiam", "776661007"],
];

const insererLocataire = db.prepare(`
  INSERT INTO locataires (agence_id, prenom, nom, telephone, email, cni, profession, employeur,
                          garant_nom, garant_telephone, adresse)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const idsLocataires = LOCATAIRES.map(([prenom, nom, tel, cni, prof, emp, gnom, gtel]) =>
  Number(insererLocataire.run(
    agenceId, prenom, nom, tel,
    `${prenom.toLowerCase()}.${nom.toLowerCase()}@exemple.sn`,
    cni, prof, emp, gnom, gtel, "Dakar, Sénégal",
  ).lastInsertRowid),
);

// ---------------------------------------------------------------- contrats
// [indice du bien, indice du locataire, mois de debut (relatif), jour d'echeance]
// Echeance tombant il y a 3 jours : garantit un impaye « tout frais »,
// pour que les trois niveaux de relance soient visibles dans la demo.
const JOUR_RECENT = Math.min(28, Math.max(1, new Date().getUTCDate() - 3));

const BAUX = [
  [0, 0, -14, 5],
  [1, 1, -22, 1],
  [2, 2, -8,  10],
  [4, 3, -18, 5],
  [6, 4, -5,  3],
  [7, 5, -11, 5],
  [8, 6, -3,  JOUR_RECENT],
];

const insererContrat = db.prepare(`
  INSERT INTO contrats (agence_id, reference, bien_id, locataire_id, date_debut, duree_mois,
                        loyer, charges, caution, jour_echeance, commission_pct, statut)
  VALUES (?, ?, ?, ?, ?, 12, ?, ?, ?, ?, 10, 'actif')
`);

const contrats = BAUX.map(([ib, il, debut, jour], i) => {
  const bien = BIENS[ib];
  const id = Number(insererContrat.run(
    agenceId, `BAIL-${String(i + 1).padStart(4, "0")}`, idsBiens[ib], idsLocataires[il],
    jourDu(moisDecale(debut), 1), bien.loyer, bien.charges, bien.loyer * bien.caution, jour,
  ).lastInsertRowid);

  db.prepare("UPDATE biens SET statut = 'loue' WHERE id = ?").run(idsBiens[ib]);
  return { id, debut, jour, loyer: bien.loyer, charges: bien.charges };
});

// Un bien reserve, pour illustrer la vitrine
db.prepare("UPDATE biens SET statut = 'reserve' WHERE id = ?").run(idsBiens[3]);

// ------------------------------------------------- factures et paiements
const insererFacture = db.prepare(`
  INSERT INTO factures (agence_id, contrat_id, numero, periode, date_emission, date_echeance,
                        montant_loyer, montant_charges, montant_autres, montant_total, statut)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'emise')
`);

const insererPaiement = db.prepare(`
  INSERT INTO paiements (agence_id, facture_id, montant, date_paiement, mode, reference)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const MODES = ["orange_money", "wave", "especes", "virement", "free_money", "cheque"];
let compteurFacture = 0;
let alea = 42;
const suivant = () => (alea = (alea * 1103515245 + 12345) % 2147483648) / 2147483648;

// Six derniers mois, du plus ancien au mois en cours
for (let m = -5; m <= 0; m++) {
  const periode = moisDecale(m);

  for (const c of contrats) {
    if (c.debut > m) continue; // le bail n'avait pas encore commence

    const total = c.loyer + c.charges;
    const annee = periode.slice(0, 4);
    const numero = `FAC-${annee}-${String(++compteurFacture).padStart(4, "0")}`;

    const factureId = Number(insererFacture.run(
      agenceId, c.id, numero, periode, `${periode}-01`, jourDu(periode, c.jour),
      c.loyer, c.charges, total,
    ).lastInsertRowid);

    // Les mois passes sont regles ; le mois en cours l'est partiellement.
    const tirage = suivant();
    let part = 1;
    // Le dernier bail reste impaye ce mois-ci : c'est le cas « rappel amical ».
    if (m === 0 && c === contrats[contrats.length - 1]) part = 0;
    else if (m === 0) part = tirage < 0.55 ? 1 : tirage < 0.8 ? 0.5 : 0;
    else if (m === -1 && tirage < 0.18) part = 0;   // un impaye recent
    else if (tirage < 0.08) part = 0.6;             // un paiement partiel plus ancien

    if (part > 0) {
      const mode = MODES[Math.floor(suivant() * MODES.length)];
      const reference = mode === "orange_money" || mode === "wave" || mode === "free_money"
        ? `TX${Math.floor(suivant() * 900000000 + 100000000)}`
        : mode === "cheque" ? `CHQ-${Math.floor(suivant() * 900000 + 100000)}` : null;

      insererPaiement.run(
        agenceId, factureId, Math.round(total * part),
        jourDu(periode, Math.min(28, c.jour + Math.floor(suivant() * 6))),
        mode, reference,
      );
    }
  }
}

// ---------------------------------------------------------------- relances
// Quelques relances deja envoyees, pour illustrer l'historique.
const insererRelance = db.prepare(`
  INSERT INTO relances (agence_id, facture_id, niveau, canal, message, envoye_le)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const impayees = db.prepare(`
  SELECT f.id, f.periode,
         CAST(julianday('now') - julianday(f.date_echeance) AS INTEGER) AS retard
    FROM factures f
    LEFT JOIN (SELECT facture_id, SUM(montant) AS paye FROM paiements GROUP BY facture_id) p
           ON p.facture_id = f.id
   WHERE f.montant_total > COALESCE(p.paye, 0)
     AND date(f.date_echeance) < date('now')
   ORDER BY retard DESC
`).all();

// Les deux plus anciens impayes ont deja ete relances il y a une dizaine de jours.
for (const [i, f] of impayees.slice(0, 2).entries()) {
  const niveau = f.retard >= 30 ? "mise_en_demeure" : f.retard >= 8 ? "relance" : "rappel";
  const jours = 10 + i * 2;
  const date = new Date(Date.now() - jours * 86400000).toISOString().slice(0, 19).replace("T", " ");
  insererRelance.run(agenceId, f.id, niveau, i === 0 ? "whatsapp" : "sms", null, date);
}

// ---------------------------------------------------------------- demandes
const DEMANDES = [
  [idsBiens[3], "Modou Faye", "778001122", "modou.faye@exemple.sn",
   "Bonjour, je suis intéressé par l'appartement de Sacré-Cœur. Serait-il possible de visiter samedi matin ?", "nouvelle"],
  [idsBiens[5], "Sokhna Mbengue", "770112233", null,
   "Bonjour, le local du Plateau est-il toujours disponible ? Je souhaite y ouvrir une boutique.", "nouvelle"],
  [idsBiens[9], "Aliou Badara Cissé", "769887766", "ab.cisse@exemple.sn",
   "Bonjour, nous cherchons des bureaux pour notre startup (5 personnes). Quel est le préavis ?", "traitee"],
];

const insererDemande = db.prepare(`
  INSERT INTO demandes (agence_id, bien_id, nom, telephone, email, message, statut)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
for (const d of DEMANDES) insererDemande.run(agenceId, ...d);

// ------------------------------------------------------------------ bilan
const compter = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;

console.log(`
Base de demonstration creee : ${cheminBase}

  Agence      : Teranga Immobilier (Dakar)
  Biens       : ${compter("biens")}
  Locataires  : ${compter("locataires")}
  Baux        : ${compter("contrats")}
  Factures    : ${compter("factures")}
  Paiements   : ${compter("paiements")}
  Demandes    : ${compter("demandes")}
  Relances    : ${compter("relances")}

Connexion :  demo@keurgestion.sn  /  demo1234
`);

db.close();
