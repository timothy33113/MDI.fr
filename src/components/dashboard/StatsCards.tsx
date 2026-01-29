import React from 'react'
import { Users, Building2, FolderKanban, TrendingUp } from 'lucide-react'
import { Structure, Projet } from '@/types'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  gradient: string
  iconColor: string
  delay?: number
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconColor,
  delay = 0
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 ${gradient} transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-default`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
      <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 rounded-full bg-white/5 blur-lg" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-white/70">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-xl ${iconColor} transition-transform duration-300 group-hover:rotate-12`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
    </div>
  )
}

interface StatsCardsProps {
  structures: Structure[]
  projets: Projet[]
  loading?: boolean
}

const StatsCards: React.FC<StatsCardsProps> = ({ structures, projets, loading = false }) => {
  // Calculer les statistiques
  const personnesPhysiques = structures.filter(s => s.type === 'PERSONNE_PHYSIQUE').length
  const societes = structures.filter(s => s.type !== 'PERSONNE_PHYSIQUE').length
  const totalProjets = projets.length

  // Projets en cours vs termines
  const projetsEnCours = projets.filter(p =>
    ['Analyse', 'En_Cours'].includes(p.status)
  ).length
  const projetsTermines = projets.filter(p =>
    ['Dossier_Complet', 'PDF_Genere', 'Archive'].includes(p.status)
  ).length

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Personnes physiques',
      value: personnesPhysiques,
      subtitle: 'Associes enregistres',
      icon: Users,
      gradient: 'bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800',
      iconColor: 'bg-blue-400/30'
    },
    {
      title: 'Societes',
      value: societes,
      subtitle: 'SCI, SARL, Holdings...',
      icon: Building2,
      gradient: 'bg-gradient-to-br from-purple-500 to-purple-700 dark:from-purple-600 dark:to-purple-800',
      iconColor: 'bg-purple-400/30'
    },
    {
      title: 'Projets immobiliers',
      value: totalProjets,
      subtitle: `${projetsEnCours} en cours`,
      icon: FolderKanban,
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800',
      iconColor: 'bg-emerald-400/30'
    },
    {
      title: 'Taux de completion',
      value: totalProjets > 0 ? `${Math.round((projetsTermines / totalProjets) * 100)}%` : '0%',
      subtitle: `${projetsTermines} dossier${projetsTermines > 1 ? 's' : ''} finalise${projetsTermines > 1 ? 's' : ''}`,
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800',
      iconColor: 'bg-orange-400/30'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.title}
          {...stat}
          delay={index * 100}
        />
      ))}
    </div>
  )
}

export default StatsCards
