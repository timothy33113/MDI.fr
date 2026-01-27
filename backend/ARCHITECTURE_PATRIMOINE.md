# Architecture du Système de Gestion Patrimoniale

## Vue d'ensemble

Ce document décrit l'architecture complète du système de gestion patrimoniale interconnecté permettant de gérer :
- Les personnes physiques et morales
- Les biens immobiliers (personnels et professionnels)
- Les crédits et financements
- Les relations de détention et copropriété

## 1. Modèle de Données

### 1.1 Tables Existantes à Étendre

#### `structures` (existante)
```sql
-- Déjà en place avec :
- id (UUID)
- user_id (UUID)
- type (ENUM)
- nom, adresse, telephone, email
- personne_physique (JSONB)
- personne_morale (JSONB)
```

### 1.2 Nouvelles Tables à Créer

#### `detentions_structures` - Relations entre structures
```sql
CREATE TABLE detentions_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_detentrice_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    structure_detenue_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_detention DECIMAL(5,2) NOT NULL CHECK (pourcentage_detention > 0 AND pourcentage_detention <= 100),
    date_debut DATE,
    date_fin DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(structure_detentrice_id, structure_detenue_id)
);

CREATE INDEX idx_detentions_detentrice ON detentions_structures(structure_detentrice_id);
CREATE INDEX idx_detentions_detenue ON detentions_structures(structure_detenue_id);
```

#### `biens_patrimoniaux` - Biens immobiliers personnels/professionnels
```sql
CREATE TABLE biens_patrimoniaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    type_bien VARCHAR(50) NOT NULL, -- Appartement, Maison, Immeuble, Local_Commercial, Terrain, etc.
    type_patrimoine VARCHAR(20) NOT NULL CHECK (type_patrimoine IN ('Personnel', 'Professionnel')),

    -- Localisation
    adresse TEXT NOT NULL,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'France',

    -- Caractéristiques
    superficie DECIMAL(10,2),
    nombre_pieces INTEGER,
    nombre_chambres INTEGER,
    annee_construction INTEGER,
    etat VARCHAR(50),

    -- Valeurs
    valeur_acquisition DECIMAL(12,2),
    date_acquisition DATE,
    valeur_actuelle DECIMAL(12,2),
    date_evaluation DATE,

    -- Revenus (si loué)
    loue BOOLEAN DEFAULT FALSE,
    loyer_mensuel DECIMAL(10,2),
    charges_mensuelles DECIMAL(10,2),

    -- Fiscalité
    taxe_fonciere DECIMAL(10,2),
    regime_fiscal VARCHAR(50),

    metadata JSONB, -- Pour stocker des infos supplémentaires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_biens_user ON biens_patrimoniaux(user_id);
CREATE INDEX idx_biens_type_patrimoine ON biens_patrimoniaux(type_patrimoine);
```

#### `proprietaires_biens` - Détention de biens
```sql
CREATE TABLE proprietaires_biens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bien_id UUID REFERENCES biens_patrimoniaux(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_detention DECIMAL(5,2) NOT NULL CHECK (pourcentage_detention > 0 AND pourcentage_detention <= 100),
    date_debut DATE,
    date_fin DATE,
    type_detention VARCHAR(50), -- Pleine_Propriete, Nue_Propriete, Usufruit, Indivision
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bien_id, structure_id)
);

CREATE INDEX idx_proprietaires_bien ON proprietaires_biens(bien_id);
CREATE INDEX idx_proprietaires_structure ON proprietaires_biens(structure_id);
```

#### `credits_patrimoniaux` - Crédits et financements
```sql
CREATE TABLE credits_patrimoniaux (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    structure_emprunteur_id UUID REFERENCES structures(id) ON DELETE SET NULL,
    bien_finance_id UUID REFERENCES biens_patrimoniaux(id) ON DELETE SET NULL,

    nom VARCHAR(255) NOT NULL,
    type_credit VARCHAR(50) NOT NULL, -- Immobilier, Consommation, Professionnel, etc.
    type_patrimoine VARCHAR(20) NOT NULL CHECK (type_patrimoine IN ('Personnel', 'Professionnel')),

    -- Organisme prêteur
    banque VARCHAR(255),

    -- Montants
    montant_initial DECIMAL(12,2) NOT NULL,
    montant_restant_du DECIMAL(12,2) NOT NULL,

    -- Conditions
    taux_interet DECIMAL(5,4) NOT NULL,
    taux_assurance DECIMAL(5,4),
    duree_mois INTEGER NOT NULL,
    mensualite DECIMAL(10,2) NOT NULL,

    -- Dates
    date_debut DATE NOT NULL,
    date_fin_prevue DATE NOT NULL,

    -- Garanties
    garanties TEXT,

    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credits_user ON credits_patrimoniaux(user_id);
CREATE INDEX idx_credits_structure ON credits_patrimoniaux(structure_emprunteur_id);
CREATE INDEX idx_credits_bien ON credits_patrimoniaux(bien_finance_id);
CREATE INDEX idx_credits_type_patrimoine ON credits_patrimoniaux(type_patrimoine);
```

