# API Documentation - MDI.fr

Documentation complète de l'API REST pour MDI.fr - Générateur de dossiers bancaires immobiliers.

## 🔗 Base URL

- **Développement**: `http://localhost:3001`
- **Production**: `https://api.mdi.fr`

## 🔐 Authentification

L'API utilise l'authentification JWT (JSON Web Token). Incluez le token dans l'en-tête `Authorization` :

```
Authorization: Bearer <your-jwt-token>
```

## 📋 Endpoints

### 🔐 Authentification

#### POST /api/auth/register
Inscription d'un nouvel utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "hasPaid": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  },
  "message": "Inscription réussie"
}
```

#### POST /api/auth/login
Connexion d'un utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "hasPaid": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token"
  },
  "message": "Connexion réussie"
}
```

#### GET /api/auth/profile
Récupérer le profil de l'utilisateur connecté.

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "hasPaid": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PUT /api/auth/change-password
Changer le mot de passe.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### PUT /api/auth/payment-status
Mettre à jour le statut de paiement.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "hasPaid": true
}
```

### 📁 Dossiers SCI

#### POST /api/dossiers
Créer un nouveau dossier SCI.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nomSCI": "SCI Test",
  "localisation": "Paris, France",
  "prixAcquisition": 500000,
  "montantTravaux": 50000
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "dossier": {
      "id": "uuid",
      "userId": "uuid",
      "nomSCI": "SCI Test",
      "status": "Brouillon",
      "localisation": "Paris, France",
      "prixAcquisition": 500000,
      "montantTravaux": 50000,
      "totalParts": 0,
      "dateCreation": "2024-01-01T00:00:00.000Z",
      "dateModification": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Dossier SCI créé avec succès"
}
```

#### GET /api/dossiers
Récupérer tous les dossiers de l'utilisateur.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10, max: 50)
- `sortBy` (string, default: 'date_creation')
- `sortOrder` (string, 'ASC' | 'DESC', default: 'DESC')

**Réponse:**
```json
{
  "success": true,
  "data": {
    "dossiers": [
      {
        "id": "uuid",
        "userId": "uuid",
        "nomSCI": "SCI Test",
        "status": "Brouillon",
        "localisation": "Paris, France",
        "prixAcquisition": 500000,
        "montantTravaux": 50000,
        "totalParts": 0,
        "dateCreation": "2024-01-01T00:00:00.000Z",
        "dateModification": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### GET /api/dossiers/:id
Récupérer un dossier spécifique.

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "dossier": {
      "id": "uuid",
      "userId": "uuid",
      "nomSCI": "SCI Test",
      "status": "Brouillon",
      "localisation": "Paris, France",
      "prixAcquisition": 500000,
      "montantTravaux": 50000,
      "totalParts": 0,
      "associes": [],
      "financement": {
        "id": "uuid",
        "dossierId": "uuid",
        "prixAchat": 500000,
        "fraisNotaire": 0,
        "montantTravaux": 50000,
        "apportPersonnel": 0,
        "montantEmprunt": 0,
        "dureeCredit": 20,
        "tauxEstime": 3.5,
        "mensualiteEstimee": 0,
        "rentabilitePrevisionnelle": 0
      },
      "bienImmobilier": {
        "id": "uuid",
        "dossierId": "uuid",
        "adresse": "Paris, France",
        "superficie": 0,
        "nombrePieces": 0,
        "etatActuel": "",
        "dpe": "",
        "estimationValeur": 500000,
        "travauxPrevus": [],
        "photos": []
      },
      "dateCreation": "2024-01-01T00:00:00.000Z",
      "dateModification": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### PUT /api/dossiers/:id
Mettre à jour un dossier.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "nomSCI": "SCI Test Updated",
  "localisation": "Lyon, France",
  "prixAcquisition": 600000,
  "montantTravaux": 75000,
  "status": "Complete"
}
```

#### DELETE /api/dossiers/:id
Supprimer un dossier.

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "success": true,
  "message": "Dossier supprimé avec succès"
}
```

#### PATCH /api/dossiers/:id/status
Mettre à jour le statut d'un dossier.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "Complete"
}
```

