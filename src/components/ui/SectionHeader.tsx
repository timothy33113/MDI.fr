import React from 'react'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: React.ReactNode
  variant?: 'blue' | 'green'
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  variant = 'blue'
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50',
      icon: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50',
      icon: 'text-green-600 dark:text-green-400'
    }
  }

  const colors = colorClasses[variant]

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${colors.bg}`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export default SectionHeader
