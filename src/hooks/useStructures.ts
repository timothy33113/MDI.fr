import { useState, useEffect, useCallback } from 'react';
import { Structure, CreateStructureForm } from '@/types';

const STORAGE_KEY = 'mdi_structures';

// Utilitaire pour générer un ID unique
const generateId = () => `structure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Fonction pour charger depuis localStorage
const loadFromStorage = (): Structure[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('📂 Aucune structure en localStorage');
      return [];
    }
    const data = JSON.parse(stored);
    // Convertir les dates string en objets Date
    const structures = data.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt)
    }));
    console.log('📂 Chargement localStorage:', structures.length, 'structures');
    return structures;
  } catch (error) {
    console.error('❌ Erreur lors du chargement des structures:', error);
    return [];
  }
};

// Fonction pour sauvegarder dans localStorage
const saveToStorage = (structures: Structure[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(structures));
    console.log('💾 Sauvegarde localStorage:', structures.length, 'structures');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des structures:', error);
  }
};

export const useStructures = () => {
  // Initialiser directement depuis localStorage pour éviter le flash
  const [structures, setStructures] = useState<Structure[]>(() => loadFromStorage());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sauvegarder automatiquement à chaque changement
  useEffect(() => {
    saveToStorage(structures);
  }, [structures]);

  const addStructure = useCallback((data: any): Structure => {
    const newStructure: Structure = {
      id: generateId(),
      userId: 'current-user', // TODO: Remplacer par vrai userId
      type: data.type,
      nom: data.nom,
      adresse: data.adresse,
      telephone: data.telephone,
      email: data.email,
      detenteurs: data.detenteurs || [],
      personnePhysique: data.personnePhysique,
      personneMorale: data.personneMorale,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📝 Ajout de structure:', newStructure);

    setStructures(prev => {
      const updatedStructures = [...prev, newStructure];
      console.log('✅ Structures après ajout:', updatedStructures.length);
      return updatedStructures;
    });

    return newStructure;
  }, []);

  const getStructureById = useCallback((id: string): Structure | null => {
    return structures.find(s => s.id === id) || null;
  }, [structures]);

  const updateStructure = useCallback((id: string, data: any): void => {
    console.log('📝 Mise à jour de structure:', id, data);

    setStructures(prev => {
      const updatedStructures = prev.map(s =>
        s.id === id
          ? {
              ...s,
              ...data,
              updatedAt: new Date()
            }
          : s
      );

      console.log('✅ Structure mise à jour');
      return updatedStructures;
    });
  }, []);

  const deleteStructure = useCallback((id: string): void => {
    console.log('🗑️ Suppression de structure:', id);

    setStructures(prev => {
      const updatedStructures = prev.filter(s => s.id !== id);
      console.log('✅ Structure supprimée, reste:', updatedStructures.length);
      return updatedStructures;
    });
  }, []);

  const refreshStructures = useCallback((): Structure[] => {
    const loaded = loadFromStorage();
    setStructures(loaded);
    return loaded;
  }, []);

  return {
    structures,
    loading,
    error,
    addStructure,
    getStructureById,
    updateStructure,
    deleteStructure,
    refreshStructures
  };
};
