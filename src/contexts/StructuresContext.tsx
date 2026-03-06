import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Structure, CreateStructureForm } from '@/types'
import api from '@/services/api'

interface StructuresContextType {
  structures: Structure[]
  loading: boolean
  error: string | null
  addStructure: (data: any) => Promise<Structure>
  getStructureById: (id: string) => Structure | null
  updateStructure: (id: string, data: any) => Promise<void>
  deleteStructure: (id: string) => Promise<void>
  refreshStructures: () => Promise<Structure[]>
}

const StructuresContext = createContext<StructuresContextType | undefined>(undefined)

export const StructuresProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [structures, setStructures] = useState<Structure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les structures depuis l'API au montage
  useEffect(() => {
    const fetchStructures = async () => {
      // Ne pas charger si on n'a pas de token (utilisateur non connecté)
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('📡 Chargement des structures depuis l\'API...')
        const response = await api.get('/structures')
        if (response.data.success) {
          const fetchedStructures = response.data.data.structures.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt)
          }))
          setStructures(fetchedStructures)
          console.log('✅ Structures chargées:', fetchedStructures.length)
        }
      } catch (error: any) {
        console.error('❌ Erreur lors du chargement des structures:', error)
        setError(error.message || 'Erreur lors du chargement des structures')
      } finally {
        setLoading(false)
      }
    }

    fetchStructures()
  }, [])

  const addStructure = useCallback(async (data: any): Promise<Structure> => {
    try {
      console.log('📝 Création de structure via API:', data)
      const response = await api.post('/structures', data)

      if (response.data.success) {
        const newStructure = {
          ...response.data.data.structure,
          createdAt: new Date(response.data.data.structure.createdAt),
          updatedAt: new Date(response.data.data.structure.updatedAt)
        }

        setStructures(prev => [...prev, newStructure])
        console.log('✅ Structure créée:', newStructure.id)
        return newStructure
      }

      throw new Error('Erreur lors de la création de la structure')
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la structure:', error)
      setError(error.message || 'Erreur lors de la création de la structure')
      throw error
    }
  }, [])

  const getStructureById = useCallback((id: string): Structure | null => {
    return structures.find(s => s.id === id) || null
  }, [structures])

  const updateStructure = useCallback(async (id: string, data: any): Promise<void> => {
    try {
      console.log('📝 Mise à jour de structure via API:', id, data)
      const response = await api.put(`/structures?id=${id}`, data)

      if (response.data.success) {
        const updatedStructure = {
          ...response.data.data.structure,
          createdAt: new Date(response.data.data.structure.createdAt),
          updatedAt: new Date(response.data.data.structure.updatedAt)
        }

        setStructures(prev =>
          prev.map(s => (s.id === id ? updatedStructure : s))
        )
        console.log('✅ Structure mise à jour:', id)
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la mise à jour de la structure:', error)
      setError(error.message || 'Erreur lors de la mise à jour de la structure')
      throw error
    }
  }, [])

  const deleteStructure = useCallback(async (id: string): Promise<void> => {
    try {
      console.log('🗑️ Suppression de structure via API:', id)
      await api.delete(`/structures?id=${id}`)

      setStructures(prev => prev.filter(s => s.id !== id))
      console.log('✅ Structure supprimée:', id)
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression de la structure:', error)
      setError(error.message || 'Erreur lors de la suppression de la structure')
      throw error
    }
  }, [])

  const refreshStructures = useCallback(async (): Promise<Structure[]> => {
    try {
      setLoading(true)
      console.log('🔄 Rafraîchissement des structures depuis l\'API...')
      const response = await api.get('/structures')
      if (response.data.success) {
        const fetchedStructures = response.data.data.structures.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt)
        }))
        setStructures(fetchedStructures)
        console.log('✅ Structures rafraîchies:', fetchedStructures.length)
        return fetchedStructures
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du rafraîchissement des structures:', error)
      setError(error.message || 'Erreur lors du rafraîchissement des structures')
    } finally {
      setLoading(false)
    }
    return []
  }, [])

  const value = {
    structures,
    loading,
    error,
    addStructure,
    getStructureById,
    updateStructure,
    deleteStructure,
    refreshStructures
  }

  return (
    <StructuresContext.Provider value={value}>
      {children}
    </StructuresContext.Provider>
  )
}

export const useStructuresContext = () => {
  const context = useContext(StructuresContext)
  if (context === undefined) {
    throw new Error('useStructuresContext must be used within a StructuresProvider')
  }
  return context
}