#### `coemprunteurs_credits` - Co-emprunteurs
```sql
CREATE TABLE coemprunteurs_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_id UUID REFERENCES credits_patrimoniaux(id) ON DELETE CASCADE,
    structure_id UUID REFERENCES structures(id) ON DELETE CASCADE,
    pourcentage_engagement DECIMAL(5,2) NOT NULL CHECK (pourcentage_engagement > 0 AND pourcentage_engagement <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(credit_id, structure_id)
);

CREATE INDEX idx_coemprunteurs_credit ON coemprunteurs_credits(credit_id);
CREATE INDEX idx_coemprunteurs_structure ON coemprunteurs_credits(structure_id);
```

## 2. Types TypeScript

### 2.1 Nouveaux Types

```typescript
// Type de patrimoine
export type TypePatrimoine = 'Personnel' | 'Professionnel';

// Type de détention
export type TypeDetention = 'Pleine_Propriete' | 'Nue_Propriete' | 'Usufruit' | 'Indivision';

// Détention de structure
export interface DetentionStructure {
  id: string;
  structureDetentriceId: string;
  structureDetenueId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
  structureDetentrice?: Structure; // Populated
  structureDetenue?: Structure; // Populated
}

// Bien patrimonial
export interface BienPatrimonial {
  id: string;
  userId: string;
  nom: string;
  typeBien: string;
  typePatrimoine: TypePatrimoine;

  // Localisation
  adresse: string;
  codePostal?: string;
  ville?: string;
  pays?: string;

  // Caractéristiques
  superficie?: number;
  nombrePieces?: number;
  nombreChambres?: number;
  anneeConstruction?: number;
  etat?: string;

  // Valeurs
  valeurAcquisition?: number;
  dateAcquisition?: Date;
  valeurActuelle?: number;
  dateEvaluation?: Date;

  // Revenus
  loue: boolean;
  loyerMensuel?: number;
  chargesMensuelles?: number;

  // Fiscalité
  taxeFonciere?: number;
  regimeFiscal?: string;

  // Relations
  proprietaires?: ProprietaireBien[];
  credits?: CreditPatrimonial[];

  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Propriétaire de bien
export interface ProprietaireBien {
  id: string;
  bienId: string;
  structureId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
  typeDetention?: TypeDetention;
  structure?: Structure; // Populated
  bien?: BienPatrimonial; // Populated
}

// Crédit patrimonial
export interface CreditPatrimonial {
  id: string;
  userId: string;
  structureEmprunteurId?: string;
  bienFinanceId?: string;

  nom: string;
  typeCredit: string;
  typePatrimoine: TypePatrimoine;

  banque?: string;

  montantInitial: number;
  montantRestantDu: number;

  tauxInteret: number;
  tauxAssurance?: number;
  dureeMois: number;
  mensualite: number;

  dateDebut: Date;
  dateFinPrevue: Date;

  garanties?: string;

  // Relations
  structureEmprunteur?: Structure;
  bienFinance?: BienPatrimonial;
  coemprunteurs?: CoemprunteurCredit[];

  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

// Co-emprunteur
export interface CoemprunteurCredit {
  id: string;
  creditId: string;
  structureId: string;
  pourcentageEngagement: number;
  structure?: Structure;
}

// Vue d'ensemble patrimoniale
export interface VuePatrimoniale {
  structure: Structure;

  // Ce que la structure détient
  societes: Array<{
    societe: Structure;
    pourcentageDetention: number;
  }>;

  biens: Array<{
    bien: BienPatrimonial;
    pourcentageDetention: number;
    typeDetention: TypeDetention;
  }>;

  credits: Array<{
    credit: CreditPatrimonial;
    pourcentageEngagement: number;
  }>;

  // Qui détient cette structure (si société)
  detenuepar: Array<{
    detenteur: Structure;
    pourcentageDetention: number;
  }>;

  // Totaux
  totalActifsPersonnels: number;
  totalActifsProfessionnels: number;
  totalPassifsPersonnels: number;
  totalPassifsProfessionnels: number;
  patrimoineNetPersonnel: number;
  patrimoineNetProfessionnel: number;
}
```

