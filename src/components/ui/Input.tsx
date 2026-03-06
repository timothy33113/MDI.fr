import React from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <div className="text-gray-400">
              {icon}
            </div>
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 border border-gray-200 rounded-xl',
            'bg-white text-gray-900',
            'placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300',
            'transition-all',
            icon && 'pl-10',
            error && 'border-red-400 focus:ring-red-500/10 focus:border-red-400',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
