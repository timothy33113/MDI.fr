-- Migration 002: Refactoring vers architecture multi-structures et multi-porteurs
-- MDI.fr v2.0
-- Cette migration transforme l'ancien modèle SCI-only vers un modèle flexible

-- ==========================================
-- PARTIE 1: NOUVELLES TABLES
-- ==========================================

-- Table des structures (remplace l'ancien modèle associés/personnes)
CREATE TABLE structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'PERSONNE_PHYSIQUE',
    'SCI',
    'SARL',
    'SASU',
    'EURL',
    'SAS',
    'SA',
    'HOLDING',
    'AUTRE'
  )),
  nom VARCHAR(255) NOT NULL,
  adresse TEXT NOT NULL,
  telephone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_structures_user_id ON structures(user_id);
CREATE INDEX idx_structures_type ON structures(type);

-- Table de détention (hiérarchie de propriété entre structures)
CREATE TABLE detenteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
  porteur_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
  pourcentage DECIMAL(5,2) NOT NULL CHECK (pourcentage >= 0 AND pourcentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Une structure ne peut pas se détenir elle-même
  CONSTRAINT no_self_ownership CHECK (structure_id != porteur_id)
);

CREATE INDEX idx_detenteurs_structure_id ON detenteurs(structure_id);
CREATE INDEX idx_detenteurs_porteur_id ON detenteurs(porteur_id);

-- Table des projets (remplace dossiers_sci)
CREATE TABLE projets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Analyse' CHECK (status IN (
    'Analyse',
    'En_Cours',
    'Dossier_Complet',
    'PDF_Genere',
    'Archive'
  )),
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projets_user_id ON projets(user_id);
CREATE INDEX idx_projets_status ON projets(status);
CREATE INDEX idx_projets_date_creation ON projets(date_creation);

-- Table des porteurs de projet (lien projet <-> structures)
CREATE TABLE porteurs_projet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
  pourcentage_projet DECIMAL(5,2) NOT NULL CHECK (pourcentage_projet >= 0 AND pourcentage_projet <= 100),
  propriete_effective DECIMAL(5,2), -- Calculé automatiquement
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Un projet ne peut pas avoir deux fois la même structure
  UNIQUE(projet_id, structure_id)
);

CREATE INDEX idx_porteurs_projet_projet_id ON porteurs_projet(projet_id);
CREATE INDEX idx_porteurs_projet_structure_id ON porteurs_projet(structure_id);

-- ==========================================
-- PERSONNES PHYSIQUES - REFACTOR
-- ==========================================

-- Nouvelle table personnes_physiques liée aux structures
CREATE TABLE personnes_physiques_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE UNIQUE,

  -- Identité
  prenom VARCHAR(255) NOT NULL,
  date_naissance DATE NOT NULL,
  lieu_naissance VARCHAR(255) NOT NULL,
  nationalite VARCHAR(100) NOT NULL DEFAULT 'Française',
  situation_familiale VARCHAR(50) NOT NULL CHECK (situation_familiale IN (
    'Celibataire', 'Marie', 'Pacse', 'Divorce', 'Veuf'
  )),

  -- Situation professionnelle
  statut_professionnel VARCHAR(50) NOT NULL CHECK (statut_professionnel IN (
    'Salarie', 'Independant', 'Dirigeant', 'Retraite', 'Sans_activite'
  )),
  emploi VARCHAR(255),
  employeur VARCHAR(255),
  type_contrat VARCHAR(50) CHECK (type_contrat IN (
    'CDI', 'CDD', 'Interim', 'Freelance', 'Fonctionnaire'
  )),
  anciennete VARCHAR(100),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personnes_physiques_v2_structure_id ON personnes_physiques_v2(structure_id);

