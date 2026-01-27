/**
 * Types pour le système de gestion patrimoniale interconnecté
 */

import { Structure } from './structure';

// ============================================================================
// ENUMS ET TYPES DE BASE
// ============================================================================

/**
 * Type de patrimoine
 */
export type TypePatrimoine = 'Personnel' | 'Professionnel';

/**
 * Type de détention de bien
 */
export type TypeDetention = 'Pleine_Propriete' | 'Nue_Propriete' | 'Usufruit' | 'Indivision';

/**
 * Type de taux de crédit
 */
export type TypeTaux = 'Fixe' | 'Variable' | 'Modulable';

/**
 * Type d'amortissement de crédit
 */
export type TypeAmortissement = 'Constant' | 'In_Fine' | 'Progressif';

/**
 * Type d'engagement pour co-emprunteur
 */
export type TypeEngagement = 'Solidaire' | 'Conjoint' | 'Caution';

// ============================================================================
// DÉTENTIONS DE STRUCTURES
// ============================================================================

/**
 * Relation de détention entre structures (actionnariat, parts sociales)
 */
export interface DetentionStructure {
  id: string;
  structureDetentriceId: string;
  structureDetenueId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations populées
  structureDetentrice?: Structure;
  structureDetenue?: Structure;
}

/**
 * DTO pour créer une détention de structure
 */
export interface CreateDetentionStructureDto {
  structureDetentriceId: string;
  structureDetenueId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
}

/**
 * DTO pour mettre à jour une détention de structure
 */
export interface UpdateDetentionStructureDto {
  pourcentageDetention?: number;
  dateDebut?: Date;
  dateFin?: Date;
}

// ============================================================================
// BIENS PATRIMONIAUX
// ============================================================================

/**
 * Bien patrimonial (immobilier personnel ou professionnel)
 */
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

  // Valeurs financières
  valeurAcquisition?: number;
  dateAcquisition?: Date;
  valeurActuelle?: number;
  dateEvaluation?: Date;

  // Revenus locatifs
  loue: boolean;
  loyerMensuel?: number;
  chargesMensuelles?: number;

  // Fiscalité
  taxeFonciere?: number;
  regimeFiscal?: string;

  // Métadonnées
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations populées
  proprietaires?: ProprietaireBien[];
  credits?: CreditPatrimonial[];
}

/**
 * DTO pour créer un bien patrimonial
 */
export interface CreateBienPatrimonialDto {
  nom: string;
  typeBien: string;
  typePatrimoine: TypePatrimoine;
  adresse: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  superficie?: number;
  nombrePieces?: number;
  nombreChambres?: number;
  anneeConstruction?: number;
  etat?: string;
  valeurAcquisition?: number;
  dateAcquisition?: Date;
  valeurActuelle?: number;
  dateEvaluation?: Date;
  loue?: boolean;
  loyerMensuel?: number;
  chargesMensuelles?: number;
  taxeFonciere?: number;
  regimeFiscal?: string;
  metadata?: Record<string, any>;
}

/**
 * DTO pour mettre à jour un bien patrimonial
 */
export interface UpdateBienPatrimonialDto {
  nom?: string;
  typeBien?: string;
  typePatrimoine?: TypePatrimoine;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  superficie?: number;
  nombrePieces?: number;
  nombreChambres?: number;
  anneeConstruction?: number;
  etat?: string;
  valeurAcquisition?: number;
  dateAcquisition?: Date;
  valeurActuelle?: number;
  dateEvaluation?: Date;
  loue?: boolean;
  loyerMensuel?: number;
  chargesMensuelles?: number;
  taxeFonciere?: number;
  regimeFiscal?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// PROPRIÉTAIRES DE BIENS
// ============================================================================

/**
 * Lien de propriété entre un bien et une structure
 */
export interface ProprietaireBien {
  id: string;
  bienId: string;
  structureId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
  typeDetention?: TypeDetention;
  createdAt: Date;

