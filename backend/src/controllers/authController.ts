import { Request, Response } from 'express';
import { AuthService } from '@/services/authService';
import { LoginRequest, RegisterRequest, ApiResponse, ExpressHandler } from '@/types';
import { asyncHandler } from '@/utils/errors';
import logger from '@/utils/logger';

export class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   * POST /api/auth/register
   */
  static register: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const { email, password }: RegisterRequest = req.body;

    // Validation basique
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 8 caractères'
      });
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Format d\'email invalide'
      });
      return;
    }

    try {
      const result = await AuthService.register({ email, password });

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            hasPaid: result.user.hasPaid,
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt
          },
          token: result.token
        },
        message: 'Inscription réussie'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Erreur lors de l\'inscription', { email, error });
      throw error;
    }
  });

  /**
   * Connexion d'un utilisateur
   * POST /api/auth/login
   */
  static login: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const { email, password }: LoginRequest = req.body;

    // Validation basique
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
      return;
    }

    try {
      const result = await AuthService.login({ email, password });

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            hasPaid: result.user.hasPaid,
            createdAt: result.user.createdAt,
            updatedAt: result.user.updatedAt
          },
          token: result.token
        },
        message: 'Connexion réussie'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la connexion', { email, error });
      throw error;
    }
  });

  /**
   * Récupérer le profil de l'utilisateur connecté
   * GET /api/auth/profile
   */
  static getProfile: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    // L'utilisateur est déjà attaché par le middleware d'authentification
    const user = (req as any).user;

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          hasPaid: user.hasPaid,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    };

    res.status(200).json(response);
  });

  /**
   * Changer le mot de passe
   * PUT /api/auth/change-password
   */
  static changePassword: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    const user = (req as any).user;

    // Validation
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Ancien et nouveau mot de passe requis'
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
      return;
    }

    try {
      await AuthService.changePassword(user.id, currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: 'Mot de passe changé avec succès'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors du changement de mot de passe', { userId: user.id, error });
      throw error;
    }
  });

  /**
   * Mettre à jour le statut de paiement
   * PUT /api/auth/payment-status
   */
  static updatePaymentStatus: ExpressHandler = asyncHandler(async (req: any, res: any): Promise<void> => {
    const { hasPaid } = req.body;
    const user = (req as any).user;

    // Validation
    if (typeof hasPaid !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Statut de paiement invalide'
      });
      return;
    }

    try {
      const updatedUser = await AuthService.updatePaymentStatus(user.id, hasPaid);

      const response: ApiResponse = {
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            hasPaid: updatedUser.hasPaid,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt
          }
        },
        message: 'Statut de paiement mis à jour'
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut de paiement', { userId: user.id, error });
      throw error;
    }
  });

  /**
   * Déconnexion (côté client, pas d'action côté serveur)
   * POST /api/auth/logout
   */
  static logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const response: ApiResponse = {
      success: true,
      message: 'Déconnexion réussie'
    };

    res.status(200).json(response);
  });
} 