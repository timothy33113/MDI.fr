import { query } from '@/database/connection';
import logger from '@/utils/logger';
import { AnalysesRentabilite, Projet, PlanFinancement, BienImmobilier, PorteurProjet } from '@/types';

/**
 * Service de calculs automatiques de rentabilité
 */
class CalculsService {
  /**
   * Calculer et enregistrer toutes les analyses de rentabilité pour un projet
   */
  async calculateAndSaveRentabilite(projetId: string): Promise<AnalysesRentabilite> {
    try {
      logger.info(`Calcul de la rentabilité pour le projet ${projetId}`);

      // Récupérer les données nécessaires
      const projet = await this.getProjetData(projetId);

      if (!projet.financement || !projet.bienImmobilier) {
        throw new Error('Données de financement ou bien immobilier manquantes');
      }

      const analyses = await this.performCalculations(projet);

      // Enregistrer ou mettre à jour les analyses
      const existingResult = await query(
        'SELECT id FROM analyses_rentabilite WHERE projet_id = $1',
        [projetId]
      );

      if (existingResult.rows.length > 0) {
        // UPDATE
        await query(
          `UPDATE analyses_rentabilite
           SET rentabilite_brute = $1, charges_annuelles = $2, rentabilite_nette = $3,
               cash_flow_mensuel = $4, cash_flow_annuel = $5, roi = $6,
               revenus_porteurs = $7, taux_endettement_projet = $8,
               annees_recuperation_apport = $9, date_calcul = CURRENT_TIMESTAMP
           WHERE projet_id = $10`,
          [
            analyses.rentabiliteBrute,
            analyses.chargesAnnuelles,
            analyses.rentabiliteNette,
            analyses.cashFlowMensuel,
            analyses.cashFlowAnnuel,
            analyses.roi,
            analyses.revenusPorteurs,
            analyses.tauxEndettementProjet,
            analyses.anneesRecuperationApport,
            projetId
          ]
        );
      } else {
        // INSERT
        await query(
          `INSERT INTO analyses_rentabilite
           (projet_id, rentabilite_brute, charges_annuelles, rentabilite_nette,
            cash_flow_mensuel, cash_flow_annuel, roi, revenus_porteurs,
            taux_endettement_projet, annees_recuperation_apport)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            projetId,
            analyses.rentabiliteBrute,
            analyses.chargesAnnuelles,
            analyses.rentabiliteNette,
            analyses.cashFlowMensuel,
            analyses.cashFlowAnnuel,
            analyses.roi,
            analyses.revenusPorteurs,
            analyses.tauxEndettementProjet,
            analyses.anneesRecuperationApport
          ]
        );
      }

      logger.info(`Analyses de rentabilité calculées et enregistrées pour le projet ${projetId}`);
      return analyses;
    } catch (error) {
      logger.error('Erreur lors du calcul de la rentabilité:', error);
      throw error;
    }
  }

  /**
   * Récupérer les analyses de rentabilité d'un projet
   */
  async getRentabiliteByProjetId(projetId: string): Promise<AnalysesRentabilite | null> {
    try {
      const result = await query(
        'SELECT * FROM analyses_rentabilite WHERE projet_id = $1',
        [projetId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToAnalysesRentabilite(result.rows[0]);
    } catch (error) {
      logger.error('Erreur lors de la récupération des analyses:', error);
      throw error;
    }
  }

  /**
   * Effectuer tous les calculs de rentabilité
   */
  private async performCalculations(projet: {
    financement: PlanFinancement;
    bienImmobilier: BienImmobilier;
    porteurs?: PorteurProjet[];
  }): Promise<AnalysesRentabilite> {
    const { financement, bienImmobilier } = projet;

    // 1. Revenus locatifs
    const loyerMensuel = bienImmobilier.loyerMensuelEstime || 0;
    const loyersAnnuels = loyerMensuel * 12;

    // 2. Charges
    const chargesMensuelles = bienImmobilier.chargesMensuelles || 0;
    const taxeFonciere = bienImmobilier.taxeFonciere || 0;
    const chargesAnnuelles = (chargesMensuelles * 12) + taxeFonciere;

    // 3. Rentabilité brute
    const prixTotal = financement.coutTotalProjet;
    const rentabiliteBrute = prixTotal > 0 ? (loyersAnnuels / prixTotal) * 100 : 0;

    // 4. Rentabilité nette
    const revenusNetsAnnuels = loyersAnnuels - chargesAnnuelles;
    const rentabiliteNette = prixTotal > 0 ? (revenusNetsAnnuels / prixTotal) * 100 : 0;

    // 5. Cash-flow
    const mensualiteTotale = financement.mensualiteTotale || 0;
    const cashFlowMensuel = loyerMensuel - mensualiteTotale - chargesMensuelles;
    const cashFlowAnnuel = cashFlowMensuel * 12;

    // 6. ROI (Return on Investment)
    const apport = financement.apportPersonnel || 0;
    const roi = apport > 0 ? (cashFlowAnnuel / apport) * 100 : 0;

    // 7. Revenus des porteurs (somme des revenus de toutes les structures porteuses)
    const revenusPorteurs = await this.calculateRevenusPorteurs(projet.porteurs || []);

    // 8. Taux d'endettement
    const tauxEndettementProjet = revenusPorteurs > 0
      ? (mensualiteTotale / revenusPorteurs) * 100
      : 0;

    // 9. Point mort (années pour récupérer l'apport)
    const anneesRecuperationApport = cashFlowAnnuel > 0
      ? apport / cashFlowAnnuel
      : 0;

    return {
      id: '', // Sera généré par la DB
      projetId: '', // Sera rempli par l'appelant
      rentabiliteBrute: Math.round(rentabiliteBrute * 100) / 100,
      chargesAnnuelles: Math.round(chargesAnnuelles * 100) / 100,
      rentabiliteNette: Math.round(rentabiliteNette * 100) / 100,
      cashFlowMensuel: Math.round(cashFlowMensuel * 100) / 100,
      cashFlowAnnuel: Math.round(cashFlowAnnuel * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      revenusPorteurs: Math.round(revenusPorteurs * 100) / 100,
      tauxEndettementProjet: Math.round(tauxEndettementProjet * 100) / 100,
      anneesRecuperationApport: Math.round(anneesRecuperationApport * 100) / 100,
      dateCalcul: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Calculer les revenus totaux de tous les porteurs du projet
   */
  private async calculateRevenusPorteurs(porteurs: PorteurProjet[]): Promise<number> {
    let revenusTotal = 0;

    for (const porteur of porteurs) {
      // Récupérer la structure
      const structureResult = await query(
        'SELECT type FROM structures WHERE id = $1',
        [porteur.structureId]
      );

      if (structureResult.rows.length === 0) continue;

      const structure = structureResult.rows[0];

      // Si personne physique, récupérer ses revenus
      if (structure.type === 'PERSONNE_PHYSIQUE') {
        const ppResult = await query(
          `SELECT pp.id
           FROM personnes_physiques_v2 pp
           WHERE pp.structure_id = $1`,
          [porteur.structureId]
        );

        if (ppResult.rows.length > 0) {
          const revenusResult = await query(
            `SELECT total_mensuel
             FROM revenus_personnes_physiques_v2
             WHERE personne_physique_id = $1`,
            [ppResult.rows[0].id]
          );

          if (revenusResult.rows.length > 0) {
            const revenusMensuel = parseFloat(revenusResult.rows[0].total_mensuel);
            revenusTotal += revenusMensuel * (porteur.pourcentageProjet / 100);
          }
        }
      }
      // Si personne morale, on pourrait ajouter une logique similaire pour CA/résultat
      // Pour le MVP, on se concentre sur les personnes physiques
    }

    return revenusTotal;
  }

  /**
   * Récupérer les données du projet pour les calculs
   */
  private async getProjetData(projetId: string): Promise<{
    financement?: PlanFinancement;
    bienImmobilier?: BienImmobilier;
    porteurs?: PorteurProjet[];
  }> {
    const result: any = {};

    // Financement
    const financementResult = await query(
      'SELECT * FROM plans_financement_v2 WHERE projet_id = $1',
      [projetId]
    );
    if (financementResult.rows.length > 0) {
      result.financement = this.mapRowToPlanFinancement(financementResult.rows[0]);
    }

    // Bien immobilier
    const bienResult = await query(
      'SELECT * FROM biens_immobiliers_v2 WHERE projet_id = $1',
      [projetId]
    );
    if (bienResult.rows.length > 0) {
      result.bienImmobilier = this.mapRowToBienImmobilier(bienResult.rows[0]);
    }

    // Porteurs
    const porteursResult = await query(
      'SELECT * FROM porteurs_projet WHERE projet_id = $1',
      [projetId]
    );
    result.porteurs = porteursResult.rows.map(this.mapRowToPorteurProjet);

    return result;
  }

  // ==========================================
  // MAPPERS
  // ==========================================

  private mapRowToAnalysesRentabilite(row: any): AnalysesRentabilite {
    return {
      id: row.id,
      projetId: row.projet_id,
      rentabiliteBrute: parseFloat(row.rentabilite_brute),
      chargesAnnuelles: parseFloat(row.charges_annuelles),
      rentabiliteNette: parseFloat(row.rentabilite_nette),
      cashFlowMensuel: parseFloat(row.cash_flow_mensuel),
      cashFlowAnnuel: parseFloat(row.cash_flow_annuel),
      roi: parseFloat(row.roi),
      revenusPorteurs: parseFloat(row.revenus_porteurs),
      tauxEndettementProjet: parseFloat(row.taux_endettement_projet),
      anneesRecuperationApport: parseFloat(row.annees_recuperation_apport),
      dateCalcul: new Date(row.date_calcul),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToPlanFinancement(row: any): PlanFinancement {
    return {
      id: row.id,
      projetId: row.projet_id,
      prixAchat: parseFloat(row.prix_achat),
      fraisNotaire: parseFloat(row.frais_notaire),
      fraisAgence: parseFloat(row.frais_agence),
      montantTravaux: parseFloat(row.montant_travaux),
      fraisDossierBancaire: parseFloat(row.frais_dossier_bancaire),
      fraisGarantie: parseFloat(row.frais_garantie),
      autresFrais: parseFloat(row.autres_frais),
      coutTotalProjet: parseFloat(row.cout_total_projet),
      apportPersonnel: parseFloat(row.apport_personnel),
      montantEmprunt: parseFloat(row.montant_emprunt),
      dureeCredit: row.duree_credit,
      tauxInteretEstime: parseFloat(row.taux_interet_estime),
      tauxAssuranceEstime: parseFloat(row.taux_assurance_estime),
      mensualiteCapitalInterets: parseFloat(row.mensualite_capital_interets),
      mensualiteAssurance: parseFloat(row.mensualite_assurance),
      mensualiteTotale: parseFloat(row.mensualite_totale),
      typePret: row.type_pret,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToBienImmobilier(row: any): BienImmobilier {
    return {
      id: row.id,
      projetId: row.projet_id,
      adresse: row.adresse,
      codePostal: row.code_postal,
      ville: row.ville,
      type: row.type,
      superficie: parseFloat(row.superficie),
      nombrePieces: row.nombre_pieces,
      nombreChambres: row.nombre_chambres,
      nombreSDB: row.nombre_sdb,
      anneeConstruction: row.annee_construction,
      etatActuel: row.etat_actuel,
      dpe: row.dpe,
      ges: row.ges,
      destinationBien: row.destination_bien,
      loyerMensuelEstime: row.loyer_mensuel_estime ? parseFloat(row.loyer_mensuel_estime) : undefined,
      chargesMensuelles: row.charges_mensuelles ? parseFloat(row.charges_mensuelles) : undefined,
      taxeFonciere: row.taxe_fonciere ? parseFloat(row.taxe_fonciere) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToPorteurProjet(row: any): PorteurProjet {
    return {
      id: row.id,
      projetId: row.projet_id,
      structureId: row.structure_id,
      pourcentageProjet: parseFloat(row.pourcentage_projet),
      proprieteEffective: row.propriete_effective ? parseFloat(row.propriete_effective) : undefined,
      createdAt: new Date(row.created_at)
    };
  }
}

export default new CalculsService();
