import { useState, useCallback } from 'react'

interface UseEditableListOptions<T> {
  initialItems?: T[]
  createNewItem: () => T
  getId: (item: T) => string
  isEmpty?: (item: T) => boolean
  minItems?: number
}

/**
 * Hook personnalisé pour gérer une liste éditable avec ajout, suppression et modification
 */
export function useEditableList<T>({
  initialItems = [],
  createNewItem,
  getId,
  isEmpty = () => false,
  minItems = 0
}: UseEditableListOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [editingId, setEditingId] = useState<string | null>(null)

  const add = useCallback(() => {
    const newItem = createNewItem()
    setItems(prev => [...prev, newItem])
    setEditingId(getId(newItem))
  }, [createNewItem, getId])

  const remove = useCallback((id: string) => {
    if (items.length > minItems) {
      setItems(prev => prev.filter(item => getId(item) !== id))
      if (editingId === id) {
        setEditingId(null)
      }
    }
  }, [items.length, minItems, editingId, getId])

  const update = useCallback((id: string, field: string, value: any) => {
    setItems(prev => prev.map(item =>
      getId(item) === id ? { ...item, [field]: value } : item
    ))
  }, [getId])

  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setItems(prev => prev.map(item =>
      getId(item) === id ? updater(item) : item
    ))
  }, [getId])

  const validate = useCallback((id: string) => {
    setEditingId(null)
  }, [])

  const cancel = useCallback((id: string) => {
    const item = items.find(i => getId(i) === id)
    if (item && isEmpty(item) && items.length > minItems) {
      remove(id)
    } else {
      setEditingId(null)
    }
  }, [items, getId, isEmpty, minItems, remove])

  const startEdit = useCallback((id: string) => {
    setEditingId(id)
  }, [])

  const setItemsDirectly = useCallback((newItems: T[]) => {
    setItems(newItems)
  }, [])

  const getItemById = useCallback((id: string) => {
    return items.find(item => getId(item) === id)
  }, [items, getId])

  return {
    items,
    editingId,
    add,
    remove,
    update,
    updateItem,
    validate,
    cancel,
    startEdit,
    setItems: setItemsDirectly,
    getItemById,
    isEditing: (id: string) => editingId === id
  }
}