-- Revenus personnes physiques
CREATE TABLE revenus_personnes_physiques_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_physique_id UUID NOT NULL REFERENCES personnes_physiques_v2(id) ON DELETE CASCADE UNIQUE,

  salaire_mensuel_net DECIMAL(12,2) NOT NULL DEFAULT 0,
  primes_annuelles DECIMAL(12,2) NOT NULL DEFAULT 0,
  revenus_locatifs DECIMAL(12,2) NOT NULL DEFAULT 0,
  autres_revenus DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Calculés automatiquement
  total_mensuel DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_annuel DECIMAL(12,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_revenus_pp_v2_personne_physique_id ON revenus_personnes_physiques_v2(personne_physique_id);

-- Charges personnes physiques
CREATE TABLE charges_personnes_physiques_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_physique_id UUID NOT NULL REFERENCES personnes_physiques_v2(id) ON DELETE CASCADE UNIQUE,

  loyer_mensuel DECIMAL(12,2) NOT NULL DEFAULT 0,
  mensualites_credits DECIMAL(12,2) NOT NULL DEFAULT 0,
  pension_alimentaire DECIMAL(12,2) NOT NULL DEFAULT 0,
  autres_charges DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Calculé automatiquement
  total_mensuel DECIMAL(12,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_charges_pp_v2_personne_physique_id ON charges_personnes_physiques_v2(personne_physique_id);

-- ==========================================
-- PERSONNES MORALES - REFACTOR
-- ==========================================

CREATE TABLE personnes_morales_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE UNIQUE,

  -- Identité juridique
  denomination_sociale VARCHAR(255) NOT NULL,
  siret VARCHAR(14) NOT NULL,
  siren VARCHAR(9) NOT NULL,
  forme_juridique VARCHAR(50) NOT NULL CHECK (forme_juridique IN (
    'SCI', 'SARL', 'SASU', 'EURL', 'SAS', 'SA', 'Holding', 'Autre'
  )),
  date_creation DATE NOT NULL,
  capital_social DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Financier
  chiffre_affaires_annuel DECIMAL(15,2),
  resultat_net DECIMAL(15,2),
  banque_principale VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_personnes_morales_v2_structure_id ON personnes_morales_v2(structure_id);
CREATE INDEX idx_personnes_morales_v2_siret ON personnes_morales_v2(siret);

-- Représentant légal
CREATE TABLE representants_legaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_morale_id UUID NOT NULL REFERENCES personnes_morales_v2(id) ON DELETE CASCADE UNIQUE,

  nom VARCHAR(255) NOT NULL,
  prenom VARCHAR(255) NOT NULL,
  fonction VARCHAR(50) NOT NULL CHECK (fonction IN (
    'Gerant', 'President', 'Directeur_General', 'Autre'
  )),
  date_naissance DATE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_representants_legaux_personne_morale_id ON representants_legaux(personne_morale_id);

-- Bilans comptables (peut y en avoir plusieurs par société, un par exercice)
CREATE TABLE bilans_comptables_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_morale_id UUID NOT NULL REFERENCES personnes_morales_v2(id) ON DELETE CASCADE,

  exercice VARCHAR(10) NOT NULL, -- "2024", "2023", etc.
  total_actif DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_passif DECIMAL(15,2) NOT NULL DEFAULT 0,
  capitaux_propres DECIMAL(15,2) NOT NULL DEFAULT 0,
  dettes_financieres DECIMAL(15,2) NOT NULL DEFAULT 0,
  tresorerie DECIMAL(15,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Un seul bilan par exercice et par société
  UNIQUE(personne_morale_id, exercice)
);

CREATE INDEX idx_bilans_v2_personne_morale_id ON bilans_comptables_v2(personne_morale_id);

-- ==========================================
-- BIENS IMMOBILIERS - REFACTOR
-- ==========================================

CREATE TABLE biens_immobiliers_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE UNIQUE,

  -- Localisation
  adresse TEXT NOT NULL,
  code_postal VARCHAR(10) NOT NULL,
  ville VARCHAR(255) NOT NULL,

  -- Caractéristiques
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'Appartement', 'Maison', 'Immeuble', 'Local_Commercial', 'Terrain', 'Autre'
  )),
  superficie DECIMAL(8,2) NOT NULL DEFAULT 0,
  nombre_pieces INTEGER,
  nombre_chambres INTEGER,
  nombre_sdb INTEGER,
  annee_construction INTEGER,

  -- État et diagnostics
  etat_actuel VARCHAR(50) NOT NULL CHECK (etat_actuel IN (
    'Neuf', 'Bon', 'A_Renover', 'A_Renover_Entierement'
  )),
  dpe VARCHAR(1) CHECK (dpe IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  ges VARCHAR(1) CHECK (ges IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),

  -- Destination
  destination_bien VARCHAR(50) NOT NULL CHECK (destination_bien IN (
    'Location', 'Residence_Principale', 'Revente', 'Autre'
  )),
  loyer_mensuel_estime DECIMAL(10,2),
  charges_mensuelles DECIMAL(10,2),
  taxe_fonciere DECIMAL(10,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_biens_v2_projet_id ON biens_immobiliers_v2(projet_id);
CREATE INDEX idx_biens_v2_type ON biens_immobiliers_v2(type);

-- Travaux détails (lié au bien)
CREATE TABLE travaux_details_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bien_immobilier_id UUID NOT NULL REFERENCES biens_immobiliers_v2(id) ON DELETE CASCADE,

  categorie VARCHAR(50) NOT NULL CHECK (categorie IN (
    'Gros_Oeuvre', 'Second_Oeuvre', 'Finitions', 'Equipements', 'Exterieur', 'Autre'
  )),
  description TEXT NOT NULL,
  montant DECIMAL(12,2) NOT NULL DEFAULT 0,
  priorite VARCHAR(20) NOT NULL CHECK (priorite IN ('Haute', 'Moyenne', 'Basse')),
  duree_estimee INTEGER NOT NULL DEFAULT 1,

  artisan VARCHAR(255),
  devis_obtenu BOOLEAN DEFAULT false,
  date_debut_prevue DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_travaux_v2_bien_immobilier_id ON travaux_details_v2(bien_immobilier_id);
CREATE INDEX idx_travaux_v2_priorite ON travaux_details_v2(priorite);

-- Photos (lié au bien)
CREATE TABLE photos_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bien_immobilier_id UUID NOT NULL REFERENCES biens_immobiliers_v2(id) ON DELETE CASCADE,

  url TEXT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'Facade', 'Interieur', 'Avant_Travaux', 'Apres_Travaux', 'Plan', 'Autre'
  )),

  size INTEGER NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_photos_v2_bien_immobilier_id ON photos_v2(bien_immobilier_id);

