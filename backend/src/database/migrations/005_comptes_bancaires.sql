-- Migration 005: Comptes Bancaires (Économies)
-- Créée le: 2025-10-21
-- Description: Ajout de la table pour gérer les comptes bancaires et économies
--              des structures (personnels et professionnels)

-- ============================================================================
-- 1. TABLE COMPTES BANCAIRES
-- ============================================================================

CREATE TABLE IF NOT EXISTS comptes_bancaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,

    nom VARCHAR(255) NOT NULL,
    type_compte VARCHAR(50) NOT NULL, -- Compte_Courant, Livret_A, LDD, PEL, CEL, Assurance_Vie, PEA, Compte_Titre, etc.
    type_patrimoine VARCHAR(20) NOT NULL CHECK (type_patrimoine IN ('Personnel', 'Professionnel')),

    -- Organisme bancaire
    banque VARCHAR(255),
    numero_compte VARCHAR(100),

    -- Montants
    solde DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (solde >= 0),
    date_solde DATE DEFAULT CURRENT_DATE,

    -- Rendement (pour les placements)
    taux_interet DECIMAL(5,4) CHECK (taux_interet >= 0),

    -- Restrictions
    bloque BOOLEAN DEFAULT FALSE,
    date_blocage DATE,
    date_deblocage DATE,

    -- Notes
    notes TEXT,

    -- Métadonnées
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    CHECK (date_deblocage IS NULL OR date_deblocage > date_blocage)
);

CREATE INDEX idx_comptes_user ON comptes_bancaires(user_id);
CREATE INDEX idx_comptes_structure ON comptes_bancaires(structure_id);
CREATE INDEX idx_comptes_type_patrimoine ON comptes_bancaires(type_patrimoine);
CREATE INDEX idx_comptes_type_compte ON comptes_bancaires(type_compte);
CREATE INDEX idx_comptes_banque ON comptes_bancaires(banque);

COMMENT ON TABLE comptes_bancaires IS 'Comptes bancaires et placements (personnels et professionnels)';
COMMENT ON COLUMN comptes_bancaires.type_compte IS 'Type de compte: Compte_Courant, Livret_A, LDD, PEL, CEL, Assurance_Vie, PEA, Compte_Titre, etc.';
COMMENT ON COLUMN comptes_bancaires.type_patrimoine IS 'Personnel: compte privé, Professionnel: compte d''entreprise';
COMMENT ON COLUMN comptes_bancaires.structure_id IS 'Structure propriétaire du compte (optionnel pour comptes personnels)';
COMMENT ON COLUMN comptes_bancaires.bloque IS 'Indique si le compte est bloqué (PEL, CEL, etc.)';

-- ============================================================================
-- 2. HISTORIQUE DES SOLDES
-- ============================================================================
-- Pour suivre l'évolution des soldes dans le temps

CREATE TABLE IF NOT EXISTS historique_soldes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compte_id UUID NOT NULL REFERENCES comptes_bancaires(id) ON DELETE CASCADE,
    solde DECIMAL(12,2) NOT NULL,
    date_solde DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historique_compte ON historique_soldes(compte_id);
CREATE INDEX idx_historique_date ON historique_soldes(date_solde);

COMMENT ON TABLE historique_soldes IS 'Historique de l''évolution des soldes des comptes bancaires';

-- ============================================================================
-- 3. TRIGGERS POUR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_comptes_bancaires_updated_at BEFORE UPDATE ON comptes_bancaires
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. FONCTION POUR CALCULER LE TOTAL DES ÉCONOMIES
-- ============================================================================

CREATE OR REPLACE FUNCTION calcul_total_economies_structure(structure_uuid UUID)
RETURNS TABLE(
    total_personnel DECIMAL(12,2),
    total_professionnel DECIMAL(12,2),
    total_general DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN type_patrimoine = 'Personnel' THEN solde ELSE 0 END), 0) as total_personnel,
        COALESCE(SUM(CASE WHEN type_patrimoine = 'Professionnel' THEN solde ELSE 0 END), 0) as total_professionnel,
        COALESCE(SUM(solde), 0) as total_general
    FROM comptes_bancaires
    WHERE structure_id = structure_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcul_total_economies_structure IS 'Calcule le total des économies d''une structure par type de patrimoine';

-- ============================================================================
-- 5. FONCTION POUR CALCULER LE TOTAL DES ÉCONOMIES PAR UTILISATEUR
-- ============================================================================

CREATE OR REPLACE FUNCTION calcul_total_economies_user(user_uuid UUID)
RETURNS TABLE(
    total_personnel DECIMAL(12,2),
    total_professionnel DECIMAL(12,2),
    total_general DECIMAL(12,2),
    nb_comptes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN type_patrimoine = 'Personnel' THEN solde ELSE 0 END), 0) as total_personnel,
        COALESCE(SUM(CASE WHEN type_patrimoine = 'Professionnel' THEN solde ELSE 0 END), 0) as total_professionnel,
        COALESCE(SUM(solde), 0) as total_general,
        COUNT(*)::INTEGER as nb_comptes
    FROM comptes_bancaires
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcul_total_economies_user IS 'Calcule le total des économies d''un utilisateur par type de patrimoine';

-- ============================================================================
-- 6. MISE À JOUR DE LA FONCTION calcul_patrimoine_net_structure
-- ============================================================================
-- Mettre à jour la fonction existante pour inclure les économies dans les actifs

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
                ELSE 0 END), 0) as actifs_perso_biens,
            COALESCE(SUM(CASE WHEN b.type_patrimoine = 'Professionnel'
                THEN (b.valeur_actuelle * pb.pourcentage_detention / 100)
                ELSE 0 END), 0) as actifs_pro_biens
        FROM proprietaires_biens pb
        JOIN biens_patrimoniaux b ON pb.bien_id = b.id
        WHERE pb.structure_id = structure_uuid
        AND (pb.date_fin IS NULL OR pb.date_fin >= CURRENT_DATE)
    ),
    economies_structure AS (
        SELECT
            COALESCE(SUM(CASE WHEN type_patrimoine = 'Personnel' THEN solde ELSE 0 END), 0) as actifs_perso_economies,
            COALESCE(SUM(CASE WHEN type_patrimoine = 'Professionnel' THEN solde ELSE 0 END), 0) as actifs_pro_economies
        FROM comptes_bancaires
        WHERE structure_id = structure_uuid
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
        (bs.actifs_perso_biens + es.actifs_perso_economies) as actifs_perso,
        (bs.actifs_pro_biens + es.actifs_pro_economies) as actifs_pro,
        cs.passifs_perso,
        cs.passifs_pro,
        ((bs.actifs_perso_biens + es.actifs_perso_economies) - cs.passifs_perso) as net_perso,
        ((bs.actifs_pro_biens + es.actifs_pro_economies) - cs.passifs_pro) as net_pro
    FROM biens_structure bs, economies_structure es, credits_structure cs;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcul_patrimoine_net_structure IS 'Calcule le patrimoine net d''une structure (biens + économies - crédits)';

-- ============================================================================
-- 7. DONNÉES DE RÉFÉRENCE
-- ============================================================================

COMMENT ON COLUMN comptes_bancaires.type_compte IS 'Types courants: Compte_Courant, Livret_A, LDDS, PEL, CEL, Assurance_Vie, PEA, PEA_PME, Compte_Titre, Livret_Jeune, LEP';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
