import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/utils/cn'

interface ThemeToggleProps {
  className?: string
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center w-10 h-10 rounded-xl',
        'text-gray-500 hover:text-gray-700',
        'hover:bg-gray-100',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'transition-colors duration-200',
        className
      )}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      <span className="sr-only">
        {isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      </span>

      {/* Sun icon */}
      <Sun
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        )}
      />

      {/* Moon icon */}
      <Moon
        className={cn(
          'absolute h-5 w-5 transition-all duration-300',
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </button>
  )
}

export default ThemeToggle
