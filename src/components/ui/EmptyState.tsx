import React from 'react'
import { LucideIcon, Plus } from 'lucide-react'
import Card from './Card'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  icon: LucideIcon
  variant?: 'blue' | 'green' | 'purple' | 'orange'
  benefits?: Array<{ title: string; description: string }>
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  variant = 'blue',
  benefits
}) => {
  const variantClasses = {
    blue: {
      gradient: 'from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800',
      border: 'hover:border-blue-500 dark:hover:border-blue-400',
      iconBg: 'from-blue-400 to-blue-600',
      text: 'text-blue-600 dark:text-blue-400',
      infoBg: 'from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border-purple-200 dark:border-purple-800',
      infoIconBg: 'bg-purple-100 dark:bg-purple-900/50',
      infoIcon: 'text-purple-600 dark:text-purple-400'
    },
    green: {
      gradient: 'from-green-50 to-white dark:from-green-900/20 dark:to-gray-800',
      border: 'hover:border-green-500 dark:hover:border-green-400',
      iconBg: 'from-green-400 to-green-600',
      text: 'text-green-600 dark:text-green-400',
      infoBg: 'from-amber-50 to-white dark:from-amber-900/20 dark:to-gray-800 border-amber-200 dark:border-amber-800',
      infoIconBg: 'bg-amber-100 dark:bg-amber-900/50',
      infoIcon: 'text-amber-600 dark:text-amber-400'
    },
    purple: {
      gradient: 'from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800',
      border: 'hover:border-purple-500 dark:hover:border-purple-400',
      iconBg: 'from-purple-400 to-purple-600',
      text: 'text-purple-600 dark:text-purple-400',
      infoBg: 'from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-200 dark:border-blue-800',
      infoIconBg: 'bg-blue-100 dark:bg-blue-900/50',
      infoIcon: 'text-blue-600 dark:text-blue-400'
    },
    orange: {
      gradient: 'from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800',
      border: 'hover:border-orange-500 dark:hover:border-orange-400',
      iconBg: 'from-orange-400 to-orange-600',
      text: 'text-orange-600 dark:text-orange-400',
      infoBg: 'from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border-red-200 dark:border-red-800',
      infoIconBg: 'bg-red-100 dark:bg-red-900/50',
      infoIcon: 'text-red-600 dark:text-red-400'
    }
  }

  const classes = variantClasses[variant]

  return (
    <div className="space-y-6">
      {/* Action Card */}
      <Card
        className={`group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-dashed border-gray-300 ${classes.border} bg-gradient-to-br ${classes.gradient}`}
        onClick={onAction}
      >
        <div className="p-8 text-center">
          <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br ${classes.iconBg} mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
            <Icon className="h-10 w-10 text-white" />
          </div>
          <h3 className={`text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:${classes.text} transition-colors`}>
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {description}
          </p>
          <div className={`inline-flex items-center ${classes.text} font-medium group-hover:gap-3 transition-all`}>
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            <span>{actionLabel}</span>
          </div>
        </div>
      </Card>

      {/* Info Card - Pleine largeur */}
      {benefits && (
        <Card className={`bg-gradient-to-br ${classes.infoBg}`}>
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center h-12 w-12 rounded-full ${classes.infoIconBg}`}>
                <svg className={`h-6 w-6 ${classes.infoIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Avantages
              </h3>
            </div>
            <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    <strong>{benefit.title}</strong> : {benefit.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}
    </div>
  )
}

export default EmptyState
