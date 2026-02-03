import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useStructuresContext } from '@/contexts/StructuresContext'
import AnimatedButton from '@/components/ui/AnimatedButton'
import Card from '@/components/ui/Card'
import { Briefcase, FolderOpen, Building2, Sparkles, Loader2, Check } from 'lucide-react'
import { createDemoData } from '@/services/demoData'
import api from '@/services/api'

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { structures, addStructure, refreshStructures } = useStructuresContext()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [demoCreated, setDemoCreated] = useState(false)
  const [demoError, setDemoError] = useState('')

  // Fonction pour créer un projet via l'API
  const createProjet = async (data: any) => {
    const response = await api.post('/projets', data)
    return response.data
  }

  const handleCreateDemoData = async () => {
    if (loadingDemo) return

    setLoadingDemo(true)
    setDemoError('')

    try {
      await createDemoData(addStructure, createProjet)
      await refreshStructures()
      setDemoCreated(true)
      setTimeout(() => setDemoCreated(false), 5000)
    } catch (error: any) {
      console.error('Erreur création données demo:', error)
      setDemoError(error.message || 'Erreur lors de la création des données')
    } finally {
      setLoadingDemo(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome & Quick Actions */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Bonjour
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Bienvenue sur votre espace MDI.fr. Suivez ces 3 etapes pour gerer votre patrimoine immobilier.
            </p>

            {/* Trois boutons principaux */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Bouton Mes Associes */}
              <Link to="/profile" className="block group">
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg transition-transform duration-300 group-hover:scale-110">
                        <Briefcase className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                        Etape 1
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Mes Associes
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Ajoutez vos associes, societes et structures juridiques qui composeront vos projets.
                    </p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <ul className="space-y-1">
                        <li>- Personnes physiques (associes)</li>
                        <li>- Societes (SCI, SARL, etc.)</li>
                        <li>- Informations et detention</li>
                        <li>- Gestion des parts sociales</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <AnimatedButton
                        onClick={() => navigate('/profile')}
                        icon={Briefcase}
                        variant="blue"
                        size="md"
                        className="w-full"
                      >
                        Accéder à mes associés
                      </AnimatedButton>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Bouton Mes Projets */}
              <Link to="/projets" className="block group">
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg transition-transform duration-300 group-hover:scale-110">
                        <FolderOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        Etape 2
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Mes Projets Immobiliers
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Renseignez un ou plusieurs projets immobiliers avec leurs caracteristiques et financements.
                    </p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <ul className="space-y-1">
                        <li>- Details du bien immobilier</li>
                        <li>- Plan de financement</li>
                        <li>- Travaux et estimations</li>
                        <li>- Analyse de rentabilite</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <AnimatedButton
                        onClick={() => navigate('/projets')}
                        icon={FolderOpen}
                        variant="green"
                        size="md"
                        className="w-full"
                      >
                        Voir mes projets
                      </AnimatedButton>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* Bouton Mon Patrimoine */}
              <Link to="/patrimoine" className="block group">
                <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full transform hover:-translate-y-1">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg transition-transform duration-300 group-hover:scale-110">
                        <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded-full">
                        Etape 3
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Mon Patrimoine
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Visionnez l'ensemble de votre patrimoine immobilier et vos credits a un instant T.
                    </p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      <ul className="space-y-1">
                        <li>- Biens immobiliers</li>
                        <li>- Valeurs et loyers</li>
                        <li>- Credits en cours</li>
                        <li>- Vue d'ensemble consolidee</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <AnimatedButton
                        onClick={() => navigate('/patrimoine')}
                        icon={Building2}
                        variant="orange"
                        size="md"
                        className="w-full"
                      >
                        Voir mon patrimoine
                      </AnimatedButton>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* Bouton données de démonstration */}
            {structures.length === 0 && (
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
                <div className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                        <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Découvrir avec des données d'exemple
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Créez automatiquement 3 associés, 2 sociétés et 3 projets immobiliers pour explorer l'application
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateDemoData}
                      disabled={loadingDemo || demoCreated}
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                        demoCreated
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loadingDemo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Création en cours...
                        </>
                      ) : demoCreated ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Données créées !
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Créer les données d'exemple
                        </>
                      )}
                    </button>
                  </div>
                  {demoError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{demoError}</p>
                  )}
                </div>
              </Card>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}

export default Dashboard 