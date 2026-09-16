-- ============================================================================
--  NOVA Boutique — schema de la base
--
--  Une regle traverse tout ce fichier : TOUTE table qui porte des donnees de
--  commercant porte une colonne `boutique_id`, meme quand on pourrait la
--  retrouver par jointure. Les lignes de commande pourraient remonter a la
--  boutique par `commandes`, les variantes par `produits` — on les stocke
--  quand meme. La raison n'est pas la performance : c'est qu'une requete
--  oubliee sans filtre se voit immediatement a la relecture, et qu'un
--  `WHERE boutique_id = ?` peut etre exige partout sans exception a retenir.
--
--  Les montants sont des ENTIERS, dans l'unite mineure du pays (le franc CFA
--  n'a pas de centimes : 5000 = 5 000 FCFA). Aucun flottant ne touche a
--  l'argent. `pays.decimales` dit comment afficher les devises qui, elles,
--  ont des decimales, le jour ou un pays en aura.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
--  Pays : ce qui change d'un marche a l'autre, et rien d'autre.
--  Le Senegal est le premier. Ajouter un pays, c'est inserer une ligne ici —
--  pas modifier du code.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pays (
  code                TEXT PRIMARY KEY,              -- 'SN'
  nom                 TEXT NOT NULL,                 -- 'Sénégal'
  devise              TEXT NOT NULL,                 -- 'XOF'
  devise_libelle      TEXT NOT NULL,                 -- 'FCFA'
  decimales           INTEGER NOT NULL DEFAULT 0,
  indicatif           TEXT NOT NULL,                 -- '+221'
  longueur_nationale  INTEGER NOT NULL DEFAULT 9,    -- chiffres apres l'indicatif
  villes              TEXT NOT NULL DEFAULT '[]',    -- JSON: ["Dakar", ...]
  moyens_paiement     TEXT NOT NULL DEFAULT '[]',    -- JSON: codes prestataires
  actif               INTEGER NOT NULL DEFAULT 1,
  ordre               INTEGER NOT NULL DEFAULT 100
);

-- ----------------------------------------------------------------------------
--  Offres. Modifiables depuis l'administration : les tarifs du cahier des
--  charges sont des valeurs de depart, posees en donnee et non en constante.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offres (
  code                  TEXT PRIMARY KEY,            -- 'decouverte' | 'essentiel' | ...
  nom                   TEXT NOT NULL,
  prix_mensuel          INTEGER NOT NULL DEFAULT 0,
  devise                TEXT NOT NULL DEFAULT 'XOF',
  max_produits          INTEGER NOT NULL DEFAULT 5,
  quota_ia              INTEGER NOT NULL DEFAULT 10, -- operations IA reussies / mois
  max_membres           INTEGER NOT NULL DEFAULT 1,
  domaine_personnalise  INTEGER NOT NULL DEFAULT 0,
  -- 0 = la boutique reste un brouillon. C'est la limite de l'offre Decouverte,
  -- et elle est verifiee cote serveur au moment de publier, pas seulement
  -- cachee dans l'interface.
  publication           INTEGER NOT NULL DEFAULT 1,
  accroche              TEXT,
  ordre                 INTEGER NOT NULL DEFAULT 100,
  actif                 INTEGER NOT NULL DEFAULT 1
);

