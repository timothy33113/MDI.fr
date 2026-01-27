import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mdi_patrimoine';

export interface Attribution {
  structureId: string;
  pourcentage: number;
}

export interface BienGlobal {
  id: string;
  type: 'Residence_Principale' | 'Residence_Secondaire' | 'Investissement_Locatif';
  adresse: string;
  valeurEstimee: number;
  loyerMensuel?: number;
  attributions: Attribution[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditGlobal {
  id: string;
  type: 'Immobilier' | 'Consommation' | 'Professionnel' | 'Autre';
  organisme: string;
  montantInitial: number;
  dateDebut: string;
  nombreMois: number;
  tauxInteret: number;
  bienAssocie?: string;
  capitalRestantDu?: number;
  mensualite?: number;
  attributions: Attribution[];
  createdAt: Date;
  updatedAt: Date;
}

interface PatrimoineData {
  biens: BienGlobal[];
  credits: CreditGlobal[];
}

const generateId = () => `patrimoine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const loadFromStorage = (): PatrimoineData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('📂 Aucun patrimoine en localStorage');
      return { biens: [], credits: [] };
    }
    const data = JSON.parse(stored);
    console.log('📂 Chargement patrimoine:', data.biens.length, 'biens,', data.credits.length, 'crédits');
    return data;
  } catch (error) {
    console.error('❌ Erreur lors du chargement du patrimoine:', error);
    return { biens: [], credits: [] };
  }
};

const saveToStorage = (data: PatrimoineData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('💾 Sauvegarde patrimoine:', data.biens.length, 'biens,', data.credits.length, 'crédits');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du patrimoine:', error);
  }
};

export const usePatrimoine = () => {
  const [data, setData] = useState<PatrimoineData>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const addBien = (bien: Omit<BienGlobal, 'id' | 'createdAt' | 'updatedAt'>): BienGlobal => {
    const newBien: BienGlobal = {
      ...bien,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setData(prev => ({ ...prev, biens: [...prev.biens, newBien] }));
    return newBien;
  };

  const updateBien = (id: string, updates: Partial<BienGlobal>): void => {
    setData(prev => ({
      ...prev,
      biens: prev.biens.map(b =>
        b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
      )
    }));
  };

  const deleteBien = (id: string): void => {
    setData(prev => ({
      ...prev,
      biens: prev.biens.filter(b => b.id !== id)
    }));
  };

  const addCredit = (credit: Omit<CreditGlobal, 'id' | 'createdAt' | 'updatedAt'>): CreditGlobal => {
    const newCredit: CreditGlobal = {
      ...credit,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setData(prev => ({ ...prev, credits: [...prev.credits, newCredit] }));
    return newCredit;
  };

  const updateCredit = (id: string, updates: Partial<CreditGlobal>): void => {
    setData(prev => ({
      ...prev,
      credits: prev.credits.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
      )
    }));
  };

  const deleteCredit = (id: string): void => {
    setData(prev => ({
      ...prev,
      credits: prev.credits.filter(c => c.id !== id)
    }));
  };

  return {
    biens: data.biens,
    credits: data.credits,
    addBien,
    updateBien,
    deleteBien,
    addCredit,
    updateCredit,
    deleteCredit
  };
};
