import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useStructuresContext } from '@/contexts/StructuresContext'
import AnimatedButton from '@/components/ui/AnimatedButton'
import Card from '@/components/ui/Card'
import { Briefcase, FolderOpen, Building2, User, Euro, TrendingDown, Calculator } from 'lucide-react'
import { Structure } from '@/types'

// Formateur de montants en euros
const formatMontant = (montant: number | undefined): string => {
  if (montant === undefined || montant === null) return '-'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant)
}

interface AssociesTableProps {
  structures: Structure[]
  loading: boolean
}

const AssociesTable: React.FC<AssociesTableProps> = ({ structures, loading }) => {
  const personnesPhysiques = structures.filter(s => s.type === 'PERSONNE_PHYSIQUE')

  if (loading) {
    return (
      <Card className="mb-8">
        <div className="p-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (personnesPhysiques.length === 0) {
    return (
      <Card className="mb-8">
        <div className="p-6 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun associe enregistre
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Commencez par ajouter vos associes pour visualiser leurs informations financieres.
          </p>
          <Link to="/profile">
            <AnimatedButton icon={Briefcase} variant="blue" size="md">
              Ajouter un associe
            </AnimatedButton>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mb-8 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recapitulatif des associes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {personnesPhysiques.length} associe{personnesPhysiques.length > 1 ? 's' : ''} enregistre{personnesPhysiques.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Associe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  Revenus mensuels
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Charges mensuelles
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Calculator className="h-3 w-3" />
                  Reste a vivre
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Situation
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {personnesPhysiques.map((structure) => {
              const pp = structure.personnePhysique
              const revenus = pp?.revenus
              const charges = pp?.charges

              const totalRevenus = revenus?.totalMensuel ?? 0
              const totalCharges = charges?.totalMensuel ?? 0
              const resteAVivre = totalRevenus - totalCharges

              return (
                <tr
                  key={structure.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        {structure.photo ? (
                          <img
                            src={structure.photo}
                            alt={structure.nom}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                            {structure.nom.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {structure.nom}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {pp?.emploi || 'Non renseigne'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatMontant(totalRevenus)}
                    </div>
                    {revenus && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Salaire: {formatMontant(revenus.salaireMensuelNet)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">
                      {formatMontant(totalCharges)}
                    </div>
                    {charges && charges.loyerMensuel > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Loyer: {formatMontant(charges.loyerMensuel)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-semibold ${
                      resteAVivre >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatMontant(resteAVivre)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pp?.situationFamiliale === 'Marie' || pp?.situationFamiliale === 'Pacse'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {pp?.situationFamiliale || 'Non renseigne'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Ligne de total */}
          <tfoot className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Total
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatMontant(
                    personnesPhysiques.reduce((sum, s) =>
                      sum + (s.personnePhysique?.revenus?.totalMensuel ?? 0), 0
                    )
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatMontant(
                    personnesPhysiques.reduce((sum, s) =>
                      sum + (s.personnePhysique?.charges?.totalMensuel ?? 0), 0
                    )
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-semibold ${
                  personnesPhysiques.reduce((sum, s) => {
                    const rev = s.personnePhysique?.revenus?.totalMensuel ?? 0
                    const chg = s.personnePhysique?.charges?.totalMensuel ?? 0
                    return sum + (rev - chg)
                  }, 0) >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatMontant(
                    personnesPhysiques.reduce((sum, s) => {
                      const rev = s.personnePhysique?.revenus?.totalMensuel ?? 0
                      const chg = s.personnePhysique?.charges?.totalMensuel ?? 0
                      return sum + (rev - chg)
                    }, 0)
                  )}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {/* Vide pour la colonne situation */}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { structures, loading: structuresLoading } = useStructuresContext()

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

            {/* Tableau récapitulatif des associés */}
            <AssociesTable structures={structures} loading={structuresLoading} />

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
          </div>

        </div>
      </main>
    </div>
  )
}

export default Dashboard 