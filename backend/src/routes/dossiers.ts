import { Router } from 'express';
import { DossierController } from '@/controllers/dossierController';
import { authenticateToken, checkDossierOwnership } from '@/middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Routes CRUD de base
router.post('/', DossierController.createDossier);
router.get('/', DossierController.getDossiers);
router.get('/:id', checkDossierOwnership, DossierController.getDossier);
router.put('/:id', checkDossierOwnership, DossierController.updateDossier);
router.delete('/:id', checkDossierOwnership, DossierController.deleteDossier);

// Routes spécialisées
router.patch('/:id/status', checkDossierOwnership, DossierController.updateDossierStatus);
router.post('/:id/generate-pdf', checkDossierOwnership, DossierController.generatePDF);
router.get('/:id/pdf', checkDossierOwnership, DossierController.downloadPDF);

export default router; 