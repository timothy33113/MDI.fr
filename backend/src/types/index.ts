// ==========================================
// TYPES BACKEND - MDI.fr v2.0
// Types partagés avec le frontend + types spécifiques backend
// ==========================================

// ==========================================
// TYPES PARTAGÉS AVEC FRONTEND
// ==========================================

export interface User {
  id: string;
  email: string;
  hasPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TypeStructure =
  | 'PERSONNE_PHYSIQUE'
  | 'SCI'
  | 'SARL'
  | 'SASU'
  | 'EURL'
  | 'SAS'
  | 'SA'
  | 'HOLDING'
  | 'AUTRE';

export interface Structure {
  id: string;
  userId: string;
  type: TypeStructure;
  nom: string;
  adresse: string;
  telephone?: string;
  email?: string;
  detenteurs?: Detenteur[];
  personnePhysique?: PersonnePhysique;
  personneMorale?: PersonneMorale;
  createdAt: Date;
  updatedAt: Date;
}

export interface Detenteur {
  id: string;
  structureId: string;
  porteurId: string;
  pourcentage: number;
  createdAt: Date;
}

export interface PersonnePhysique {
  id: string;
  structureId: string;
  prenom: string;
  dateNaissance?: Date;
  lieuNaissance?: string;
  nationalite?: string;
  situationFamiliale?: 'Celibataire' | 'Marie' | 'Pacse' | 'Divorce' | 'Veuf';
  statutProfessionnel?: 'Salarie' | 'Independant' | 'Dirigeant' | 'Retraite' | 'Sans_activite';
  emploi?: string;
  employeur?: string;
  typeContrat?: 'CDI' | 'CDD' | 'Interim' | 'Freelance' | 'Fonctionnaire';
  anciennete?: string;
  revenus?: RevenusPersonnePhysique;
  charges?: ChargesPersonnePhysique;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenusPersonnePhysique {
  id: string;
  personnePhysiqueId: string;
  salaireMensuelNet: number;
  primesAnnuelles: number;
  revenusLocatifs: number;
  autresRevenus: number;
  totalMensuel: number;
  totalAnnuel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChargesPersonnePhysique {
  id: string;
  personnePhysiqueId: string;
  loyerMensuel: number;
  mensualitesCredits: number;
  pensionAlimentaire: number;
  autresCharges: number;
  totalMensuel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonneMorale {
  id: string;
  structureId: string;
  denominationSociale: string;
  siret: string;
  siren: string;
  formeJuridique: 'SCI' | 'SARL' | 'SASU' | 'EURL' | 'SAS' | 'SA' | 'Holding' | 'Autre';
  dateCreation?: Date;
  capitalSocial: number;
  chiffreAffairesAnnuel?: number;
  resultatNet?: number;
  banquePrincipale?: string;
  representantLegal?: RepresentantLegal;
  bilanComptable?: BilanComptable;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepresentantLegal {
  id: string;
  personneMoraleId: string;
  nom: string;
  prenom: string;
  fonction: 'Gerant' | 'President' | 'Directeur_General' | 'Autre';
  dateNaissance?: Date;
  createdAt: Date;
}

export interface BilanComptable {
  id: string;
  personneMoraleId: string;
  exercice: string;
  totalActif: number;
  totalPassif: number;
  capitauxPropres: number;
  dettesFinancieres: number;
  tresorerie: number;
  createdAt: Date;
  updatedAt: Date;
}

export type StatusProjet = 'Analyse' | 'En_Cours' | 'Dossier_Complet' | 'PDF_Genere' | 'Archive';

export interface Projet {
  id: string;
  userId: string;
  nom: string;
  description?: string;
  status: StatusProjet;
  porteurs?: PorteurProjet[];
  bienImmobilier?: BienImmobilier;
  financement?: PlanFinancement;
  analysesRentabilite?: AnalysesRentabilite;
  checklistDocuments?: ChecklistDocument[];
  dateCreation: Date;
  dateModification: Date;
}

export interface PorteurProjet {
  id: string;
  projetId: string;
  structureId: string;
  pourcentageProjet: number;
  proprieteEffective?: number;
  createdAt: Date;
}

export interface BienImmobilier {
  id: string;
  projetId: string;
  adresse: string;
  codePostal: string;
  ville: string;
  type: 'Appartement' | 'Maison' | 'Immeuble' | 'Local_Commercial' | 'Terrain' | 'Autre';
  superficie: number;
  nombrePieces?: number;
  nombreChambres?: number;
  nombreSDB?: number;
  anneeConstruction?: number;
  etatActuel: 'Neuf' | 'Bon' | 'A_Renover' | 'A_Renover_Entierement';
  dpe?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  ges?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  destinationBien: 'Location' | 'Residence_Principale' | 'Revente' | 'Autre';
  loyerMensuelEstime?: number;
  chargesMensuelles?: number;
  taxeFonciere?: number;
  elements?: ElementBien[]; // Unités individuelles (appartements, parkings, etc.)
  travauxPrevus?: TravauxDetail[];
  photos?: Photo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ElementBien {
  id: string;
  projetId: string;
  type: 'Appartement' | 'Studio' | 'Maison' | 'Parking' | 'Cave' | 'Local_Commercial' | 'Garage' | 'Autre';
  superficie: number;
  nombrePieces?: number;
  etage?: number;
  etat: 'Neuf' | 'Bon' | 'A_Renover' | 'A_Renover_Entierement';
  enLocation: boolean;
  loyerMensuel: number;
  chargesMensuelles: number;
  equipements?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TravauxDetail {
  id: string;
  bienImmobilierId: string;
  categorie: 'Gros_Oeuvre' | 'Second_Oeuvre' | 'Finitions' | 'Equipements' | 'Exterieur' | 'Autre';
  description: string;
  montant: number;
  priorite: 'Haute' | 'Moyenne' | 'Basse';
  dureeEstimee: number;
  artisan?: string;
  devisObtenu: boolean;
  dateDebutPrevue?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Photo {
  id: string;
  bienImmobilierId: string;
  url: string;
  filename: string;
  description?: string;
  type: 'Facade' | 'Interieur' | 'Avant_Travaux' | 'Apres_Travaux' | 'Plan' | 'Autre';
  size: number;
  mimeType: string;
  createdAt: Date;
}

export interface PlanFinancement {
  id: string;
  projetId: string;
  prixAchat: number;
  fraisNotaire: number;
  fraisAgence: number;
  montantTravaux: number;
  fraisDossierBancaire: number;
  fraisGarantie: number;
  autresFrais: number;
  coutTotalProjet: number;
  apportPersonnel: number;
  montantEmprunt: number;
  dureeCredit: number;
  tauxInteretEstime: number;
  tauxAssuranceEstime: number;
  mensualiteCapitalInterets: number;
  mensualiteAssurance: number;
  mensualiteTotale: number;
  typePret: 'Amortissable' | 'In_Fine' | 'Palier' | 'Autre';
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysesRentabilite {
  id: string;
  projetId: string;
  rentabiliteBrute: number;
  chargesAnnuelles: number;
  rentabiliteNette: number;
  cashFlowMensuel: number;
  cashFlowAnnuel: number;
  roi: number;
  revenusPorteurs: number;
  tauxEndettementProjet: number;
  anneesRecuperationApport: number;
  dateCalcul: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CategorieDocument =
  | 'Identite'
  | 'Revenus'
  | 'Patrimoine'
  | 'Fiscalite'
  | 'Societe'
  | 'Bien_Immobilier'
  | 'Travaux'
  | 'Autre';

export interface ChecklistDocument {
  id: string;
  projetId: string;
  categorie: CategorieDocument;
  nomDocument: string;
  description: string;
  concerneStructureId?: string;
  obligatoire: boolean;
  quantiteRequise?: string;
  validiteJours?: number;
  statut: 'Non_Fourni' | 'En_Attente' | 'Fourni' | 'Valide';
  documentUrl?: string;
  dateFourniture?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// TYPES SPÉCIFIQUES BACKEND
// ==========================================

export interface DossierSCI {
  id: string;
  userId: string;
  nomSCI: string;
  status: 'Brouillon' | 'Complete' | 'Genere' | 'PDF_Genere';
  localisation: string;
  prixAcquisition: number;
  montantTravaux: number;
  associes: Associe[];
  totalParts: number;
  financement: PlanFinancement;
  bienImmobilier: BienImmobilier;
  dateCreation: Date;
  dateModification: Date;
}

export interface Associe {
  id: string;
  dossierId: string;
  type: 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE';
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  pourcentageParts: number;
  personnePhysique?: PersonnePhysique;
  personneMorale?: PersonneMorale;
}

// Types pour les middlewares Express
export interface AuthRequest extends Request {
  user?: User;
  params: any;
  query: any;
  body: any;
  headers: any;
  ip?: string;
  get(name: string): string | undefined;
}

export type ExpressHandler = (req: any, res: any, next: any) => void | Promise<void>;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Types pour les validations
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface CreateDossierRequest {
  nomSCI: string;
  localisation: string;
  prixAcquisition: number;
  montantTravaux: number;
}

export interface UpdateDossierRequest {
  nomSCI?: string;
  localisation?: string;
  prixAcquisition?: number;
  montantTravaux?: number;
  status?: DossierSCI['status'];
}

export interface CreateStructureRequest {
  type: TypeStructure;
  nom: string;
  adresse: string;
  telephone?: string;
  email?: string;
  personnePhysique?: Partial<PersonnePhysique>;
  personneMorale?: Partial<PersonneMorale>;
}

export interface CreateProjetRequest {
  nom: string;
  description?: string;
  porteurs?: {
    structureId: string;
    pourcentageProjet: number;
  }[];
  bien?: Partial<BienImmobilier>;
  elementsBien?: Array<Omit<ElementBien, 'id' | 'projetId' | 'createdAt' | 'updatedAt'>>;
  travaux?: Array<Omit<TravauxDetail, 'id' | 'bienImmobilierId' | 'createdAt' | 'updatedAt'>>;
  financement?: Partial<PlanFinancement>;
  photos?: string[]; // Base64 encoded images
}

// Types pour les erreurs
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}