  // Relations populées
  structure?: Structure;
  bien?: BienPatrimonial;
}

/**
 * DTO pour créer un propriétaire de bien
 */
export interface CreateProprietaireBienDto {
  bienId: string;
  structureId: string;
  pourcentageDetention: number;
  dateDebut?: Date;
  dateFin?: Date;
  typeDetention?: TypeDetention;
}

/**
 * DTO pour mettre à jour un propriétaire de bien
 */
export interface UpdateProprietaireBienDto {
  pourcentageDetention?: number;
  dateDebut?: Date;
  dateFin?: Date;
  typeDetention?: TypeDetention;
}

// ============================================================================
// CRÉDITS PATRIMONIAUX
// ============================================================================

/**
 * Crédit ou emprunt (personnel ou professionnel)
 */
export interface CreditPatrimonial {
  id: string;
  userId: string;
  structureEmprunteurId?: string;
  bienFinanceId?: string;

  nom: string;
  typeCredit: string;
  typePatrimoine: TypePatrimoine;

  // Organisme prêteur
  banque?: string;
  numeroPret?: string;

  // Montants
  montantInitial: number;
  montantRestantDu: number;

  // Conditions
  tauxInteret: number;
  tauxAssurance?: number;
  dureeMois: number;
  mensualite: number;

  // Dates
  dateDebut: Date;
  dateFinPrevue: Date;
  dateFinReelle?: Date;

  // Garanties et conditions
  garanties?: string;
  typeTaux?: TypeTaux;
  typeAmortissement?: TypeAmortissement;

  // Métadonnées
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations populées
  structureEmprunteur?: Structure;
  bienFinance?: BienPatrimonial;
  coemprunteurs?: CoemprunteurCredit[];
}

/**
 * DTO pour créer un crédit patrimonial
 */
export interface CreateCreditPatrimonialDto {
  structureEmprunteurId?: string;
  bienFinanceId?: string;
  nom: string;
  typeCredit: string;
  typePatrimoine: TypePatrimoine;
  banque?: string;
  numeroPret?: string;
  montantInitial: number;
  montantRestantDu: number;
  tauxInteret: number;
  tauxAssurance?: number;
  dureeMois: number;
  mensualite: number;
  dateDebut: Date;
  dateFinPrevue: Date;
  dateFinReelle?: Date;
  garanties?: string;
  typeTaux?: TypeTaux;
  typeAmortissement?: TypeAmortissement;
  metadata?: Record<string, any>;
}

/**
 * DTO pour mettre à jour un crédit patrimonial
 */
export interface UpdateCreditPatrimonialDto {
  structureEmprunteurId?: string;
  bienFinanceId?: string;
  nom?: string;
  typeCredit?: string;
  typePatrimoine?: TypePatrimoine;
  banque?: string;
  numeroPret?: string;
  montantInitial?: number;
  montantRestantDu?: number;
  tauxInteret?: number;
  tauxAssurance?: number;
  dureeMois?: number;
  mensualite?: number;
  dateDebut?: Date;
  dateFinPrevue?: Date;
  dateFinReelle?: Date;
  garanties?: string;
  typeTaux?: TypeTaux;
  typeAmortissement?: TypeAmortissement;
  metadata?: Record<string, any>;
}

// ============================================================================
// CO-EMPRUNTEURS
// ============================================================================

/**
 * Co-emprunteur ou caution sur un crédit
 */
export interface CoemprunteurCredit {
  id: string;
  creditId: string;
  structureId: string;
  pourcentageEngagement: number;
  typeEngagement?: TypeEngagement;
  createdAt: Date;

  // Relations populées
  structure?: Structure;
  credit?: CreditPatrimonial;
}

/**
 * DTO pour créer un co-emprunteur
 */
export interface CreateCoemprunteurCreditDto {
  creditId: string;
  structureId: string;
  pourcentageEngagement: number;
  typeEngagement?: TypeEngagement;
}

/**
 * DTO pour mettre à jour un co-emprunteur
 */
export interface UpdateCoemprunteurCreditDto {
  pourcentageEngagement?: number;
  typeEngagement?: TypeEngagement;
}

// ============================================================================
// VUES ET RAPPORTS
// ============================================================================

/**
 * Vue d'ensemble du patrimoine d'une structure
 */
export interface VuePatrimoniale {
  structure: Structure;

  // Ce que la structure détient
  societes: Array<{
    societe: Structure;
    pourcentageDetention: number;
    dateDebut?: Date;
    dateFin?: Date;
  }>;

  biens: Array<{
    bien: BienPatrimonial;
    pourcentageDetention: number;
    typeDetention?: TypeDetention;
    dateDebut?: Date;
    dateFin?: Date;
  }>;

