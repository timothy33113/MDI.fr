import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import ProjetFormV2 from '@/components/forms/ProjetFormV2';
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext';
import { useProjets } from '@/hooks/useProjets';
import { CreateProjetForm } from '@/types';
import EmptyState from '@/components/ui/EmptyState';

const NewProjetPage: React.FC = () => {
  const navigate = useNavigate();
  const { structures } = useStructures();
  const { createProjet } = useProjets();

  const handleCreateProjet = async (data: CreateProjetForm) => {
    console.log('🎯 handleCreateProjet appelé dans NewProjetPage avec:', data);
    try {
      console.log('📤 Envoi de la requête de création au backend...');
      const newProjet = await createProjet(data);
      console.log('✅ Projet créé avec succès:', newProjet);
      // Redirect to the new project's analysis page
      navigate(`/projets/${newProjet.id}/analyse`);
    } catch (error) {
      console.error('❌ Erreur lors de la création du projet:', error);
      alert('Erreur lors de la création du projet. Veuillez réessayer.');
    }
  };

  const handleGeneratePDF = async (data: CreateProjetForm) => {
    try {
      console.log('🎯 Génération du dossier bancaire PDF...');

      // D'abord créer le projet
      const newProjet = await createProjet(data);
      console.log('✅ Projet créé:', newProjet);

      // Importer le générateur de PDF
      const PDFGeneratorPro = (await import('@/services/pdfGeneratorPro')).default;
      const pdfGenerator = new PDFGeneratorPro();

      // Générer et télécharger le PDF
      await pdfGenerator.downloadPDF(newProjet);
      console.log('✅ PDF téléchargé avec succès');

      alert('Dossier bancaire généré avec succès ! Le PDF a été téléchargé.');

      // Redirect to the project page
      navigate(`/projets/${newProjet.id}`);
    } catch (error) {
      console.error('❌ Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du dossier. Veuillez réessayer.');
    }
  };

  // Si aucune structure n'existe, afficher un message
  if (structures.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/projets')}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </button>

          <EmptyState
            title="Créer vos associés et sociétés"
            description="Vous devez d'abord créer au moins un associé ou une société avant de pouvoir créer un projet immobilier"
            actionLabel="Créer mes associés et sociétés"
            onAction={() => navigate('/profile')}
            icon={Users}
            variant="orange"
          />
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
          onSubmit={handleCreateProjet}
          onCancel={() => navigate('/projets')}
          onGeneratePDF={handleGeneratePDF}
        />
      </div>
    </div>
  );
};

export default NewProjetPage;
