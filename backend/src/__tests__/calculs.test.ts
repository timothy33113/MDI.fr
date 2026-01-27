/**
 * Tests unitaires pour les calculs financiers
 */

describe('Calculs Financiers', () => {
  describe('calculerMensualite', () => {
    /**
     * Calcule la mensualite d'un credit amortissable
     */
    function calculerMensualite(
      capital: number,
      tauxAnnuel: number,
      nombreMois: number
    ): number {
      if (capital <= 0 || nombreMois <= 0 || tauxAnnuel <= 0) {
        return 0;
      }
      const tauxMensuel = tauxAnnuel / 100 / 12;
      const mensualite = capital * (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMois)) /
                         (Math.pow(1 + tauxMensuel, nombreMois) - 1);
      return Math.round(mensualite * 100) / 100;
    }

    it('should calculate monthly payment for standard loan', () => {
      // Credit de 200 000 EUR a 3.5% sur 20 ans (240 mois)
      const mensualite = calculerMensualite(200000, 3.5, 240);
      expect(mensualite).toBeCloseTo(1160, 0); // ~1160 EUR
    });

    it('should return 0 for zero capital', () => {
      expect(calculerMensualite(0, 3.5, 240)).toBe(0);
    });

    it('should return 0 for zero rate', () => {
      expect(calculerMensualite(200000, 0, 240)).toBe(0);
    });

    it('should return 0 for zero duration', () => {
      expect(calculerMensualite(200000, 3.5, 0)).toBe(0);
    });

    it('should handle small loans correctly', () => {
      // Credit de 10 000 EUR a 5% sur 5 ans (60 mois)
      const mensualite = calculerMensualite(10000, 5, 60);
      expect(mensualite).toBeCloseTo(188.71, 1);
    });

    it('should handle high interest rates', () => {
      // Credit de 100 000 EUR a 10% sur 10 ans (120 mois)
      const mensualite = calculerMensualite(100000, 10, 120);
      expect(mensualite).toBeCloseTo(1321.51, 1);
    });
  });

  describe('calculerCapitalRestantDu', () => {
    /**
     * Calcule le capital restant du a une date donnee
     */
    function calculerCapitalRestantDu(
      capital: number,
      tauxAnnuel: number,
      nombreMois: number,
      moisEcoules: number
    ): number {
      if (capital <= 0 || nombreMois <= 0 || tauxAnnuel <= 0) {
        return capital;
      }

      if (moisEcoules >= nombreMois) {
        return 0;
      }

      const tauxMensuel = tauxAnnuel / 100 / 12;
      const capitalRestant = capital *
        (Math.pow(1 + tauxMensuel, nombreMois) - Math.pow(1 + tauxMensuel, moisEcoules)) /
        (Math.pow(1 + tauxMensuel, nombreMois) - 1);

      return Math.round(capitalRestant * 100) / 100;
    }

    it('should return full capital at month 0', () => {
      const crd = calculerCapitalRestantDu(200000, 3.5, 240, 0);
      expect(crd).toBeCloseTo(200000, 0);
    });

    it('should return 0 when loan is fully paid', () => {
      const crd = calculerCapitalRestantDu(200000, 3.5, 240, 240);
      expect(crd).toBe(0);
    });

    it('should return 0 when past loan duration', () => {
      const crd = calculerCapitalRestantDu(200000, 3.5, 240, 300);
      expect(crd).toBe(0);
    });

    it('should decrease over time', () => {
      const crd12 = calculerCapitalRestantDu(200000, 3.5, 240, 12);
      const crd24 = calculerCapitalRestantDu(200000, 3.5, 240, 24);
      const crd60 = calculerCapitalRestantDu(200000, 3.5, 240, 60);

      expect(crd12).toBeLessThan(200000);
      expect(crd24).toBeLessThan(crd12);
      expect(crd60).toBeLessThan(crd24);
    });

    it('should handle edge case with invalid inputs', () => {
      expect(calculerCapitalRestantDu(0, 3.5, 240, 12)).toBe(0);
      expect(calculerCapitalRestantDu(200000, 0, 240, 12)).toBe(200000);
      expect(calculerCapitalRestantDu(200000, 3.5, 0, 12)).toBe(200000);
    });
  });

  describe('calculerRentabiliteBrute', () => {
    /**
     * Calcule la rentabilite brute
     */
    function calculerRentabiliteBrute(loyerAnnuel: number, prixAchat: number): number {
      if (prixAchat <= 0) return 0;
      return Math.round((loyerAnnuel / prixAchat) * 100 * 100) / 100;
    }

    it('should calculate gross yield correctly', () => {
      // Loyer 800 EUR/mois, Prix 200 000 EUR
      const rentabilite = calculerRentabiliteBrute(800 * 12, 200000);
      expect(rentabilite).toBeCloseTo(4.8, 1);
    });

    it('should return 0 for zero price', () => {
      expect(calculerRentabiliteBrute(9600, 0)).toBe(0);
    });

    it('should handle high yields', () => {
      // Loyer 1200 EUR/mois, Prix 100 000 EUR = 14.4%
      const rentabilite = calculerRentabiliteBrute(1200 * 12, 100000);
      expect(rentabilite).toBeCloseTo(14.4, 1);
    });
  });

  describe('calculerRentabiliteNette', () => {
    /**
     * Calcule la rentabilite nette
     */
    function calculerRentabiliteNette(
      loyerAnnuel: number,
      chargesAnnuelles: number,
      prixAchat: number
    ): number {
      if (prixAchat <= 0) return 0;
      const revenusNets = loyerAnnuel - chargesAnnuelles;
      return Math.round((revenusNets / prixAchat) * 100 * 100) / 100;
    }

    it('should calculate net yield correctly', () => {
      // Loyer 800 EUR/mois, Charges 2400 EUR/an, Prix 200 000 EUR
      const rentabilite = calculerRentabiliteNette(800 * 12, 2400, 200000);
      expect(rentabilite).toBeCloseTo(3.6, 1);
    });

    it('should handle negative yield when charges exceed income', () => {
      const rentabilite = calculerRentabiliteNette(5000, 10000, 200000);
      expect(rentabilite).toBeLessThan(0);
    });
  });

  describe('calculerCashFlow', () => {
    /**
     * Calcule le cash-flow mensuel
     */
    function calculerCashFlowMensuel(
      loyerMensuel: number,
      mensualiteCredit: number,
      chargesMensuelles: number
    ): number {
      return Math.round((loyerMensuel - mensualiteCredit - chargesMensuelles) * 100) / 100;
    }

    it('should calculate positive cash flow', () => {
      // Loyer 1000, Mensualite 700, Charges 100 = +200
      const cf = calculerCashFlowMensuel(1000, 700, 100);
      expect(cf).toBe(200);
    });

    it('should calculate negative cash flow', () => {
      // Loyer 800, Mensualite 900, Charges 100 = -200
      const cf = calculerCashFlowMensuel(800, 900, 100);
      expect(cf).toBe(-200);
    });

    it('should handle zero values', () => {
      expect(calculerCashFlowMensuel(0, 0, 0)).toBe(0);
    });
  });

  describe('calculerTauxEndettement', () => {
    /**
     * Calcule le taux d'endettement
     */
    function calculerTauxEndettement(chargesMensuelles: number, revenusMensuels: number): number {
      if (revenusMensuels <= 0) return 0;
      return Math.round((chargesMensuelles / revenusMensuels) * 100 * 100) / 100;
    }

    it('should calculate debt ratio correctly', () => {
      // Charges 1000 EUR, Revenus 3000 EUR = 33.33%
      const taux = calculerTauxEndettement(1000, 3000);
      expect(taux).toBeCloseTo(33.33, 1);
    });

    it('should return 0 for zero income', () => {
      expect(calculerTauxEndettement(1000, 0)).toBe(0);
    });

    it('should flag over-indebted situation', () => {
      // Charges 2000 EUR, Revenus 3000 EUR = 66.67% (over 35% threshold)
      const taux = calculerTauxEndettement(2000, 3000);
      expect(taux).toBeGreaterThan(35);
    });

    it('should handle acceptable debt ratio', () => {
      // Charges 900 EUR, Revenus 3000 EUR = 30% (under 35% threshold)
      const taux = calculerTauxEndettement(900, 3000);
      expect(taux).toBeLessThan(35);
    });
  });

  describe('calculerROI', () => {
    /**
     * Calcule le retour sur investissement (ROI)
     */
    function calculerROI(cashFlowAnnuel: number, apport: number): number {
      if (apport <= 0) return 0;
      return Math.round((cashFlowAnnuel / apport) * 100 * 100) / 100;
    }

    it('should calculate positive ROI', () => {
      // Cash-flow annuel 3600 EUR, Apport 50 000 EUR = 7.2%
      const roi = calculerROI(3600, 50000);
      expect(roi).toBeCloseTo(7.2, 1);
    });

    it('should calculate negative ROI', () => {
      // Cash-flow annuel -1200 EUR, Apport 50 000 EUR = -2.4%
      const roi = calculerROI(-1200, 50000);
      expect(roi).toBeLessThan(0);
    });

    it('should return 0 for zero apport', () => {
      expect(calculerROI(3600, 0)).toBe(0);
    });
  });

  describe('calculerAnneesRecuperation', () => {
    /**
     * Calcule le nombre d'annees pour recuperer l'apport
     */
    function calculerAnneesRecuperation(apport: number, cashFlowAnnuel: number): number {
      if (cashFlowAnnuel <= 0) return Infinity;
      return Math.round((apport / cashFlowAnnuel) * 100) / 100;
    }

    it('should calculate recovery time correctly', () => {
      // Apport 50 000 EUR, Cash-flow annuel 5000 EUR = 10 ans
      const annees = calculerAnneesRecuperation(50000, 5000);
      expect(annees).toBe(10);
    });

    it('should return Infinity for negative cash flow', () => {
      expect(calculerAnneesRecuperation(50000, -1000)).toBe(Infinity);
    });

    it('should return Infinity for zero cash flow', () => {
      expect(calculerAnneesRecuperation(50000, 0)).toBe(Infinity);
    });

    it('should handle fractional years', () => {
      // Apport 50 000 EUR, Cash-flow annuel 8000 EUR = 6.25 ans
      const annees = calculerAnneesRecuperation(50000, 8000);
      expect(annees).toBeCloseTo(6.25, 2);
    });
  });

  describe('calculerFraisNotaire', () => {
    /**
     * Estime les frais de notaire
     */
    function calculerFraisNotaire(prixAchat: number, isAncien: boolean = true): number {
      const taux = isAncien ? 0.08 : 0.03; // 8% ancien, 3% neuf
      return Math.round(prixAchat * taux * 100) / 100;
    }

    it('should calculate notary fees for old property', () => {
      // Prix 200 000 EUR, ancien = 16 000 EUR
      const frais = calculerFraisNotaire(200000, true);
      expect(frais).toBe(16000);
    });

    it('should calculate notary fees for new property', () => {
      // Prix 200 000 EUR, neuf = 6 000 EUR
      const frais = calculerFraisNotaire(200000, false);
      expect(frais).toBe(6000);
    });

    it('should default to old property rate', () => {
      const frais = calculerFraisNotaire(200000);
      expect(frais).toBe(16000);
    });
  });

  describe('Integration: Full Investment Analysis', () => {
    interface InvestmentAnalysis {
      rentabiliteBrute: number;
      rentabiliteNette: number;
      cashFlowMensuel: number;
      cashFlowAnnuel: number;
      tauxEndettement: number;
      roi: number;
      anneesRecuperation: number;
    }

    function analyzeInvestment(
      prixAchat: number,
      fraisNotaire: number,
      montantTravaux: number,
      apport: number,
      tauxCredit: number,
      dureeCredit: number,
      loyerMensuel: number,
      chargesMensuelles: number,
      revenusMensuelsInvestisseur: number
    ): InvestmentAnalysis {
      // Cout total
      const coutTotal = prixAchat + fraisNotaire + montantTravaux;

      // Emprunt
      const emprunt = coutTotal - apport;

      // Mensualite
      const tauxMensuel = tauxCredit / 100 / 12;
      const mensualite = emprunt * (tauxMensuel * Math.pow(1 + tauxMensuel, dureeCredit)) /
                         (Math.pow(1 + tauxMensuel, dureeCredit) - 1);

      // Rentabilites
      const loyerAnnuel = loyerMensuel * 12;
      const chargesAnnuelles = chargesMensuelles * 12;
      const rentabiliteBrute = (loyerAnnuel / coutTotal) * 100;
      const rentabiliteNette = ((loyerAnnuel - chargesAnnuelles) / coutTotal) * 100;

      // Cash-flow
      const cashFlowMensuel = loyerMensuel - mensualite - chargesMensuelles;
      const cashFlowAnnuel = cashFlowMensuel * 12;

      // Ratios
      const tauxEndettement = (mensualite / revenusMensuelsInvestisseur) * 100;
      const roi = apport > 0 ? (cashFlowAnnuel / apport) * 100 : 0;
      const anneesRecuperation = cashFlowAnnuel > 0 ? apport / cashFlowAnnuel : Infinity;

      return {
        rentabiliteBrute: Math.round(rentabiliteBrute * 100) / 100,
        rentabiliteNette: Math.round(rentabiliteNette * 100) / 100,
        cashFlowMensuel: Math.round(cashFlowMensuel * 100) / 100,
        cashFlowAnnuel: Math.round(cashFlowAnnuel * 100) / 100,
        tauxEndettement: Math.round(tauxEndettement * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        anneesRecuperation: Math.round(anneesRecuperation * 100) / 100
      };
    }

    it('should analyze a typical rental investment', () => {
      const analysis = analyzeInvestment(
        200000,  // Prix achat
        16000,   // Frais notaire
        10000,   // Travaux
        45000,   // Apport
        3.5,     // Taux credit
        240,     // Duree 20 ans
        1000,    // Loyer mensuel
        200,     // Charges mensuelles
        4000     // Revenus investisseur
      );

      // Verifications
      expect(analysis.rentabiliteBrute).toBeGreaterThan(5);
      expect(analysis.rentabiliteBrute).toBeLessThan(6);
      expect(analysis.tauxEndettement).toBeLessThan(35); // Sous le seuil bancaire
      expect(analysis.cashFlowMensuel).toBeDefined();
      expect(analysis.roi).toBeDefined();
    });

    it('should detect over-leveraged investment', () => {
      const analysis = analyzeInvestment(
        300000,  // Prix eleve
        24000,   // Frais notaire
        20000,   // Travaux importants
        30000,   // Apport faible
        4.5,     // Taux eleve
        300,     // Duree longue
        1200,    // Loyer insuffisant
        300,     // Charges
        3500     // Revenus modestes
      );

      // Le taux d'endettement devrait depasser le seuil
      expect(analysis.tauxEndettement).toBeGreaterThan(35);
    });

    it('should calculate profitable investment with good cash flow', () => {
      const analysis = analyzeInvestment(
        150000,  // Prix attractif
        12000,   // Frais notaire
        5000,    // Peu de travaux
        50000,   // Bon apport
        3.0,     // Bon taux
        180,     // 15 ans
        1100,    // Bon loyer
        150,     // Charges faibles
        5000     // Bons revenus
      );

      // Investissement rentable
      expect(analysis.cashFlowMensuel).toBeGreaterThan(0);
      expect(analysis.roi).toBeGreaterThan(0);
      expect(analysis.anneesRecuperation).toBeLessThan(50); // Recuperation en moins de 50 ans
    });
  });
});