## 3. API Endpoints à Créer

### 3.1 Détentions de structures
- `POST /api/structures/:id/detentions` - Ajouter une détention
- `GET /api/structures/:id/detentions` - Liste des détentions
- `PUT /api/structures/:id/detentions/:detentionId` - Modifier
- `DELETE /api/structures/:id/detentions/:detentionId` - Supprimer

### 3.2 Biens patrimoniaux
- `POST /api/biens` - Créer un bien
- `GET /api/biens` - Liste des biens (filtrable par type_patrimoine)
- `GET /api/biens/:id` - Détails d'un bien
- `PUT /api/biens/:id` - Modifier un bien
- `DELETE /api/biens/:id` - Supprimer un bien
- `POST /api/biens/:id/proprietaires` - Ajouter un propriétaire
- `DELETE /api/biens/:id/proprietaires/:proprietaireId` - Retirer un propriétaire

### 3.3 Crédits patrimoniaux
- `POST /api/credits` - Créer un crédit
- `GET /api/credits` - Liste des crédits (filtrable par type_patrimoine)
- `GET /api/credits/:id` - Détails d'un crédit
- `PUT /api/credits/:id` - Modifier un crédit
- `DELETE /api/credits/:id` - Supprimer un crédit
- `POST /api/credits/:id/coemprunteurs` - Ajouter un co-emprunteur
- `DELETE /api/credits/:id/coemprunteurs/:coemprunteurId` - Retirer un co-emprunteur

### 3.4 Vue d'ensemble
- `GET /api/structures/:id/patrimoine` - Vue complète du patrimoine
- `GET /api/patrimoine/synthese` - Synthèse globale (personnel vs professionnel)

## 4. Interface Utilisateur

### 4.1 Page Structure Détaillée
Quand on clique sur un associé ou une société, afficher :
- **En-tête** : Infos principales + type (Personnel/Professionnel)
- **Onglet Sociétés** : Liste des sociétés détenues avec %
- **Onglet Biens** : Liste des biens possédés avec %
- **Onglet Crédits** : Liste des crédits avec montants
- **Onglet Organigramme** : Visualisation graphique des relations

### 4.2 Organigramme Interactif
Utiliser une bibliothèque comme `react-flow` ou `vis-network` pour :
- Nœuds : Personnes physiques, sociétés, biens
- Liens : Détention (avec %), emprunts, copropriété
- Couleurs : Personnel (bleu), Professionnel (vert)
- Filtres : Afficher/masquer certains types de relations

### 4.3 Tableau de Bord Patrimonial
- **Vue Globale** : Patrimoine total personnel vs professionnel
- **Graphiques** : Répartition des actifs, évolution dans le temps
- **Alertes** : Crédits à échéance proche, biens sans détenteur à 100%, etc.

## 5. Implémentation Progressive

### Phase 1 : Base de données et backend
1. Créer les migrations SQL
2. Créer les types TypeScript
3. Créer les services backend
4. Créer les routes API

### Phase 2 : Frontend - Gestion de base
1. Page de détail d'une structure
2. Formulaires pour ajouter biens/crédits/détentions
3. Listes et tableaux

### Phase 3 : Visualisation
1. Organigramme interactif
2. Tableau de bord patrimonial
3. Rapports et exports

### Phase 4 : Fonctionnalités avancées
1. Import/export de données
2. Simulations (acquisition, vente)
3. Optimisation fiscale
4. Historique et versioning

## 6. Règles de Gestion

### 6.1 Validation des pourcentages
- La somme des détentions d'une structure ne peut dépasser 100%
- La somme des propriétaires d'un bien doit être 100%
- La somme des co-emprunteurs d'un crédit doit être 100%

### 6.2 Cohérence des données
- Un bien personnel ne peut appartenir qu'à des personnes physiques
- Un bien professionnel peut appartenir à des sociétés et/ou personnes physiques
- Un crédit professionnel doit être lié à au moins une société

### 6.3 Suppression en cascade
- Supprimer une structure → supprimer toutes ses détentions
- Supprimer un bien → supprimer tous les liens de propriété
- Supprimer un crédit → supprimer tous les co-emprunteurs

## 7. Sécurité

- Toutes les entités doivent appartenir à `user_id`
- Vérification des permissions à chaque opération
- Logs d'audit pour les opérations sensibles
- Validation stricte des montants et pourcentages
