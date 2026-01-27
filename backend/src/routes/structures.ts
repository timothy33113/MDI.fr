import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import structureService from '@/services/structureService';
import { ApiResponse, CreateStructureRequest } from '@/types';
import logger from '@/utils/logger';

const router = Router();

/**
 * @route   POST /api/structures
 * @desc    Créer une nouvelle structure
 * @access  Private
 */
router.post('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data: CreateStructureRequest = req.body;

    // Validation basique
    if (!data.type || !data.nom || !data.adresse) {
      const response: ApiResponse = {
        success: false,
        error: 'Type, nom et adresse sont requis'
      };
      return res.status(400).json(response);
    }

    const structure = await structureService.createStructure(userId, data);

    const response: ApiResponse = {
      success: true,
      data: { structure },
      message: 'Structure créée avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('❌ ERREUR CRÉATION STRUCTURE - Message:', error.message);
    logger.error('❌ ERREUR CRÉATION STRUCTURE - Stack:', error.stack);
    logger.error('❌ ERREUR CRÉATION STRUCTURE - Data envoyée:', JSON.stringify(data, null, 2));
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la création de la structure'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/structures
 * @desc    Récupérer toutes les structures de l'utilisateur
 * @access  Private
 */
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const structures = await structureService.getStructuresByUserId(userId);

    const response: ApiResponse = {
      success: true,
      data: { structures }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération structures:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération des structures'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/structures/:id
 * @desc    Récupérer une structure par ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const structureId = req.params.id;
    const structure = await structureService.getStructureById(structureId);

    if (!structure) {
      const response: ApiResponse = {
        success: false,
        error: 'Structure non trouvée'
      };
      return res.status(404).json(response);
    }

    // Vérifier que la structure appartient à l'utilisateur
    if (structure.userId !== req.user.id) {
      const response: ApiResponse = {
        success: false,
        error: 'Accès non autorisé'
      };
      return res.status(403).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { structure }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération structure:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération de la structure'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/structures/:id
 * @desc    Mettre à jour une structure
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const structureId = req.params.id;
    const userId = req.user.id;
    const data = req.body;

    const structure = await structureService.updateStructure(structureId, userId, data);

    const response: ApiResponse = {
      success: true,
      data: { structure },
      message: 'Structure mise à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour structure:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour de la structure'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/structures/:id
 * @desc    Supprimer une structure
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const structureId = req.params.id;
    const userId = req.user.id;

    await structureService.deleteStructure(structureId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Structure supprimée avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression structure:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression de la structure'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/structures/:id/detenteurs
 * @desc    Ajouter un détenteur à une structure
 * @access  Private
 */
router.post('/:id/detenteurs', authenticateToken, async (req: any, res: any) => {
  try {
    const structureId = req.params.id;
    const { porteurId, pourcentage } = req.body;

    if (!porteurId || pourcentage === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'porteurId et pourcentage sont requis'
      };
      return res.status(400).json(response);
    }

    const detenteur = await structureService.addDetenteur(structureId, porteurId, pourcentage);

    const response: ApiResponse = {
      success: true,
      data: { detenteur },
      message: 'Détenteur ajouté avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur ajout détenteur:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de l\'ajout du détenteur'
    };
    res.status(500).json(response);
  }
});

export default router;
