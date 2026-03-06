import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import ProjetFormV2 from '@/components/forms/ProjetFormV2';
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext';
import { useProjets } from '@/hooks/useProjets';
import { CreateProjetForm } from '@/types';

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
      <div className="min-h-screen bg-[#F7F7F7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            onClick={() => navigate('/profile')}
            className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-coral-100 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-coral-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">Créer vos associés et sociétés</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Vous devez d'abord créer au moins un associé ou une société avant de pouvoir créer un projet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
