import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Users, TrendingUp, TrendingDown, User, Briefcase, DollarSign, Receipt, Wallet, Network, PiggyBank } from 'lucide-react'
import Card from '@/components/ui/Card'
import AnimatedButton from '@/components/ui/AnimatedButton'
import SectionHeader from '@/components/ui/SectionHeader'
import api from '@/services/api'
import OrganigrammePatrimonial from '@/components/patrimoine/OrganigrammePatrimonial'

type TabType = 'identite' | 'situation_pro' | 'revenus' | 'charges' | 'patrimoine' | 'economies' | 'organigramme'

interface VuePatrimoniale {
  structure: any
  societes: Array<{
    societe: any
    pourcentageDetention: number
    dateDebut?: Date
    dateFin?: Date
  }>
  biens: Array<{
    bien: any
    pourcentageDetention: number
    typeDetention?: string
    dateDebut?: Date
    dateFin?: Date
  }>
  comptes: any[]
  credits: Array<{
    credit: any
    pourcentageEngagement: number
    typeEngagement?: string
  }>
  detenuePar: Array<{
    detenteur: any
    pourcentageDetention: number
    dateDebut?: Date
    dateFin?: Date
  }>
  totalActifsPersonnels: number
  totalActifsProfessionnels: number
  totalPassifsPersonnels: number
  totalPassifsProfessionnels: number
  patrimoineNetPersonnel: number
  patrimoineNetProfessionnel: number
}

const StructureDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('identite')
  const [patrimoine, setPatrimoine] = useState<VuePatrimoniale | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadPatrimoine()
    }
  }, [id])

  const loadPatrimoine = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/structures/${id}/patrimoine`)
      setPatrimoine(response.data.data.patrimoine)
    } catch (error) {
      console.error('Erreur lors du chargement du patrimoine:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!patrimoine) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Structure non trouvée</p>
          <AnimatedButton onClick={() => navigate('/profile')} icon={ArrowLeft} variant="blue">
            Retour
          </AnimatedButton>
        </div>
      </div>
    )
  }

  const structure = patrimoine.structure
  const isPersonnePhysique = structure.type === 'PERSONNE_PHYSIQUE'

  const tabs = [
    { id: 'identite' as const, label: 'Identité', icon: User },
    { id: 'situation_pro' as const, label: 'Situation pro', icon: Briefcase },
    { id: 'revenus' as const, label: 'Revenus', icon: DollarSign },
    { id: 'charges' as const, label: 'Charges', icon: Receipt },
    { id: 'patrimoine' as const, label: 'Patrimoine', icon: Wallet },
    { id: 'economies' as const, label: 'Économies', icon: PiggyBank },
    { id: 'organigramme' as const, label: 'Organigramme', icon: Network }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${isPersonnePhysique ? 'bg-blue-100' : 'bg-green-100'} rounded-lg`}>
                  {isPersonnePhysique ? (
                    <Users className={`h-6 w-6 ${isPersonnePhysique ? 'text-blue-600' : 'text-green-600'}`} />
                  ) : (
                    <Building2 className={`h-6 w-6 ${isPersonnePhysique ? 'text-blue-600' : 'text-green-600'}`} />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{structure.nom}</h1>
                  <p className="text-sm text-gray-500">
                    {isPersonnePhysique ? 'Personne physique' : structure.type}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Actifs Personnels</span>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(patrimoine.totalActifsPersonnels)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-900">Actifs Professionnels</span>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(patrimoine.totalActifsProfessionnels)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-900">Passifs Personnels</span>
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {formatCurrency(patrimoine.totalPassifsPersonnels)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-900">Passifs Professionnels</span>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(patrimoine.totalPassifsProfessionnels)}
              </p>
            </div>
          </Card>
        </div>

        {/* Patrimoine Net */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-900">Patrimoine Net Personnel</span>
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-indigo-900">
                {formatCurrency(patrimoine.patrimoineNetPersonnel)}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Patrimoine Net Professionnel</span>
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-purple-900">
                {formatCurrency(patrimoine.patrimoineNetProfessionnel)}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Identité Tab */}
        {activeTab === 'identite' && (
          <div className="space-y-6">
            <SectionHeader
              title="Informations d'identité"
              subtitle="Coordonnées et informations principales"
              icon={User}
            />
            <Card>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {isPersonnePhysique && structure.personnePhysique ? (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Prénom</p>
                        <p className="font-medium text-lg">{structure.personnePhysique.prenom || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nom</p>
                        <p className="font-medium text-lg">{structure.personnePhysique.nom || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date de naissance</p>
                        <p className="font-medium text-lg">
                          {structure.personnePhysique.dateNaissance
                            ? new Date(structure.personnePhysique.dateNaissance).toLocaleDateString('fr-FR')
                            : 'Non renseignée'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Lieu de naissance</p>
                        <p className="font-medium text-lg">{structure.personnePhysique.lieuNaissance || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nationalité</p>
                        <p className="font-medium text-lg">{structure.personnePhysique.nationalite || 'Non renseignée'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-lg">{structure.email || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Téléphone</p>
                        <p className="font-medium text-lg">{structure.telephone || 'Non renseigné'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Adresse</p>
                        <p className="font-medium text-lg">{structure.adresse || 'Non renseignée'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">Nom / Raison sociale</p>
                        <p className="font-medium text-lg">{structure.nom}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Type de structure</p>
                        <p className="font-medium text-lg">{structure.type}</p>
                      </div>
                      {structure.personneMorale && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">SIRET</p>
                            <p className="font-medium text-lg">{structure.personneMorale.siret || 'Non renseigné'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Capital social</p>
                            <p className="font-medium text-lg">
                              {structure.personneMorale.capitalSocial
                                ? formatCurrency(structure.personneMorale.capitalSocial)
                                : 'Non renseigné'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date de création</p>
                            <p className="font-medium text-lg">
                              {structure.personneMorale.dateCreation
                                ? new Date(structure.personneMorale.dateCreation).toLocaleDateString('fr-FR')
                                : 'Non renseignée'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Gérant</p>
                            <p className="font-medium text-lg">{structure.personneMorale.gerant || 'Non renseigné'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Régime fiscal</p>
                            <p className="font-medium text-lg">{structure.personneMorale.regimeFiscal || 'Non renseigné'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500">Objet social</p>
                            <p className="font-medium">{structure.personneMorale.objetSocial || 'Non renseigné'}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-lg">{structure.email || 'Non renseigné'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Téléphone</p>
                        <p className="font-medium text-lg">{structure.telephone || 'Non renseigné'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Adresse</p>
                        <p className="font-medium text-lg">{structure.adresse || 'Non renseignée'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Situation Professionnelle Tab */}
        {activeTab === 'situation_pro' && (
          <div className="space-y-6">
            <SectionHeader
              title="Situation professionnelle"
              subtitle="Emploi, statut et activité professionnelle"
              icon={Briefcase}
            />
            <Card>
              <div className="p-6">
                {isPersonnePhysique && structure.personnePhysique ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-500">Profession</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.profession || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Employeur</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.employeur || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type de contrat</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.typeContrat || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ancienneté</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.anciennete || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Situation familiale</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.situationFamiliale || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nombre d'enfants</p>
                      <p className="font-medium text-lg">{structure.personnePhysique.nombreEnfants ?? 'Non renseigné'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Informations non disponibles pour ce type de structure
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Revenus Tab */}
        {activeTab === 'revenus' && (
          <div className="space-y-6">
            <SectionHeader
              title="Revenus"
              subtitle="Sources de revenus et montants mensuels"
              icon={DollarSign}
            />
            <Card>
              <div className="p-6">
                {isPersonnePhysique && structure.personnePhysique ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">Salaire mensuel net</p>
                        <p className="font-bold text-2xl text-green-900">
                          {structure.personnePhysique.salaireMensuelNet
                            ? formatCurrency(structure.personnePhysique.salaireMensuelNet)
                            : 'Non renseigné'}
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">Autres revenus mensuels</p>
                        <p className="font-bold text-2xl text-blue-900">
                          {structure.personnePhysique.autresRevenus
                            ? formatCurrency(structure.personnePhysique.autresRevenus)
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-sm text-indigo-700">Total revenus mensuels</p>
                        <p className="font-bold text-2xl text-indigo-900">
                          {formatCurrency(
                            (structure.personnePhysique.salaireMensuelNet || 0) +
                            (structure.personnePhysique.autresRevenus || 0)
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Revenus annuels estimés</p>
                      <p className="font-bold text-3xl text-gray-900">
                        {formatCurrency(
                          ((structure.personnePhysique.salaireMensuelNet || 0) +
                          (structure.personnePhysique.autresRevenus || 0)) * 12
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Informations non disponibles pour ce type de structure
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Charges Tab */}
        {activeTab === 'charges' && (
          <div className="space-y-6">
            <SectionHeader
              title="Charges"
              subtitle="Dépenses récurrentes et charges mensuelles"
              icon={Receipt}
            />
            <Card>
              <div className="p-6">
                {isPersonnePhysique && structure.personnePhysique ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-700">Charges mensuelles</p>
                        <p className="font-bold text-2xl text-orange-900">
                          {structure.personnePhysique.chargesMensuelles
                            ? formatCurrency(structure.personnePhysique.chargesMensuelles)
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700">Crédits en cours (mensuel)</p>
                        <p className="font-bold text-2xl text-red-900">
                          {structure.personnePhysique.creditEnCours
                            ? formatCurrency(structure.personnePhysique.creditEnCours)
                            : formatCurrency(0)}
                        </p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-700">Total charges mensuelles</p>
                        <p className="font-bold text-2xl text-amber-900">
                          {formatCurrency(
                            (structure.personnePhysique.chargesMensuelles || 0) +
                            (structure.personnePhysique.creditEnCours || 0)
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Calcul du reste à vivre */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Reste à vivre mensuel</p>
                      <p className={`font-bold text-3xl ${
                        ((structure.personnePhysique.salaireMensuelNet || 0) +
                        (structure.personnePhysique.autresRevenus || 0) -
                        (structure.personnePhysique.chargesMensuelles || 0) -
                        (structure.personnePhysique.creditEnCours || 0)) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(
                          (structure.personnePhysique.salaireMensuelNet || 0) +
                          (structure.personnePhysique.autresRevenus || 0) -
                          (structure.personnePhysique.chargesMensuelles || 0) -
                          (structure.personnePhysique.creditEnCours || 0)
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        (Revenus - Charges - Crédits)
                      </p>
                    </div>

                    {/* Épargne disponible */}
                    {structure.personnePhysique.epargneDisponible && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-700">Épargne disponible</p>
                        <p className="font-bold text-2xl text-purple-900">
                          {formatCurrency(structure.personnePhysique.epargneDisponible)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Informations non disponibles pour ce type de structure
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Patrimoine Tab */}
        {activeTab === 'patrimoine' && (
          <div className="space-y-6">
            <SectionHeader
              title="Patrimoine"
              subtitle="Vue d'ensemble des actifs et détentions"
              icon={Wallet}
            />
            {/* Détenteurs */}
            {patrimoine.detenuePar.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Détenu par</h3>
                  <div className="space-y-3">
                    {patrimoine.detenuePar.map((detention, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{detention.detenteur.nom}</p>
                            <p className="text-sm text-gray-500">{detention.detenteur.type}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {detention.pourcentageDetention}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Sociétés détenues */}
            {patrimoine.societes.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sociétés détenues</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patrimoine.societes.map((item, idx) => (
                      <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{item.societe.nom}</p>
                            <p className="text-xs text-gray-500">{item.societe.type}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {item.pourcentageDetention}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Biens immobiliers */}
            {patrimoine.biens.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Biens immobiliers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patrimoine.biens.map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        item.bien.type_patrimoine === 'Personnel'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{item.bien.nom}</p>
                            <p className="text-xs text-gray-500">{item.bien.type_bien}</p>
                            <p className="text-xs text-gray-600 mt-1">{item.bien.ville}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {item.pourcentageDetention}%
                          </span>
                        </div>
                        {item.bien.valeur_actuelle && (
                          <p className="text-sm font-semibold text-gray-900 mt-2">
                            {formatCurrency(item.bien.valeur_actuelle)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Crédits */}
            {patrimoine.credits.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Crédits et emprunts</h3>
                  <div className="space-y-3">
                    {patrimoine.credits.map((item, idx) => (
                      <div key={idx} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{item.credit.nom}</p>
                            <p className="text-xs text-gray-500">{item.credit.type_credit} - {item.credit.banque}</p>
                          </div>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            {item.pourcentageEngagement}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Capital restant</p>
                            <p className="font-semibold">{formatCurrency(item.credit.montant_restant_du)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Mensualité</p>
                            <p className="font-semibold">{formatCurrency(item.credit.mensualite)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Taux</p>
                            <p className="font-semibold">{item.credit.taux_interet}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Durée</p>
                            <p className="font-semibold">{item.credit.duree_mois} mois</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

          </div>
        )}

        {/* Économies Tab */}
        {activeTab === 'economies' && (
          <div className="space-y-6">
            <SectionHeader
              title="Comptes bancaires et économies"
              subtitle="Liquidités et placements financiers"
              icon={PiggyBank}
            />
            <Card>
              <div className="p-6">
                {!patrimoine.comptes || patrimoine.comptes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Aucun compte bancaire enregistré
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patrimoine.comptes.map((compte: any, idx: number) => (
                      <div key={idx} className={`p-4 rounded-lg border ${
                        compte.typePatrimoine === 'Personnel'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-indigo-50 border-indigo-200'
                      }`}>
                        <div className="mb-2">
                          <p className="font-semibold text-gray-900">{compte.nom}</p>
                          <p className="text-xs text-gray-500">{compte.typeCompte.replace(/_/g, ' ')}</p>
                          {compte.banque && <p className="text-xs text-gray-600 mt-1">{compte.banque}</p>}
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(compte.solde)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Organigramme Tab */}
        {activeTab === 'organigramme' && (
          <div className="space-y-6">
            <SectionHeader
              title="Organigramme Patrimonial"
              subtitle="Visualisation interactive des relations patrimoniales"
              icon={Network}
            />
            <Card>
              <div className="p-6">
                <OrganigrammePatrimonial patrimoine={patrimoine} />
                <div className="mt-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                    <span>Personnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                    <span>Professionnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 border-2 border-orange-400 rounded"></div>
                    <span>Crédit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border-2 border-purple-400 rounded"></div>
                    <span>Économie</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default StructureDetail
