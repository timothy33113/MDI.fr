import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/authService';
import { AuthRequest, ExpressHandler } from '@/types';
import { AuthenticationError } from '@/utils/errors';
import logger from '@/utils/logger';

/**
 * Middleware pour vérifier l'authentification JWT
 */
export const authenticateToken: ExpressHandler = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Token d\'authentification manquant');
    }

    // Vérifier le token
    const decoded = AuthService.verifyToken(token);
    
    // Récupérer l'utilisateur depuis la base de données
    const user = await AuthService.getUserById(decoded.id);
    if (!user) {
      throw new AuthenticationError('Utilisateur non trouvé');
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    logger.error('Erreur d\'authentification', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Token invalide'
      });
    }
  }
};

/**
 * Middleware optionnel pour vérifier l'authentification
 * Ne bloque pas si l'utilisateur n'est pas connecté
 */
export const optionalAuth: ExpressHandler = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = AuthService.verifyToken(token);
      const user = await AuthService.getUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignorer les erreurs d'authentification pour ce middleware optionnel
    logger.debug('Authentification optionnelle échouée', { error });
  }
  
  next();
};

/**
 * Middleware pour vérifier que l'utilisateur a payé
 */
export const requirePayment: ExpressHandler = (
  req: any,
  res: any,
  next: any
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentification requise'
    });
    return;
  }

  if (!req.user.hasPaid) {
    res.status(403).json({
      success: false,
      error: 'Paiement requis pour accéder à cette fonctionnalité'
    });
    return;
  }

  next();
};

/**
 * Middleware pour vérifier les permissions sur un dossier
 */
export const checkDossierOwnership: ExpressHandler = async (
  req: any,
  res: any,
  next: any
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentification requise'
      });
      return;
    }

    const dossierId = req.params.id || req.params.dossierId;
    if (!dossierId) {
      res.status(400).json({
        success: false,
        error: 'ID du dossier manquant'
      });
      return;
    }

    // Vérifier que l'utilisateur est propriétaire du dossier
    const { query } = await import('@/database/connection');
    const result = await query(
      'SELECT id FROM dossiers_sci WHERE id = $1 AND user_id = $2',
      [dossierId, req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(403).json({
        success: false,
        error: 'Accès non autorisé à ce dossier'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Erreur lors de la vérification des permissions', { error });
    res.status(500).json({
      success: false,
      error: 'Erreur interne du serveur'
    });
  }
}; 