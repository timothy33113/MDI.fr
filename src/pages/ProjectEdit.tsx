import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import ProjectForm from '@/components/forms/ProjectForm'
import AssocieForm from '@/components/forms/AssocieForm'
import FinancementForm from '@/components/forms/FinancementForm'
import BienImmobilierForm from '@/components/forms/BienImmobilierForm'
import TravauxForm from '@/components/forms/TravauxForm'
import RecapitulatifForm from '@/components/forms/RecapitulatifForm'
import PDFGenerator from '@/services/pdfGenerator'
import { pdfService } from '@/services/pdfService'
import { ArrowLeft, Plus, Users, Building2, Euro, FileText, Save, Percent, Download, Loader2, Pencil, Trash2, Check, AlertTriangle, Home, Hammer, X } from 'lucide-react'
import { DossierSCI, Associe, PlanFinancement, BienImmobilier, TravauxDetail } from '@/types'

const ProjectEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getProject, createProject, updateProject } = useProject()
  
  const [activeTab, setActiveTab] = useState('project')
  const [project, setProject] = useState<Partial<DossierSCI>>({})
  const [associes, setAssocies] = useState<Associe[]>([])
  const [showAssocieForm, setShowAssocieForm] = useState(false)
  const [editingAssocie, setEditingAssocie] = useState<Associe | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [financement, setFinancement] = useState<Partial<PlanFinancement>>({})
  const [bienImmobilier, setBienImmobilier] = useState<Partial<BienImmobilier>>({})
  const [travaux, setTravaux] = useState<TravauxDetail[]>([])

  const isNewProject = id === 'new'

  useEffect(() => {
    if (!isNewProject && id) {
      const existingProject = getProject(id)
      if (existingProject) {
        setProject(existingProject)
        setAssocies(existingProject.associes || [])
      }
    }
  }, [id, isNewProject, getProject])

  const tabs = [
    { key: 'project', label: 'Société', icon: Building2 },
    { key: 'associes', label: 'Associés', icon: Users },
    { key: 'financement', label: 'Financement', icon: Euro },
    { key: 'bien', label: 'Bien immobilier', icon: Home },
    { key: 'travaux', label: 'Travaux', icon: Hammer },
    { key: 'pdf', label: 'Dossier PDF', icon: FileText },
  ]

  const handleProjectSave = (data: any) => {
    setProject(prev => ({ ...prev, ...data }))
    setActiveTab('associes')
  }

  const handleFinancementSave = (data: PlanFinancement) => {
    setFinancement(data)
    setActiveTab('bien')
  }

  const handleBienImmobilierSave = (data: BienImmobilier) => {
    setBienImmobilier(data)
    setActiveTab('travaux')
  }

  const handleTravauxSave = (data: TravauxDetail[]) => {
    setTravaux(data)
    setActiveTab('pdf')
  }

  const handleGeneratePDF = () => {
    const completeDossier: DossierSCI = {
      id: project.id || '',
      userId: project.userId || '',
      nomSCI: project.nomSCI || '',
      localisation: project.localisation || '',
      prixAcquisition: project.prixAcquisition || 0,
      montantTravaux: project.montantTravaux || 0,
      status: 'PDF_Genere',
      dateCreation: project.dateCreation || new Date(),
      dateModification: new Date(),
      associes,
      totalParts: associes.reduce((sum, a) => sum + a.pourcentageParts, 0),
      financement: financement as PlanFinancement,
      bienImmobilier: {
        ...bienImmobilier,
        travauxPrevus: travaux
      } as BienImmobilier
    }

    // Sauvegarder le projet avec le statut PDF_Genere
    if (isNewProject) {
      createProject(completeDossier)
    } else {
      updateProject(completeDossier.id, completeDossier)
    }

    // Telecharger le PDF (local)
    const pdfGenerator = new PDFGenerator()
    const filename = `dossier-${completeDossier.nomSCI || 'sci'}-${new Date().toISOString().split('T')[0]}.pdf`
    pdfGenerator.downloadPDF(completeDossier, filename)
  }

  // Generer PDF depuis l'API (pour les projets sauvegardes en base)
  const handleGeneratePDFFromAPI = async () => {
    if (!id || isNewProject) {
      // Fallback sur la generation locale si pas d'ID
      handleGeneratePDF()
      return
    }

    setPdfLoading(true)
    setPdfError(null)

    try {
      const result = await pdfService.downloadPDFBasic(id)

      if (!result.success) {
        setPdfError(result.error || 'Erreur lors de la generation du PDF')
        // Fallback sur la generation locale
        handleGeneratePDF()
      }
    } catch (error: any) {
      console.error('Error generating PDF from API:', error)
      setPdfError(error.message)
      // Fallback sur la generation locale
      handleGeneratePDF()
    } finally {
      setPdfLoading(false)
    }
  }

  // Generer PDF Pro depuis l'API
  const handleGeneratePDFPro = async () => {
    if (!id || isNewProject) {
      setPdfError('Veuillez d\'abord sauvegarder le projet')
      return
    }

    setPdfLoading(true)
    setPdfError(null)

    try {
      const result = await pdfService.downloadPDFPro(id)

      if (!result.success) {
        setPdfError(result.error || 'Erreur lors de la generation du PDF')
      }
    } catch (error: any) {
      console.error('Error generating PDF Pro:', error)
      setPdfError(error.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleAssocieSave = (associe: Associe) => {
    if (editingAssocie) {
      setAssocies(prev => prev.map(a => a.id === associe.id ? associe : a))
    } else {
      setAssocies(prev => [...prev, associe])
    }
    setShowAssocieForm(false)
    setEditingAssocie(null)
  }

  const handleAssocieDelete = (associeId: string) => {
    setAssocies(prev => prev.filter(a => a.id !== associeId))
  }

  const handleAssocieEdit = (associe: Associe) => {
    setEditingAssocie(associe)
    setShowAssocieForm(true)
  }

  const handleSaveProject = async () => {
    setLoading(true)
    try {
      const projectData: DossierSCI = {
        id: project.id || Date.now().toString(),
        userId: user?.id || '',
        nomSCI: project.nomSCI || '',
        status: 'Brouillon',
        localisation: project.localisation || '',
        prixAcquisition: project.prixAcquisition || 0,
        montantTravaux: project.montantTravaux || 0,
        associes,
        totalParts: associes.reduce((sum, a) => sum + a.pourcentageParts, 0),
        financement: financement as PlanFinancement || {
          prixAchat: project.prixAcquisition || 0,
          fraisNotaire: 0,
          montantTravaux: project.montantTravaux || 0,
          apportPersonnel: 0,
          montantEmprunt: 0,
          dureeCredit: 20,
          tauxEstime: 3.5,
          mensualiteEstimee: 0,
          rentabilitePrevisionnelle: 0
        },
        bienImmobilier: {
          ...bienImmobilier,
          travauxPrevus: travaux,
          adresse: bienImmobilier.adresse || project.localisation || '',
          superficie: bienImmobilier.superficie || 0,
          nombrePieces: bienImmobilier.nombrePieces || 0,
          etatActuel: bienImmobilier.etatActuel || '',
          photos: bienImmobilier.photos || [],
          dpe: bienImmobilier.dpe || '',
          estimationValeur: bienImmobilier.estimationValeur || project.prixAcquisition || 0
        } as BienImmobilier,
        dateCreation: project.dateCreation || new Date(),
        dateModification: new Date()
      }

      if (isNewProject) {
        createProject(projectData)
      } else {
        updateProject(projectData.id, projectData)
      }
      
      navigate('/')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    } finally {
      setLoading(false)
    }
  }

  const partsDisponibles = 100 - associes.reduce((sum, a) => sum + a.pourcentageParts, 0)

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projets')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {isNewProject ? 'Nouveau dossier' : project.nomSCI || 'Modifier le dossier'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isNewProject ? 'Créez un nouveau dossier bancaire' : 'Modifiez les informations du dossier'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNewProject && (
              <button
                onClick={handleGeneratePDFFromAPI}
                disabled={pdfLoading}
                className="px-4 py-2 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                {pdfLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {pdfLoading ? 'Génération...' : 'Générer PDF'}
              </button>
            )}

            <button
              onClick={handleSaveProject}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Tab navigation with Vectra style */}
        <nav className="flex items-center gap-1 mt-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Message d'erreur PDF */}
      {pdfError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-red-700 text-sm">{pdfError}</span>
            <button
              onClick={() => setPdfError(null)}
              className="p-1 text-red-400 hover:text-red-600 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'project' && (
            <ProjectForm
              initialData={project}
              onSave={handleProjectSave}
              onNext={() => setActiveTab('associes')}
            />
          )}

          {activeTab === 'associes' && (
            <div className="space-y-6">
              {/* En-tête des associés */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    Associés ({associes.length}/5)
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Total des parts : {associes.reduce((sum, a) => sum + a.pourcentageParts, 0)}%
                    {associes.reduce((sum, a) => sum + a.pourcentageParts, 0) === 100 && (
                      <span className="inline-flex items-center gap-1 ml-2 text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        Complet
                      </span>
                    )}
                  </p>
                </div>

                {associes.length < 5 && (
                  <button
                    onClick={() => setShowAssocieForm(true)}
                    disabled={partsDisponibles <= 0}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un associé
                  </button>
                )}
              </div>

              {/* Formulaire d'ajout d'associé */}
              {showAssocieForm && (
                <AssocieForm
                  initialData={editingAssocie || undefined}
                  onSave={handleAssocieSave}
                  onCancel={() => {
                    setShowAssocieForm(false)
                    setEditingAssocie(null)
                  }}
                  partsDisponibles={partsDisponibles}
                />
              )}

              {/* Liste des associés */}
              {associes.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {associes.map((associe) => (
                    <div key={associe.id} className="relative bg-white rounded-2xl border border-gray-200/60 p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${
                            associe.type === 'PERSONNE_PHYSIQUE'
                              ? 'bg-coral-50 text-coral-500'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {associe.type === 'PERSONNE_PHYSIQUE' ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              <Building2 className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            {associe.type === 'PERSONNE_PHYSIQUE' ? 'Physique' : 'Morale'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAssocieEdit(associe)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleAssocieDelete(associe.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-3">
                        {associe.nom}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Percent className="h-3.5 w-3.5 text-gray-300" />
                          <span>{associe.pourcentageParts}% des parts</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Euro className="h-3.5 w-3.5 text-gray-300" />
                          <span>
                            {associe.type === 'PERSONNE_PHYSIQUE'
                              ? `${associe.personnePhysique?.salaire || 0}€/mois`
                              : `${associe.personneMorale?.chiffreAffaires || 0}€/an`
                            }
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-gray-300" />
                          <span className="truncate">{associe.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contraintes */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200/60 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Contraintes
                  </h3>
                </div>
                <ul className="text-sm text-gray-500 space-y-1 ml-6">
                  <li>• Minimum 1 associé, maximum 5</li>
                  <li>• Total des parts doit être exactement 100%</li>
                  <li>• Au moins 1 personne physique dans la SCI</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'financement' && (
            <FinancementForm
              initialData={financement}
              associes={associes}
              onSave={handleFinancementSave}
              onNext={() => setActiveTab('bien')}
            />
          )}

          {activeTab === 'bien' && (
            <BienImmobilierForm
              initialData={bienImmobilier}
              onSave={handleBienImmobilierSave}
              onNext={() => setActiveTab('travaux')}
            />
          )}

          {activeTab === 'travaux' && (
            <TravauxForm
              initialData={travaux}
              onSave={handleTravauxSave}
              onNext={() => setActiveTab('pdf')}
            />
          )}

          {activeTab === 'pdf' && (
            <RecapitulatifForm
              project={project}
              associes={associes}
              financement={financement}
              bienImmobilier={bienImmobilier}
              travaux={travaux}
              onGeneratePDF={handleGeneratePDF}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default ProjectEdit 