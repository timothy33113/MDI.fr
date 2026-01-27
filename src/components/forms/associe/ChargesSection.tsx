import React from 'react'
import { FormSection, EditableTable, useEditableList } from '../shared'
import { Charge, Credit } from '../shared/types'

interface ChargesSectionProps {
  charges: Charge[]
  credits: Credit[]
  onChargesChange: (charges: Charge[]) => void
}

export function ChargesSection({ charges, credits, onChargesChange }: ChargesSectionProps) {
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
  } = useEditableList<Charge>({
    initialItems: charges,
    createNewItem: () => ({
      id: Date.now().toString(),
      libelle: '',
      montantMensuel: 0
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.libelle,
    minItems: 0
  })

  // Synchroniser avec le parent
  React.useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(charges)) {
      onChargesChange(items)
    }
  }, [items])

  // Synchroniser depuis le parent si necessaire
  React.useEffect(() => {
    if (JSON.stringify(charges) !== JSON.stringify(items)) {
      setItems(charges)
    }
  }, [charges])

  const totalCharges = items.reduce((sum, c) => sum + c.montantMensuel, 0)
  const totalMensualitesCredits = credits.reduce((sum, c) => sum + (c.mensualite || 0), 0)
  const totalChargesAvecCredits = totalCharges + totalMensualitesCredits

  const columns = [
    {
      key: 'libelle',
      header: 'Libelle',
      render: (item: Charge, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="text"
            value={item.libelle}
            onChange={(e) => onUpdate('libelle', e.target.value)}
            placeholder="Ex: Loyer, Electricite, etc."
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <span className="text-gray-900">{item.libelle}</span>
        )
      )
    },
    {
      key: 'montantMensuel',
      header: 'Montant mensuel',
      align: 'right' as const,
      render: (item: Charge, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
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
      title="Charges mensuelles"
      description="Renseignez vos charges fixes mensuelles (hors credits)"
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
        addButtonText="Ajouter une charge"
        editingRowClass="bg-red-50"
      />

      {/* Recapitulatif des charges */}
      <div className="mt-6 space-y-3">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Charges fixes</span>
              <span className="font-medium text-gray-900">
                {totalCharges.toLocaleString('fr-FR')} EUR
              </span>
            </div>
            {totalMensualitesCredits > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Mensualites credits</span>
                <span className="font-medium text-gray-900">
                  {totalMensualitesCredits.toLocaleString('fr-FR')} EUR
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-red-800">Total charges mensuelles</span>
                <span className="text-xl font-bold text-red-700">
                  {totalChargesAvecCredits.toLocaleString('fr-FR')} EUR
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  )
}
