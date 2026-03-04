// ==========================================
// TYPES PRINCIPAUX - MDI.fr v2.0
// Architecture multi-structures et multi-porteurs
// ==========================================

// ==========================================
// UTILISATEURS ET AUTHENTIFICATION
// ==========================================

export interface User {
  id: string;
  email: string;
  hasPaid: boolean;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// STRUCTURES (Personnes physiques et morales)
// ==========================================

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

/**
 * Structure unifiée pour personnes physiques et morales
 * Peut avoir des détenteurs (hiérarchie de propriété)
 */
export interface Structure {
  id: string;
  userId: string;
  type: TypeStructure;

  // Informations communes
  nom: string; // Nom complet pour PP, dénomination sociale pour PM
  adresse: string;
  telephone?: string;
  email?: string;
  photo?: string; // Photo de profil (base64 ou URL) pour les personnes physiques

  // Relations hiérarchiques
  detenteurs: Detenteur[]; // Qui détient cette structure

  // Données spécifiques selon le type
  personnePhysique?: PersonnePhysique;
  personneMorale?: PersonneMorale;

  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Représente la détention d'une structure par un porteur
 * Permet la hiérarchie: SARL détenue par Jean à 100%, SCI détenue par SARL à 60%
 */
export interface Detenteur {
  id: string;
  structureId: string; // Structure qui EST détenue
  porteurId: string; // ID de la Structure qui DÉTIENT (peut être PP ou PM)
  pourcentage: number; // % de détention (0-100)
  createdAt: Date;
}

// ==========================================
// PERSONNES PHYSIQUES - Détails
// ==========================================

export interface PersonnePhysique {
  id: string;
  structureId: string;

  // Identité
  prenom: string;
  dateNaissance: Date;
  lieuNaissance: string;
  nationalite: string;
  situationFamiliale: 'Celibataire' | 'Marie' | 'Pacse' | 'Divorce' | 'Veuf';

  // Situation professionnelle
  statutProfessionnel: 'Salarie' | 'Independant' | 'Dirigeant' | 'Retraite' | 'Sans_activite';
  emploi?: string;
  employeur?: string;
  typeContrat?: 'CDI' | 'CDD' | 'Interim' | 'Freelance' | 'Fonctionnaire';
  anciennete?: string; // "3 ans", "6 mois", etc.

  // Revenus
  revenus: RevenusPersonnePhysique;

  // Charges
  charges: ChargesPersonnePhysique;

  // Patrimoine existant (Phase 2 - optionnel pour MVP)
  patrimoine?: PatrimoinePersonnePhysique;

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

