import React, { useState } from 'react';
import { Plus, Building2, User, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext';
import StructureForm from '@/components/forms/StructureForm';
import { CreateStructureForm } from '@/types';

const StructuresPage: React.FC = () => {
  const { structures, loading, addStructure, deleteStructure } = useStructures();
  const [showForm, setShowForm] = useState(false);

  const handleCreateStructure = async (data: CreateStructureForm) => {
    try {
      addStructure(data);
      setShowForm(false);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette structure ?')) {
      try {
        await deleteStructure(id);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PERSONNE_PHYSIQUE: 'Personne Physique',
      SCI: 'SCI',
      SARL: 'SARL',
      SASU: 'SASU',
      EURL: 'EURL',
      SAS: 'SAS',
      SA: 'SA',
      HOLDING: 'Holding'
    };
    return labels[type] || type;
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <StructureForm
            onSubmit={handleCreateStructure}
            onCancel={() => setShowForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes Structures</h1>
            <p className="text-gray-600 mt-1">
              Gérez vos structures (personnes physiques et morales)
            </p>
          </div>

          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle structure
          </Button>
        </div>

        {/* Liste des structures */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Chargement des structures...</p>
          </div>
        ) : structures.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune structure
              </h3>
              <p className="text-gray-600 mb-4">
                Créez votre première structure pour commencer
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Créer ma première structure
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {structures.map((structure) => (
              <Card key={structure.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      {structure.type === 'PERSONNE_PHYSIQUE' ? (
                        <User className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Building2 className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">
                        {getTypeLabel(structure.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteStructure(structure.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {structure.nom}
                </h3>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">📍 {structure.adresse}</p>

                  {structure.telephone && (
                    <p className="text-gray-600">📞 {structure.telephone}</p>
                  )}

                  {structure.email && (
                    <p className="text-gray-600">📧 {structure.email}</p>
                  )}

                  {structure.type === 'PERSONNE_PHYSIQUE' && structure.personnePhysique && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600">
                        <strong>Situation:</strong> {structure.personnePhysique.situationFamiliale}
                      </p>
                      <p className="text-gray-600">
                        <strong>Statut:</strong> {structure.personnePhysique.statutProfessionnel}
                      </p>
                    </div>
                  )}

                  {structure.type !== 'PERSONNE_PHYSIQUE' && structure.personneMorale && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-600">
                        <strong>SIRET:</strong> {structure.personneMorale.siret}
                      </p>
                      {structure.personneMorale.capitalSocial && (
                        <p className="text-gray-600">
                          <strong>Capital:</strong> {structure.personneMorale.capitalSocial.toLocaleString('fr-FR')} €
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {structure.detenteurs && structure.detenteurs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Détenu par:</p>
                    {structure.detenteurs.map((detenteur) => (
                      <div key={detenteur.id} className="text-xs text-gray-600">
                        Structure ({detenteur.pourcentage}%)
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StructuresPage;
