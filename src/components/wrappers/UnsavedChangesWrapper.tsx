import React from 'react'
import { Save } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

interface UnsavedChangesWrapperProps {
  hasChanges: boolean
  onSave: () => void | Promise<void>
  isSaving?: boolean
  children: React.ReactNode
}

export const UnsavedChangesWrapper: React.FC<UnsavedChangesWrapperProps> = ({
  hasChanges,
  onSave,
  isSaving = false,
  children
}) => {
  const { showModal, handleNavigation, confirmNavigation, saveAndNavigate, cancelNavigation } = useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    onSave
  })

  return (
    <>
      {/* Sticky Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="shadow-lg flex items-center gap-2 px-6 py-3"
            size="lg"
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      )}

      {/* Content */}
      {children}

      {/* Modal de confirmation de sortie */}
      <Modal
        isOpen={showModal}
        onClose={cancelNavigation}
        title="Modifications non sauvegardées"
        onConfirm={confirmNavigation}
        confirmText="Quitter sans sauvegarder"
        cancelText="Rester sur la page"
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Vous avez des modifications non sauvegardées. Si vous quittez maintenant, ces modifications seront perdues.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={saveAndNavigate} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder et quitter
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
