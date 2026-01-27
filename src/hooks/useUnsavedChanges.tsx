import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean
  onSave?: () => void | Promise<void>
}

export const useUnsavedChanges = ({ hasUnsavedChanges, onSave }: UseUnsavedChangesOptions) => {
  const [showModal, setShowModal] = useState(false)
  const [nextLocation, setNextLocation] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Prevent navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleNavigation = useCallback((path: string) => {
    if (hasUnsavedChanges) {
      setNextLocation(path)
      setShowModal(true)
      return false
    }
    navigate(path)
    return true
  }, [hasUnsavedChanges, navigate])

  const confirmNavigation = useCallback(() => {
    if (nextLocation) {
      navigate(nextLocation)
      setShowModal(false)
      setNextLocation(null)
    }
  }, [nextLocation, navigate])

  const saveAndNavigate = useCallback(async () => {
    if (onSave) {
      await onSave()
    }
    if (nextLocation) {
      navigate(nextLocation)
      setShowModal(false)
      setNextLocation(null)
    }
  }, [onSave, nextLocation, navigate])

  const cancelNavigation = useCallback(() => {
    setShowModal(false)
    setNextLocation(null)
  }, [])

  return {
    showModal,
    handleNavigation,
    confirmNavigation,
    saveAndNavigate,
    cancelNavigation
  }
}
