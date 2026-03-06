import React, { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { Toast as ToastType, ToastType as ToastVariant, useToast } from '@/contexts/ToastContext'
import { cn } from '@/utils/cn'

// Configuration des icones et styles par type
const toastConfig: Record<ToastVariant, {
  icon: React.FC<{ className?: string }>
  bgColor: string
  borderColor: string
  iconColor: string
  progressColor: string
}> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    progressColor: 'bg-green-500'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    progressColor: 'bg-red-500'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    progressColor: 'bg-amber-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    progressColor: 'bg-blue-500'
  }
}

// Composant Toast individuel
interface ToastItemProps {
  toast: ToastType
  onClose: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const duration = toast.duration || 5000

  // Animation de sortie
  const handleClose = () => {
    setIsExiting(true)
    setTimeout(onClose, 300) // Attendre la fin de l'animation
  }

  // Barre de progression
  useEffect(() => {
    if (duration <= 0) return

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration])

  return (
    <div
      className={cn(
        'relative w-full max-w-sm overflow-hidden rounded-xl border shadow-lg',
        'transform transition-all duration-300 ease-out',
        config.bgColor,
        config.borderColor,
        isExiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100 animate-slide-in-right'
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icone */}
          <div className={cn('flex-shrink-0', config.iconColor)}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900">
                {toast.title}
              </p>
            )}
            <p className={cn(
              'text-sm text-gray-700',
              toast.title && 'mt-1'
            )}>
              {toast.message}
            </p>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className={cn(
              'flex-shrink-0 rounded-md p-1.5',
              'text-gray-400 hover:text-gray-600',
              'hover:bg-gray-100 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
            )}
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barre de progression supprimée */}
    </div>
  )
}

// Conteneur de tous les toasts
const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}

export { ToastContainer, ToastItem }
export default ToastContainer
