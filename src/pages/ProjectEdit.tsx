import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProject } from '@/hooks/useProject'
import TabNavigation from '@/components/ui/TabNavigation'
import ProjectForm from '@/components/forms/ProjectForm'
import AssocieForm from '@/components/forms/AssocieForm'
import FinancementForm from '@/components/forms/FinancementForm'
import BienImmobilierForm from '@/components/forms/BienImmobilierForm'
import TravauxForm from '@/components/forms/TravauxForm'
import RecapitulatifForm from '@/components/forms/RecapitulatifForm'
import PDFGenerator from '@/services/pdfGenerator'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ArrowLeft, Plus, Users, Building2, Euro, FileText, Save, Percent } from 'lucide-react'
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
    { key: 'project', label: 'Informations SCI', icon: '🏢' },
    { key: 'associes', label: 'Associés', icon: '👥' },
    { key: 'financement', label: 'Financement', icon: '💰' },
    { key: 'bien', label: 'Bien immobilier', icon: '🏠' },
    { key: 'travaux', label: 'Travaux', icon: '🔨' },
    { key: 'pdf', label: 'Génération PDF', icon: '📄' },
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

    // Télécharger le PDF
    const pdfGenerator = new PDFGenerator()
    const filename = `dossier-${completeDossier.nomSCI || 'sci'}-${new Date().toISOString().split('T')[0]}.pdf`
    pdfGenerator.downloadPDF(completeDossier, filename)
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {isNewProject ? 'Nouveau dossier' : project.nomSCI || 'Modifier le dossier'}
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleSaveProject}
                disabled={loading}
                variant="secondary"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

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
                  <h2 className="text-xl font-semibold text-gray-900">
                    Associés ({associes.length}/5)
                  </h2>
                  <p className="text-gray-600">
                    Total des parts: {associes.reduce((sum, a) => sum + a.pourcentageParts, 0)}% 
                    {associes.reduce((sum, a) => sum + a.pourcentageParts, 0) === 100 && (
                      <span className="text-green-600 ml-2">✅</span>
                    )}
                  </p>
                </div>
                
                {associes.length < 5 && (
                  <Button
                    onClick={() => setShowAssocieForm(true)}
                    disabled={partsDisponibles <= 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un associé
                  </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {associes.map((associe) => (
                    <Card key={associe.id} className="relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          {associe.type === 'PERSONNE_PHYSIQUE' ? (
                            <Users className="h-5 w-5 text-blue-500 mr-2" />
                          ) : (
                            <Building2 className="h-5 w-5 text-green-500 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-500">
                            {associe.type === 'PERSONNE_PHYSIQUE' ? 'Personne physique' : 'Personne morale'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAssocieEdit(associe)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleAssocieDelete(associe.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2">
                        {associe.nom}
                      </h3>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Percent className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{associe.pourcentageParts}% des parts</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 mr-2 text-gray-400" />
                          <span>
                            {associe.type === 'PERSONNE_PHYSIQUE' 
                              ? `${associe.personnePhysique?.salaire || 0}€/mois`
                              : `${associe.personneMorale?.chiffreAffaires || 0}€/an`
                            }
                          </span>
                        </div>

                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate">{associe.email}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Contraintes */}
              <Card className="bg-yellow-50 border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  ⚠️ Contraintes
                </h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Minimum 1 associé, maximum 5</li>
                  <li>• Total des parts doit être exactement 100%</li>
                  <li>• Au moins 1 personne physique dans la SCI</li>
                </ul>
              </Card>
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