-- ==========================================
-- FINANCEMENT - REFACTOR
-- ==========================================

CREATE TABLE plans_financement_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE UNIQUE,

  -- Coûts d'acquisition
  prix_achat DECIMAL(15,2) NOT NULL DEFAULT 0,
  frais_notaire DECIMAL(15,2) NOT NULL DEFAULT 0,
  frais_agence DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Travaux
  montant_travaux DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Autres frais
  frais_dossier_bancaire DECIMAL(15,2) NOT NULL DEFAULT 0,
  frais_garantie DECIMAL(15,2) NOT NULL DEFAULT 0,
  autres_frais DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Total calculé automatiquement
  cout_total_projet DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Financement
  apport_personnel DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_emprunt DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Conditions de crédit
  duree_credit INTEGER NOT NULL DEFAULT 20,
  taux_interet_estime DECIMAL(5,2) NOT NULL DEFAULT 3.5,
  taux_assurance_estime DECIMAL(5,2) NOT NULL DEFAULT 0.36,

  -- Mensualités calculées automatiquement
  mensualite_capital_interets DECIMAL(10,2) NOT NULL DEFAULT 0,
  mensualite_assurance DECIMAL(10,2) NOT NULL DEFAULT 0,
  mensualite_totale DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Type de prêt
  type_pret VARCHAR(50) NOT NULL DEFAULT 'Amortissable' CHECK (type_pret IN (
    'Amortissable', 'In_Fine', 'Palier', 'Autre'
  )),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plans_financement_v2_projet_id ON plans_financement_v2(projet_id);

-- ==========================================
-- ANALYSES DE RENTABILITE
-- ==========================================

