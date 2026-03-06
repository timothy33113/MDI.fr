import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useStructuresContext } from '@/contexts/StructuresContext'
import Card from '@/components/ui/Card'
import { Briefcase, FolderOpen, Building2, Sparkles, Loader2, Check, ArrowRight } from 'lucide-react'
import { createDemoData } from '@/services/demoData'
import api from '@/services/api'

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { structures, addStructure, refreshStructures } = useStructuresContext()
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [demoCreated, setDemoCreated] = useState(false)
  const [demoError, setDemoError] = useState('')
  const [projetsCount, setProjetsCount] = useState(0)

  useEffect(() => {
    api.get('/projets').then(res => setProjetsCount(res.data?.length || 0)).catch(() => {})
  }, [demoCreated])

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
      console.error('Erreur creation donnees demo:', error)
      setDemoError(error.message || 'Erreur lors de la creation des donnees')
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const steps = [
    {
      number: '01',
      title: 'Mes Associes',
      description: 'Ajoutez vos associes, societes et structures juridiques.',
      details: ['Personnes physiques', 'Societes (SCI, SARL...)', 'Gestion des parts sociales'],
      icon: Briefcase,
      path: '/profile',
      buttonLabel: 'Acceder aux associes',
      accent: 'coral' as const,
    },
    {
      number: '02',
      title: 'Mes Projets',
      description: 'Renseignez vos projets immobiliers avec financements et travaux.',
      details: ['Details du bien', 'Plan de financement', 'Analyse de rentabilite'],
      icon: FolderOpen,
      path: '/projets',
      buttonLabel: 'Voir mes projets',
      accent: 'honey' as const,
    },
    {
      number: '03',
      title: 'Mon Patrimoine',
      description: 'Visionnez l\'ensemble de votre patrimoine a un instant T.',
      details: ['Biens immobiliers', 'Credits en cours', 'Vue consolidee'],
      icon: Building2,
      path: '/patrimoine',
      buttonLabel: 'Voir mon patrimoine',
      accent: 'gray' as const,
    },
  ]

  const accentStyles = {
    coral: {
      iconBg: 'bg-coral-100 group-hover:bg-coral-400',
      iconText: 'text-coral-500 group-hover:text-white',
      number: 'text-coral-200',
      dot: 'bg-coral-300',
      border: 'group-hover:border-coral-200',
    },
    honey: {
      iconBg: 'bg-honey-100 group-hover:bg-honey-400',
      iconText: 'text-honey-600 group-hover:text-gray-900',
      number: 'text-honey-200',
      dot: 'bg-honey-400',
      border: 'group-hover:border-honey-200',
    },
    gray: {
      iconBg: 'bg-gray-100 group-hover:bg-gray-800',
      iconText: 'text-gray-500 group-hover:text-white',
      number: 'text-gray-200',
      dot: 'bg-gray-300',
      border: 'group-hover:border-gray-300',
    },
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm text-gray-500 mb-1">Workspace</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Bonjour{user.prenom ? `, ${user.prenom}` : ''}
          </h1>
          <p className="text-gray-500 mt-2">
            Bienvenue sur votre espace MDI.fr
          </p>

          {/* KPIs */}
          {(structures.length > 0 || projetsCount > 0) && (
            <div className="flex items-center gap-4 mt-4">
              {(() => {
                const associes = structures.filter(s => s.type === 'PERSONNE_PHYSIQUE').length
                const societes = structures.filter(s => s.type !== 'PERSONNE_PHYSIQUE').length
                return (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-sm">
                      <Briefcase className="h-3.5 w-3.5 text-coral-400" />
                      <span className="font-semibold text-gray-900">{associes}</span>
                      <span className="text-gray-500">associé{associes > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-honey-500" />
                      <span className="font-semibold text-gray-900">{societes}</span>
                      <span className="text-gray-500">société{societes > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-sm">
                      <FolderOpen className="h-3.5 w-3.5 text-gray-500" />
                      <span className="font-semibold text-gray-900">{projetsCount}</span>
                      <span className="text-gray-500">projet{projetsCount > 1 ? 's' : ''}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {steps.map((step) => {
            const accent = accentStyles[step.accent]
            return (
              <Link key={step.path} to={step.path} className="block group">
                <Card className={`h-full hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${accent.border}`}>
                  <div className="flex flex-col h-full">
                    {/* Step number + icon */}
                    <div className="flex items-start justify-between mb-6">
                      <span className={`text-4xl font-bold ${accent.number} tracking-tighter`}>
                        {step.number}
                      </span>
                      <div className={`p-2.5 rounded-xl transition-all duration-300 ${accent.iconBg}`}>
                        <step.icon className={`h-5 w-5 transition-colors duration-300 ${accent.iconText}`} />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {step.description}
                    </p>

                    {/* Details list */}
                    <ul className="space-y-1.5 mb-6 flex-1">
                      {step.details.map((detail) => (
                        <li key={detail} className="text-sm text-gray-400 flex items-center gap-2">
                          <span className={`w-1 h-1 ${accent.dot} rounded-full flex-shrink-0`} />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    {/* Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm font-medium text-gray-900">{step.buttonLabel}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Demo data banner */}
        {structures.length === 0 && (
          <Card className="border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Decouvrir avec des donnees d'exemple
                  </h3>
                  <p className="text-sm text-gray-500">
                    Creez automatiquement 3 associes, 2 societes et 3 projets pour explorer l'application
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreateDemoData}
                disabled={loadingDemo || demoCreated}
                className={`inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  demoCreated
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loadingDemo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creation en cours...
                  </>
                ) : demoCreated ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Donnees creees !
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Creer les donnees d'exemple
                  </>
                )}
              </button>
            </div>
            {demoError && (
              <p className="mt-3 text-sm text-red-600">{demoError}</p>
            )}
          </Card>
        )}
      </main>
    </div>
  )
}

export default Dashboard
