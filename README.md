# MDI.fr - Generateur de Dossiers Bancaires Immobiliers

Application web professionnelle pour generer des dossiers bancaires complets pour des projets d'investissement immobilier.

## Vue d'ensemble

MDI.fr permet de creer des dossiers bancaires professionnels pour des SCI (Societes Civiles Immobilieres) et autres structures d'investissement immobilier. L'application offre une gestion complete des structures juridiques, des associes, du patrimoine et des projets d'investissement.

## Technologies

| Couche | Technologies |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Base de donnees** | PostgreSQL |
| **Authentification** | JWT |
| **PDF** | jsPDF |
| **Diagrammes** | ReactFlow |

## Installation rapide

```bash
# Frontend
npm install
npm run dev

# Backend (terminal separe)
cd backend
npm install
npm run dev
```

## Structure du projet

```
MDI.fr/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── forms/                # Formulaires
│   │   │   ├── shared/           # Composants partages (types, hooks, tables)
│   │   │   ├── associe/          # Sections AssocieForm
│   │   │   └── *.tsx             # Formulaires principaux
│   │   ├── ui/                   # Composants UI de base
│   │   ├── pdf/                  # Generation PDF
│   │   └── dashboard/            # Composants tableau de bord
│   ├── pages/                    # Pages de l'application
│   ├── hooks/                    # Hooks React personnalises
│   ├── services/                 # Services API
│   ├── contexts/                 # Contextes React
│   └── types/                    # Types TypeScript
├── backend/
│   ├── src/
│   │   ├── routes/               # Routes API
│   │   ├── services/             # Logique metier
│   │   ├── database/             # Connexion et migrations
│   │   └── middleware/           # Middleware Express
│   └── package.json
└── package.json
```

## Fonctionnalites principales

### Gestion des structures
- **Personnes physiques** : associes individuels avec patrimoine complet
- **Personnes morales** : SCI, SARL, SASU, Holdings, etc.
- **Hierarchie de detention** : gestion des pourcentages de parts

### Gestion des projets
- **Creation de projets** d'investissement immobilier
- **Calculs financiers** automatiques (ratios, rentabilite)
- **Plan de financement** detaille
- **Checklist documents** auto-generee

### Patrimoine
- **Biens immobiliers** existants
- **Credits en cours** avec calculs automatiques
- **Comptes bancaires** et economies
- **Revenus et charges** mensuels

### Visualisation
- **Organigramme patrimonial** interactif (ReactFlow)
- **Tableaux de bord** avec metriques
- **Generation PDF** professionnelle

## Scripts disponibles

### Frontend
```bash
npm run dev       # Serveur de developpement (port 5173)
npm run build     # Build de production
npm run preview   # Preview du build
npm run lint      # Verification ESLint
```

### Backend
```bash
npm run dev       # Serveur avec nodemon (port 3001)
npm run build     # Compilation TypeScript
npm start         # Demarrage production
npm run migrate   # Executer les migrations
npm run seed      # Donnees de test
npm test          # Tests unitaires
```

## Configuration

### Variables d'environnement Frontend
```env
VITE_API_URL=http://localhost:3001
```

### Variables d'environnement Backend
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/mdi_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

## API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### Structures
- `GET/POST /api/structures` - Liste/Creation
- `GET/PUT/DELETE /api/structures/:id` - CRUD individuel

### Projets
- `GET/POST /api/projets` - Liste/Creation
- `GET/PUT/DELETE /api/projets/:id` - CRUD individuel

### Patrimoine
- `GET/POST /api/patrimoine` - Gestion du patrimoine

## Architecture des composants de formulaire

Le projet utilise une architecture modulaire pour les formulaires complexes :

```
src/components/forms/
├── shared/                       # Composants et utilitaires partages
│   ├── types.ts                  # Types communs (Revenu, Charge, Credit...)
│   ├── useEditableList.ts        # Hook pour listes editables
│   ├── EditableTable.tsx         # Tableau editable generique
│   ├── FormSection.tsx           # Section de formulaire
│   ├── SectionNavigation.tsx     # Navigation par onglets
│   └── creditCalculations.ts     # Calculs de credits
├── associe/                      # Sous-composants AssocieForm
│   ├── IdentiteSection.tsx       # Section identite
│   ├── RevenusSection.tsx        # Section revenus
│   ├── ChargesSection.tsx        # Section charges
│   ├── ComptesSection.tsx        # Section comptes bancaires
│   ├── BiensCreditsSection.tsx   # Section patrimoine immobilier
│   ├── SituationProfessionnelleSection.tsx
│   └── OrganigrammeSection.tsx   # Visualisation ReactFlow
└── [formulaires principaux]
```

## Deploiement

### Frontend
Recommande : Vercel, Netlify, AWS S3 + CloudFront

### Backend
Recommande : Railway, Heroku, AWS EC2

### Base de donnees
Recommande : PostgreSQL sur Railway ou AWS RDS

## Documentation supplementaire

- `backend/README.md` - Documentation backend detaillee
- `backend/API_DOCUMENTATION.md` - Documentation API complete
- `backend/ARCHITECTURE_PATRIMOINE.md` - Architecture du systeme patrimonial

## Licence

MIT License

---

**MDI.fr** - Simplifiez vos dossiers bancaires immobiliers