CREATE TABLE analyses_rentabilite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE UNIQUE,

  -- Rentabilité brute
  rentabilite_brute DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Rentabilité nette
  charges_annuelles DECIMAL(12,2) NOT NULL DEFAULT 0,
  rentabilite_nette DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Cash-flow
  cash_flow_mensuel DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_flow_annuel DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- ROI
  roi DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Taux d'endettement
  revenus_porteurs DECIMAL(12,2) NOT NULL DEFAULT 0,
  taux_endettement_projet DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Point mort
  annees_recuperation_apport DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Dernière mise à jour
  date_calcul TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analyses_rentabilite_projet_id ON analyses_rentabilite(projet_id);

-- ==========================================
-- CHECKLIST DOCUMENTS
-- ==========================================

CREATE TABLE checklist_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,

  categorie VARCHAR(50) NOT NULL CHECK (categorie IN (
    'Identite', 'Revenus', 'Patrimoine', 'Fiscalite', 'Societe', 'Bien_Immobilier', 'Travaux', 'Autre'
  )),
  nom_document VARCHAR(255) NOT NULL,
  description TEXT,

  -- Qui doit fournir
  concerne_structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,

  -- Contraintes
  obligatoire BOOLEAN DEFAULT true,
  quantite_requise VARCHAR(100), -- "3 derniers mois", etc.
  validite_jours INTEGER, -- Validité du document en jours

  -- État
  statut VARCHAR(50) NOT NULL DEFAULT 'Non_Fourni' CHECK (statut IN (
    'Non_Fourni', 'En_Attente', 'Fourni', 'Valide'
  )),

  -- Si fourni (Phase 2)
  document_url TEXT,
  date_fourniture TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_documents_projet_id ON checklist_documents(projet_id);
CREATE INDEX idx_checklist_documents_structure_id ON checklist_documents(concerne_structure_id);
CREATE INDEX idx_checklist_documents_statut ON checklist_documents(statut);

-- ==========================================
-- TRIGGERS - Mise à jour automatique
-- ==========================================

-- Triggers pour updated_at
CREATE TRIGGER update_structures_updated_at BEFORE UPDATE ON structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projets_updated_at BEFORE UPDATE ON projets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnes_physiques_v2_updated_at BEFORE UPDATE ON personnes_physiques_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenus_pp_v2_updated_at BEFORE UPDATE ON revenus_personnes_physiques_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_charges_pp_v2_updated_at BEFORE UPDATE ON charges_personnes_physiques_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnes_morales_v2_updated_at BEFORE UPDATE ON personnes_morales_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bilans_v2_updated_at BEFORE UPDATE ON bilans_comptables_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biens_v2_updated_at BEFORE UPDATE ON biens_immobiliers_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travaux_v2_updated_at BEFORE UPDATE ON travaux_details_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_financement_v2_updated_at BEFORE UPDATE ON plans_financement_v2 FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_rentabilite_updated_at BEFORE UPDATE ON analyses_rentabilite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklist_documents_updated_at BEFORE UPDATE ON checklist_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PARTIE 2: MIGRATION DES DONNEES (optionnel - si données existantes)
-- ==========================================

-- Cette partie sera exécutée uniquement si vous avez des données à migrer
-- Sinon, vous pouvez commencer avec une DB fraîche

-- Note: À adapter selon vos besoins de migration
-- Pour le MVP, on peut partir d'une DB fraîche

-- ==========================================
-- PARTIE 3: COMMENTAIRES (Documentation dans la DB)
-- ==========================================

COMMENT ON TABLE structures IS 'Table unifiée des structures (personnes physiques et morales)';
COMMENT ON TABLE detenteurs IS 'Relations de détention entre structures (hiérarchie)';
COMMENT ON TABLE projets IS 'Projets immobiliers avec multi-porteurs';
COMMENT ON TABLE porteurs_projet IS 'Lien entre projets et structures porteuses';
COMMENT ON TABLE analyses_rentabilite IS 'Calculs automatiques de rentabilité par projet';
COMMENT ON TABLE checklist_documents IS 'Documents requis générés automatiquement par projet';
