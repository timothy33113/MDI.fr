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
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
    red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center overflow-hidden text-white bg-gradient-to-r ${variantClasses[variant]} ${sizeClasses[size]} rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 font-medium ${className}`}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 w-0 bg-white transition-all duration-300 ease-out group-hover:w-full opacity-10"></div>

      {/* Left icon */}
      {Icon && (
        <Icon className={`${iconSizeClasses[size]} mr-2 group-hover:rotate-12 transition-transform duration-300`} />
      )}

      {/* Content */}
      <span className="relative">{children}</span>

      {/* Right icon */}
      {IconRight && (
        <IconRight className={`${iconSizeClasses[size]} ml-2 group-hover:rotate-90 transition-transform duration-300`} />
      )}
    </button>
  )
}

export default AnimatedButton
