// Configuration globale pour les tests
import dotenv from 'dotenv';

// Charger les variables d'environnement de test
dotenv.config({ path: '.env.test' });

// Configuration globale pour les tests
beforeAll(() => {
  // Configuration avant tous les tests
  console.log('🧪 Configuration des tests...');
});

afterAll(() => {
  // Nettoyage après tous les tests
  console.log('🧹 Nettoyage des tests...');
});

// Configuration pour chaque test
beforeEach(() => {
  // Configuration avant chaque test
});

afterEach(() => {
  // Nettoyage après chaque test
}); 