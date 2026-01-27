import React from 'react'
import { FormSection, EditableTable, useEditableList } from '../shared'
import { CompteBancaire } from '../shared/types'

interface ComptesSectionProps {
  comptes: CompteBancaire[]
  onComptesChange: (comptes: CompteBancaire[]) => void
}

const TYPES_COMPTE = [
  { value: 'Compte_Courant', label: 'Compte Courant' },
  { value: 'Livret_A', label: 'Livret A' },
  { value: 'LDDS', label: 'LDDS' },
  { value: 'PEL', label: 'PEL' },
  { value: 'CEL', label: 'CEL' },
  { value: 'Assurance_Vie', label: 'Assurance Vie' },
  { value: 'PEA', label: 'PEA' },
  { value: 'Compte_Titre', label: 'Compte Titre' },
  { value: 'Autre', label: 'Autre' }
]

export function ComptesSection({ comptes, onComptesChange }: ComptesSectionProps) {
  const {
    items,
    editingId,
    add,
    remove,
    update,
    validate,
    cancel,
    startEdit,
    setItems
  } = useEditableList<CompteBancaire>({
    initialItems: comptes,
    createNewItem: () => ({
      id: Date.now().toString(),
      nom: '',
      typeCompte: 'Compte_Courant',
      banque: '',
      solde: 0
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.banque,
    minItems: 0
  })

  // Synchroniser avec le parent
  React.useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(comptes)) {
      onComptesChange(items)
    }
  }, [items])

  // Synchroniser depuis le parent si necessaire
  React.useEffect(() => {
    if (JSON.stringify(comptes) !== JSON.stringify(items)) {
      setItems(comptes)
    }
  }, [comptes])

  const totalEconomies = items.reduce((sum, c) => sum + c.solde, 0)

  const columns = [
    {
      key: 'typeCompte',
      header: 'Type de compte',
      render: (item: CompteBancaire, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <div className="space-y-2">
            <select
              value={item.typeCompte}
              onChange={(e) => onUpdate('typeCompte', e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            >
              {TYPES_COMPTE.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            {item.typeCompte === 'Autre' && (
              <input
                type="text"
                value={item.typeCompteAutre || ''}
                onChange={(e) => onUpdate('typeCompteAutre', e.target.value)}
                placeholder="Preciser le type"
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              />
            )}
          </div>
        ) : (
          <span className="text-gray-900">
            {item.typeCompte === 'Autre' && item.typeCompteAutre
              ? item.typeCompteAutre
              : TYPES_COMPTE.find(t => t.value === item.typeCompte)?.label || item.typeCompte}
          </span>
        )
      )
    },
    {
      key: 'banque',
      header: 'Banque',
      render: (item: CompteBancaire, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="text"
            value={item.banque}
            onChange={(e) => onUpdate('banque', e.target.value)}
            placeholder="Ex: Credit Agricole"
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <span className="text-gray-900">{item.banque}</span>
        )
      )
    },
    {
      key: 'solde',
      header: 'Solde',
      align: 'right' as const,
      render: (item: CompteBancaire, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="number"
            value={item.solde}
            onChange={(e) => onUpdate('solde', Number(e.target.value))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
          />
        ) : (
          <span className="text-gray-900 font-semibold">{item.solde.toLocaleString('fr-FR')} EUR</span>
        )
      )
    }
  ]

  return (
    <FormSection
      title="Economies et placements"
      description="Renseignez vos comptes bancaires et placements financiers"
    >
      <EditableTable
        items={items}
        columns={columns}
        editingId={editingId}
        getId={(item) => item.id}
        onAdd={add}
        onRemove={remove}
        onValidate={validate}
        onCancel={cancel}
        onStartEdit={startEdit}
        onUpdate={update}
        addButtonText="Ajouter un compte"
        editingRowClass="bg-purple-50"
      />

      {/* Total des economies */}
      {items.length > 0 && (
        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-purple-800">Total des economies</span>
            <span className="text-xl font-bold text-purple-700">
              {totalEconomies.toLocaleString('fr-FR')} EUR
            </span>
          </div>
        </div>
      )}
    </FormSection>
  )
}
