import { Pool, PoolClient } from 'pg';
import logger from '@/utils/logger';

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  max: 20, // Nombre maximum de connexions
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 2000, // Timeout de connexion de 2s
});

// Événements de la pool
pool.on('connect', (client: PoolClient) => {
  logger.info('Nouvelle connexion à la base de données établie');
});

pool.on('error', (err: Error, client: PoolClient) => {
  logger.error('Erreur inattendue de la base de données', { error: err.message });
});

pool.on('remove', (client: PoolClient) => {
  logger.info('Connexion à la base de données fermée');
});

// Test de connexion
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Connexion à la base de données réussie');
    return true;
  } catch (error) {
    logger.error('Erreur de connexion à la base de données', { error });
    return false;
  }
};

// Fonction utilitaire pour exécuter des requêtes
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Requête exécutée', { 
      text, 
      duration, 
      rows: res.rowCount 
    });
    return res;
  } catch (error) {
    logger.error('Erreur lors de l\'exécution de la requête', { 
      text, 
      params, 
      error 
    });
    throw error;
  }
};

// Fonction pour les transactions
export const transaction = async (callback: (client: PoolClient) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Fermeture propre de la pool
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Pool de connexions fermée');
};

export default pool; 