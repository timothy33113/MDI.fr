import { ApiError } from '@/types';

// Classe d'erreur personnalisée
export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Erreurs spécifiques
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Ressource') {
    super(`${resource} non trouvé`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Trop de requêtes') {
    super(message, 429);
  }
}

// Gestionnaire d'erreurs global
export const errorHandler = (
  error: Error | AppError,
  req: any,
  res: any,
  next: any
) => {
  let statusCode = 500;
  let message = 'Erreur interne du serveur';

  // Si c'est une erreur personnalisée
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Erreurs de validation
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  }
  // Erreurs JWT
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }
  // Erreurs de base de données
  else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Données invalides';
  }
  else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Données en conflit';
  }
  // Erreurs de fichiers
  else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'Erreur lors du téléchargement du fichier';
  }

  // Log de l'erreur
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Réponse d'erreur
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env['NODE_ENV'] === 'development' && {
      stack: error.stack,
      details: error.message
    })
  });
};

// Gestionnaire pour les routes non trouvées
export const notFoundHandler = (req: any, res: any) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} non trouvée`
  });
};

// Wrapper pour les fonctions async
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 