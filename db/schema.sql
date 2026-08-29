-- ============================================================
--  Sen Gestion - Schema de la base de donnees
--  SaaS de gestion locative immobiliere (Senegal)
--  Montants stockes en entiers, en francs CFA (XOF), sans decimales.
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------- Agences (les clients du SaaS) ----------
CREATE TABLE IF NOT EXISTS agences (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nom           TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  ninea         TEXT,
  rccm          TEXT,
  telephone     TEXT,
  email         TEXT,
  adresse       TEXT,
  ville         TEXT DEFAULT 'Dakar',
  logo_url      TEXT,
  commission_pct REAL NOT NULL DEFAULT 10,
  -- Numeros ou l'agence encaisse les loyers, montres au locataire
  paiement_orange_money TEXT,
  paiement_wave         TEXT,
  paiement_free_money   TEXT,
  paiement_consignes    TEXT,   -- precisions libres (RIB, horaires de caisse...)
  -- Encaissement automatique : chaque agence branche SON propre compte
  -- marchand. L'argent va directement chez elle ; Sen Gestion ne le touche
  -- jamais et n'a donc pas besoin d'agrement d'etablissement de paiement.
  encaissement_actif      INTEGER NOT NULL DEFAULT 0,
  encaissement_fournisseur TEXT,          -- paydunya (seul gere pour l'instant)
  encaissement_mode       TEXT NOT NULL DEFAULT 'test',  -- test | reel
  -- Cles marchandes, chiffrees (voir src/lib/chiffrement.ts). Jamais en clair.
  encaissement_cle_maitre TEXT,
  encaissement_cle_privee TEXT,
  encaissement_jeton      TEXT,
  -- Formule d'abonnement : decouverte | bailleur | agence | pro
  plan          TEXT NOT NULL DEFAULT 'decouverte',
  -- Modeles de messages de relance (vides = modeles par defaut du logiciel)
  modele_rappel           TEXT,
  modele_relance          TEXT,
  modele_mise_en_demeure  TEXT,
  cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Utilisateurs ----------
CREATE TABLE IF NOT EXISTS utilisateurs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id         INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  nom               TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  telephone         TEXT,
  -- Vide pour un compte cree via Google : l'identite est alors verifiee par Google.
  mot_de_passe_hash TEXT,
  -- Identifiant Google (sub), unique et stable dans le temps.
  google_id         TEXT,
  avatar_url        TEXT,
  role              TEXT NOT NULL DEFAULT 'proprietaire',  -- proprietaire | agent
  actif             INTEGER NOT NULL DEFAULT 1,
  cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_agence ON utilisateurs(agence_id);

-- ---------- Sessions de connexion ----------
CREATE TABLE IF NOT EXISTS sessions (
  token          TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le      TEXT NOT NULL,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(utilisateur_id);

-- ---------- Biens immobiliers ----------
CREATE TABLE IF NOT EXISTS biens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id     INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  reference     TEXT NOT NULL,
  titre         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'appartement',
                -- appartement | villa | maison | studio | chambre | duplex
                -- | local_commercial | bureau | magasin | terrain
  description   TEXT,
  ville         TEXT NOT NULL DEFAULT 'Dakar',
  quartier      TEXT,
  adresse       TEXT,
  chambres      INTEGER NOT NULL DEFAULT 0,
  salles_bain   INTEGER NOT NULL DEFAULT 0,
  surface       INTEGER,                    -- m2
  etage         TEXT,
  meuble        INTEGER NOT NULL DEFAULT 0, -- 0 = non meuble, 1 = meuble
  equipements   TEXT,                       -- liste separee par des virgules
  photos        TEXT,                       -- URLs separees par des retours a la ligne
  loyer         INTEGER NOT NULL DEFAULT 0, -- loyer mensuel FCFA
  charges       INTEGER NOT NULL DEFAULT 0, -- charges mensuelles FCFA
  caution_mois  INTEGER NOT NULL DEFAULT 2, -- nombre de mois de caution
  -- Location courte duree (meuble touristique, type Airbnb).
  -- Quand courte_duree = 1, c'est prix_nuit qui s'affiche, pas le loyer.
  courte_duree  INTEGER NOT NULL DEFAULT 0,
  prix_nuit     INTEGER NOT NULL DEFAULT 0, -- FCFA par nuit
  nuits_min     INTEGER NOT NULL DEFAULT 1,
  capacite      INTEGER NOT NULL DEFAULT 2, -- nombre de voyageurs
  statut        TEXT NOT NULL DEFAULT 'disponible',
                -- disponible | loue | reserve | travaux
  publie        INTEGER NOT NULL DEFAULT 1, -- visible sur la vitrine publique
  proprietaire_nom       TEXT,
  proprietaire_telephone TEXT,
  cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_biens_agence  ON biens(agence_id);
CREATE INDEX IF NOT EXISTS idx_biens_vitrine ON biens(publie, statut);
CREATE UNIQUE INDEX IF NOT EXISTS idx_biens_ref ON biens(agence_id, reference);

-- ---------- Locataires ----------
CREATE TABLE IF NOT EXISTS locataires (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id         INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  prenom            TEXT NOT NULL,
  nom               TEXT NOT NULL,
  telephone         TEXT NOT NULL,
  telephone2        TEXT,
  email             TEXT,
  cni               TEXT,                   -- numero de carte nationale d'identite
  profession        TEXT,
  employeur         TEXT,
  adresse           TEXT,
  garant_nom        TEXT,
  garant_telephone  TEXT,
  notes             TEXT,
  -- Photo de profil, envoyee par le locataire depuis son espace
  photo_url         TEXT,
  -- Acces a l'espace locataire (facultatif : active par l'agence)
  mot_de_passe_hash TEXT,
  acces_actif       INTEGER NOT NULL DEFAULT 0,
  cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_locataires_agence ON locataires(agence_id);

-- ---------- Sessions de l'espace locataire ----------
CREATE TABLE IF NOT EXISTS sessions_locataires (
  token          TEXT PRIMARY KEY,
  locataire_id   INTEGER NOT NULL REFERENCES locataires(id) ON DELETE CASCADE,
  expire_le      TEXT NOT NULL,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_loc_locataire ON sessions_locataires(locataire_id);

-- ---------- Contrats de bail ----------
CREATE TABLE IF NOT EXISTS contrats (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id      INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  bien_id        INTEGER NOT NULL REFERENCES biens(id) ON DELETE RESTRICT,
  locataire_id   INTEGER NOT NULL REFERENCES locataires(id) ON DELETE RESTRICT,
  reference      TEXT NOT NULL,
  date_debut     TEXT NOT NULL,             -- AAAA-MM-JJ
  date_fin       TEXT,                      -- AAAA-MM-JJ (vide = bail reconductible)
  duree_mois     INTEGER NOT NULL DEFAULT 12,
  loyer          INTEGER NOT NULL DEFAULT 0,
  charges        INTEGER NOT NULL DEFAULT 0,
  caution        INTEGER NOT NULL DEFAULT 0,
  caution_rendue INTEGER NOT NULL DEFAULT 0,
  jour_echeance  INTEGER NOT NULL DEFAULT 5, -- jour du mois ou le loyer est du
  commission_pct REAL NOT NULL DEFAULT 10,   -- honoraires de l'agence en %
  statut         TEXT NOT NULL DEFAULT 'actif',  -- actif | termine | resilie
  notes          TEXT,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contrats_agence ON contrats(agence_id);
CREATE INDEX IF NOT EXISTS idx_contrats_bien   ON contrats(bien_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contrats_ref ON contrats(agence_id, reference);

-- ---------- Factures / quittances de loyer ----------
CREATE TABLE IF NOT EXISTS factures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id       INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  contrat_id      INTEGER NOT NULL REFERENCES contrats(id) ON DELETE CASCADE,
  numero          TEXT NOT NULL,
  periode         TEXT NOT NULL,            -- AAAA-MM
  date_emission   TEXT NOT NULL,
  date_echeance   TEXT NOT NULL,
  montant_loyer   INTEGER NOT NULL DEFAULT 0,
  montant_charges INTEGER NOT NULL DEFAULT 0,
  montant_autres  INTEGER NOT NULL DEFAULT 0,
  libelle_autres  TEXT,
  montant_total   INTEGER NOT NULL DEFAULT 0,
  statut          TEXT NOT NULL DEFAULT 'emise',  -- emise | annulee
  cree_le         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_factures_agence  ON factures(agence_id);
CREATE INDEX IF NOT EXISTS idx_factures_contrat ON factures(contrat_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_periode ON factures(contrat_id, periode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_numero  ON factures(agence_id, numero);

-- ---------- Paiements ----------
CREATE TABLE IF NOT EXISTS paiements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id      INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  facture_id     INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  montant        INTEGER NOT NULL,
  date_paiement  TEXT NOT NULL,
  mode           TEXT NOT NULL DEFAULT 'especes',
                 -- orange_money | wave | free_money | especes | virement | cheque
  reference      TEXT,                      -- no de transaction Orange Money / Wave, no de cheque...
  note           TEXT,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paiements_agence  ON paiements(agence_id);
CREATE INDEX IF NOT EXISTS idx_paiements_facture ON paiements(facture_id);

-- ---------- Transactions d'encaissement en ligne ----------
-- Une ligne par tentative de paiement lancee depuis l'espace locataire.
-- Le jeton est celui du fournisseur : c'est lui qui fait foi, et c'est sur
-- lui qu'on interroge le fournisseur pour connaitre le vrai statut.
CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id     INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  facture_id    INTEGER REFERENCES factures(id) ON DELETE CASCADE,
  locataire_id  INTEGER REFERENCES locataires(id) ON DELETE SET NULL,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
  fournisseur   TEXT NOT NULL DEFAULT 'paydunya',
  jeton         TEXT NOT NULL,             -- jeton de facture chez le fournisseur
  montant       INTEGER NOT NULL,
  statut        TEXT NOT NULL DEFAULT 'initiee',
                -- initiee | payee | echouee | annulee
  -- Paiement cree dans la table `paiements` une fois l'argent confirme.
  -- Sa presence rend la confirmation idempotente : un second appel du
  -- fournisseur ne peut pas crediter deux fois la meme facture.
  paiement_id   INTEGER REFERENCES paiements(id) ON DELETE SET NULL,
  detail        TEXT,                      -- message du fournisseur, pour le journal
  cree_le       TEXT NOT NULL DEFAULT (datetime('now')),
  confirme_le   TEXT
);
CREATE INDEX IF NOT EXISTS idx_transactions_agence ON transactions(agence_id, cree_le);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_jeton ON transactions(fournisseur, jeton);

-- ---------- Reservations de courte duree (meubles touristiques) ----------
-- Une reservation bloque le bien de date_arrivee (incluse) a date_depart
-- (exclue) : le jour du depart, le bien peut deja etre reloue.
CREATE TABLE IF NOT EXISTS reservations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id     INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  bien_id       INTEGER NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
  reference     TEXT NOT NULL,
  nom           TEXT NOT NULL,
  telephone     TEXT NOT NULL,
  email         TEXT,
  date_arrivee  TEXT NOT NULL,             -- AAAA-MM-JJ
  date_depart   TEXT NOT NULL,             -- AAAA-MM-JJ (exclue)
  nuits         INTEGER NOT NULL DEFAULT 1,
  voyageurs     INTEGER NOT NULL DEFAULT 1,
  prix_nuit     INTEGER NOT NULL DEFAULT 0, -- fige au moment de la demande
  montant_total INTEGER NOT NULL DEFAULT 0,
  montant_paye  INTEGER NOT NULL DEFAULT 0,
  statut        TEXT NOT NULL DEFAULT 'demande',
                -- demande | confirmee | annulee | terminee
  message       TEXT,
  note          TEXT,                       -- note interne de l'agence
  cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reservations_agence ON reservations(agence_id, statut);
CREATE INDEX IF NOT EXISTS idx_reservations_bien   ON reservations(bien_id, date_arrivee);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_ref ON reservations(agence_id, reference);

-- ---------- Artisans recommandes par l'agence ----------
-- Annuaire des professionnels du batiment que l'agence connait et
-- recommande : plombiers, electriciens, macons... Visible publiquement,
-- comme les biens, pour que locataires et proprietaires les trouvent.
CREATE TABLE IF NOT EXISTS artisans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id     INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  nom           TEXT NOT NULL,
  metier        TEXT NOT NULL DEFAULT 'autre',
  telephone     TEXT NOT NULL,
  telephone2    TEXT,
  ville         TEXT NOT NULL DEFAULT 'Dakar',
  quartier      TEXT,
  description   TEXT,
  tarif_indicatif TEXT,        -- texte libre : "À partir de 5 000 FCFA"
  photo_url     TEXT,
  publie        INTEGER NOT NULL DEFAULT 1,  -- visible sur la vitrine publique
  cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_artisans_agence  ON artisans(agence_id);
CREATE INDEX IF NOT EXISTS idx_artisans_vitrine ON artisans(publie, metier);

-- ---------- Demandes recues depuis la vitrine publique ----------
CREATE TABLE IF NOT EXISTS demandes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id   INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  bien_id     INTEGER REFERENCES biens(id) ON DELETE SET NULL,
  nom         TEXT NOT NULL,
  telephone   TEXT NOT NULL,
  email       TEXT,
  message     TEXT,
  statut      TEXT NOT NULL DEFAULT 'nouvelle',  -- nouvelle | traitee | archivee
  cree_le     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_demandes_agence ON demandes(agence_id, statut);

-- ---------- Relances des loyers impayes ----------
CREATE TABLE IF NOT EXISTS relances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agence_id   INTEGER NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  facture_id  INTEGER NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  niveau      TEXT NOT NULL,   -- rappel | relance | mise_en_demeure
  canal       TEXT NOT NULL,   -- whatsapp | sms | appel | email
  message     TEXT,
  envoye_le   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_relances_agence  ON relances(agence_id);
CREATE INDEX IF NOT EXISTS idx_relances_facture ON relances(facture_id, niveau);

-- ---------- Reinitialisation de mot de passe ----------
CREATE TABLE IF NOT EXISTS reinitialisations (
  token          TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le      TEXT NOT NULL,
  utilise_le     TEXT,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reinit_user ON reinitialisations(utilisateur_id);

-- ---------- Tentatives de connexion (anti force brute) ----------
CREATE TABLE IF NOT EXISTS tentatives_connexion (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  cle     TEXT NOT NULL,   -- adresse e-mail visee, ou adresse IP d'origine
  reussie INTEGER NOT NULL DEFAULT 0,
  le      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tentatives ON tentatives_connexion(cle, le);
