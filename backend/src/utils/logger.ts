// Temporairement, utilisons console.log au lieu de winston
// import { createLogger, format, transports } from 'winston';

// Mock logger pour le moment
const createLogger = (config: any) => {
  return {
    info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
    error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
    warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
    debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta || ''),
  };
};

const format = {
  combine: (...args: any[]) => ({}),
  timestamp: (config: any) => ({}),
  printf: (fn: any) => fn,
  colorize: () => ({}),
};

const transports = {
  Console: class Console {
    constructor(config: any) {}
  },
  File: class File {
    constructor(config: any) {}
  }
};

const { combine, timestamp, printf, colorize } = format;

// Format personnalisé pour les logs
const logFormat = printf(({ level, message, timestamp, ...metadata }: any) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Configuration du logger
const logger = createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console avec couleurs en développement
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    // Fichier pour les erreurs
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Fichier pour tous les logs
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Ne pas quitter en cas d'erreur
  exitOnError: false
});

// Logger pour les requêtes HTTP
export const requestLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp, level, message, method, url, status, responseTime }: any) => {
      return `${timestamp} [${level}]: ${method} ${url} - ${status} (${responseTime}ms)`;
    })
  ),
  transports: [
    new transports.File({
      filename: 'logs/requests.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

export default logger; 