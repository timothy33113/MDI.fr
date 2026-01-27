-- Migration 004: Système de Gestion Patrimoniale Interconnectée
-- Créée le: 2025-10-21
-- Description: Ajout des tables pour gérer les détentions de structures,
--              les biens patrimoniaux, les crédits et leurs relations

-- ============================================================================
-- 1. DÉTENTIONS DE STRUCTURES
-- ============================================================================
-- Permet de gérer qui détient quoi (personne physique détient une société, etc.)

CREATE TABLE IF NOT EXISTS detentions_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_detentrice_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    structure_detenue_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_detention DECIMAL(5,2) NOT NULL CHECK (pourcentage_detention > 0 AND pourcentage_detention <= 100),
    date_debut DATE,
    date_fin DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    UNIQUE(structure_detentrice_id, structure_detenue_id),
    CHECK (structure_detentrice_id != structure_detenue_id) -- Une structure ne peut pas se détenir elle-même
);

CREATE INDEX idx_detentions_detentrice ON detentions_structures(structure_detentrice_id);
CREATE INDEX idx_detentions_detenue ON detentions_structures(structure_detenue_id);

COMMENT ON TABLE detentions_structures IS 'Relations de détention entre structures (actionnariat, parts sociales)';
COMMENT ON COLUMN detentions_structures.pourcentage_detention IS 'Pourcentage de parts détenues (0-100)';

-- ============================================================================
-- 2. BIENS PATRIMONIAUX
-- ============================================================================
-- Gestion des biens immobiliers personnels et professionnels

CREATE TABLE IF NOT EXISTS biens_patrimoniaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type_bien VARCHAR(50) NOT NULL, -- Appartement, Maison, Immeuble, Local_Commercial, Terrain, Parking, etc.
    type_patrimoine VARCHAR(20) NOT NULL CHECK (type_patrimoine IN ('Personnel', 'Professionnel')),

    -- Localisation
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'France',

    -- Caractéristiques
    superficie DECIMAL(10,2),
    nombre_pieces INTEGER CHECK (nombre_pieces >= 0),
    nombre_chambres INTEGER CHECK (nombre_chambres >= 0),
    annee_construction INTEGER CHECK (annee_construction >= 1800 AND annee_construction <= EXTRACT(YEAR FROM CURRENT_DATE) + 10),
    etat VARCHAR(50), -- Neuf, Bon, Moyen, A_Renover, etc.

    -- Valeurs financières
    valeur_acquisition DECIMAL(12,2) CHECK (valeur_acquisition >= 0),
    date_acquisition DATE,
    valeur_actuelle DECIMAL(12,2) CHECK (valeur_actuelle >= 0),
    date_evaluation DATE,

    -- Revenus locatifs
    loue BOOLEAN DEFAULT FALSE,
    loyer_mensuel DECIMAL(10,2) CHECK (loyer_mensuel >= 0),
    charges_mensuelles DECIMAL(10,2) CHECK (charges_mensuelles >= 0),

    -- Fiscalité
    taxe_fonciere DECIMAL(10,2) CHECK (taxe_fonciere >= 0),
    regime_fiscal VARCHAR(50), -- LMNP, LMP, SCI_IS, SCI_IR, etc.

    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_biens_user ON biens_patrimoniaux(user_id);
CREATE INDEX idx_biens_type_patrimoine ON biens_patrimoniaux(type_patrimoine);
CREATE INDEX idx_biens_type_bien ON biens_patrimoniaux(type_bien);
CREATE INDEX idx_biens_ville ON biens_patrimoniaux(ville);

COMMENT ON TABLE biens_patrimoniaux IS 'Biens immobiliers personnels et professionnels';
COMMENT ON COLUMN biens_patrimoniaux.type_patrimoine IS 'Personnel: bien privé, Professionnel: détenu via société';

-- ============================================================================
-- 3. PROPRIÉTAIRES DE BIENS
-- ============================================================================
-- Gestion de la multipropriété et des différents types de détention

CREATE TABLE IF NOT EXISTS proprietaires_biens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bien_id UUID NOT NULL REFERENCES biens_patrimoniaux(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_detention DECIMAL(5,2) NOT NULL CHECK (pourcentage_detention > 0 AND pourcentage_detention <= 100),
    date_debut DATE,
    date_fin DATE,
    type_detention VARCHAR(50) DEFAULT 'Pleine_Propriete', -- Pleine_Propriete, Nue_Propriete, Usufruit, Indivision
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    UNIQUE(bien_id, structure_id)
);

