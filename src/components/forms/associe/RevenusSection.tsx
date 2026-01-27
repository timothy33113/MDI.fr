import React from 'react'
import { TrendingUp } from 'lucide-react'
import { FormSection, EditableTable, useEditableList } from '../shared'
import { Revenu } from '../shared/types'

interface RevenusSectionProps {
  revenus: Revenu[]
  onRevenusChange: (revenus: Revenu[]) => void
}

export function RevenusSection({ revenus, onRevenusChange }: RevenusSectionProps) {
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
  } = useEditableList<Revenu>({
    initialItems: revenus,
    createNewItem: () => ({
      id: Date.now().toString(),
      type: 'autre',
      libelle: '',
      montantMensuel: 0
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.libelle,
    minItems: 0
  })

  // Synchroniser avec le parent
  React.useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(revenus)) {
      onRevenusChange(items)
    }
  }, [items])

  // Synchroniser depuis le parent si necessaire
  React.useEffect(() => {
    if (JSON.stringify(revenus) !== JSON.stringify(items)) {
      setItems(revenus)
    }
  }, [revenus])

  const totalRevenus = items.reduce((sum, r) => sum + r.montantMensuel, 0)

  const columns = [
    {
      key: 'type',
      header: 'Type de revenu',
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <select
            value={item.type}
            onChange={(e) => onUpdate('type', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          >
            <option value="salaire">Salaire</option>
            <option value="prime">Prime</option>
            <option value="locatif">Revenus locatifs</option>
            <option value="investissement">Investissements</option>
            <option value="societe">Revenus de societe</option>
            <option value="autre">Autre</option>
          </select>
        ) : (
          <span className="text-gray-900 capitalize">{item.type.replace('_', ' ')}</span>
        )
      )
    },
    {
      key: 'libelle',
      header: 'Libelle',
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="text"
            value={item.libelle}
            onChange={(e) => onUpdate('libelle', e.target.value)}
            placeholder="Ex: Salaire principal"
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <span className="text-gray-900">{item.libelle}</span>
        )
      )
    },
    {
      key: 'nombreMois',
      header: 'Nb mois',
      align: 'center' as const,
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        item.type === 'salaire' ? (
          isEditing ? (
            <select
              value={item.nombreMois || 12}
              onChange={(e) => onUpdate('nombreMois', Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
            >
              <option value="12">12 mois</option>
              <option value="13">13 mois</option>
              <option value="14">14 mois</option>
              <option value="15">15 mois</option>
              <option value="16">16 mois</option>
            </select>
          ) : (
            <span className="text-gray-900">{item.nombreMois || 12} mois</span>
          )
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      )
    },
    {
      key: 'montantMensuel',
      header: 'Montant',
      align: 'right' as const,
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="number"
            value={item.montantMensuel}
            onChange={(e) => onUpdate('montantMensuel', Number(e.target.value))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
          />
        ) : (
          <span className="text-gray-900 font-semibold">{item.montantMensuel.toLocaleString('fr-FR')} EUR</span>
        )
      )
    }
  ]

  return (
    <FormSection
      title="Revenus mensuels"
      description="Renseignez tous vos revenus reguliers percus chaque mois"
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
        addButtonText="Ajouter un revenu"
        editingRowClass="bg-green-50"
      />

      {/* Total des revenus */}
      {items.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-green-800">Total des revenus mensuels</span>
            <span className="text-xl font-bold text-green-700">
              {totalRevenus.toLocaleString('fr-FR')} EUR
            </span>
          </div>
        </div>
      )}
    </FormSection>
  )
}
