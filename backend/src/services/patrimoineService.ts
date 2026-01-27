/**
 * Service pour la gestion du système patrimonial
 */

import pool from '../config/database';
import logger from '../utils/logger';
import {
  DetentionStructure,
  CreateDetentionStructureDto,
  UpdateDetentionStructureDto,
  BienPatrimonial,
  CreateBienPatrimonialDto,
  UpdateBienPatrimonialDto,
  ProprietaireBien,
  CreateProprietaireBienDto,
  UpdateProprietaireBienDto,
  CreditPatrimonial,
  CreateCreditPatrimonialDto,
  UpdateCreditPatrimonialDto,
  CoemprunteurCredit,
  CreateCoemprunteurCreditDto,
  UpdateCoemprunteurCreditDto,
  VuePatrimoniale,
  SynthesePatrimoniale,
  PatrimoineNetStructure
} from '../types/patrimoine';

export class PatrimoineService {
  // ============================================================================
  // DÉTENTIONS DE STRUCTURES
  // ============================================================================

  async createDetentionStructure(
    userId: string,
    data: CreateDetentionStructureDto
  ): Promise<DetentionStructure> {
    const client = await pool.connect();
    try {
      // Vérifier que les deux structures appartiennent à l'utilisateur
      const structuresCheck = await client.query(
        'SELECT id FROM structures WHERE id = ANY($1) AND user_id = $2',
        [[data.structureDetentriceId, data.structureDetenueId], userId]
      );

      if (structuresCheck.rows.length !== 2) {
        throw new Error('Une ou plusieurs structures non trouvées ou non autorisées');
      }

      const result = await client.query(
        `INSERT INTO detentions_structures (
          structure_detentrice_id, structure_detenue_id, pourcentage_detention,
          date_debut, date_fin
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          data.structureDetentriceId,
          data.structureDetenueId,
          data.pourcentageDetention,
          data.dateDebut || null,
          data.dateFin || null
        ]
      );

      return this.mapDetentionStructure(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getDetentionsStructure(structureId: string, userId: string): Promise<DetentionStructure[]> {
    const client = await pool.connect();
    try {
      // Vérifier que la structure appartient à l'utilisateur
      const structureCheck = await client.query(
        'SELECT id FROM structures WHERE id = $1 AND user_id = $2',
        [structureId, userId]
      );

      if (structureCheck.rows.length === 0) {
        throw new Error('Structure non trouvée ou non autorisée');
      }

      const result = await client.query(
        `SELECT ds.*,
          row_to_json(s1.*) as structure_detentrice,
          row_to_json(s2.*) as structure_detenue
        FROM detentions_structures ds
        LEFT JOIN structures s1 ON ds.structure_detentrice_id = s1.id
        LEFT JOIN structures s2 ON ds.structure_detenue_id = s2.id
        WHERE ds.structure_detentrice_id = $1 OR ds.structure_detenue_id = $1
        ORDER BY ds.created_at DESC`,
        [structureId]
      );

      return result.rows.map(row => this.mapDetentionStructure(row));
    } finally {
      client.release();
    }
  }

  async updateDetentionStructure(
    detentionId: string,
    userId: string,
    data: UpdateDetentionStructureDto
  ): Promise<DetentionStructure> {
    const client = await pool.connect();
    try {
      // Vérifier que la détention existe et appartient à l'utilisateur
      const detentionCheck = await client.query(
        `SELECT ds.* FROM detentions_structures ds
        JOIN structures s ON ds.structure_detentrice_id = s.id
        WHERE ds.id = $1 AND s.user_id = $2`,
        [detentionId, userId]
      );

      if (detentionCheck.rows.length === 0) {
        throw new Error('Détention non trouvée ou non autorisée');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.pourcentageDetention !== undefined) {
        updates.push(`pourcentage_detention = $${paramCount++}`);
        values.push(data.pourcentageDetention);
      }
      if (data.dateDebut !== undefined) {
        updates.push(`date_debut = $${paramCount++}`);
        values.push(data.dateDebut);
      }
      if (data.dateFin !== undefined) {
        updates.push(`date_fin = $${paramCount++}`);
        values.push(data.dateFin);
      }

      if (updates.length === 0) {
        return this.mapDetentionStructure(detentionCheck.rows[0]);
      }

      values.push(detentionId);
      const result = await client.query(
        `UPDATE detentions_structures
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *`,
        values
      );

      return this.mapDetentionStructure(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteDetentionStructure(detentionId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM detentions_structures ds
        USING structures s
        WHERE ds.id = $1 AND ds.structure_detentrice_id = s.id AND s.user_id = $2`,
        [detentionId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Détention non trouvée ou non autorisée');
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // BIENS PATRIMONIAUX
  // ============================================================================

  async createBienPatrimonial(
    userId: string,
    data: CreateBienPatrimonialDto
  ): Promise<BienPatrimonial> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO biens_patrimoniaux (
          user_id, nom, type_bien, type_patrimoine, adresse, code_postal, ville, pays,
          superficie, nombre_pieces, nombre_chambres, annee_construction, etat,
          valeur_acquisition, date_acquisition, valeur_actuelle, date_evaluation,
          loue, loyer_mensuel, charges_mensuelles, taxe_fonciere, regime_fiscal, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *`,
        [
          userId,
          data.nom,
          data.typeBien,
          data.typePatrimoine,
          data.adresse,
          data.codePostal || null,
          data.ville || null,
          data.pays || 'France',
          data.superficie || null,
          data.nombrePieces || null,
          data.nombreChambres || null,
          data.anneeConstruction || null,
          data.etat || null,
          data.valeurAcquisition || null,
          data.dateAcquisition || null,
          data.valeurActuelle || null,
          data.dateEvaluation || null,
          data.loue || false,
          data.loyerMensuel || null,
          data.chargesMensuelles || null,
          data.taxeFonciere || null,
          data.regimeFiscal || null,
          JSON.stringify(data.metadata || {})
        ]
      );

      return this.mapBienPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getBiensPatrimoniaux(
    userId: string,
    typePatrimoine?: 'Personnel' | 'Professionnel'
  ): Promise<BienPatrimonial[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM biens_patrimoniaux WHERE user_id = $1';
      const params: any[] = [userId];

      if (typePatrimoine) {
        query += ' AND type_patrimoine = $2';
        params.push(typePatrimoine);
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      return result.rows.map(row => this.mapBienPatrimonial(row));
    } finally {
      client.release();
    }
  }

  async getBienPatrimonialById(bienId: string, userId: string): Promise<BienPatrimonial | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT b.*,
          json_agg(DISTINCT jsonb_build_object(
            'id', pb.id,
            'structureId', pb.structure_id,
            'pourcentageDetention', pb.pourcentage_detention,
            'typeDetention', pb.type_detention,
            'structure', row_to_json(s.*)
          )) FILTER (WHERE pb.id IS NOT NULL) as proprietaires
        FROM biens_patrimoniaux b
        LEFT JOIN proprietaires_biens pb ON b.id = pb.bien_id
        LEFT JOIN structures s ON pb.structure_id = s.id
        WHERE b.id = $1 AND b.user_id = $2
        GROUP BY b.id`,
        [bienId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapBienPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateBienPatrimonial(
    bienId: string,
    userId: string,
    data: UpdateBienPatrimonialDto
  ): Promise<BienPatrimonial> {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = this.camelToSnake(key);
          if (key === 'metadata') {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(value);
          }
        }
      });

      if (updates.length === 0) {
        const bien = await this.getBienPatrimonialById(bienId, userId);
        if (!bien) throw new Error('Bien non trouvé');
        return bien;
      }

      values.push(bienId, userId);
      const result = await client.query(
        `UPDATE biens_patrimoniaux
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Bien non trouvé ou non autorisé');
      }

      return this.mapBienPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteBienPatrimonial(bienId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM biens_patrimoniaux WHERE id = $1 AND user_id = $2',
        [bienId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Bien non trouvé ou non autorisé');
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // PROPRIÉTAIRES DE BIENS
  // ============================================================================

  async addProprietaireBien(
    userId: string,
    data: CreateProprietaireBienDto
  ): Promise<ProprietaireBien> {
    const client = await pool.connect();
    try {
      // Vérifier que le bien et la structure appartiennent à l'utilisateur
      const checks = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM biens_patrimoniaux WHERE id = $1 AND user_id = $3) as bien_exists,
          (SELECT COUNT(*) FROM structures WHERE id = $2 AND user_id = $3) as structure_exists`,
        [data.bienId, data.structureId, userId]
      );

      if (checks.rows[0].bien_exists === '0' || checks.rows[0].structure_exists === '0') {
        throw new Error('Bien ou structure non trouvé(e) ou non autorisé(e)');
      }

      const result = await client.query(
        `INSERT INTO proprietaires_biens (
          bien_id, structure_id, pourcentage_detention, date_debut, date_fin, type_detention
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.bienId,
          data.structureId,
          data.pourcentageDetention,
          data.dateDebut || null,
          data.dateFin || null,
          data.typeDetention || 'Pleine_Propriete'
        ]
      );

      return this.mapProprietaireBien(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async removeProprietaireBien(proprietaireId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM proprietaires_biens pb
        USING biens_patrimoniaux b
        WHERE pb.id = $1 AND pb.bien_id = b.id AND b.user_id = $2`,
        [proprietaireId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Propriétaire non trouvé ou non autorisé');
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CRÉDITS PATRIMONIAUX
  // ============================================================================

  async createCreditPatrimonial(
    userId: string,
    data: CreateCreditPatrimonialDto
  ): Promise<CreditPatrimonial> {
    const client = await pool.connect();
    try {
      // Vérifier que la structure emprunteuse (si fournie) appartient à l'utilisateur
      if (data.structureEmprunteurId) {
        const structureCheck = await client.query(
          'SELECT id FROM structures WHERE id = $1 AND user_id = $2',
          [data.structureEmprunteurId, userId]
        );

        if (structureCheck.rows.length === 0) {
          throw new Error('Structure emprunteuse non trouvée ou non autorisée');
        }
      }

      const result = await client.query(
        `INSERT INTO credits_patrimoniaux (
          user_id, structure_emprunteur_id, bien_finance_id, nom, type_credit, type_patrimoine,
          banque, numero_pret, montant_initial, montant_restant_du, taux_interet, taux_assurance,
          duree_mois, mensualite, date_debut, date_fin_prevue, date_fin_reelle,
          garanties, type_taux, type_amortissement, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          userId,
          data.structureEmprunteurId || null,
          data.bienFinanceId || null,
          data.nom,
          data.typeCredit,
          data.typePatrimoine,
          data.banque || null,
          data.numeroPret || null,
          data.montantInitial,
          data.montantRestantDu,
          data.tauxInteret,
          data.tauxAssurance || null,
          data.dureeMois,
          data.mensualite,
          data.dateDebut,
          data.dateFinPrevue,
          data.dateFinReelle || null,
          data.garanties || null,
          data.typeTaux || 'Fixe',
          data.typeAmortissement || 'Constant',
          JSON.stringify(data.metadata || {})
        ]
      );

      return this.mapCreditPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getCreditsPatrimoniaux(
    userId: string,
    typePatrimoine?: 'Personnel' | 'Professionnel'
  ): Promise<CreditPatrimonial[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM credits_patrimoniaux WHERE user_id = $1';
      const params: any[] = [userId];

      if (typePatrimoine) {
        query += ' AND type_patrimoine = $2';
        params.push(typePatrimoine);
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      return result.rows.map(row => this.mapCreditPatrimonial(row));
    } finally {
      client.release();
    }
  }

  async getCreditPatrimonialById(creditId: string, userId: string): Promise<CreditPatrimonial | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT c.*,
          row_to_json(s.*) as structure_emprunteur,
          row_to_json(b.*) as bien_finance,
          json_agg(DISTINCT jsonb_build_object(
            'id', co.id,
            'structureId', co.structure_id,
            'pourcentageEngagement', co.pourcentage_engagement,
            'typeEngagement', co.type_engagement,
            'structure', row_to_json(s2.*)
          )) FILTER (WHERE co.id IS NOT NULL) as coemprunteurs
        FROM credits_patrimoniaux c
        LEFT JOIN structures s ON c.structure_emprunteur_id = s.id
        LEFT JOIN biens_patrimoniaux b ON c.bien_finance_id = b.id
        LEFT JOIN coemprunteurs_credits co ON c.id = co.credit_id
        LEFT JOIN structures s2 ON co.structure_id = s2.id
        WHERE c.id = $1 AND c.user_id = $2
        GROUP BY c.id, s.id, b.id`,
        [creditId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCreditPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateCreditPatrimonial(
    creditId: string,
    userId: string,
    data: UpdateCreditPatrimonialDto
  ): Promise<CreditPatrimonial> {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = this.camelToSnake(key);
          if (key === 'metadata') {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(value);
          }
        }
      });

      if (updates.length === 0) {
        const credit = await this.getCreditPatrimonialById(creditId, userId);
        if (!credit) throw new Error('Crédit non trouvé');
        return credit;
      }

      values.push(creditId, userId);
      const result = await client.query(
        `UPDATE credits_patrimoniaux
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Crédit non trouvé ou non autorisé');
      }

      return this.mapCreditPatrimonial(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteCreditPatrimonial(creditId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM credits_patrimoniaux WHERE id = $1 AND user_id = $2',
        [creditId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Crédit non trouvé ou non autorisé');
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // CO-EMPRUNTEURS
  // ============================================================================

  async addCoemprunteur(
    userId: string,
    data: CreateCoemprunteurCreditDto
  ): Promise<CoemprunteurCredit> {
    const client = await pool.connect();
    try {
      // Vérifier que le crédit et la structure appartiennent à l'utilisateur
      const checks = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM credits_patrimoniaux WHERE id = $1 AND user_id = $3) as credit_exists,
          (SELECT COUNT(*) FROM structures WHERE id = $2 AND user_id = $3) as structure_exists`,
        [data.creditId, data.structureId, userId]
      );

      if (checks.rows[0].credit_exists === '0' || checks.rows[0].structure_exists === '0') {
        throw new Error('Crédit ou structure non trouvé(e) ou non autorisé(e)');
      }

      const result = await client.query(
        `INSERT INTO coemprunteurs_credits (
          credit_id, structure_id, pourcentage_engagement, type_engagement
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          data.creditId,
          data.structureId,
          data.pourcentageEngagement,
          data.typeEngagement || 'Solidaire'
        ]
      );

      return this.mapCoemprunteurCredit(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async removeCoemprunteur(coemprunteurId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM coemprunteurs_credits co
        USING credits_patrimoniaux c
        WHERE co.id = $1 AND co.credit_id = c.id AND c.user_id = $2`,
        [coemprunteurId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Co-emprunteur non trouvé ou non autorisé');
      }
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // VUES ET RAPPORTS
  // ============================================================================

  async getVuePatrimoniale(structureId: string, userId: string): Promise<VuePatrimoniale> {
    const client = await pool.connect();
    try {
      // Vérifier que la structure appartient à l'utilisateur
      const structureResult = await client.query(
        'SELECT * FROM structures WHERE id = $1 AND user_id = $2',
        [structureId, userId]
      );

      if (structureResult.rows.length === 0) {
        throw new Error('Structure non trouvée ou non autorisée');
      }

      // Sociétés détenues
      const societesResult = await client.query(
        `SELECT ds.*, row_to_json(s.*) as societe
        FROM detentions_structures ds
        JOIN structures s ON ds.structure_detenue_id = s.id
        WHERE ds.structure_detentrice_id = $1
        AND (ds.date_fin IS NULL OR ds.date_fin >= CURRENT_DATE)`,
        [structureId]
      );

      // Biens détenus
      const biensResult = await client.query(
        `SELECT pb.*, row_to_json(b.*) as bien
        FROM proprietaires_biens pb
        JOIN biens_patrimoniaux b ON pb.bien_id = b.id
        WHERE pb.structure_id = $1
        AND (pb.date_fin IS NULL OR pb.date_fin >= CURRENT_DATE)`,
        [structureId]
      );

      // Comptes bancaires
      const comptesResult = await client.query(
        `SELECT * FROM comptes_bancaires
        WHERE structure_id = $1
        ORDER BY created_at DESC`,
        [structureId]
      );

      // Crédits
      const creditsResult = await client.query(
        `SELECT c.*, co.pourcentage_engagement, co.type_engagement
        FROM credits_patrimoniaux c
        LEFT JOIN coemprunteurs_credits co ON c.id = co.credit_id AND co.structure_id = $1
        WHERE c.structure_emprunteur_id = $1 OR co.structure_id = $1
        AND c.date_fin_reelle IS NULL`,
        [structureId]
      );

      // Détenteurs (qui détient cette structure)
      const detenteursResult = await client.query(
        `SELECT ds.*, row_to_json(s.*) as detenteur
        FROM detentions_structures ds
        JOIN structures s ON ds.structure_detentrice_id = s.id
        WHERE ds.structure_detenue_id = $1
        AND (ds.date_fin IS NULL OR ds.date_fin >= CURRENT_DATE)`,
        [structureId]
      );

      // Calcul du patrimoine net
      const patrimoineResult = await client.query(
        'SELECT * FROM calcul_patrimoine_net_structure($1)',
        [structureId]
      );

      const patrimoine = patrimoineResult.rows[0] || {
        actifs_personnels: 0,
        actifs_professionnels: 0,
        passifs_personnels: 0,
        passifs_professionnels: 0,
        net_personnel: 0,
        net_professionnel: 0
      };

      return {
        structure: structureResult.rows[0],
        societes: societesResult.rows.map(row => ({
          societe: row.societe,
          pourcentageDetention: parseFloat(row.pourcentage_detention),
          dateDebut: row.date_debut,
          dateFin: row.date_fin
        })),
        biens: biensResult.rows.map(row => ({
          bien: this.mapBienPatrimonial(row.bien),
          pourcentageDetention: parseFloat(row.pourcentage_detention),
          typeDetention: row.type_detention,
          dateDebut: row.date_debut,
          dateFin: row.date_fin
        })),
        comptes: comptesResult.rows.map(row => this.mapCompteBancaire(row)),
        credits: creditsResult.rows.map(row => ({
          credit: this.mapCreditPatrimonial(row),
          pourcentageEngagement: parseFloat(row.pourcentage_engagement || 100),
          typeEngagement: row.type_engagement
        })),
        detenuePar: detenteursResult.rows.map(row => ({
          detenteur: row.detenteur,
          pourcentageDetention: parseFloat(row.pourcentage_detention),
          dateDebut: row.date_debut,
          dateFin: row.date_fin
        })),
        totalActifsPersonnels: parseFloat(patrimoine.actifs_personnels || 0),
        totalActifsProfessionnels: parseFloat(patrimoine.actifs_professionnels || 0),
        totalPassifsPersonnels: parseFloat(patrimoine.passifs_personnels || 0),
        totalPassifsProfessionnels: parseFloat(patrimoine.passifs_professionnels || 0),
        patrimoineNetPersonnel: parseFloat(patrimoine.net_personnel || 0),
        patrimoineNetProfessionnel: parseFloat(patrimoine.net_professionnel || 0)
      };
    } finally {
      client.release();
    }
  }

  async getSynthesePatrimoniale(userId: string): Promise<SynthesePatrimoniale> {
    const client = await pool.connect();
    try {
      // Actifs personnels
      const actifsPersoResult = await client.query(
        `SELECT
          COUNT(*) as nb_biens,
          COALESCE(SUM(valeur_actuelle), 0) as valeur_totale,
          COUNT(*) FILTER (WHERE loue = true) as nb_loues,
          COALESCE(SUM(loyer_mensuel) FILTER (WHERE loue = true), 0) as revenus_mensuels
        FROM biens_patrimoniaux
        WHERE user_id = $1 AND type_patrimoine = 'Personnel'`,
        [userId]
      );

      // Passifs personnels
      const passifsPersoResult = await client.query(
        `SELECT
          COUNT(*) as nb_credits,
          COALESCE(SUM(montant_restant_du), 0) as montant_restant,
          COALESCE(SUM(mensualite), 0) as mensualites_totales
        FROM credits_patrimoniaux
        WHERE user_id = $1 AND type_patrimoine = 'Personnel' AND date_fin_reelle IS NULL`,
        [userId]
      );

      // Actifs professionnels
      const actifsProResult = await client.query(
        `SELECT
          COUNT(*) as nb_biens,
          COALESCE(SUM(valeur_actuelle), 0) as valeur_totale,
          COUNT(*) FILTER (WHERE loue = true) as nb_loues,
          COALESCE(SUM(loyer_mensuel) FILTER (WHERE loue = true), 0) as revenus_mensuels
        FROM biens_patrimoniaux
        WHERE user_id = $1 AND type_patrimoine = 'Professionnel'`,
        [userId]
      );

      const nbSocietesResult = await client.query(
        `SELECT COUNT(*) as nb_societes
        FROM structures
        WHERE user_id = $1 AND type != 'PERSONNE_PHYSIQUE'`,
        [userId]
      );

      // Passifs professionnels
      const passifsProResult = await client.query(
        `SELECT
          COUNT(*) as nb_credits,
          COALESCE(SUM(montant_restant_du), 0) as montant_restant,
          COALESCE(SUM(mensualite), 0) as mensualites_totales
        FROM credits_patrimoniaux
        WHERE user_id = $1 AND type_patrimoine = 'Professionnel' AND date_fin_reelle IS NULL`,
        [userId]
      );

      const actifsPerso = actifsPersoResult.rows[0];
      const passifsPerso = passifsPersoResult.rows[0];
      const actifsPro = actifsProResult.rows[0];
      const passifsPro = passifsProResult.rows[0];

      const patrimoineNetPerso = parseFloat(actifsPerso.valeur_totale || 0) - parseFloat(passifsPerso.montant_restant || 0);
      const patrimoineNetPro = parseFloat(actifsPro.valeur_totale || 0) - parseFloat(passifsPro.montant_restant || 0);

      return {
        actifsPersonnels: {
          biens: parseInt(actifsPerso.nb_biens || 0),
          valeurBiens: parseFloat(actifsPerso.valeur_totale || 0),
          biensLoues: parseInt(actifsPerso.nb_loues || 0),
          revenusMensuels: parseFloat(actifsPerso.revenus_mensuels || 0)
        },
        passifsPersonnels: {
          credits: parseInt(passifsPerso.nb_credits || 0),
          montantRestantDu: parseFloat(passifsPerso.montant_restant || 0),
          mensualitesTotales: parseFloat(passifsPerso.mensualites_totales || 0)
        },
        actifsProfessionnels: {
          biens: parseInt(actifsPro.nb_biens || 0),
          valeurBiens: parseFloat(actifsPro.valeur_totale || 0),
          biensLoues: parseInt(actifsPro.nb_loues || 0),
          revenusMensuels: parseFloat(actifsPro.revenus_mensuels || 0),
          societes: parseInt(nbSocietesResult.rows[0].nb_societes || 0)
        },
        passifsProfessionnels: {
          credits: parseInt(passifsPro.nb_credits || 0),
          montantRestantDu: parseFloat(passifsPro.montant_restant || 0),
          mensualitesTotales: parseFloat(passifsPro.mensualites_totales || 0)
        },
        patrimoineNetPersonnel: patrimoineNetPerso,
        patrimoineNetProfessionnel: patrimoineNetPro,
        patrimoineNetTotal: patrimoineNetPerso + patrimoineNetPro
      };
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapDetentionStructure(row: any): DetentionStructure {
    return {
      id: row.id,
      structureDetentriceId: row.structure_detentrice_id,
      structureDetenueId: row.structure_detenue_id,
      pourcentageDetention: parseFloat(row.pourcentage_detention),
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      structureDetentrice: row.structure_detentrice,
      structureDetenue: row.structure_detenue
    };
  }

  private mapBienPatrimonial(row: any): BienPatrimonial {
    return {
      id: row.id,
      userId: row.user_id,
      nom: row.nom,
      typeBien: row.type_bien,
      typePatrimoine: row.type_patrimoine,
      adresse: row.adresse,
      codePostal: row.code_postal,
      ville: row.ville,
      pays: row.pays,
      superficie: row.superficie ? parseFloat(row.superficie) : undefined,
      nombrePieces: row.nombre_pieces,
      nombreChambres: row.nombre_chambres,
      anneeConstruction: row.annee_construction,
      etat: row.etat,
      valeurAcquisition: row.valeur_acquisition ? parseFloat(row.valeur_acquisition) : undefined,
      dateAcquisition: row.date_acquisition,
      valeurActuelle: row.valeur_actuelle ? parseFloat(row.valeur_actuelle) : undefined,
      dateEvaluation: row.date_evaluation,
      loue: row.loue,
      loyerMensuel: row.loyer_mensuel ? parseFloat(row.loyer_mensuel) : undefined,
      chargesMensuelles: row.charges_mensuelles ? parseFloat(row.charges_mensuelles) : undefined,
      taxeFonciere: row.taxe_fonciere ? parseFloat(row.taxe_fonciere) : undefined,
      regimeFiscal: row.regime_fiscal,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      proprietaires: row.proprietaires
    };
  }

  private mapProprietaireBien(row: any): ProprietaireBien {
    return {
      id: row.id,
      bienId: row.bien_id,
      structureId: row.structure_id,
      pourcentageDetention: parseFloat(row.pourcentage_detention),
      dateDebut: row.date_debut,
      dateFin: row.date_fin,
      typeDetention: row.type_detention,
      createdAt: row.created_at
    };
  }

  private mapCreditPatrimonial(row: any): CreditPatrimonial {
    return {
      id: row.id,
      userId: row.user_id,
      structureEmprunteurId: row.structure_emprunteur_id,
      bienFinanceId: row.bien_finance_id,
      nom: row.nom,
      typeCredit: row.type_credit,
      typePatrimoine: row.type_patrimoine,
      banque: row.banque,
      numeroPret: row.numero_pret,
      montantInitial: parseFloat(row.montant_initial),
      montantRestantDu: parseFloat(row.montant_restant_du),
      tauxInteret: parseFloat(row.taux_interet),
      tauxAssurance: row.taux_assurance ? parseFloat(row.taux_assurance) : undefined,
      dureeMois: row.duree_mois,
      mensualite: parseFloat(row.mensualite),
      dateDebut: row.date_debut,
      dateFinPrevue: row.date_fin_prevue,
      dateFinReelle: row.date_fin_reelle,
      garanties: row.garanties,
      typeTaux: row.type_taux,
      typeAmortissement: row.type_amortissement,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      structureEmprunteur: row.structure_emprunteur,
      bienFinance: row.bien_finance,
      coemprunteurs: row.coemprunteurs
    };
  }

  private mapCoemprunteurCredit(row: any): CoemprunteurCredit {
    return {
      id: row.id,
      creditId: row.credit_id,
      structureId: row.structure_id,
      pourcentageEngagement: parseFloat(row.pourcentage_engagement),
      typeEngagement: row.type_engagement,
      createdAt: row.created_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // ============================================================================
  // COMPTES BANCAIRES (ÉCONOMIES)
  // ============================================================================

  async createCompteBancaire(
    userId: string,
    data: any
  ): Promise<any> {
    const client = await pool.connect();
    try {
      // Vérifier que la structure (si fournie) appartient à l'utilisateur
      if (data.structureId) {
        const structureCheck = await client.query(
          'SELECT id FROM structures WHERE id = $1 AND user_id = $2',
          [data.structureId, userId]
        );

        if (structureCheck.rows.length === 0) {
          throw new Error('Structure non trouvée ou non autorisée');
        }
      }

      const result = await client.query(
        `INSERT INTO comptes_bancaires (
          user_id, structure_id, nom, type_compte, type_patrimoine,
          banque, numero_compte, solde, date_solde, taux_interet,
          bloque, date_blocage, date_deblocage, notes, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          userId,
          data.structureId || null,
          data.nom,
          data.typeCompte,
          data.typePatrimoine,
          data.banque || null,
          data.numeroCompte || null,
          data.solde || 0,
          data.dateSolde || new Date(),
          data.tauxInteret || null,
          data.bloque || false,
          data.dateBlocage || null,
          data.dateDeblocage || null,
          data.notes || null,
          JSON.stringify(data.metadata || {})
        ]
      );

      return this.mapCompteBancaire(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getComptesBancaires(
    userId: string,
    typePatrimoine?: 'Personnel' | 'Professionnel',
    structureId?: string
  ): Promise<any[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM comptes_bancaires WHERE user_id = $1';
      const params: any[] = [userId];
      let paramCount = 1;

      if (typePatrimoine) {
        paramCount++;
        query += ` AND type_patrimoine = $${paramCount}`;
        params.push(typePatrimoine);
      }

      if (structureId) {
        paramCount++;
        query += ` AND structure_id = $${paramCount}`;
        params.push(structureId);
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      return result.rows.map(row => this.mapCompteBancaire(row));
    } finally {
      client.release();
    }
  }

  async getCompteBancaireById(compteId: string, userId: string): Promise<any | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM comptes_bancaires WHERE id = $1 AND user_id = $2',
        [compteId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapCompteBancaire(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateCompteBancaire(
    compteId: string,
    userId: string,
    data: any
  ): Promise<any> {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const snakeKey = this.camelToSnake(key);
          if (key === 'metadata') {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${snakeKey} = $${paramCount++}`);
            values.push(value);
          }
        }
      });

      if (updates.length === 0) {
        const compte = await this.getCompteBancaireById(compteId, userId);
        if (!compte) throw new Error('Compte non trouvé');
        return compte;
      }

      values.push(compteId, userId);
      const result = await client.query(
        `UPDATE comptes_bancaires
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
        RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Compte non trouvé ou non autorisé');
      }

      return this.mapCompteBancaire(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteCompteBancaire(compteId: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM comptes_bancaires WHERE id = $1 AND user_id = $2',
        [compteId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Compte non trouvé ou non autorisé');
      }
    } finally {
      client.release();
    }
  }

  private mapCompteBancaire(row: any): any {
    return {
      id: row.id,
      userId: row.user_id,
      structureId: row.structure_id,
      nom: row.nom,
      typeCompte: row.type_compte,
      typePatrimoine: row.type_patrimoine,
      banque: row.banque,
      numeroCompte: row.numero_compte,
      solde: parseFloat(row.solde),
      dateSolde: row.date_solde,
      tauxInteret: row.taux_interet ? parseFloat(row.taux_interet) : undefined,
      bloque: row.bloque,
      dateBlocage: row.date_blocage,
      dateDeblocage: row.date_deblocage,
      notes: row.notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default new PatrimoineService();