  // Calculé automatiquement
  totalMensuel: number;
  totalAnnuel: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ChargesPersonnePhysique {
  id: string;
  personnePhysiqueId: string;

  loyerMensuel: number;
  mensualitesCredits: number; // Total mensualités tous crédits
  pensionAlimentaire: number;
  autresCharges: number;

  // Calculé automatiquement
  totalMensuel: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patrimoine existant d'une personne physique
 * Phase 2 - Pas prioritaire pour MVP
 */
export interface PatrimoinePersonnePhysique {
  id: string;
  personnePhysiqueId: string;

  biensImmobiliers: BienExistant[];
  creditsEnCours: CreditExistant[];
  epargneDisponible: number;

  // Calculé automatiquement
  patrimoineNet: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface BienExistant {
  id: string;
  patrimoineId: string;

  type: 'Residence_Principale' | 'Residence_Secondaire' | 'Investissement_Locatif';
  adresse: string;
  valeurEstimee: number;
  creditAssocie?: CreditExistant;

  createdAt: Date;
}

export interface CreditExistant {
  id: string;
  patrimoine_id?: string;
  bien_existant_id?: string;

  type: 'Immobilier' | 'Consommation' | 'Professionnel' | 'Autre';
  organisme: string;
  montantInitial: number;
  capitalRestantDu: number;
  mensualite: number;
  tauxInteret: number;
  dateFinPrevue: Date;

  createdAt: Date;
}

// ==========================================
// PERSONNES MORALES - Détails
// ==========================================

export interface PersonneMorale {
  id: string;
  structureId: string;

  // Identité juridique
  denominationSociale: string;
  siret: string;
  siren: string;
  formeJuridique: 'SCI' | 'SARL' | 'SASU' | 'EURL' | 'SAS' | 'SA' | 'Holding' | 'Autre';
  dateCreation: Date;
  capitalSocial: number;

  // Représentant légal
  representantLegal: RepresentantLegal;

  // Informations financières
  chiffreAffairesAnnuel?: number;
  resultatNet?: number;
  bilanComptable?: BilanComptable;

  // Banque
  banquePrincipale?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface RepresentantLegal {
  id: string;
  personneMoraleId: string;

  nom: string;
  prenom: string;
  fonction: 'Gerant' | 'President' | 'Directeur_General' | 'Autre';
  dateNaissance: Date;

  createdAt: Date;
}

export interface BilanComptable {
  id: string;
  personneMoraleId: string;

  exercice: string; // "2024", "2023", etc.
  totalActif: number;
  totalPassif: number;
  capitauxPropres: number;
  dettesFinancieres: number;
  tresorerie: number;

  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// PROJETS IMMOBILIERS
// ==========================================

export type StatusProjet =
  | 'Analyse'
  | 'En_Cours'
  | 'Dossier_Complet'
  | 'PDF_Genere'
  | 'Archive';

/**
 * Projet immobilier avec multi-porteurs
 * Remplace l'ancien DossierSCI
 */
export interface Projet {
  id: string;
  userId: string;

  // Informations générales
  nom: string; // "Immeuble Lyon 3", "Villa Marseille", etc.
  description?: string;
  status: StatusProjet;

  // Porteurs du projet (structures et/ou personnes physiques)
  porteurs: PorteurProjet[];

  // Bien immobilier
  bienImmobilier: BienImmobilier;

  // Financement
  financement: PlanFinancement;

  // Calculs automatiques
  analysesRentabilite: AnalysesRentabilite;

  // Documents checklist
  checklistDocuments: ChecklistDocument[];

  // Photo de couverture (base64)
  photoCouverture?: string;

  // Comparables de marche
  comparables?: ComparableMarche[];

  // Métadonnées
  dateCreation: Date;
  dateModification: Date;
}

export interface ComparableMarche {
  id: string;
  projetId: string;
  url: string;
  titre: string;
  prix: number;
  surface: number;
  pieces: number;
  loyer?: number;
  ville: string;
  codePostal?: string;
  images: string[];
  createdAt: Date;
}

/**
 * Porteur d'un projet avec % de participation
 * Peut être une personne physique directe ou une structure
 */
export interface PorteurProjet {
  id: string;
  projetId: string;
  structureId: string; // Référence vers une Structure (PP ou PM)

  pourcentageProjet: number; // % de participation directe dans le projet

  // Calculé automatiquement en fonction de la hiérarchie
  proprieteEffective?: number; // % réel après cascade (si détenu via holding, etc.)

  createdAt: Date;
}

// ==========================================
// BIENS IMMOBILIERS
// ==========================================

export interface BienImmobilier {
  id: string;
  projetId: string;

  // Localisation
  adresse: string;
  codePostal: string;
  ville: string;

  // Caractéristiques
  type: 'Appartement' | 'Maison' | 'Immeuble' | 'Local_Commercial' | 'Terrain' | 'Autre';
  superficie: number;
  nombrePieces?: number;
  nombreChambres?: number;
  nombreSDB?: number;
  anneeConstruction?: number;

  // État et diagnostics
  etatActuel: 'Neuf' | 'Bon' | 'A_Renover' | 'A_Renover_Entierement';
  dpe?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  ges?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

  // Travaux
  travauxPrevus: TravauxDetail[];

  // Rentabilité locative (si applicable)
  destinationBien: 'Location' | 'Residence_Principale' | 'Revente' | 'Autre';
  loyerMensuelEstime?: number;
  chargesMensuelles?: number;
  taxeFonciere?: number;

  // Photos et documents
  photos: Photo[];

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
  dureeEstimee: number; // en jours

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

// ==========================================
// FINANCEMENT
// ==========================================

export interface PlanFinancement {
  id: string;
  projetId: string;

  // Coûts d'acquisition
  prixAchat: number;
  fraisNotaire: number; // Calculé auto ou manuel
  fraisAgence: number;

  // Travaux
  montantTravaux: number;

  // Autres frais
  fraisDossierBancaire: number;
  fraisGarantie: number; // Hypothèque, caution, etc.
  autresFrais: number;

  // Total calculé automatiquement
  coutTotalProjet: number;

  // Financement
  apportPersonnel: number;
  montantEmprunt: number; // Calculé auto: coutTotal - apport

  // Conditions de crédit
  dureeCredit: number; // en années
  tauxInteretEstime: number;
  tauxAssuranceEstime: number;

  // Mensualités calculées automatiquement
  mensualiteCapitalInterets: number;
  mensualiteAssurance: number;
  mensualiteTotale: number;

  // Type de prêt
  typePret: 'Amortissable' | 'In_Fine' | 'Palier' | 'Autre';

  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// ANALYSES ET CALCULS AUTOMATIQUES
// ==========================================

/**
 * Calculs de rentabilité automatiques pour un projet
 */
export interface AnalysesRentabilite {
  id: string;
  projetId: string;

  // Rentabilité brute
  rentabiliteBrute: number; // (Loyers annuels / Prix total) × 100

  // Rentabilité nette
  chargesAnnuelles: number;
  rentabiliteNette: number; // ((Loyers - Charges) / Prix total) × 100

  // Cash-flow
  cashFlowMensuel: number; // Loyers - (Mensualité + charges)
  cashFlowAnnuel: number;

  // ROI
  roi: number; // Retour sur investissement par rapport à l'apport

  // Taux d'effort / Endettement
  revenusPorteurs: number; // Revenus totaux de tous les porteurs
  tauxEndettementProjet: number; // Mensualités / Revenus

  // Point mort
  anneesRecuperationApport: number; // Combien d'années pour récupérer l'apport

  // Dernière mise à jour
  dateCalcul: Date;
}

// ==========================================
// DOCUMENTS - CHECKLIST
// ==========================================

export type CategorieDocument =
  | 'Identite'
  | 'Revenus'
  | 'Patrimoine'
  | 'Fiscalite'
  | 'Societe'
  | 'Bien_Immobilier'
  | 'Travaux'
  | 'Autre';

/**
 * Checklist de documents générée automatiquement
 * Basée sur les porteurs et le type de projet
 */
export interface ChecklistDocument {
  id: string;
  projetId: string;

  categorie: CategorieDocument;
  nomDocument: string;
  description: string;

  // Qui doit fournir ce document
  concerneStructureId?: string; // null = concerne le projet global

  // Contraintes
  obligatoire: boolean;
  quantiteRequise?: string; // "3 derniers mois", "Année N-1 et N-2", etc.
  validiteJours?: number; // Combien de jours le doc reste valide (ex: Kbis 90 jours)

  // État
  statut: 'Non_Fourni' | 'En_Attente' | 'Fourni' | 'Valide';

  // Si fourni (Phase 2 - upload réel)
  documentUrl?: string;
  dateFourniture?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// TYPES POUR LES COMPOSANTS UI
// ==========================================

export interface StructureCard {
  id: string;
  type: TypeStructure;
  nom: string;
  nombreProjets: number; // Combien de projets utilisent cette structure
}

export interface TabProps {
  tabs: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// ==========================================
// TYPES POUR LES FORMULAIRES
// ==========================================

export interface CreateStructureForm {
  type: TypeStructure;
  nom: string;
  adresse: string;
  telephone?: string;
  email?: string;

  // Si personne physique
  personnePhysique?: Partial<PersonnePhysique>;

  // Si personne morale
  personneMorale?: Partial<PersonneMorale>;

  // Détenteurs
  detenteurs?: {
    porteurId: string;
    pourcentage: number;
  }[];
}

export interface CreateProjetForm {
  nom: string;
  description?: string;

  // Porteurs
  porteurs: {
    structureId: string;
    pourcentageProjet: number;
  }[];

  // Bien (correspond au backend qui attend 'bien' et non 'bienImmobilier')
  bien?: Partial<BienImmobilier>;

  // Éléments de bien (appartements, parkings, etc.)
  elementsBien?: Array<{
    type: 'Appartement' | 'Local_Commercial' | 'Maison' | 'Studio' | 'Parking' | 'Cave';
    superficie: number;
    nombrePieces?: number;
    etat: 'Bon' | 'Moyen' | 'A_Renover' | 'Neuf';
    enLocation: boolean;
    loyerMensuel?: number;
    chargesMensuelles?: number;
  }>;

  // Travaux
  travaux?: Array<{
    type: string;
    description: string;
    montant: number;
  }>;

  // Photos (base64)
  photos?: string[];

  // Photo de couverture (base64)
  photoCouverture?: string;

  // Comparables de marche
  comparables?: Array<{
    url: string;
    titre?: string;
    prix?: number;
    surface?: number;
    pieces?: number;
    loyer?: number;
    ville?: string;
    codePostal?: string;
    images?: string[];
  }>;

  // Financement
  financement: Partial<PlanFinancement>;
}

// ==========================================
// TYPES LEGACY - Compatibilité avec ancien code
// ==========================================

/**
 * @deprecated Utiliser Projet à la place
 * Interface legacy pour compatibilité avec l'ancien code
 */
export interface DossierSCI {
  id: string;
  userId: string;
  nomSCI: string;
  localisation: string;
  prixAcquisition: number;
  montantTravaux: number;
  status: 'Brouillon' | 'Complete' | 'PDF_Genere' | StatusProjet;
  dateCreation: Date;
  dateModification: Date;
  associes: Associe[];
  totalParts: number;
  financement?: PlanFinancement;
  bienImmobilier?: BienImmobilier;
}

/**
 * @deprecated Utiliser Structure/PorteurProjet à la place
 * Interface legacy pour les associés
 */
export interface Associe {
  id: string;
  type: 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE';
  pourcentageParts: number;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  personnePhysique?: AssociePersonnePhysique;
  personneMorale?: AssociePersonneMorale;
}

export interface AssociePersonnePhysique {
  prenom: string;
  dateNaissance: Date;
  lieuNaissance: string;
  situationFamiliale: 'Celibataire' | 'Marie' | 'Pacse' | 'Divorce' | 'Veuf';
  nationalite: string;
  emploi: string;
  employeur: string;
  salaire: number;
  anciennete: string;
  typeContrat: 'CDI' | 'CDD' | 'Freelance' | 'Fonctionnaire' | 'Interim';
  revenus: {
    salaire: number;
    totalRevenus: number;
  };
  charges: {
    totalCharges: number;
  };
  epargne: number;
  creditsEnCours: any[];
  biensImmobiliers: any[];
}

export interface AssociePersonneMorale {
  denominationSociale: string;
  siret: string;
  siren: string;
  formeJuridique: 'SARL' | 'SAS' | 'SA' | 'EURL' | 'SASU' | 'SCI' | 'Autre';
  dateCreation: Date;
  capitalSocial: number;
  representantLegal: {
    nom: string;
    prenom: string;
    fonction: 'Gerant' | 'President' | 'Directeur_General' | 'Autre';
    dateNaissance: Date;
  };
  chiffreAffaires: number;
  resultatNet: number;
  bilanComptable: {
    totalActif: number;
    totalPassif: number;
    capitauxPropres: number;
    dettesFinancieres: number;
    tresorerie: number;
    exercice: string;
  };
  actionnariat: any[];
  banquePrincipale: string;
}

// Extension de ProjectCard pour compatibilité avec useProject hook
export interface ProjectCard {
  id: string;
  nom: string;
  adresse: string;
  prix: number;
  photo?: string;
  status: 'Brouillon' | 'Complete' | 'PDF_Genere' | StatusProjet;
  nombrePorteurs?: number;
  nombreAssocies?: number; // Legacy field
  rentabiliteBrute?: number;
  cashFlowMensuel?: number;
}
