-- Migration 003: Ajouter la table elements_bien_v2 pour les immeubles multi-logements
-- Cette migration permet de stocker plusieurs unités de bien par projet

-- ==========================================
-- TABLE ELEMENTS DE BIEN
-- ==========================================

CREATE TABLE elements_bien_v2 (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID NOT NULL REFERENCES projets(id) ON DELETE CASCADE,

  -- Type d'élément
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'Appartement', 'Studio', 'Maison', 'Parking', 'Cave', 'Local_Commercial', 'Garage', 'Autre'
  )),

  -- Caractéristiques
  superficie DECIMAL(8,2) NOT NULL DEFAULT 0,
  nombre_pieces INTEGER,
  etage INTEGER,

  -- État
  etat VARCHAR(50) NOT NULL DEFAULT 'Bon' CHECK (etat IN (
    'Neuf', 'Bon', 'A_Renover', 'A_Renover_Entierement'
  )),

  -- Location
  en_location BOOLEAN DEFAULT false,
  loyer_mensuel DECIMAL(10,2) DEFAULT 0,
  charges_mensuelles DECIMAL(10,2) DEFAULT 0,

  -- Équipements (pour affichage)
  equipements TEXT[], -- Array de features: ['balcon', 'cave', 'parking']

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_elements_bien_v2_projet_id ON elements_bien_v2(projet_id);
CREATE INDEX idx_elements_bien_v2_type ON elements_bien_v2(type);

-- Trigger pour updated_at
CREATE TRIGGER update_elements_bien_v2_updated_at
  BEFORE UPDATE ON elements_bien_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- MODIFICATION TABLE BIENS_IMMOBILIERS_V2
-- ==========================================

-- Retirer la contrainte UNIQUE sur projet_id pour permettre des cas complexes
-- (bien que normalement on n'aura qu'un bien par projet, mais il servira de "conteneur")
-- La vraie donnée sera dans elements_bien_v2

ALTER TABLE biens_immobiliers_v2
  DROP CONSTRAINT IF EXISTS biens_immobiliers_v2_projet_id_key;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON TABLE elements_bien_v2 IS 'Unités individuelles d''un bien immobilier (appartements, parkings, caves, etc.)';
COMMENT ON COLUMN elements_bien_v2.equipements IS 'Array JSON des équipements/caractéristiques de l''unité';