CREATE INDEX idx_proprietaires_bien ON proprietaires_biens(bien_id);
CREATE INDEX idx_proprietaires_structure ON proprietaires_biens(structure_id);

COMMENT ON TABLE proprietaires_biens IS 'Liens de propriété entre biens et structures';
COMMENT ON COLUMN proprietaires_biens.type_detention IS 'Type de droit: pleine propriété, nue-propriété, usufruit, indivision';

-- ============================================================================
-- 4. CRÉDITS PATRIMONIAUX
-- ============================================================================
-- Gestion des emprunts et crédits (personnels et professionnels)

CREATE TABLE IF NOT EXISTS credits_patrimoniaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    structure_emprunteur_id UUID REFERENCES structures(id) ON DELETE SET NULL,
    bien_finance_id UUID REFERENCES biens_patrimoniaux(id) ON DELETE SET NULL,

    nom VARCHAR(255) NOT NULL,
    type_credit VARCHAR(50) NOT NULL, -- Immobilier, Consommation, Professionnel, Relais, etc.
    type_patrimoine VARCHAR(20) NOT NULL CHECK (type_patrimoine IN ('Personnel', 'Professionnel')),

    -- Organisme prêteur
    banque VARCHAR(255),
    numero_pret VARCHAR(100),

    -- Montants
    montant_initial DECIMAL(12,2) NOT NULL CHECK (montant_initial > 0),
    montant_restant_du DECIMAL(12,2) NOT NULL CHECK (montant_restant_du >= 0),

    -- Conditions
    taux_interet DECIMAL(5,4) NOT NULL CHECK (taux_interet >= 0),
    taux_assurance DECIMAL(5,4) CHECK (taux_assurance >= 0),
    duree_mois INTEGER NOT NULL CHECK (duree_mois > 0),
    mensualite DECIMAL(10,2) NOT NULL CHECK (mensualite > 0),

    -- Dates
    date_debut DATE NOT NULL,
    date_fin_prevue DATE NOT NULL,
    date_fin_reelle DATE,

    -- Garanties et conditions
    garanties TEXT,
    type_taux VARCHAR(20) DEFAULT 'Fixe', -- Fixe, Variable, Modulable

    -- Amortissement
    type_amortissement VARCHAR(30) DEFAULT 'Constant', -- Constant, In_Fine, Progressif

    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes de dates
    CHECK (date_fin_prevue > date_debut),
    CHECK (date_fin_reelle IS NULL OR date_fin_reelle >= date_debut)
);

CREATE INDEX idx_credits_user ON credits_patrimoniaux(user_id);
CREATE INDEX idx_credits_structure ON credits_patrimoniaux(structure_emprunteur_id);
CREATE INDEX idx_credits_bien ON credits_patrimoniaux(bien_finance_id);
CREATE INDEX idx_credits_type_patrimoine ON credits_patrimoniaux(type_patrimoine);
CREATE INDEX idx_credits_banque ON credits_patrimoniaux(banque);

COMMENT ON TABLE credits_patrimoniaux IS 'Crédits et emprunts personnels et professionnels';
COMMENT ON COLUMN credits_patrimoniaux.structure_emprunteur_id IS 'Structure principale emprunteuse (peut avoir des co-emprunteurs)';
COMMENT ON COLUMN credits_patrimoniaux.bien_finance_id IS 'Bien financé par ce crédit (si applicable)';

-- ============================================================================
-- 5. CO-EMPRUNTEURS
-- ============================================================================
-- Gestion des co-emprunteurs sur un crédit

CREATE TABLE IF NOT EXISTS coemprunteurs_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_id UUID NOT NULL REFERENCES credits_patrimoniaux(id) ON DELETE CASCADE,
    structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_engagement DECIMAL(5,2) NOT NULL CHECK (pourcentage_engagement > 0 AND pourcentage_engagement <= 100),
    type_engagement VARCHAR(50) DEFAULT 'Solidaire', -- Solidaire, Conjoint, Caution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    UNIQUE(credit_id, structure_id)
);

CREATE INDEX idx_coemprunteurs_credit ON coemprunteurs_credits(credit_id);
CREATE INDEX idx_coemprunteurs_structure ON coemprunteurs_credits(structure_id);

