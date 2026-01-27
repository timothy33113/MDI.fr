# Backend API - MDI.fr

Backend Node.js/Express avec TypeScript pour l'application MDI.fr - Générateur de dossiers bancaires immobiliers.

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification JWT** complète (inscription, connexion, profil)
- **Base de données PostgreSQL** avec schéma complet
- **Sécurité** (helmet, CORS, rate limiting, validation)
- **Logging** structuré avec Winston
- **Gestion d'erreurs** centralisée
- **API REST** avec TypeScript strict

### 🔄 En développement
- **Gestion des dossiers SCI** (CRUD complet)
- **Upload de fichiers** vers AWS S3
- **Gestion des associés** et personnes physiques/morales
- **Calculs financiers** automatiques
- **Génération PDF** côté serveur

## 🛠️ Technologies

- **Node.js** 18+
- **Express.js** - Framework web
- **TypeScript** - Typage statique
- **PostgreSQL** - Base de données
- **JWT** - Authentification
- **bcryptjs** - Hashage des mots de passe
- **Winston** - Logging
- **Helmet** - Sécurité
- **CORS** - Cross-origin requests
- **Rate Limiting** - Protection contre les abus

## 📋 Prérequis

- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

## 🔧 Installation

1. **Cloner le projet**
```bash
cd backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp env.example .env
```

4. **Configurer les variables d'environnement**
```env
# Configuration du serveur
NODE_ENV=development
PORT=3001

# Base de données PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/mdi_db

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# AWS S3 Configuration (optionnel pour le moment)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=eu-west-3
AWS_S3_BUCKET=mdi-files

# Configuration CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

5. **Créer la base de données PostgreSQL**
```sql
CREATE DATABASE mdi_db;
```

6. **Exécuter les migrations**
```bash
npm run migrate
```

## 🚀 Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm run build
npm start
```

## 📊 Structure du projet

```
backend/
├── src/
│   ├── controllers/     # Contrôleurs API
│   ├── database/        # Connexion DB et migrations
│   ├── middleware/      # Middleware Express
│   ├── routes/          # Routes API
│   ├── services/        # Logique métier
│   ├── types/           # Types TypeScript
│   ├── utils/           # Utilitaires
│   └── index.ts         # Point d'entrée
├── logs/                # Fichiers de logs
├── uploads/             # Fichiers uploadés
└── package.json
```

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/profile` - Profil utilisateur
- `PUT /api/auth/change-password` - Changer mot de passe
- `PUT /api/auth/payment-status` - Mettre à jour statut paiement

### Santé
- `GET /health` - Health check
- `GET /` - Informations API

## 🗄️ Base de données

### Tables principales
- `users` - Utilisateurs
- `dossiers_sci` - Dossiers SCI
- `associes` - Associés
- `personnes_physiques` - Personnes physiques
- `personnes_morales` - Personnes morales
- `plans_financement` - Plans de financement
- `biens_immobiliers` - Biens immobiliers
- `travaux_details` - Travaux prévus
- `photos` - Photos des biens

### Migration
```bash
# Exécuter les migrations
npm run migrate

# Réinitialiser la base (dangereux en production)
npm run migrate:reset
```

## 🔒 Sécurité

### Middleware de sécurité
- **Helmet** - Headers de sécurité
- **CORS** - Cross-origin requests
- **Rate Limiting** - Protection contre les abus
- **Validation** - Validation des données
- **JWT** - Authentification sécurisée

### Bonnes pratiques
- Mots de passe hashés avec bcrypt
- Tokens JWT avec expiration
- Validation stricte des données
- Logging des actions sensibles
- Gestion d'erreurs centralisée

## 📝 Logging

### Configuration
- **Console** - Développement
- **Fichiers** - Production
- **Niveaux** - error, warn, info, debug

### Fichiers de logs
- `logs/error.log` - Erreurs uniquement
- `logs/combined.log` - Tous les logs
- `logs/requests.log` - Requêtes HTTP

## 🧪 Tests

### Exécuter les tests
```bash
npm test
```

### Couverture de code
```bash
npm run test:coverage
```

## 📦 Scripts disponibles

```bash
# Développement
npm run dev          # Démarrage avec nodemon
npm run build        # Compilation TypeScript
npm start           # Démarrage production

# Base de données
npm run migrate     # Exécuter les migrations
npm run seed        # Données de test

# Tests
npm test           # Tests unitaires
npm run test:watch # Tests en mode watch

# Linting
npm run lint       # Vérification ESLint
npm run lint:fix   # Correction automatique
```

## 🔧 Configuration

### Variables d'environnement
- `NODE_ENV` - Environnement (development/production)
- `PORT` - Port du serveur
- `DATABASE_URL` - URL de connexion PostgreSQL
- `JWT_SECRET` - Clé secrète JWT
- `CORS_ORIGIN` - Origine autorisée pour CORS

### Base de données
- **Host**: localhost
- **Port**: 5432
- **Database**: mdi_db
- **User**: postgres (ou configuré)

## 🚀 Déploiement

### Préparation
1. Build de l'application
2. Configuration des variables d'environnement
3. Migration de la base de données
4. Configuration du reverse proxy (nginx)

### Variables de production
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/mdi_db
JWT_SECRET=very-secure-secret-key
CORS_ORIGIN=https://mdi.fr
```

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Métriques
- Temps de réponse
- Taux d'erreur
- Utilisation mémoire
- Connexions base de données

## 🔄 Développement

### Ajouter une nouvelle route
1. Créer le contrôleur dans `src/controllers/`
2. Créer le service dans `src/services/`
3. Ajouter la route dans `src/routes/`
4. Importer dans `src/index.ts`

### Ajouter une nouvelle table
1. Créer la migration SQL
2. Ajouter les types TypeScript
3. Créer le service correspondant
4. Ajouter les routes CRUD

## 🐛 Dépannage

### Erreurs courantes
- **Connexion DB** - Vérifier DATABASE_URL
- **CORS** - Vérifier CORS_ORIGIN
- **JWT** - Vérifier JWT_SECRET
- **Port** - Vérifier que le port est libre

### Logs
```bash
# Voir les logs en temps réel
tail -f logs/combined.log

# Voir les erreurs
tail -f logs/error.log
```

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**MDI.fr Backend** - API sécurisée et performante pour la gestion de dossiers bancaires immobiliers ! 🏠✨ 