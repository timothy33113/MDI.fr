import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/database/connection';
import { User, LoginRequest, RegisterRequest } from '@/types';
import { AuthenticationError, ConflictError } from '@/utils/errors';
import logger from '@/utils/logger';

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret';
  private static readonly JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';

  /**
   * Hash un mot de passe
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare un mot de passe avec son hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Génère un token JWT
   */
  static generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      hasPaid: user.hasPaid
    };

    return (jwt as any).sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });
  }

  /**
   * Vérifie et décode un token JWT
   */
  static verifyToken(token: string): any {
    try {
      return (jwt as any).verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError('Token invalide');
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(data: RegisterRequest): Promise<{ user: User; token: string }> {
    try {
      // Vérifier si l'email existe déjà
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        throw new ConflictError('Un utilisateur avec cet email existe déjà');
      }

      // Hasher le mot de passe
      const passwordHash = await this.hashPassword(data.password);

      // Créer l'utilisateur
      const result = await query(
        `INSERT INTO users (email, password_hash, has_paid)
         VALUES ($1, $2, $3)
         RETURNING id, email, has_paid, created_at, updated_at`,
        [data.email, passwordHash, false]
      );

      const user: User = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        hasPaid: result.rows[0].has_paid,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at
      };

      // Générer le token
      const token = this.generateToken(user);

      logger.info('Nouvel utilisateur inscrit', { email: user.email });

      return { user, token };
    } catch (error) {
      logger.error('Erreur lors de l\'inscription', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  static async login(data: LoginRequest): Promise<{ user: User; token: string }> {
    try {
      // Récupérer l'utilisateur
      const result = await query(
        'SELECT id, email, password_hash, has_paid, created_at, updated_at FROM users WHERE email = $1',
        [data.email]
      );

      if (result.rows.length === 0) {
        throw new AuthenticationError('Email ou mot de passe incorrect');
      }

      const userData = result.rows[0];

      // Vérifier le mot de passe
      const isValidPassword = await this.comparePassword(data.password, userData.password_hash);
      if (!isValidPassword) {
        throw new AuthenticationError('Email ou mot de passe incorrect');
      }

      const user: User = {
        id: userData.id,
        email: userData.email,
        hasPaid: userData.has_paid,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };

      // Générer le token
      const token = this.generateToken(user);

      logger.info('Utilisateur connecté', { email: user.email });

      return { user, token };
    } catch (error) {
      logger.error('Erreur lors de la connexion', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Récupérer un utilisateur par son ID
   */
  static async getUserById(id: string): Promise<User | null> {
    try {
      const result = await query(
        'SELECT id, email, has_paid, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];
      return {
        id: userData.id,
        email: userData.email,
        hasPaid: userData.has_paid,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'utilisateur', { id, error });
      throw error;
    }
  }

  /**
   * Mettre à jour le statut de paiement d'un utilisateur
   */
  static async updatePaymentStatus(userId: string, hasPaid: boolean): Promise<User> {
    try {
      const result = await query(
        `UPDATE users 
         SET has_paid = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, email, has_paid, created_at, updated_at`,
        [hasPaid, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const userData = result.rows[0];
      const user: User = {
        id: userData.id,
        email: userData.email,
        hasPaid: userData.has_paid,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at
      };

      logger.info('Statut de paiement mis à jour', { userId, hasPaid });

      return user;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut de paiement', { userId, hasPaid, error });
      throw error;
    }
  }

  /**
   * Changer le mot de passe d'un utilisateur
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Récupérer le hash actuel
      const result = await query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const currentHash = result.rows[0].password_hash;

      // Vérifier l'ancien mot de passe
      const isValidPassword = await this.comparePassword(currentPassword, currentHash);
      if (!isValidPassword) {
        throw new AuthenticationError('Mot de passe actuel incorrect');
      }

      // Hasher le nouveau mot de passe
      const newHash = await this.hashPassword(newPassword);

      // Mettre à jour le mot de passe
      await query(
        `UPDATE users 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newHash, userId]
      );

      logger.info('Mot de passe changé avec succès', { userId });
    } catch (error) {
      logger.error('Erreur lors du changement de mot de passe', { userId, error });
      throw error;
    }
  }
} 