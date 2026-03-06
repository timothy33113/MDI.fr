import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onConfirm?: () => void
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  closeOnBackdropClick?: boolean
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmVariant = 'primary',
  size = 'medium',
  closeOnBackdropClick = true
}) => {
  if (!isOpen) return null

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-3xl',
    xlarge: 'max-w-6xl'
  }

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-950/30 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative bg-white rounded-3xl shadow-2xl ${sizeClasses[size]} w-full ${size === 'small' ? 'max-h-[50vh]' : size === 'medium' ? 'max-h-[90vh]' : 'h-[90vh]'} flex flex-col animate-[modalIn_0.2s_ease-out]`}>
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-2 bg-white rounded-t-3xl sticky top-0 z-10">
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className={`px-8 py-5 ${size === 'small' ? '' : 'overflow-y-auto flex-1'}`}>
            {children}
          </div>

          {/* Footer */}
          {onConfirm && (
            <div className="flex justify-end gap-3 px-8 py-5 bg-white rounded-b-3xl sticky bottom-0 z-10">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  confirmVariant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal
