import { Request, Response } from 'express';
import { DossierService } from '@/services/dossierService';
import { CreateDossierRequest, UpdateDossierRequest, ApiResponse, PaginationParams, ExpressHandler } from '@/types';
import { asyncHandler } from '@/utils/errors';
import { AuthRequest } from '@/types';
import logger from '@/utils/logger';

export class DossierController {
  /**
   * Créer un nouveau dossier SCI
   * POST /api/dossiers
   */
  static createDossier: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const data: CreateDossierRequest = req.body;

    // Validation
    if (!data.nomSCI || !data.localisation || !data.prixAcquisition) {
      res.status(400).json({
        success: false,
        error: 'Nom de la SCI, localisation et prix d\'acquisition sont requis'
      });
      return;
    }

    if (data.prixAcquisition <= 0) {
      res.status(400).json({
        success: false,
        error: 'Le prix d\'acquisition doit être supérieur à 0'
      });
      return;
    }

    if (data.montantTravaux < 0) {
      res.status(400).json({
        success: false,
        error: 'Le montant des travaux ne peut pas être négatif'
      });
      return;
    }

    try {
      const dossier = await DossierService.createDossier(userId, data);

      const response: ApiResponse = {
        success: true,
        data: { dossier },
        message: 'Dossier SCI créé avec succès'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Erreur lors de la création du dossier', { userId, data, error });
      throw error;
    }
  });

  /**
   * Récupérer un dossier par son ID
   * GET /api/dossiers/:id
   */
  static getDossier: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;

    try {
      const dossier = await DossierService.getDossierById(dossierId, userId);

      if (!dossier) {
        res.status(404).json({
          success: false,
          error: 'Dossier non trouvé'
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { dossier }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la récupération du dossier', { userId, dossierId, error });
      throw error;
    }
  });

  /**
   * Récupérer tous les dossiers d'un utilisateur
   * GET /api/dossiers
   */
  static getDossiers: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    
    // Paramètres de pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = req.query.sortBy as string || 'date_creation';
    const sortOrder = req.query.sortOrder as 'ASC' | 'DESC' || 'DESC';

    const params: PaginationParams = {
      page,
      limit: Math.min(limit, 50), // Limiter à 50 maximum
      sortBy,
      sortOrder
    };

    try {
      const result = await DossierService.getDossiersByUser(userId, params);

      const response: ApiResponse = {
        success: true,
        data: {
          dossiers: result.data,
          pagination: result.pagination
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la récupération des dossiers', { userId, params, error });
      throw error;
    }
  });

  /**
   * Mettre à jour un dossier
   * PUT /api/dossiers/:id
   */
  static updateDossier: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;
    const data: UpdateDossierRequest = req.body;

    // Validation
    if (data.prixAcquisition !== undefined && data.prixAcquisition <= 0) {
      res.status(400).json({
        success: false,
        error: 'Le prix d\'acquisition doit être supérieur à 0'
      });
      return;
    }

    if (data.montantTravaux !== undefined && data.montantTravaux < 0) {
      res.status(400).json({
        success: false,
        error: 'Le montant des travaux ne peut pas être négatif'
      });
      return;
    }

    if (data.status !== undefined && !['Brouillon', 'Complete', 'Genere', 'PDF_Genere'].includes(data.status)) {
      res.status(400).json({
        success: false,
        error: 'Statut invalide'
      });
      return;
    }

    try {
      const dossier = await DossierService.updateDossier(dossierId, userId, data);

      const response: ApiResponse = {
        success: true,
        data: { dossier },
        message: 'Dossier mis à jour avec succès'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du dossier', { userId, dossierId, data, error });
      throw error;
    }
  });

  /**
   * Supprimer un dossier
   * DELETE /api/dossiers/:id
   */
  static deleteDossier: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;

    try {
      await DossierService.deleteDossier(dossierId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Dossier supprimé avec succès'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la suppression du dossier', { userId, dossierId, error });
      throw error;
    }
  });

  /**
   * Mettre à jour le statut d'un dossier
   * PATCH /api/dossiers/:id/status
   */
  static updateDossierStatus: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;
    const { status } = req.body;

    // Validation
    if (!status || !['Brouillon', 'Complete', 'Genere', 'PDF_Genere'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Statut invalide. Doit être: Brouillon, Complete, Genere, ou PDF_Genere'
      });
      return;
    }

    try {
      const dossier = await DossierService.updateDossierStatus(dossierId, userId, status);

      const response: ApiResponse = {
        success: true,
        data: { dossier },
        message: `Statut du dossier mis à jour vers: ${status}`
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut', { userId, dossierId, status, error });
      throw error;
    }
  });

  /**
   * Générer un PDF pour un dossier
   * POST /api/dossiers/:id/generate-pdf
   */
  static generatePDF: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;

    try {
      // Récupérer le dossier complet
      const dossier = await DossierService.getDossierById(dossierId, userId);

      if (!dossier) {
        res.status(404).json({
          success: false,
          error: 'Dossier non trouvé'
        });
        return;
      }

      // Vérifier que le dossier est complet
      if (dossier.status === 'Brouillon') {
        res.status(400).json({
          success: false,
          error: 'Le dossier doit être complet avant de générer le PDF'
        });
        return;
      }

      // TODO: Implémenter la génération PDF côté serveur
      // Pour l'instant, on met juste à jour le statut
      const updatedDossier = await DossierService.updateDossierStatus(dossierId, userId, 'PDF_Genere');

      const response: ApiResponse = {
        success: true,
        data: { 
          dossier: updatedDossier,
          pdfUrl: `/api/dossiers/${dossierId}/pdf` // URL pour télécharger le PDF
        },
        message: 'PDF généré avec succès'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF', { userId, dossierId, error });
      throw error;
    }
  });

  /**
   * Télécharger le PDF d'un dossier
   * GET /api/dossiers/:id/pdf
   */
  static downloadPDF: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const userId = req.user!.id;
    const dossierId = req.params.id;

    try {
      const dossier = await DossierService.getDossierById(dossierId, userId);

      if (!dossier) {
        res.status(404).json({
          success: false,
          error: 'Dossier non trouvé'
        });
        return;
      }

      if (dossier.status !== 'PDF_Genere') {
        res.status(400).json({
          success: false,
          error: 'Le PDF n\'a pas encore été généré pour ce dossier'
        });
        return;
      }

      // TODO: Implémenter la génération et le téléchargement du PDF
      // Pour l'instant, on retourne une erreur
      res.status(501).json({
        success: false,
        error: 'Génération PDF côté serveur en cours d\'implémentation'
      });
    } catch (error) {
      logger.error('Erreur lors du téléchargement du PDF', { userId, dossierId, error });
      throw error;
    }
  });
} 