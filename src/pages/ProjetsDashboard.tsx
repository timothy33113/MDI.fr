import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, ArrowLeft, Edit, Copy, Trash2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AnimatedButton from '@/components/ui/AnimatedButton';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { StatusProjet } from '@/types';
import { useProjets } from '@/hooks/useProjets';
import api from '@/services/api';

const ProjetsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projets, loading, deleteProjet, fetchProjets } = useProjets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projetToDelete, setProjetToDelete] = useState<{ id: string; nom: string } | null>(null);

  const handleEdit = (e: React.MouseEvent, projetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/projets/${projetId}/edit`);
  };

  const handleDuplicate = async (e: React.MouseEvent, projetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Voulez-vous dupliquer ce projet ?')) {
      try {
        const response = await api.post(`/projets/${projetId}/duplicate`);
        if (response.data.success) {
          alert('Projet dupliqué avec succès !');
          refreshProjets();
        }
      } catch (error) {
        console.error('Erreur lors de la duplication:', error);
        alert('Erreur lors de la duplication du projet');
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, projetId: string, projetNom: string) => {
    e.preventDefault();
    e.stopPropagation();
    setProjetToDelete({ id: projetId, nom: projetNom });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (projetToDelete) {
      console.log('🗑️ Suppression du projet:', projetToDelete.id);
      try {
        await deleteProjet(projetToDelete.id);
        await fetchProjets(); // Rafraîchir la liste
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
      setShowDeleteModal(false);
      setProjetToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProjetToDelete(null);
  };

  const getStatusBadge = (status: StatusProjet) => {
    const styles: Record<StatusProjet, string> = {
      Analyse: 'bg-yellow-100 text-yellow-800',
      En_Cours: 'bg-blue-100 text-blue-800',
      Dossier_Complet: 'bg-green-100 text-green-800',
      PDF_Genere: 'bg-purple-100 text-purple-800',
      Archive: 'bg-gray-100 text-gray-800'
    };

    const labels: Record<StatusProjet, string> = {
      Analyse: 'Analyse',
      En_Cours: 'En cours',
      Dossier_Complet: 'Complet',
      PDF_Genere: 'PDF généré',
      Archive: 'Archivé'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page title */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mes Projets</h1>
                <p className="text-sm text-gray-500">
                  Gérez vos projets immobiliers et analyses de rentabilité
                </p>
              </div>
            </div>

            <AnimatedButton
              onClick={() => navigate('/projets/nouveau')}
              icon={FileText}
              iconRight={Plus}
              variant="blue"
            >
              Nouveau projet
            </AnimatedButton>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Liste des projets */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Chargement des projets...</p>
          </div>
        ) : projets.length === 0 ? (
          <EmptyState
            title="Créer un projet immobilier"
            description="Analysez la rentabilité de vos investissements et générez des dossiers professionnels"
            actionLabel="Créer mon premier projet"
            onAction={() => navigate('/projets/nouveau')}
            icon={FileText}
            variant="blue"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projets.map((projet) => {
              const bienAdresse = projet.bienImmobilier?.adresse || 'Adresse non définie';
              const prixTotal = projet.financement?.prixTotal || 0;
              const nombrePorteurs = projet.porteurs?.length || 0;
              const rentabilite = projet.analysesRentabilite?.[0]?.rentabiliteBrute;
              const cashFlow = projet.analysesRentabilite?.[0]?.cashFlowMensuel;
              const photoUrl = projet.bienImmobilier?.photos?.[0]?.url;

              return (
                <Card
                  key={projet.id}
                  className="bg-gray-50 hover:bg-gray-200 transition-colors cursor-pointer"
                  onClick={(e) => handleEdit(e, projet.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {projet.nom}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {bienAdresse}
                        </p>
                        <div className="mt-2">
                          {getStatusBadge(projet.status)}
                        </div>
                      </div>
                      {/* Image ou avatar */}
                      <div className="flex-shrink-0 relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden shadow-lg">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={projet.nom}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="h-8 w-8 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex justify-between">
                        <span>Prix:</span>
                        <span className="font-medium text-right">{prixTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Porteurs:</span>
                        <span className="font-medium text-right">{nombrePorteurs}</span>
                      </div>
                      {rentabilite && (
                        <div className="flex justify-between">
                          <span>Rentabilité:</span>
                          <span className={`font-medium text-right ${
                            rentabilite > 5 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {rentabilite.toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {cashFlow !== undefined && (
                        <div className="flex justify-between">
                          <span>Cash-flow mensuel:</span>
                          <span className={`font-medium text-right ${
                            cashFlow > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {cashFlow > 0 ? '+' : ''}{cashFlow.toLocaleString('fr-FR')} €
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        onClick={(e) => handleDeleteClick(e, projet.id, projet.nom)}
                        className="w-full text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        title="Confirmer la suppression"
        size="small"
        closeOnBackdropClick={true}
      >
        <div className="py-2">
          <p className="text-gray-700 text-sm mb-4">
            Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{projetToDelete?.nom}</span> ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjetsDashboard;
