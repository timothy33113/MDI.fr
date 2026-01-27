import { query, transaction } from '@/database/connection';
import { DossierSCI, CreateDossierRequest, UpdateDossierRequest, PaginationParams, PaginatedResponse } from '@/types';
import { NotFoundError, ValidationError } from '@/utils/errors';
import logger from '@/utils/logger';

export class DossierService {
  /**
   * Créer un nouveau dossier SCI
   */
  static async createDossier(userId: string, data: CreateDossierRequest): Promise<DossierSCI> {
    try {
      const result = await query(
        `INSERT INTO dossiers_sci (
          user_id, nom_sci, localisation, prix_acquisition, montant_travaux, 
          status, total_parts, date_creation, date_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          userId,
          data.nomSCI,
          data.localisation,
          data.prixAcquisition,
          data.montantTravaux,
          'Brouillon',
          0
        ]
      );

      const dossierData = result.rows[0];
      const dossier: DossierSCI = {
        id: dossierData.id,
        userId: dossierData.user_id,
        nomSCI: dossierData.nom_sci,
        status: dossierData.status,
        localisation: dossierData.localisation,
        prixAcquisition: parseFloat(dossierData.prix_acquisition),
        montantTravaux: parseFloat(dossierData.montant_travaux),
        associes: [],
        totalParts: dossierData.total_parts,
        financement: {
          id: '',
          dossierId: dossierData.id,
          prixAchat: data.prixAcquisition,
          fraisNotaire: 0,
          montantTravaux: data.montantTravaux,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: {
          id: '',
          dossierId: dossierData.id,
          adresse: data.localisation,
          superficie: 0,
          nombrePieces: 0,
          etatActuel: '',
          dpe: '',
          estimationValeur: data.prixAcquisition,
          travauxPrevus: [],
          photos: []
        },
        dateCreation: dossierData.date_creation,
        dateModification: dossierData.date_modification
      };

      logger.info('Nouveau dossier SCI créé', { userId, dossierId: dossier.id });
      return dossier;
    } catch (error) {
      logger.error('Erreur lors de la création du dossier', { userId, data, error });
      throw error;
    }
  }

  /**
   * Récupérer un dossier par son ID
   */
  static async getDossierById(dossierId: string, userId: string): Promise<DossierSCI | null> {
    try {
      const result = await query(
        `SELECT * FROM dossiers_sci WHERE id = $1 AND user_id = $2`,
        [dossierId, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const dossierData = result.rows[0];
      
      // Récupérer les associés
      const associesResult = await query(
        `SELECT * FROM associes WHERE dossier_id = $1`,
        [dossierId]
      );

      // Récupérer le plan de financement
      const financementResult = await query(
        `SELECT * FROM plans_financement WHERE dossier_id = $1`,
        [dossierId]
      );

      // Récupérer le bien immobilier
      const bienResult = await query(
        `SELECT * FROM biens_immobiliers WHERE dossier_id = $1`,
        [dossierId]
      );

      const dossier: DossierSCI = {
        id: dossierData.id,
        userId: dossierData.user_id,
        nomSCI: dossierData.nom_sci,
        status: dossierData.status,
        localisation: dossierData.localisation,
        prixAcquisition: parseFloat(dossierData.prix_acquisition),
        montantTravaux: parseFloat(dossierData.montant_travaux),
        associes: associesResult.rows.map((row: any) => ({
          id: row.id,
          dossierId: row.dossier_id,
          type: row.type,
          nom: row.nom,
          adresse: row.adresse,
          telephone: row.telephone,
          email: row.email,
          pourcentageParts: parseFloat(row.pourcentage_parts)
        })),
        totalParts: dossierData.total_parts,
        financement: financementResult.rows.length > 0 ? {
          id: financementResult.rows[0].id,
          dossierId: financementResult.rows[0].dossier_id,
          prixAchat: parseFloat(financementResult.rows[0].prix_achat),
          fraisNotaire: parseFloat(financementResult.rows[0].frais_notaire),
          montantTravaux: parseFloat(financementResult.rows[0].montant_travaux),
          apportPersonnel: parseFloat(financementResult.rows[0].apport_personnel),
          montantEmprunt: parseFloat(financementResult.rows[0].montant_emprunt),
          dureeCredit: financementResult.rows[0].duree_credit,
          tauxEstime: parseFloat(financementResult.rows[0].taux_estime),
          mensualiteEstimee: parseFloat(financementResult.rows[0].mensualite_estimee),
          rentabilitePrevisionnelle: parseFloat(financementResult.rows[0].rentabilite_previsionnelle)
        } : {
          id: '',
          dossierId: dossierData.id,
          prixAchat: dossierData.prix_acquisition,
          fraisNotaire: 0,
          montantTravaux: dossierData.montant_travaux,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: bienResult.rows.length > 0 ? {
          id: bienResult.rows[0].id,
          dossierId: bienResult.rows[0].dossier_id,
          adresse: bienResult.rows[0].adresse,
          superficie: parseFloat(bienResult.rows[0].superficie),
          nombrePieces: bienResult.rows[0].nombre_pieces,
          etatActuel: bienResult.rows[0].etat_actuel,
          dpe: bienResult.rows[0].dpe,
          estimationValeur: parseFloat(bienResult.rows[0].estimation_valeur),
          travauxPrevus: [],
          photos: []
        } : {
          id: '',
          dossierId: dossierData.id,
          adresse: dossierData.localisation,
          superficie: 0,
          nombrePieces: 0,
          etatActuel: '',
          dpe: '',
          estimationValeur: dossierData.prix_acquisition,
          travauxPrevus: [],
          photos: []
        },
        dateCreation: dossierData.date_creation,
        dateModification: dossierData.date_modification
      };

      return dossier;
    } catch (error) {
      logger.error('Erreur lors de la récupération du dossier', { dossierId, userId, error });
      throw error;
    }
  }

  /**
   * Récupérer tous les dossiers d'un utilisateur avec pagination
   */
  static async getDossiersByUser(
    userId: string, 
    params: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<DossierSCI>> {
    try {
      const offset = (params.page - 1) * params.limit;
      const sortBy = params.sortBy || 'date_creation';
      const sortOrder = params.sortOrder || 'DESC';

      // Compter le total
      const countResult = await query(
        `SELECT COUNT(*) FROM dossiers_sci WHERE user_id = $1`,
        [userId]
      );
      const total = parseInt(countResult.rows[0].count);

      // Récupérer les dossiers
      const result = await query(
        `SELECT * FROM dossiers_sci 
         WHERE user_id = $1 
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT $2 OFFSET $3`,
        [userId, params.limit, offset]
      );

      const dossiers = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        nomSCI: row.nom_sci,
        status: row.status,
        localisation: row.localisation,
        prixAcquisition: parseFloat(row.prix_acquisition),
        montantTravaux: parseFloat(row.montant_travaux),
        associes: [],
        totalParts: row.total_parts,
        financement: {
          id: '',
          dossierId: row.id,
          prixAchat: row.prix_acquisition,
          fraisNotaire: 0,
          montantTravaux: row.montant_travaux,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: {
          id: '',
          dossierId: row.id,
          adresse: row.localisation,
          superficie: 0,
          nombrePieces: 0,
          etatActuel: '',
          dpe: '',
          estimationValeur: row.prix_acquisition,
          travauxPrevus: [],
          photos: []
        },
        dateCreation: row.date_creation,
        dateModification: row.date_modification
      }));

      return {
        data: dossiers,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: Math.ceil(total / params.limit)
        }
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des dossiers', { userId, params, error });
      throw error;
    }
  }

  /**
   * Mettre à jour un dossier
   */
  static async updateDossier(
    dossierId: string, 
    userId: string, 
    data: UpdateDossierRequest
  ): Promise<DossierSCI> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Construire dynamiquement la requête de mise à jour
      if (data.nomSCI !== undefined) {
        updateFields.push(`nom_sci = $${paramCount++}`);
        values.push(data.nomSCI);
      }
      if (data.localisation !== undefined) {
        updateFields.push(`localisation = $${paramCount++}`);
        values.push(data.localisation);
      }
      if (data.prixAcquisition !== undefined) {
        updateFields.push(`prix_acquisition = $${paramCount++}`);
        values.push(data.prixAcquisition);
      }
      if (data.montantTravaux !== undefined) {
        updateFields.push(`montant_travaux = $${paramCount++}`);
        values.push(data.montantTravaux);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      if (updateFields.length === 0) {
        throw new ValidationError('Aucun champ à mettre à jour');
      }

      updateFields.push(`date_modification = CURRENT_TIMESTAMP`);
      values.push(dossierId, userId);

      const result = await query(
        `UPDATE dossiers_sci 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Dossier');
      }

      const dossierData = result.rows[0];
      const dossier: DossierSCI = {
        id: dossierData.id,
        userId: dossierData.user_id,
        nomSCI: dossierData.nom_sci,
        status: dossierData.status,
        localisation: dossierData.localisation,
        prixAcquisition: parseFloat(dossierData.prix_acquisition),
        montantTravaux: parseFloat(dossierData.montant_travaux),
        associes: [],
        totalParts: dossierData.total_parts,
        financement: {
          id: '',
          dossierId: dossierData.id,
          prixAchat: dossierData.prix_acquisition,
          fraisNotaire: 0,
          montantTravaux: dossierData.montant_travaux,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: {
          id: '',
          dossierId: dossierData.id,
          adresse: dossierData.localisation,
          superficie: 0,
          nombrePieces: 0,
          etatActuel: '',
          dpe: '',
          estimationValeur: dossierData.prix_acquisition,
          travauxPrevus: [],
          photos: []
        },
        dateCreation: dossierData.date_creation,
        dateModification: dossierData.date_modification
      };

      logger.info('Dossier mis à jour', { dossierId, userId });
      return dossier;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du dossier', { dossierId, userId, data, error });
      throw error;
    }
  }

  /**
   * Supprimer un dossier
   */
  static async deleteDossier(dossierId: string, userId: string): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM dossiers_sci WHERE id = $1 AND user_id = $2`,
        [dossierId, userId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Dossier');
      }

      logger.info('Dossier supprimé', { dossierId, userId });
    } catch (error) {
      logger.error('Erreur lors de la suppression du dossier', { dossierId, userId, error });
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'un dossier
   */
  static async updateDossierStatus(
    dossierId: string, 
    userId: string, 
    status: DossierSCI['status']
  ): Promise<DossierSCI> {
    try {
      const result = await query(
        `UPDATE dossiers_sci 
         SET status = $1, date_modification = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [status, dossierId, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Dossier');
      }

      const dossierData = result.rows[0];
      const dossier: DossierSCI = {
        id: dossierData.id,
        userId: dossierData.user_id,
        nomSCI: dossierData.nom_sci,
        status: dossierData.status,
        localisation: dossierData.localisation,
        prixAcquisition: parseFloat(dossierData.prix_acquisition),
        montantTravaux: parseFloat(dossierData.montant_travaux),
        associes: [],
        totalParts: dossierData.total_parts,
        financement: {
          id: '',
          dossierId: dossierData.id,
          prixAchat: dossierData.prix_acquisition,
          fraisNotaire: 0,
          montantTravaux: dossierData.montant_travaux,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: {
          id: '',
          dossierId: dossierData.id,
          adresse: dossierData.localisation,
          superficie: 0,
          nombrePieces: 0,
          etatActuel: '',
          dpe: '',
          estimationValeur: dossierData.prix_acquisition,
          travauxPrevus: [],
          photos: []
        },
        dateCreation: dossierData.date_creation,
        dateModification: dossierData.date_modification
      };

      logger.info('Statut du dossier mis à jour', { dossierId, userId, status });
      return dossier;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut', { dossierId, userId, status, error });
      throw error;
    }
  }
} 