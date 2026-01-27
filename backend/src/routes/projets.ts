import { Router } from 'express';
import { authenticateToken } from '@/middleware/auth';
import projetService from '@/services/projetService';
import calculsService from '@/services/calculsService';
import checklistService from '@/services/checklistService';
import { ApiResponse, CreateProjetRequest, StatusProjet } from '@/types';
import logger from '@/utils/logger';

const router = Router();

/**
 * @route   POST /api/projets
 * @desc    Créer un nouveau projet
 * @access  Private
 */
router.post('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const data: CreateProjetRequest = req.body;

    // Validation basique
    if (!data.nom) {
      const response: ApiResponse = {
        success: false,
        error: 'Le nom du projet est requis'
      };
      return res.status(400).json(response);
    }

    const projet = await projetService.createProjet(userId, data);

    const response: ApiResponse = {
      success: true,
      data: { projet },
      message: 'Projet créé avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur création projet:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la création du projet'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/projets
 * @desc    Récupérer tous les projets de l'utilisateur
 * @access  Private
 */
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const allProjets = await projetService.getProjetsByUserId(userId);

    // Filtrer les projets vides (sans porteurs, sans biens, et sans financement)
    const projets = allProjets.filter(projet => {
      const hasPorteurs = projet.porteurs && projet.porteurs.length > 0;
      const hasBiens = projet.bienImmobilier || (projet.elementsUnites && projet.elementsUnites.length > 0);
      const hasFinancement = projet.financement;

      // Un projet est valide s'il a AU MOINS un porteur OU un bien OU un financement
      return hasPorteurs || hasBiens || hasFinancement;
    });

    const response: ApiResponse = {
      success: true,
      data: { projets }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération projets:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération des projets'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/projets/:id
 * @desc    Récupérer un projet par ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const projet = await projetService.getProjetById(projetId);

    if (!projet) {
      const response: ApiResponse = {
        success: false,
        error: 'Projet non trouvé'
      };
      return res.status(404).json(response);
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (projet.userId !== req.user.id) {
      const response: ApiResponse = {
        success: false,
        error: 'Accès non autorisé'
      };
      return res.status(403).json(response);
    }

    // Charger aussi les analyses de rentabilité
    const analyses = await calculsService.getRentabiliteByProjetId(projetId);
    if (analyses) {
      projet.analysesRentabilite = analyses;
    }

    // Charger la checklist
    const checklist = await checklistService.getChecklistByProjetId(projetId);
    if (checklist) {
      projet.checklistDocuments = checklist;
    }

    const response: ApiResponse = {
      success: true,
      data: { projet }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération projet:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération du projet'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/projets/:id
 * @desc    Mettre à jour un projet complet
 * @access  Private
 */
router.put('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const userId = req.user.id;
    const data: CreateProjetRequest = req.body;

    // Validation basique
    if (!data.nom) {
      const response: ApiResponse = {
        success: false,
        error: 'Le nom du projet est requis'
      };
      return res.status(400).json(response);
    }

    const projet = await projetService.updateProjet(projetId, userId, data);

    const response: ApiResponse = {
      success: true,
      data: { projet },
      message: 'Projet mis à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour projet:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du projet'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PATCH /api/projets/:id/status
 * @desc    Mettre à jour le statut d'un projet
 * @access  Private
 */
router.patch('/:id/status', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;

    if (!status) {
      const response: ApiResponse = {
        success: false,
        error: 'Le statut est requis'
      };
      return res.status(400).json(response);
    }

    const projet = await projetService.updateProjetStatus(projetId, userId, status as StatusProjet);

    const response: ApiResponse = {
      success: true,
      data: { projet },
      message: 'Statut du projet mis à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour statut projet:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du statut'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   DELETE /api/projets/:id
 * @desc    Supprimer un projet
 * @access  Private
 */
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const userId = req.user.id;

    await projetService.deleteProjet(projetId, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Projet supprimé avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur suppression projet:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la suppression du projet'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/projets/:id/duplicate
 * @desc    Dupliquer un projet
 * @access  Private
 */
router.post('/:id/duplicate', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const userId = req.user.id;

    const nouveauProjet = await projetService.duplicateProjet(projetId, userId);

    const response: ApiResponse = {
      success: true,
      data: { projet: nouveauProjet },
      message: 'Projet dupliqué avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur duplication projet:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la duplication du projet'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/projets/:id/porteurs
 * @desc    Ajouter un porteur à un projet
 * @access  Private
 */
router.post('/:id/porteurs', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const { structureId, pourcentageProjet } = req.body;

    if (!structureId || pourcentageProjet === undefined) {
      const response: ApiResponse = {
        success: false,
        error: 'structureId et pourcentageProjet sont requis'
      };
      return res.status(400).json(response);
    }

    const porteur = await projetService.addPorteurToProjet(projetId, structureId, pourcentageProjet);

    const response: ApiResponse = {
      success: true,
      data: { porteur },
      message: 'Porteur ajouté avec succès'
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Erreur ajout porteur:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de l\'ajout du porteur'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/projets/:id/bien
 * @desc    Créer ou mettre à jour le bien immobilier
 * @access  Private
 */
router.put('/:id/bien', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const data = req.body;

    const bien = await projetService.upsertBienImmobilier(projetId, data);

    // Recalculer la rentabilité après modification du bien
    await calculsService.calculateAndSaveRentabilite(projetId);

    const response: ApiResponse = {
      success: true,
      data: { bien },
      message: 'Bien immobilier mis à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour bien:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du bien immobilier'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PUT /api/projets/:id/financement
 * @desc    Créer ou mettre à jour le plan de financement
 * @access  Private
 */
router.put('/:id/financement', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;
    const data = req.body;

    const financement = await projetService.upsertPlanFinancement(projetId, data);

    // Recalculer la rentabilité après modification du financement
    await calculsService.calculateAndSaveRentabilite(projetId);

    const response: ApiResponse = {
      success: true,
      data: { financement },
      message: 'Plan de financement mis à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour financement:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du financement'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/projets/:id/analyser
 * @desc    Calculer les analyses de rentabilité
 * @access  Private
 */
router.post('/:id/analyser', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;

    const analyses = await calculsService.calculateAndSaveRentabilite(projetId);

    const response: ApiResponse = {
      success: true,
      data: { analyses },
      message: 'Analyses de rentabilité calculées avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur calcul rentabilité:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors du calcul de la rentabilité'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   POST /api/projets/:id/checklist
 * @desc    Générer la checklist de documents
 * @access  Private
 */
router.post('/:id/checklist', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;

    const checklist = await checklistService.generateChecklistForProjet(projetId);

    const response: ApiResponse = {
      success: true,
      data: { checklist },
      message: 'Checklist générée avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur génération checklist:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la génération de la checklist'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/projets/:id/checklist
 * @desc    Récupérer la checklist de documents
 * @access  Private
 */
router.get('/:id/checklist', authenticateToken, async (req: any, res: any) => {
  try {
    const projetId = req.params.id;

    const checklist = await checklistService.getChecklistByProjetId(projetId);

    const response: ApiResponse = {
      success: true,
      data: { checklist }
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur récupération checklist:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Erreur lors de la récupération de la checklist'
    };
    res.status(500).json(response);
  }
});

/**
 * @route   PATCH /api/projets/:id/checklist/:documentId
 * @desc    Mettre à jour le statut d'un document
 * @access  Private
 */
router.patch('/:id/checklist/:documentId', authenticateToken, async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { statut } = req.body;

    if (!statut) {
      const response: ApiResponse = {
        success: false,
        error: 'Le statut est requis'
      };
      return res.status(400).json(response);
    }

    await checklistService.updateDocumentStatus(documentId, statut);

    const response: ApiResponse = {
      success: true,
      message: 'Statut du document mis à jour avec succès'
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Erreur mise à jour statut document:', error);
    const response: ApiResponse = {
      success: false,
      error: error.message || 'Erreur lors de la mise à jour du statut'
    };
    res.status(500).json(response);
  }
});

export default router;
