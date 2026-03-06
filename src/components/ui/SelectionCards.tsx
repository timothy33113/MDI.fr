import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SelectionOption {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
}

interface SelectionCardsProps {
  options: SelectionOption[]
  value: string
  onChange: (value: string) => void
  columns?: 2 | 3 | 4
  variant?: 'coral' | 'honey' | 'default'
  disabled?: boolean
}

const variantStyles = {
  coral: {
    selected: 'bg-gradient-to-br from-coral-50 via-coral-100/60 to-honey-50 border-coral-300 shadow-sm',
    icon: 'text-coral-500',
    text: 'text-gray-900',
    desc: 'text-coral-600/80',
  },
  honey: {
    selected: 'bg-gradient-to-br from-honey-50 via-honey-100/60 to-coral-50 border-honey-400 shadow-sm',
    icon: 'text-honey-600',
    text: 'text-gray-900',
    desc: 'text-honey-700/80',
  },
  default: {
    selected: 'bg-gray-900 border-gray-900 shadow-sm',
    icon: 'text-white',
    text: 'text-white',
    desc: 'text-gray-300',
  },
}

const SelectionCards: React.FC<SelectionCardsProps> = ({
  options,
  value,
  onChange,
  columns = 3,
  variant = 'coral',
  disabled = false,
}) => {
  const styles = variantStyles[variant]

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-3', gridCols[columns])}>
      {options.map((option) => {
        const isSelected = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              'relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all duration-200',
              disabled && 'opacity-50 cursor-not-allowed',
              isSelected
                ? styles.selected
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
            )}
          >
            {Icon && (
              <div className={cn(
                'mb-2.5 transition-colors',
                isSelected ? styles.icon : 'text-gray-400'
              )}>
                <Icon className="h-6 w-6" />
              </div>
            )}
            <span className={cn(
              'text-sm font-semibold transition-colors',
              isSelected ? styles.text : 'text-gray-700'
            )}>
              {option.label}
            </span>
            {option.description && (
              <span className={cn(
                'text-xs mt-1 transition-colors',
                isSelected ? styles.desc : 'text-gray-400'
              )}>
                {option.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default SelectionCards