COMMENT ON TABLE coemprunteurs_credits IS 'Co-emprunteurs et cautions sur les crédits';
COMMENT ON COLUMN coemprunteurs_credits.pourcentage_engagement IS 'Part de responsabilité dans le crédit';

-- ============================================================================
-- 6. TRIGGERS POUR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_detentions_structures_updated_at BEFORE UPDATE ON detentions_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biens_patrimoniaux_updated_at BEFORE UPDATE ON biens_patrimoniaux
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credits_patrimoniaux_updated_at BEFORE UPDATE ON credits_patrimoniaux
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour valider qu'un bien a exactement 100% de propriétaires
CREATE OR REPLACE FUNCTION validate_bien_ownership(bien_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_percentage DECIMAL(5,2);
BEGIN
    SELECT COALESCE(SUM(pourcentage_detention), 0)
    INTO total_percentage
    FROM proprietaires_biens
    WHERE bien_id = bien_uuid AND (date_fin IS NULL OR date_fin >= CURRENT_DATE);

    RETURN ABS(total_percentage - 100.00) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le montant total d'un crédit (capital + intérêts)
CREATE OR REPLACE FUNCTION calcul_cout_total_credit(credit_uuid UUID)
RETURNS DECIMAL(12,2) AS $$
DECLARE
    mensualite_credit DECIMAL(10,2);
    duree_credit INTEGER;
BEGIN
    SELECT mensualite, duree_mois
    INTO mensualite_credit, duree_credit
    FROM credits_patrimoniaux
    WHERE id = credit_uuid;

    RETURN mensualite_credit * duree_credit;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir le patrimoine net d'une structure
CREATE OR REPLACE FUNCTION calcul_patrimoine_net_structure(structure_uuid UUID)
RETURNS TABLE(
    actifs_personnels DECIMAL(12,2),
    actifs_professionnels DECIMAL(12,2),
    passifs_personnels DECIMAL(12,2),
    passifs_professionnels DECIMAL(12,2),
    net_personnel DECIMAL(12,2),
    net_professionnel DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH
    biens_structure AS (
        SELECT
            COALESCE(SUM(CASE WHEN b.type_patrimoine = 'Personnel'
                THEN (b.valeur_actuelle * pb.pourcentage_detention / 100)
                ELSE 0 END), 0) as actifs_perso,
            COALESCE(SUM(CASE WHEN b.type_patrimoine = 'Professionnel'
                THEN (b.valeur_actuelle * pb.pourcentage_detention / 100)
                ELSE 0 END), 0) as actifs_pro
        FROM proprietaires_biens pb
        JOIN biens_patrimoniaux b ON pb.bien_id = b.id
        WHERE pb.structure_id = structure_uuid
        AND (pb.date_fin IS NULL OR pb.date_fin >= CURRENT_DATE)
    ),
    credits_structure AS (
        SELECT
            COALESCE(SUM(CASE WHEN c.type_patrimoine = 'Personnel'
                THEN c.montant_restant_du
                ELSE 0 END), 0) as passifs_perso,
            COALESCE(SUM(CASE WHEN c.type_patrimoine = 'Professionnel'
                THEN c.montant_restant_du
                ELSE 0 END), 0) as passifs_pro
        FROM credits_patrimoniaux c
        WHERE c.structure_emprunteur_id = structure_uuid
        AND (c.date_fin_reelle IS NULL)
    )
    SELECT
        bs.actifs_perso,
        bs.actifs_pro,
        cs.passifs_perso,
        cs.passifs_pro,
        (bs.actifs_perso - cs.passifs_perso) as net_perso,
        (bs.actifs_pro - cs.passifs_pro) as net_pro
    FROM biens_structure bs, credits_structure cs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. DONNÉES DE RÉFÉRENCE
-- ============================================================================

-- Types de biens communs
COMMENT ON COLUMN biens_patrimoniaux.type_bien IS 'Types: Appartement, Maison, Immeuble, Local_Commercial, Terrain, Parking, Cave, Garage, Bureau';

-- Types de crédits communs
COMMENT ON COLUMN credits_patrimoniaux.type_credit IS 'Types: Immobilier, Consommation, Professionnel, Relais, Travaux, LOA, Credit_Bail';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
