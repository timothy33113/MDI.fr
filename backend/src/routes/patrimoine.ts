/**
 * Routes pour le système de gestion patrimoniale
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import patrimoineService from '../services/patrimoineService';
import logger from '../utils/logger';
import { ApiResponse } from '../types/api';

const router = express.Router();

// ============================================================================
// DÉTENTIONS DE STRUCTURES
// ============================================================================

/**
 * @route   POST /api/structures/:id/detentions
 * @desc    Ajouter une détention de structure
 * @access  Private
 */
router.post('/structures/:id/detentions', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const structureId = req.params.id;

    const detention = await patrimoineService.createDetentionStructure(userId, {
      ...req.body,
      structureDetentriceId: structureId
    });

    const response: ApiResponse = {
      success: true,
      data: { detention },
      message: 'Détention créée avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur création détention:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la création de la détention'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/structures/:id/detentions
 * @desc    Liste des détentions d'une structure
 * @access  Private
 */
router.get('/structures/:id/detentions', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const structureId = req.params.id;

    const detentions = await patrimoineService.getDetentionsStructure(structureId, userId);

    const response: ApiResponse = {
      success: true,
      data: { detentions }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération détentions:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération des détentions'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/structures/:id/detentions/:detentionId
 * @desc    Modifier une détention
 * @access  Private
 */
router.put('/structures/:id/detentions/:detentionId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const detentionId = req.params.detentionId;

    const detention = await patrimoineService.updateDetentionStructure(detentionId, userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { detention },
      message: 'Détention modifiée avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur modification détention:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la modification de la détention'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/structures/:id/detentions/:detentionId
 * @desc    Supprimer une détention
 * @access  Private
 */
router.delete('/structures/:id/detentions/:detentionId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const detentionId = req.params.detentionId;

    await patrimoineService.deleteDetentionStructure(detentionId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Détention supprimée avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression détention:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression de la détention'
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// BIENS PATRIMONIAUX
// ============================================================================

/**
 * @route   POST /api/biens
 * @desc    Créer un bien patrimonial
 * @access  Private
 */
router.post('/biens', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const bien = await patrimoineService.createBienPatrimonial(userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { bien },
      message: 'Bien créé avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur création bien:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la création du bien'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/biens
 * @desc    Liste des biens patrimoniaux
 * @access  Private
 */
router.get('/biens', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const typePatrimoine = req.query.typePatrimoine as 'Personnel' | 'Professionnel' | undefined;

    const biens = await patrimoineService.getBiensPatrimoniaux(userId, typePatrimoine);

    const response: ApiResponse = {
      success: true,
      data: { biens }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération biens:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération des biens'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/biens/:id
 * @desc    Détails d'un bien patrimonial
 * @access  Private
 */
router.get('/biens/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const bienId = req.params.id;

    const bien = await patrimoineService.getBienPatrimonialById(bienId, userId);

    if (!bien) {
      const response: ApiResponse = {
        success: false,
        error: 'Bien non trouvé'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { bien }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération bien:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération du bien'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/biens/:id
 * @desc    Modifier un bien patrimonial
 * @access  Private
 */
router.put('/biens/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const bienId = req.params.id;

    const bien = await patrimoineService.updateBienPatrimonial(bienId, userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { bien },
      message: 'Bien modifié avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur modification bien:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la modification du bien'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/biens/:id
 * @desc    Supprimer un bien patrimonial
 * @access  Private
 */
router.delete('/biens/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const bienId = req.params.id;

    await patrimoineService.deleteBienPatrimonial(bienId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Bien supprimé avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression bien:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression du bien'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/biens/:id/proprietaires
 * @desc    Ajouter un propriétaire à un bien
 * @access  Private
 */
router.post('/biens/:id/proprietaires', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const bienId = req.params.id;

    const proprietaire = await patrimoineService.addProprietaireBien(userId, {
      ...req.body,
      bienId
    });

    const response: ApiResponse = {
      success: true,
      data: { proprietaire },
      message: 'Propriétaire ajouté avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur ajout propriétaire:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de l\'ajout du propriétaire'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/biens/:id/proprietaires/:proprietaireId
 * @desc    Retirer un propriétaire d'un bien
 * @access  Private
 */
router.delete('/biens/:id/proprietaires/:proprietaireId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const proprietaireId = req.params.proprietaireId;

    await patrimoineService.removeProprietaireBien(proprietaireId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Propriétaire retiré avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression propriétaire:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression du propriétaire'
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// CRÉDITS PATRIMONIAUX
// ============================================================================

/**
 * @route   POST /api/credits
 * @desc    Créer un crédit patrimonial
 * @access  Private
 */
router.post('/credits', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const credit = await patrimoineService.createCreditPatrimonial(userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { credit },
      message: 'Crédit créé avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur création crédit:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la création du crédit'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/credits
 * @desc    Liste des crédits patrimoniaux
 * @access  Private
 */
router.get('/credits', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const typePatrimoine = req.query.typePatrimoine as 'Personnel' | 'Professionnel' | undefined;

    const credits = await patrimoineService.getCreditsPatrimoniaux(userId, typePatrimoine);

    const response: ApiResponse = {
      success: true,
      data: { credits }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération crédits:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération des crédits'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/credits/:id
 * @desc    Détails d'un crédit patrimonial
 * @access  Private
 */
router.get('/credits/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const creditId = req.params.id;

    const credit = await patrimoineService.getCreditPatrimonialById(creditId, userId);

    if (!credit) {
      const response: ApiResponse = {
        success: false,
        error: 'Crédit non trouvé'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: { credit }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération crédit:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération du crédit'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/credits/:id
 * @desc    Modifier un crédit patrimonial
 * @access  Private
 */
router.put('/credits/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const creditId = req.params.id;

    const credit = await patrimoineService.updateCreditPatrimonial(creditId, userId, req.body);

    const response: ApiResponse = {
      success: true,
      data: { credit },
      message: 'Crédit modifié avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur modification crédit:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la modification du crédit'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/credits/:id
 * @desc    Supprimer un crédit patrimonial
 * @access  Private
 */
router.delete('/credits/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const creditId = req.params.id;

    await patrimoineService.deleteCreditPatrimonial(creditId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Crédit supprimé avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression crédit:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression du crédit'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/credits/:id/coemprunteurs
 * @desc    Ajouter un co-emprunteur
 * @access  Private
 */
router.post('/credits/:id/coemprunteurs', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const creditId = req.params.id;

    const coemprunteur = await patrimoineService.addCoemprunteur(userId, {
      ...req.body,
      creditId
    });

    const response: ApiResponse = {
      success: true,
      data: { coemprunteur },
      message: 'Co-emprunteur ajouté avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur ajout co-emprunteur:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de l\'ajout du co-emprunteur'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/credits/:id/coemprunteurs/:coemprunteurId
 * @desc    Retirer un co-emprunteur
 * @access  Private
 */
router.delete('/credits/:id/coemprunteurs/:coemprunteurId', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const coemprunteurId = req.params.coemprunteurId;

    await patrimoineService.removeCoemprunteur(coemprunteurId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Co-emprunteur retiré avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression co-emprunteur:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression du co-emprunteur'
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// VUES ET RAPPORTS
// ============================================================================

/**
 * @route   GET /api/structures/:id/patrimoine
 * @desc    Vue complète du patrimoine d'une structure
 * @access  Private
 */
router.get('/structures/:id/patrimoine', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const structureId = req.params.id;

    const vuePatrimoniale = await patrimoineService.getVuePatrimoniale(structureId, userId);

    const response: ApiResponse = {
      success: true,
      data: { patrimoine: vuePatrimoniale }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération vue patrimoniale:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération de la vue patrimoniale'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/patrimoine/synthese
 * @desc    Synthèse globale du patrimoine (personnel vs professionnel)
 * @access  Private
 */
router.get('/patrimoine/synthese', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const synthese = await patrimoineService.getSynthesePatrimoniale(userId);

    const response: ApiResponse = {
      success: true,
      data: { synthese }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération synthèse patrimoniale:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la récupération de la synthèse patrimoniale'
    };
    res.status(500).json(response);
  }
});

export default router;