-- ----------------------------------------------------------------------------
--  Boutiques
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boutiques (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  slug                TEXT NOT NULL UNIQUE,          -- adresse publique : slug.nova.shop
  nom                 TEXT NOT NULL,
  activite            TEXT,                          -- 'mode', 'beaute', ...
  description         TEXT,
  pays                TEXT NOT NULL DEFAULT 'SN' REFERENCES pays(code),
  ville               TEXT,
  quartier            TEXT,
  adresse             TEXT,
  telephone           TEXT,
  whatsapp            TEXT,
  email               TEXT,
  logo_url            TEXT,

  -- Apparence
  modele              TEXT NOT NULL DEFAULT 'epure', -- epure | elegant | colore
  couleur             TEXT NOT NULL DEFAULT '#0E5C3F',

  -- Contenu. Deux colonnes distinctes, et c'est le coeur du sujet : le
  -- brouillon est ce que le commercant modifie, `publie` est ce que le
  -- visiteur voit. Aucune ecriture du brouillon ne touche a `publie`.
  brouillon           TEXT NOT NULL DEFAULT '{}',    -- JSON valide (schema sections)
  publie              TEXT,                          -- JSON, NULL tant que rien n'est publie
  publiee_le          TEXT,

  -- Partage
  titre_partage       TEXT,
  description_partage TEXT,

  -- Conditions : le commercant les redige et les valide lui-meme. Tant que
  -- `conditions_validees_le` est NULL, les pages existent mais sont marquees
  -- comme non validees.
  conditions_vente       TEXT,
  conditions_livraison   TEXT,
  conditions_retour      TEXT,
  conditions_validees_le TEXT,

  -- Livraison
  retrait_actif       INTEGER NOT NULL DEFAULT 0,
  retrait_adresse     TEXT,
  retrait_horaires    TEXT,
  livraison_active    INTEGER NOT NULL DEFAULT 1,
  paiement_livraison  INTEGER NOT NULL DEFAULT 1,

  -- Encaissement en ligne. `mode` vaut 'test' tant que le prestataire n'a pas
  -- ete branche pour de vrai : l'interface le dit, au lieu de laisser croire
  -- qu'un paiement a ete pris.
  paiement_en_ligne   INTEGER NOT NULL DEFAULT 0,
  paiement_fournisseur TEXT,
  paiement_mode       TEXT NOT NULL DEFAULT 'test',  -- test | reel
  paiement_cle_publique TEXT,
  paiement_cle_privee TEXT,                          -- chiffree au repos
  paiement_secret_webhook TEXT,                      -- chiffre au repos

  -- Domaine personnalise
  domaine             TEXT UNIQUE,
  domaine_jeton       TEXT,
  domaine_verifie_le  TEXT,

  -- Assistant de creation : la progression est sauvegardee a chaque etape.
  etape_assistant     INTEGER NOT NULL DEFAULT 1,
  assistant_fini_le   TEXT,

  -- Taux de change saisis par le commercant, pour les imports depuis une
  -- place de marche etrangere. JSON { "USD": 610, "CNY": 85 }.
  -- L'euro n'y figure pas : sa parite avec le franc CFA est FIXE (voir
  -- src/lib/devises.ts), il n'y a rien a saisir.
  taux_change         TEXT NOT NULL DEFAULT '{}',
  -- Marge appliquee par defaut au prix importe, en pourcentage. 0 = aucune.
  marge_import        INTEGER NOT NULL DEFAULT 0,

  -- Abonnement
  offre               TEXT NOT NULL DEFAULT 'decouverte' REFERENCES offres(code),
  offre_expire_le     TEXT,

  -- Administration
  suspendue_le        TEXT,
  motif_suspension    TEXT,
  notes_internes      TEXT,                          -- jamais lu par l'espace marchand
  demonstration       INTEGER NOT NULL DEFAULT 0,    -- boutique d'exemple du site public

  cree_le             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS utilisateurs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id       INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom               TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  telephone         TEXT,
  mot_de_passe_hash TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'proprietaire', -- proprietaire | equipier
  actif             INTEGER NOT NULL DEFAULT 1,
  cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token          TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le      TEXT NOT NULL,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Recuperation de compte. Le jeton est stocke HACHE : une fuite de la base
-- ne donne pas de quoi reinitialiser les mots de passe.
CREATE TABLE IF NOT EXISTS reinitialisations (
  jeton_hash     TEXT PRIMARY KEY,
  utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le      TEXT NOT NULL,
  utilise_le     TEXT,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
--  Catalogue
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  slug        TEXT NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 100,
  cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (boutique_id, slug)
);

CREATE TABLE IF NOT EXISTS produits (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id      INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  categorie_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  nom              TEXT NOT NULL,
  slug             TEXT NOT NULL,
  description      TEXT,
  -- JSON [{ "nom": "Matière", "valeur": "Coton" }]. Saisies par le commercant :
  -- l'IA a le droit de les REFORMULER, jamais d'en inventer.
  caracteristiques TEXT NOT NULL DEFAULT '[]',
  prix             INTEGER NOT NULL DEFAULT 0,
  prix_barre       INTEGER,
  stock            INTEGER NOT NULL DEFAULT 0,
  suivi_stock      INTEGER NOT NULL DEFAULT 1,
  seuil_alerte     INTEGER NOT NULL DEFAULT 3,
  photos           TEXT NOT NULL DEFAULT '[]',        -- JSON: noms de fichiers
  -- 'physique' seulement pour l'instant. La colonne existe pour que les
  -- services et les produits numeriques s'ajoutent sans migration de donnees ;
  -- aucune interface ne propose encore les autres valeurs.
  type             TEXT NOT NULL DEFAULT 'physique',
  variante_libelle TEXT,                              -- 'Taille', 'Couleur'...
  actif            INTEGER NOT NULL DEFAULT 1,
  cree_le          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (boutique_id, slug)
);

CREATE TABLE IF NOT EXISTS variantes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  produit_id  INTEGER NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
  valeur      TEXT NOT NULL,                          -- 'M', 'Rouge'...
  supplement  INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  ordre       INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS zones_livraison (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL,
  frais       INTEGER NOT NULL DEFAULT 0,
  delai       TEXT,
  actif       INTEGER NOT NULL DEFAULT 1,
  ordre       INTEGER NOT NULL DEFAULT 100
);

-- ----------------------------------------------------------------------------
--  Commandes
--
--  TROIS statuts separes, et jamais un seul :
--    statut            ou en est le commercant       (nouvelle -> livree)
--    statut_livraison  ou en est le colis            (a_preparer -> remise)
--    statut_paiement   ou en est l'argent            (en_attente -> paye)
--
--  Une commande recue n'est PAS un encaissement. `montant_encaisse` ne bouge
--  que sur un geste explicite du commercant ou une notification verifiee du
--  prestataire — jamais a la creation de la commande.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS commandes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id       INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  reference         TEXT NOT NULL,                    -- 'CMD-7K2M9'
  -- Empeche le double-clic et le rechargement de page de creer deux commandes.
  -- Nullable (une commande creee a la main n'en a pas), unique sinon.
  cle_idempotence   TEXT,
  client_nom        TEXT NOT NULL,
  client_telephone  TEXT NOT NULL,
  client_ville      TEXT,
  client_quartier   TEXT,
  client_repere     TEXT,
  client_adresse    TEXT,
  mode_livraison    TEXT NOT NULL DEFAULT 'livraison', -- livraison | retrait
  zone_id           INTEGER REFERENCES zones_livraison(id) ON DELETE SET NULL,
  zone_nom          TEXT,
  sous_total        INTEGER NOT NULL DEFAULT 0,
  frais_livraison   INTEGER NOT NULL DEFAULT 0,
  total             INTEGER NOT NULL DEFAULT 0,
  devise            TEXT NOT NULL DEFAULT 'XOF',
  moyen_paiement    TEXT NOT NULL DEFAULT 'livraison', -- livraison | en_ligne
  statut            TEXT NOT NULL DEFAULT 'nouvelle',
  statut_livraison  TEXT NOT NULL DEFAULT 'a_preparer',
  statut_paiement   TEXT NOT NULL DEFAULT 'en_attente',
  montant_encaisse  INTEGER NOT NULL DEFAULT 0,
  note_client       TEXT,
  jeton_suivi       TEXT NOT NULL,                    -- suivi sans compte client
  annulee_le        TEXT,
  cree_le           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (boutique_id, reference)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_commandes_idempotence
  ON commandes (boutique_id, cle_idempotence) WHERE cle_idempotence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commandes_boutique ON commandes (boutique_id, cree_le DESC);

-- Les lignes figent le nom et le prix du jour de la commande : changer le prix
-- d'un produit demain ne doit pas reecrire une commande d'hier.
CREATE TABLE IF NOT EXISTS lignes_commande (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id    INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  commande_id    INTEGER NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  produit_id     INTEGER REFERENCES produits(id) ON DELETE SET NULL,
  variante_id    INTEGER REFERENCES variantes(id) ON DELETE SET NULL,
  nom            TEXT NOT NULL,
  variante_texte TEXT,
  prix_unitaire  INTEGER NOT NULL,
  quantite       INTEGER NOT NULL,
  total_ligne    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id          INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  nom                  TEXT NOT NULL,
  telephone            TEXT NOT NULL,
  ville                TEXT,
  quartier             TEXT,
  nb_commandes         INTEGER NOT NULL DEFAULT 0,
  total_commande       INTEGER NOT NULL DEFAULT 0,
  total_encaisse       INTEGER NOT NULL DEFAULT 0,
  derniere_commande_le TEXT,
  UNIQUE (boutique_id, telephone)
);

-- Une ouverture de WhatsApp n'est pas une commande, et pas un paiement. Elle
-- est tracee ici, a part, pour que le tableau de bord ne melange jamais les
-- deux chiffres.
CREATE TABLE IF NOT EXISTS demandes_whatsapp (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id   INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  reference     TEXT NOT NULL,
  produit_id    INTEGER REFERENCES produits(id) ON DELETE SET NULL,
  recapitulatif TEXT,
  montant       INTEGER NOT NULL DEFAULT 0,
  commande_id   INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  cree_le       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
--  Paiements
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS paiements (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id        INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  commande_id        INTEGER REFERENCES commandes(id) ON DELETE SET NULL,
  fournisseur        TEXT NOT NULL,                  -- 'test' | 'paydunya' | 'wave'
  mode               TEXT NOT NULL DEFAULT 'test',
  reference_externe  TEXT,
  montant            INTEGER NOT NULL,
  devise             TEXT NOT NULL DEFAULT 'XOF',
  statut             TEXT NOT NULL DEFAULT 'en_attente', -- en_attente|paye|echoue|rembourse
  cree_le            TEXT NOT NULL DEFAULT (datetime('now')),
  maj_le             TEXT
);

-- Le rempart contre les doublons de notification : un evenement deja vu est
-- ignore. La contrainte est dans la base, pas dans le code appelant.
CREATE TABLE IF NOT EXISTS evenements_paiement (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  fournisseur   TEXT NOT NULL,
  identifiant   TEXT NOT NULL,
  boutique_id   INTEGER,
  resultat      TEXT,
  charge_utile  TEXT,
  recu_le       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (fournisseur, identifiant)
);

CREATE TABLE IF NOT EXISTS abonnements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id    INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  offre          TEXT NOT NULL,
  montant        INTEGER NOT NULL,
  devise         TEXT NOT NULL DEFAULT 'XOF',
  statut         TEXT NOT NULL DEFAULT 'en_attente', -- en_attente | regle | echoue
  fournisseur    TEXT,
  reference      TEXT,
  periode_debut  TEXT,
  periode_fin    TEXT,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
--  IA : versions, historique, consommation
-- ----------------------------------------------------------------------------

-- Chaque instantane est immuable. On en pose un AVANT chaque modification du
-- brouillon et A CHAQUE publication : c'est ce qui rend « annuler » et
-- « restaurer » possibles sans conserver un journal de patchs.
CREATE TABLE IF NOT EXISTS versions_boutique (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id  INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  numero       INTEGER NOT NULL,
  contenu      TEXT NOT NULL,
  etat         TEXT NOT NULL DEFAULT 'brouillon',   -- brouillon | publiee
  origine      TEXT NOT NULL DEFAULT 'manuel',      -- manuel|ia|assistant|restauration|publication
  resume       TEXT,
  cree_par     INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cree_le      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (boutique_id, numero)
);

-- ----------------------------------------------------------------------------
--  Imports depuis une place de marche ou une photo
--
--  Chaque tentative laisse une trace, reussie ou non. Deux raisons :
--
--   1. RESPONSABILITE. Un import recopie un texte, un prix, parfois une image
--      qui appartiennent a quelqu'un d'autre. Savoir quelle adresse a ete
--      importee, quand, et par qui, est ce qui permet de repondre a une
--      reclamation. La colonne `droits_confirmes_le` enregistre le moment ou
--      le commercant a declare avoir le droit d'utiliser l'image.
--
--   2. MISE AU POINT. Les places de marche changent la structure de leurs
--      pages sans preavis. `charge_utile` garde ce qui a ete extrait : quand
--      un import rend n'importe quoi, on sait pourquoi sans redemander
--      l'adresse au commercant.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imports_produit (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id         INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  utilisateur_id      INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  source              TEXT NOT NULL,                   -- lien | photo
  origine             TEXT,                            -- amazon | ebay | aliexpress | alibaba | autre
  adresse             TEXT,                            -- l'URL importee
  statut              TEXT NOT NULL DEFAULT 'propose', -- propose | accepte | abandonne | echoue
  erreur              TEXT,
  charge_utile        TEXT,                            -- ce qui a ete extrait (JSON)
  produit_id          INTEGER REFERENCES produits(id) ON DELETE SET NULL,
  image_reprise       INTEGER NOT NULL DEFAULT 0,
  droits_confirmes_le TEXT,
  cree_le             TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_imports_boutique ON imports_produit (boutique_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS operations_ia (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id    INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
  type           TEXT NOT NULL,                     -- structure|description|modification|couleurs
  demande        TEXT,
  -- Seul 'reussie' consomme le quota. Un echec est trace pour le journal, pas
  -- decompte : le commercant ne paie pas une panne.
  statut         TEXT NOT NULL DEFAULT 'en_cours',  -- en_cours|reussie|echouee
  moteur         TEXT NOT NULL DEFAULT 'local',     -- anthropic | local
  resultat       TEXT,
  erreur         TEXT,
  jetons_entree  INTEGER,
  jetons_sortie  INTEGER,
  cree_le        TEXT NOT NULL DEFAULT (datetime('now')),
  termine_le     TEXT
);
CREATE INDEX IF NOT EXISTS idx_ia_boutique ON operations_ia (boutique_id, cree_le DESC);

-- ----------------------------------------------------------------------------
--  Administration, securite, assistance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS administrateurs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nom               TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  mot_de_passe_hash TEXT NOT NULL,
  actif             INTEGER NOT NULL DEFAULT 1,
  cree_le           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions_admin (
  token       TEXT PRIMARY KEY,
  admin_id    INTEGER NOT NULL REFERENCES administrateurs(id) ON DELETE CASCADE,
  expire_le   TEXT NOT NULL,
  cree_le     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_admin (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id  INTEGER REFERENCES administrateurs(id) ON DELETE SET NULL,
  action    TEXT NOT NULL,
  cible     TEXT,
  motif     TEXT,
  details   TEXT,
  cree_le   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_erreurs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER,
  source      TEXT NOT NULL,
  message     TEXT NOT NULL,
  details     TEXT,
  cree_le     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demandes_assistance (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  sujet       TEXT NOT NULL,
  message     TEXT NOT NULL,
  statut      TEXT NOT NULL DEFAULT 'ouverte',      -- ouverte | repondue | close
  reponse     TEXT,
  cree_le     TEXT NOT NULL DEFAULT (datetime('now')),
  repondu_le  TEXT
);

-- Limitation de debit : connexions, commandes, appels IA. Une ligne par cle
-- et par fenetre ; le menage se fait au passage.
CREATE TABLE IF NOT EXISTS limites_requetes (
  cle            TEXT PRIMARY KEY,
  compte         INTEGER NOT NULL DEFAULT 0,
  fenetre_debut  TEXT NOT NULL
);
