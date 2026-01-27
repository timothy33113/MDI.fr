// Configuration des variables d'environnement EN PREMIER
import dotenv from 'dotenv';
dotenv.config();

import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import des utilitaires
import logger from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/utils/errors';
import { testConnection } from '@/database/connection';

// Import des routes
import authRoutes from '@/routes/auth';
import dossiersRoutes from '@/routes/dossiers';
import structuresRoutes from '@/routes/structures';
import projetsRoutes from '@/routes/projets';
import leboncoinRoutes from '@/routes/leboncoin';
import patrimoineRoutes from '@/routes/patrimoine';

const app = express();
const PORT = process.env['PORT'] || 3001;

// Configuration CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177'
];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env['CORS_ORIGIN'] === origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Configuration du rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'), // 1 minute en développement
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '1000'), // 1000 requêtes par minute en développement
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Désactiver le rate limiting en développement
    return process.env['NODE_ENV'] === 'development';
  }
});

// Middleware de sécurité et de base
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use('/api/', limiter);

// Logging des requêtes
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Middleware de logging personnalisé
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Requête HTTP', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Routes de base
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MDI.fr API - Générateur de dossiers bancaires immobiliers',
    version: '1.0.0',
          environment: process.env['NODE_ENV'] || 'development'
    });
});

// Route de santé
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: process.env['NODE_ENV'] || 'development'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service indisponible'
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/dossiers', dossiersRoutes);
app.use('/api/structures', structuresRoutes);
app.use('/api/projets', projetsRoutes);
app.use('/api/leboncoin', leboncoinRoutes);
app.use('/api', patrimoineRoutes);

// Route pour les fichiers statiques (si nécessaire)
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Gestionnaire pour les routes non trouvées
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Démarrage du serveur
const startServer = async () => {
  try {
    // Test de connexion à la base de données
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Impossible de se connecter à la base de données');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Serveur MDI.fr démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${process.env['NODE_ENV'] || 'development'}`);
      logger.info(`🔗 URL: http://localhost:${PORT}`);
      logger.info(`📈 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt propre du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT reçu, arrêt propre du serveur...');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  logger.error('Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesse rejetée non gérée:', { reason, promise });
  process.exit(1);
});

// Démarrage du serveur
startServer(); 