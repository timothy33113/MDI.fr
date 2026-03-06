import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, MoreHorizontal, Pencil, Trash2, MapPin, Copy, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { StatusProjet } from '@/types';
import { useProjets } from '@/hooks/useProjets';
import api from '@/services/api';

const ProjetsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { projets, loading, deleteProjet, fetchProjets, getProjetById, createProjet } = useProjets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projetToDelete, setProjetToDelete] = useState<{ id: string; nom: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleDeleteClick = (projetId: string, projetNom: string) => {
    setProjetToDelete({ id: projetId, nom: projetNom });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (projetToDelete) {
      try {
        await deleteProjet(projetToDelete.id);
        await fetchProjets();
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

  const handleDuplicate = async (projetId: string) => {
    setDuplicating(projetId);
    setOpenMenuId(null);
    try {
      const projet = await getProjetById(projetId);
      if (!projet) return;

      const duplicateData = {
        nom: `${projet.nom} (copie)`,
        description: projet.description,
        porteurs: (projet.porteurs || []).map((p: any) => ({
          structureId: p.structureId || p.structure?.id,
          pourcentageProjet: p.pourcentageProjet,
        })).filter((p: any) => p.structureId),
        bien: projet.bienImmobilier ? {
          adresse: projet.bienImmobilier.adresse,
          codePostal: projet.bienImmobilier.codePostal,
          ville: projet.bienImmobilier.ville,
          type: projet.bienImmobilier.type,
          superficie: projet.bienImmobilier.superficie,
          nombrePieces: projet.bienImmobilier.nombrePieces,
          etatActuel: projet.bienImmobilier.etatActuel,
          destinationBien: projet.bienImmobilier.destinationBien,
          loyerMensuelEstime: projet.bienImmobilier.loyerMensuelEstime,
          chargesMensuelles: projet.bienImmobilier.chargesMensuelles,
          dpe: projet.bienImmobilier.dpe,
          ges: projet.bienImmobilier.ges,
          taxeFonciere: projet.bienImmobilier.taxeFonciere,
        } : undefined,
        financement: projet.financement ? {
          prixAchat: projet.financement.prixAchat,
          fraisNotaire: projet.financement.fraisNotaire,
          fraisAgence: projet.financement.fraisAgence,
          montantTravaux: projet.financement.montantTravaux,
          apportPersonnel: projet.financement.apportPersonnel,
          dureeCredit: projet.financement.dureeCredit,
          tauxInteretEstime: projet.financement.tauxInteretEstime,
          typePret: projet.financement.typePret,
        } : undefined,
      };

      const newProjet = await createProjet(duplicateData as any);
      navigate(`/projets/${newProjet.id}/edit`);
    } catch (err) {
      console.error('Erreur duplication:', err);
    } finally {
      setDuplicating(null);
    }
  };

  const getStatusBadge = (status: StatusProjet) => {
    const styles: Record<StatusProjet, string> = {
      Analyse: 'bg-honey-50 text-honey-700 border border-honey-200',
      En_Cours: 'bg-coral-50 text-coral-600 border border-coral-200',
      Dossier_Complet: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      PDF_Genere: 'bg-coral-50 text-coral-600 border border-coral-200',
      Archive: 'bg-gray-50 text-gray-600 border border-gray-200'
    };

    const labels: Record<StatusProjet, string> = {
      Analyse: 'Analyse',
      En_Cours: 'En cours',
      Dossier_Complet: 'Complet',
      PDF_Genere: 'PDF généré',
      Archive: 'Archivé'
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Projets <span className="text-gray-400 font-normal text-2xl">({projets.length})</span>
          </h1>
          <button
            onClick={() => navigate('/projets/nouveau')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Nouveau
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Chargement...</p>
          </div>
        ) : projets.length === 0 ? (
          <div
            onClick={() => navigate('/projets/nouveau')}
            className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">Créer un projet immobilier</p>
            <p className="text-xs text-gray-500 mt-1">Analysez la rentabilité de vos investissements</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            {/* En-têtes */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_120px_48px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <span>Projet</span>
              <span>Statut</span>
              <span>Prix</span>
              <span>Rentabilité</span>
              <span></span>
            </div>
            {/* Lignes */}
            {projets.map((projet, index) => {
              const bienAdresse = projet.bienImmobilier?.adresse || 'Adresse non définie';
              const prixTotal = projet.financement?.prixTotal || 0;
              const rentabilite = projet.analysesRentabilite?.[0]?.rentabiliteBrute;
              const photoUrl = projet.bienImmobilier?.photos?.[0]?.url;

              return (
                <div
                  key={projet.id}
                  onClick={() => navigate(`/projets/${projet.id}/edit`)}
                  className={`flex items-center sm:grid sm:grid-cols-[1fr_100px_120px_120px_48px] gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    index < projets.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Projet (photo + nom + adresse) */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={projet.nom} className="w-full h-full object-cover" />
                      ) : (
                        <FileText className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{projet.nom}</p>
                      <p className="text-xs text-gray-400 truncate">{bienAdresse}</p>
                    </div>
                  </div>
                  {/* Statut */}
                  <div className="hidden sm:block">
                    {getStatusBadge(projet.status)}
                  </div>
                  {/* Prix */}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{prixTotal.toLocaleString('fr-FR')} €</p>
                  </div>
                  {/* Rentabilité */}
                  <div className="hidden sm:block">
                    {rentabilite ? (
                      <span className={`text-sm font-medium ${rentabilite > 5 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {rentabilite.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                  {/* Menu "..." */}
                  <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === projet.id ? null : projet.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenuId === projet.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => { navigate(`/projets/${projet.id}/edit`); setOpenMenuId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => handleDuplicate(projet.id)}
                          disabled={duplicating === projet.id}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {duplicating === projet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />} Dupliquer
                        </button>
                        <button
                          onClick={() => { handleDeleteClick(projet.id, projet.nom); setOpenMenuId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-xl font-medium transition-colors"
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
