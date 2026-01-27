-- Migration initiale pour MDI.fr
-- Création des tables principales

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  has_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_has_paid ON users(has_paid);

-- Table des dossiers SCI
CREATE TABLE dossiers_sci (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom_sci VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Brouillon' CHECK (status IN ('Brouillon', 'Complete', 'Genere', 'PDF_Genere')),
  localisation VARCHAR(500) NOT NULL,
  prix_acquisition DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_travaux DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_parts INTEGER NOT NULL DEFAULT 0,
  date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les dossiers
CREATE INDEX idx_dossiers_user_id ON dossiers_sci(user_id);
CREATE INDEX idx_dossiers_status ON dossiers_sci(status);
CREATE INDEX idx_dossiers_date_creation ON dossiers_sci(date_creation);

-- Table des associés
CREATE TABLE associes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_sci(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('PERSONNE_PHYSIQUE', 'PERSONNE_MORALE')),
  nom VARCHAR(255) NOT NULL,
  adresse TEXT NOT NULL,
  telephone VARCHAR(20),
  email VARCHAR(255),
  pourcentage_parts DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les associés
CREATE INDEX idx_associes_dossier_id ON associes(dossier_id);
CREATE INDEX idx_associes_type ON associes(type);

-- Table des personnes physiques
CREATE TABLE personnes_physiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associe_id UUID NOT NULL REFERENCES associes(id) ON DELETE CASCADE,
  prenom VARCHAR(255) NOT NULL,
  date_naissance DATE NOT NULL,
  lieu_naissance VARCHAR(255) NOT NULL,
  situation_familiale VARCHAR(50) NOT NULL CHECK (situation_familiale IN ('Celibataire', 'Marie', 'Divorce', 'Veuf')),
  nationalite VARCHAR(100) NOT NULL,
  emploi VARCHAR(255) NOT NULL,
  employeur VARCHAR(255) NOT NULL,
  salaire DECIMAL(12,2) NOT NULL DEFAULT 0,
  anciennete VARCHAR(100),
  type_contrat VARCHAR(50) NOT NULL CHECK (type_contrat IN ('CDI', 'CDD', 'Interim', 'Liberal', 'Retraite', 'Autre')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les personnes physiques
CREATE INDEX idx_personnes_physiques_associe_id ON personnes_physiques(associe_id);

-- Table des revenus des personnes physiques
CREATE TABLE revenus_personnes_physiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_physique_id UUID NOT NULL REFERENCES personnes_physiques(id) ON DELETE CASCADE,
  salaire DECIMAL(12,2) NOT NULL DEFAULT 0,
  primes DECIMAL(12,2) NOT NULL DEFAULT 0,
  autres_revenus DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_revenus DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les revenus
CREATE INDEX idx_revenus_personne_physique_id ON revenus_personnes_physiques(personne_physique_id);

-- Table des charges des personnes physiques
CREATE TABLE charges_personnes_physiques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_physique_id UUID NOT NULL REFERENCES personnes_physiques(id) ON DELETE CASCADE,
  loyers DECIMAL(12,2) NOT NULL DEFAULT 0,
  credits DECIMAL(12,2) NOT NULL DEFAULT 0,
  charges_copro DECIMAL(12,2) NOT NULL DEFAULT 0,
  autres_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les charges
CREATE INDEX idx_charges_personne_physique_id ON charges_personnes_physiques(personne_physique_id);

-- Table des personnes morales
CREATE TABLE personnes_morales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  associe_id UUID NOT NULL REFERENCES associes(id) ON DELETE CASCADE,
  denomination_sociale VARCHAR(255) NOT NULL,
  siret VARCHAR(14) NOT NULL,
  siren VARCHAR(9) NOT NULL,
  forme_juridique VARCHAR(50) NOT NULL CHECK (forme_juridique IN ('SARL', 'SAS', 'SA', 'SCA', 'Autre')),
  capital_social DECIMAL(15,2) NOT NULL DEFAULT 0,
  chiffre_affaires DECIMAL(15,2) NOT NULL DEFAULT 0,
  resultat_net DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les personnes morales
CREATE INDEX idx_personnes_morales_associe_id ON personnes_morales(associe_id);
CREATE INDEX idx_personnes_morales_siret ON personnes_morales(siret);

-- Table des bilans comptables
CREATE TABLE bilans_comptables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_morale_id UUID NOT NULL REFERENCES personnes_morales(id) ON DELETE CASCADE,
  actif_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  passif_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  fonds_propres DECIMAL(15,2) NOT NULL DEFAULT 0,
  dettes DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les bilans
CREATE INDEX idx_bilans_personne_morale_id ON bilans_comptables(personne_morale_id);

-- Table des actionnaires
CREATE TABLE actionnaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  personne_morale_id UUID NOT NULL REFERENCES personnes_morales(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  pourcentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les actionnaires
CREATE INDEX idx_actionnaires_personne_morale_id ON actionnaires(personne_morale_id);

-- Table des plans de financement
CREATE TABLE plans_financement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_sci(id) ON DELETE CASCADE,
  prix_achat DECIMAL(15,2) NOT NULL DEFAULT 0,
  frais_notaire DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_travaux DECIMAL(15,2) NOT NULL DEFAULT 0,
  apport_personnel DECIMAL(15,2) NOT NULL DEFAULT 0,
  montant_emprunt DECIMAL(15,2) NOT NULL DEFAULT 0,
  duree_credit INTEGER NOT NULL DEFAULT 20,
  taux_estime DECIMAL(5,2) NOT NULL DEFAULT 3.5,
  mensualite_estimee DECIMAL(10,2) NOT NULL DEFAULT 0,
  rentabilite_previsionnelle DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les plans de financement
CREATE INDEX idx_plans_financement_dossier_id ON plans_financement(dossier_id);

-- Table des biens immobiliers
CREATE TABLE biens_immobiliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dossier_id UUID NOT NULL REFERENCES dossiers_sci(id) ON DELETE CASCADE,
  adresse TEXT NOT NULL,
  superficie DECIMAL(8,2) NOT NULL DEFAULT 0,
  nombre_pieces INTEGER NOT NULL DEFAULT 0,
  etat_actuel VARCHAR(100) NOT NULL,
  dpe VARCHAR(10) NOT NULL,
  estimation_valeur DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les biens immobiliers
CREATE INDEX idx_biens_immobiliers_dossier_id ON biens_immobiliers(dossier_id);

-- Table des travaux prévus
CREATE TABLE travaux_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bien_immobilier_id UUID NOT NULL REFERENCES biens_immobiliers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  montant DECIMAL(12,2) NOT NULL DEFAULT 0,
  priorite VARCHAR(20) NOT NULL CHECK (priorite IN ('Haute', 'Moyenne', 'Basse')),
  duree_estimee INTEGER NOT NULL DEFAULT 1,
  artisan VARCHAR(255),
  date_debut DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les travaux
CREATE INDEX idx_travaux_bien_immobilier_id ON travaux_details(bien_immobilier_id);
CREATE INDEX idx_travaux_priorite ON travaux_details(priorite);

-- Table des photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bien_immobilier_id UUID NOT NULL REFERENCES biens_immobiliers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description VARCHAR(500),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Avant', 'Apres', 'Plan', 'Autre')),
  filename VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les photos
CREATE INDEX idx_photos_bien_immobilier_id ON photos(bien_immobilier_id);
CREATE INDEX idx_photos_type ON photos(type);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dossiers_sci_updated_at BEFORE UPDATE ON dossiers_sci FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_associes_updated_at BEFORE UPDATE ON associes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnes_physiques_updated_at BEFORE UPDATE ON personnes_physiques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenus_personnes_physiques_updated_at BEFORE UPDATE ON revenus_personnes_physiques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_charges_personnes_physiques_updated_at BEFORE UPDATE ON charges_personnes_physiques FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_personnes_morales_updated_at BEFORE UPDATE ON personnes_morales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bilans_comptables_updated_at BEFORE UPDATE ON bilans_comptables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_actionnaires_updated_at BEFORE UPDATE ON actionnaires FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plans_financement_updated_at BEFORE UPDATE ON plans_financement FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_biens_immobiliers_updated_at BEFORE UPDATE ON biens_immobiliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travaux_details_updated_at BEFORE UPDATE ON travaux_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 