  comptes: CompteBancaire[];

  credits: Array<{
    credit: CreditPatrimonial;
    pourcentageEngagement: number;
    typeEngagement?: TypeEngagement;
  }>;

  // Qui détient cette structure (si société)
  detenuePar: Array<{
    detenteur: Structure;
    pourcentageDetention: number;
    dateDebut?: Date;
    dateFin?: Date;
  }>;

  // Totaux calculés
  totalActifsPersonnels: number;
  totalActifsProfessionnels: number;
  totalPassifsPersonnels: number;
  totalPassifsProfessionnels: number;
  patrimoineNetPersonnel: number;
  patrimoineNetProfessionnel: number;
}

/**
 * Synthèse patrimoniale globale
 */
export interface SynthesePatrimoniale {
  // Totaux personnels
  actifsPersonnels: {
    biens: number;
    valeurBiens: number;
    biensLoues: number;
    revenusMensuels: number;
  };

  passifsPersonnels: {
    credits: number;
    montantRestantDu: number;
    mensualitesTotales: number;
  };

  // Totaux professionnels
  actifsProfessionnels: {
    biens: number;
    valeurBiens: number;
    biensLoues: number;
    revenusMensuels: number;
    societes: number;
  };

  passifsProfessionnels: {
    credits: number;
    montantRestantDu: number;
    mensualitesTotales: number;
  };

  // Patrimoine net
  patrimoineNetPersonnel: number;
  patrimoineNetProfessionnel: number;
  patrimoineNetTotal: number;
}

/**
 * Résultat de la fonction calcul_patrimoine_net_structure
 */
export interface PatrimoineNetStructure {
  actifsPersonnels: number;
  actifsProfessionnels: number;
  passifsPersonnels: number;
  passifsProfessionnels: number;
  netPersonnel: number;
  netProfessionnel: number;
}

// ============================================================================
// COMPTES BANCAIRES (ÉCONOMIES)
// ============================================================================

/**
 * Compte bancaire (économies personnelles ou professionnelles)
 */
export interface CompteBancaire {
  id: string;
  userId: string;
  structureId?: string;

  nom: string;
  typeCompte: string;
  typePatrimoine: TypePatrimoine;

  // Organisme bancaire
  banque?: string;
  numeroCompte?: string;

  // Montants
  solde: number;
  dateSolde?: Date;

  // Rendement
  tauxInteret?: number;

  // Restrictions
  bloque: boolean;
  dateBlocage?: Date;
  dateDeblocage?: Date;

  // Notes
  notes?: string;

  // Métadonnées
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations populées
  structure?: any;
}

/**
 * DTO pour créer un compte bancaire
 */
export interface CreateCompteBancaireDto {
  structureId?: string;
  nom: string;
  typeCompte: string;
  typePatrimoine: TypePatrimoine;
  banque?: string;
  numeroCompte?: string;
  solde?: number;
  dateSolde?: Date;
  tauxInteret?: number;
  bloque?: boolean;
  dateBlocage?: Date;
  dateDeblocage?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * DTO pour mettre à jour un compte bancaire
 */
export interface UpdateCompteBancaireDto {
  structureId?: string;
  nom?: string;
  typeCompte?: string;
  typePatrimoine?: TypePatrimoine;
  banque?: string;
  numeroCompte?: string;
  solde?: number;
  dateSolde?: Date;
  tauxInteret?: number;
  bloque?: boolean;
  dateBlocage?: Date;
  dateDeblocage?: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Historique de solde
 */
export interface HistoriqueSolde {
  id: string;
  compteId: string;
  solde: number;
  dateSolde: Date;
  notes?: string;
  createdAt: Date;
}

/**
 * DTO pour ajouter un historique de solde
 */
export interface CreateHistoriqueSoldeDto {
  compteId: string;
  solde: number;
  dateSolde: Date;
  notes?: string;
}

/**
 * Résultat du calcul des économies d'une structure
 */
export interface TotalEconomiesStructure {
  totalPersonnel: number;
  totalProfessionnel: number;
  totalGeneral: number;
}

/**
 * Résultat du calcul des économies d'un utilisateur
 */
export interface TotalEconomiesUser {
  totalPersonnel: number;
  totalProfessionnel: number;
  totalGeneral: number;
  nbComptes: number;
}
