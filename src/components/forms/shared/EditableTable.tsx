import React from 'react'
import { Plus, Trash2, CheckCircle, X } from 'lucide-react'

interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (item: T, isEditing: boolean, onUpdate: (field: string, value: any) => void) => React.ReactNode
}

interface EditableTableProps<T> {
  items: T[]
  columns: Column<T>[]
  editingId: string | null
  getId: (item: T) => string
  onAdd: () => void
  onRemove: (id: string) => void
  onValidate: (id: string) => void
  onCancel: (id: string) => void
  onStartEdit: (id: string) => void
  onUpdate: (id: string, field: string, value: any) => void
  addButtonText: string
  minItems?: number
  expandedContent?: (item: T, isEditing: boolean, onUpdate: (field: string, value: any) => void) => React.ReactNode
  editingRowClass?: string
  hoverRowClass?: string
}

export function EditableTable<T>({
  items,
  columns,
  editingId,
  getId,
  onAdd,
  onRemove,
  onValidate,
  onCancel,
  onStartEdit,
  onUpdate,
  addButtonText,
  minItems = 0,
  expandedContent,
  editingRowClass = 'bg-blue-50',
  hoverRowClass = 'hover:bg-gray-50'
}: EditableTableProps<T>) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-4 font-semibold text-gray-700 ${
                    col.align === 'center' ? 'text-center' :
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
              <th className="w-20 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const id = getId(item)
              const isEditing = editingId === id
              const handleUpdate = (field: string, value: any) => onUpdate(id, field, value)

              return (
                <React.Fragment key={id}>
                  <tr
                    className={`border-b border-gray-200 ${
                      isEditing ? editingRowClass : `cursor-pointer ${hoverRowClass}`
                    }`}
                    onClick={() => !isEditing && onStartEdit(id)}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 ${
                          col.align === 'center' ? 'text-center' :
                          col.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {col.render(item, isEditing, handleUpdate)}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end">
                        {!isEditing ? (
                          items.length > minItems && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onRemove(id) }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onValidate(id) }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Valider"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onCancel(id) }}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title="Annuler"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Contenu étendu pour l'édition */}
                  {isEditing && expandedContent && (
                    <tr className={`${editingRowClass} border-b border-blue-200`}>
                      <td colSpan={columns.length + 1} className="py-4 px-4">
                        {expandedContent(item, isEditing, handleUpdate)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdd() }}
        className="w-full py-3 px-6 bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2"
      >
        <Plus className="h-5 w-5" />
        {addButtonText}
      </button>
    </div>
  )
}
