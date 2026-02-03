import { useState, useEffect } from 'react';
import api from '@/services/api';
import {
  Projet,
  CreateProjetForm,
  BienImmobilier,
  PlanFinancement,
  AnalysesRentabilite,
  ChecklistDocument,
  StatusProjet
} from '@/types';

export const useProjets = () => {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjets = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📡 Chargement des projets...');
      const response = await api.get('/projets');
      console.log('📥 Réponse projets:', response.data);
      // L'API retourne directement un tableau, pas {data: {projets: [...]}}
      const projetsData = Array.isArray(response.data) ? response.data : (response.data.data?.projets || []);
      console.log('✅ Projets chargés:', projetsData.length);
      setProjets(projetsData);
    } catch (err: any) {
      console.error('❌ Erreur chargement projets:', err);
      setError(err.response?.data?.error || 'Erreur lors du chargement des projets');
    } finally {
      setLoading(false);
    }
  };

  const createProjet = async (data: CreateProjetForm): Promise<Projet> => {
    console.log('🚀 useProjets.createProjet appelé avec:', data);
    try {
      setLoading(true);
      setError(null);
      console.log('📤 Envoi requête POST /projets');
      const response = await api.post('/projets', data);
      console.log('📥 Réponse reçue:', response);
      const newProjet = response.data.data.projet;
      console.log('✅ Nouveau projet extrait:', newProjet);
      setProjets([...projets, newProjet]);
      return newProjet;
    } catch (err: any) {
      console.error('❌ Erreur dans createProjet:', err);
      console.error('❌ Response data:', err.response?.data);
      const errorMsg = err.response?.data?.error || 'Erreur lors de la création du projet';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getProjetById = async (id: string): Promise<Projet | null> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/projets/${id}`);
      return response.data.data.projet;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement du projet');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProjet = async (id: string, data: CreateProjetForm): Promise<Projet> => {
    console.log('🚀 useProjets.updateProjet appelé avec:', { id, data });
    try {
      setLoading(true);
      setError(null);
      console.log('📤 Envoi requête PUT /projets/' + id);
      const response = await api.put(`/projets/${id}`, data);
      console.log('📥 Réponse reçue:', response);
      const updatedProjet = response.data.data.projet;
      console.log('✅ Projet mis à jour:', updatedProjet);
      setProjets(projets.map(p => p.id === id ? updatedProjet : p));
      return updatedProjet;
    } catch (err: any) {
      console.error('❌ Erreur dans updateProjet:', err);
      console.error('❌ Response data:', err.response?.data);
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour du projet';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateProjetStatus = async (id: string, status: StatusProjet): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.patch(`/projets/${id}/status`, { status });
      const updatedProjet = response.data.data.projet;
      setProjets(projets.map(p => p.id === id ? updatedProjet : p));
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour du statut';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteProjet = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/projets/${id}`);
      setProjets(projets.filter(p => p.id !== id));
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la suppression du projet';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const addPorteurToProjet = async (
    projetId: string,
    structureId: string,
    pourcentageProjet: number
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/projets/${projetId}/porteurs`, {
        structureId,
        pourcentageProjet
      });
      // Refetch projet to get updated porteurs
      await fetchProjets();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de l\'ajout du porteur';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const upsertBienImmobilier = async (
    projetId: string,
    data: Partial<BienImmobilier>
  ): Promise<BienImmobilier> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/projets/${projetId}/bien`, data);
      return response.data.data.bienImmobilier;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour du bien';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const upsertPlanFinancement = async (
    projetId: string,
    data: Partial<PlanFinancement>
  ): Promise<PlanFinancement> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put(`/projets/${projetId}/financement`, data);
      return response.data.data.planFinancement;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour du financement';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const calculateRentabilite = async (projetId: string): Promise<AnalysesRentabilite> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/projets/${projetId}/analyser`);
      return response.data.data.analyse;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors du calcul de rentabilité';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const generateChecklist = async (projetId: string): Promise<ChecklistDocument[]> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/projets/${projetId}/checklist`);
      return response.data.data.documents;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la génération de la checklist';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getChecklist = async (projetId: string): Promise<ChecklistDocument[]> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/projets/${projetId}/checklist`);
      return response.data.data.documents;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement de la checklist');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentStatus = async (
    projetId: string,
    documentId: string,
    statut: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.patch(`/projets/${projetId}/checklist/${documentId}`, { statut });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la mise à jour du document';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjets();
  }, []);

  return {
    projets,
    loading,
    error,
    fetchProjets,
    createProjet,
    getProjetById,
    updateProjet,
    updateProjetStatus,
    deleteProjet,
    addPorteurToProjet,
    upsertBienImmobilier,
    upsertPlanFinancement,
    calculateRentabilite,
    generateChecklist,
    getChecklist,
    updateDocumentStatus
  };
};
