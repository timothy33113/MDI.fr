import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProjetFormV2 from '@/components/forms/ProjetFormV2';
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext';
import { useProjets } from '@/hooks/useProjets';
import { CreateProjetForm, Projet } from '@/types';
import { pdfService } from '@/services/pdfService';
import { useToast } from '@/contexts/ToastContext';

const EditProjetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { structures } = useStructures();
  const { getProjetById, updateProjet } = useProjets();
  const toast = useToast();
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjet = async () => {
      if (id) {
        console.log('🔍 Chargement du projet:', id);
        const projetData = await getProjetById(id);
        console.log('📦 Projet chargé:', projetData);
        setProjet(projetData);
        setLoading(false);
      }
    };

    loadProjet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdateProjet = async (data: CreateProjetForm) => {
    console.log('💾 Mise à jour du projet:', data);
    if (!id) return;

    try {
      await updateProjet(id, data);
      toast.success('Projet enregistré');
      navigate('/projets');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du projet:', error);
      const detail = error?.message || error?.response?.data?.error || String(error);
      toast.error(detail, 'Erreur');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      console.log('🎯 Génération du dossier bancaire PDF...');

      if (!id) {
        toast.warning('Aucun projet chargé');
        return;
      }

      if (!projet?.porteurs || projet.porteurs.length === 0) {
        toast.error('Veuillez ajouter au moins un porteur du projet avant de générer le dossier bancaire.');
        return;
      }

      // Utiliser pdfService pour récupérer les données complètes
      const result = await pdfService.downloadPDFPro(id);

      if (result.success) {
        console.log('✅ PDF téléchargé avec succès');
        toast.success('Dossier bancaire téléchargé');
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la génération du PDF:', error);
      toast.error('Erreur lors de la génération du dossier. Veuillez réessayer.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600">Chargement du projet...</p>
        </div>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/projets')}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </button>
          <p className="text-center text-gray-600">Projet introuvable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/projets')}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux projets
        </button>

        <ProjetFormV2
          structures={structures}
          onSubmit={handleUpdateProjet}
          onCancel={() => navigate('/projets')}
          onGeneratePDF={handleGeneratePDF}
          initialProjet={projet}
        />
      </div>
    </div>
  );
};

export default EditProjetPage;
