import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './connection';
import logger from '@/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runMigration = async (filename: string): Promise<void> => {
  try {
    const filePath = join(__dirname, 'migrations', filename);
    const sql = readFileSync(filePath, 'utf8');
    
    logger.info(`Exécution de la migration: ${filename}`);
    await query(sql);
    logger.info(`Migration ${filename} exécutée avec succès`);
  } catch (error) {
    logger.error(`Erreur lors de l'exécution de la migration ${filename}:`, error);
    throw error;
  }
};

const main = async (): Promise<void> => {
  try {
    logger.info('Début des migrations...');
    
    // Test de connexion
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }
    
    // Exécution des migrations dans l'ordre
    await runMigration('001_initial_schema.sql');
    await runMigration('002_refactor_multi_structures.sql');

    logger.info('Toutes les migrations ont été exécutées avec succès !');
  } catch (error) {
    logger.error('Erreur lors des migrations:', error);
    process.exit(1);
  }
};

// Exécution si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main; 