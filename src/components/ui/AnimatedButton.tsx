import React from 'react'
import { LucideIcon } from 'lucide-react'

interface AnimatedButtonProps {
  onClick: () => void
  children: React.ReactNode
  icon?: LucideIcon
  iconRight?: LucideIcon
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onClick,
  children,
  icon: Icon,
  iconRight: IconRight,
  variant = 'blue',
  size = 'md',
  className = ''
}) => {
  const variantClasses = {
    blue: 'bg-gray-900 hover:bg-gray-800 text-white',
    green: 'bg-gray-900 hover:bg-gray-800 text-white',
    purple: 'bg-gray-900 hover:bg-gray-800 text-white',
    orange: 'bg-gray-900 hover:bg-gray-800 text-white',
    red: 'bg-red-600 hover:bg-red-700 text-white'
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center justify-center ${variantClasses[variant]} ${sizeClasses[size]} rounded-xl transition-all duration-200 font-medium hover:shadow-md ${className}`}
    >
      {Icon && (
        <Icon className={`${iconSizeClasses[size]} mr-2 transition-transform duration-200 group-hover:-translate-y-px`} />
      )}

      <span>{children}</span>

      {IconRight && (
        <IconRight className={`${iconSizeClasses[size]} ml-2 transition-transform duration-200 group-hover:translate-x-0.5`} />
      )}
    </button>
  )
}

export default AnimatedButton