**Statuts possibles:**
- `Brouillon` - Dossier en cours de création
- `Complete` - Dossier complet
- `Genere` - Dossier généré
- `PDF_Genere` - PDF généré

#### POST /api/dossiers/:id/generate-pdf
Générer un PDF pour un dossier.

**Headers:** `Authorization: Bearer <token>`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "dossier": {
      "id": "uuid",
      "status": "PDF_Genere"
    },
    "pdfUrl": "/api/dossiers/uuid/pdf"
  },
  "message": "PDF généré avec succès"
}
```

#### GET /api/dossiers/:id/pdf
Télécharger le PDF d'un dossier.

**Headers:** `Authorization: Bearer <token>`

**Réponse:** Fichier PDF binaire

### 🏥 Santé

#### GET /health
Vérifier l'état de l'API.

**Réponse:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

#### GET /
Informations sur l'API.

**Réponse:**
```json
{
  "success": true,
  "message": "MDI.fr API - Générateur de dossiers bancaires immobiliers",
  "version": "1.0.0",
  "environment": "development"
}
```

## 📊 Codes de statut HTTP

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Non autorisé
- `404` - Ressource non trouvée
- `409` - Conflit
- `429` - Trop de requêtes
- `500` - Erreur interne du serveur
- `501` - Non implémenté

## 🔒 Gestion des erreurs

Toutes les erreurs suivent le même format :

```json
{
  "success": false,
  "error": "Message d'erreur descriptif"
}
```

### Erreurs courantes

#### 400 - Requête invalide
```json
{
  "success": false,
  "error": "Nom de la SCI, localisation et prix d'acquisition sont requis"
}
```

#### 401 - Non authentifié
```json
{
  "success": false,
  "error": "Token d'authentification manquant"
}
```

#### 403 - Non autorisé
```json
{
  "success": false,
  "error": "Accès non autorisé à ce dossier"
}
```

#### 404 - Ressource non trouvée
```json
{
  "success": false,
  "error": "Dossier non trouvé"
}
```

#### 409 - Conflit
```json
{
  "success": false,
  "error": "Un utilisateur avec cet email existe déjà"
}
```

#### 429 - Trop de requêtes
```json
{
  "success": false,
  "error": "Trop de requêtes, veuillez réessayer plus tard"
}
```

## 📝 Validation

### Utilisateurs
- **Email**: Format email valide, unique
- **Mot de passe**: Minimum 8 caractères

### Dossiers SCI
- **nomSCI**: Requis, chaîne non vide
- **localisation**: Requis, chaîne non vide
- **prixAcquisition**: Requis, nombre positif
- **montantTravaux**: Optionnel, nombre positif ou zéro

## 🔄 Pagination

Les endpoints qui retournent des listes supportent la pagination :

**Query Parameters:**
- `page`: Numéro de page (défaut: 1)
- `limit`: Nombre d'éléments par page (défaut: 10, max: 50)
- `sortBy`: Champ de tri (défaut: 'date_creation')
- `sortOrder`: Ordre de tri ('ASC' ou 'DESC', défaut: 'DESC')

**Réponse paginée:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

## 🚀 Exemples d'utilisation

### Créer un compte et un dossier

```bash
# 1. Inscription
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 2. Connexion
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 3. Créer un dossier (utiliser le token de la réponse précédente)
curl -X POST http://localhost:3001/api/dossiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "nomSCI": "SCI Test",
    "localisation": "Paris, France",
    "prixAcquisition": 500000,
    "montantTravaux": 50000
  }'
```

### Récupérer les dossiers avec pagination

```bash
curl -X GET "http://localhost:3001/api/dossiers?page=1&limit=5&sortBy=date_creation&sortOrder=DESC" \
  -H "Authorization: Bearer <token>"
```

## 📚 Documentation Swagger

La documentation interactive est disponible à :
- **Développement**: `http://localhost:3001/api-docs`
- **Production**: `https://api.mdi.fr/api-docs`

## 🔧 Support

Pour toute question ou problème :
- **Email**: support@mdi.fr
- **Documentation**: https://docs.mdi.fr
- **GitHub**: https://github.com/mdi-fr/api

---

**MDI.fr API** - API sécurisée et performante pour la gestion de dossiers bancaires immobiliers ! 🏠✨ 