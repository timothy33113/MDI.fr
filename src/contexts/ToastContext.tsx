import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// Types de toast
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Interface pour un toast individuel
export interface Toast {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

// Interface pour le contexte
interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
}

// Nombre maximum de toasts visibles
const MAX_VISIBLE_TOASTS = 3

// Duree par defaut (3 secondes)
const DEFAULT_DURATION = 3000

const ToastContext = createContext<ToastContextType | undefined>(undefined)

// Generateur d'ID unique
let toastId = 0
const generateId = () => `toast-${++toastId}-${Date.now()}`

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId()
    const duration = toast.duration ?? DEFAULT_DURATION

    setToasts(prev => {
      // Si on depasse le max, on retire les plus anciens
      const newToasts = [...prev, { ...toast, id, duration }]
      if (newToasts.length > MAX_VISIBLE_TOASTS) {
        return newToasts.slice(-MAX_VISIBLE_TOASTS)
      }
      return newToasts
    })

    // Auto-dismiss apres la duree specifiee
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }, [removeToast])

  // Fonctions utilitaires pour chaque type de toast
  const success = useCallback((message: string, title?: string) => {
    return addToast({ type: 'success', message, title })
  }, [addToast])

  const error = useCallback((message: string, title?: string) => {
    return addToast({ type: 'error', message, title })
  }, [addToast])

  const warning = useCallback((message: string, title?: string) => {
    return addToast({ type: 'warning', message, title })
  }, [addToast])

  const info = useCallback((message: string, title?: string) => {
    return addToast({ type: 'info', message, title })
  }, [addToast])

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  )
}

// Hook pour utiliser le contexte toast
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default ToastContext
