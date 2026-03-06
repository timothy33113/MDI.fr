import React from 'react'
import { FormSection, EditableTable, useEditableList } from '../shared'
import { Revenu } from '../shared/types'

interface RevenusSectionProps {
  revenus: Revenu[]
  onRevenusChange: (revenus: Revenu[]) => void
}

const typesAvecPeriodicite = ['prime', 'investissement', 'locatif', 'societe', 'autre']

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
      montantMensuel: 0,
      periodicite: 'mensuel',
      montantSaisi: 0
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

  const handleMontantChange = (item: Revenu, value: number, onUpdate: (field: string, value: any) => void) => {
    const periodicite = item.periodicite || 'mensuel'
    onUpdate('montantSaisi', value)
    if (item.type === 'salaire' || periodicite === 'mensuel') {
      onUpdate('montantMensuel', value)
    } else {
      onUpdate('montantMensuel', Math.round((value / 12) * 100) / 100)
    }
  }

  const handlePeriodiciteChange = (item: Revenu, newPeriodicite: string, onUpdate: (field: string, value: any) => void) => {
    onUpdate('periodicite', newPeriodicite)
    const montantSaisi = item.montantSaisi || item.montantMensuel
    if (newPeriodicite === 'annuel') {
      onUpdate('montantMensuel', Math.round((montantSaisi / 12) * 100) / 100)
    } else {
      onUpdate('montantMensuel', montantSaisi)
    }
  }

  const columns = [
    {
      key: 'type',
      header: 'Type de revenu',
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <select
            value={item.type}
            onChange={(e) => {
              onUpdate('type', e.target.value)
              // Reset periodicite quand on passe en salaire
              if (e.target.value === 'salaire') {
                onUpdate('periodicite', 'mensuel')
                onUpdate('montantMensuel', item.montantSaisi || item.montantMensuel)
              }
            }}
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
      key: 'periodicite',
      header: 'Periodicite',
      align: 'center' as const,
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        typesAvecPeriodicite.includes(item.type) ? (
          isEditing ? (
            <select
              value={item.periodicite || 'mensuel'}
              onChange={(e) => handlePeriodiciteChange(item, e.target.value, onUpdate)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
            >
              <option value="mensuel">Mensuel</option>
              <option value="annuel">Annuel</option>
            </select>
          ) : (
            <span className="text-gray-900 capitalize">{item.periodicite || 'mensuel'}</span>
          )
        ) : (
          <span className="text-gray-400 text-sm">Mensuel</span>
        )
      )
    },
    {
      key: 'montant',
      header: 'Montant',
      align: 'right' as const,
      render: (item: Revenu, isEditing: boolean, onUpdate: (field: string, value: any) => void) => {
        const periodicite = item.periodicite || 'mensuel'
        const isAnnuel = typesAvecPeriodicite.includes(item.type) && periodicite === 'annuel'

        return isEditing ? (
          <div>
            <input
              type="number"
              value={item.montantSaisi ?? item.montantMensuel}
              onChange={(e) => handleMontantChange(item, Number(e.target.value), onUpdate)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-right"
            />
            {isAnnuel && (
              <div className="text-xs text-gray-500 mt-1 text-right">
                = {item.montantMensuel.toLocaleString('fr-FR')} EUR/mois
              </div>
            )}
          </div>
        ) : (
          <div className="text-right">
            <span className="text-gray-900 font-semibold">
              {(item.montantSaisi ?? item.montantMensuel).toLocaleString('fr-FR')} EUR
              {isAnnuel && <span className="text-gray-400 font-normal">/an</span>}
            </span>
            {isAnnuel && (
              <div className="text-xs text-gray-500">
                = {item.montantMensuel.toLocaleString('fr-FR')} EUR/mois
              </div>
            )}
          </div>
        )
      }
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
