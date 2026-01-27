import React from 'react'
import { Home, CreditCard } from 'lucide-react'
import { FormSection, EditableTable, useEditableList, updateCreditWithCalculations } from '../shared'
import { BienImmobilier, Credit } from '../shared/types'

interface BiensImmoSectionProps {
  biens: BienImmobilier[]
  credits: Credit[]
  onBiensChange: (biens: BienImmobilier[]) => void
  onCreditsChange: (credits: Credit[]) => void
}

const TYPES_BIEN = [
  { value: 'Residence_Principale', label: 'Residence Principale' },
  { value: 'Residence_Secondaire', label: 'Residence Secondaire' },
  { value: 'Investissement_Locatif', label: 'Investissement Locatif' }
]

const TYPES_CREDIT = [
  { value: 'Immobilier', label: 'Immobilier' },
  { value: 'Consommation', label: 'Consommation' },
  { value: 'Professionnel', label: 'Professionnel' },
  { value: 'Autre', label: 'Autre' }
]

export function BiensCreditsSection({
  biens,
  credits,
  onBiensChange,
  onCreditsChange
}: BiensImmoSectionProps) {
  // Hook pour les biens
  const biensState = useEditableList<BienImmobilier>({
    initialItems: biens,
    createNewItem: () => ({
      id: Date.now().toString(),
      type: 'Residence_Principale',
      adresse: '',
      valeurEstimee: 0
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.adresse,
    minItems: 0
  })

  // Hook pour les credits
  const creditsState = useEditableList<Credit>({
    initialItems: credits,
    createNewItem: () => ({
      id: Date.now().toString(),
      type: 'Immobilier',
      organisme: '',
      montantInitial: 0,
      dateDebut: '',
      nombreMois: 240,
      tauxInteret: 3.5
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.organisme,
    minItems: 0
  })

  // Synchroniser les biens
  React.useEffect(() => {
    if (JSON.stringify(biensState.items) !== JSON.stringify(biens)) {
      onBiensChange(biensState.items)
    }
  }, [biensState.items])

  React.useEffect(() => {
    if (JSON.stringify(biens) !== JSON.stringify(biensState.items)) {
      biensState.setItems(biens)
    }
  }, [biens])

  // Synchroniser les credits
  React.useEffect(() => {
    if (JSON.stringify(creditsState.items) !== JSON.stringify(credits)) {
      onCreditsChange(creditsState.items)
    }
  }, [creditsState.items])

  React.useEffect(() => {
    if (JSON.stringify(credits) !== JSON.stringify(creditsState.items)) {
      creditsState.setItems(credits)
    }
  }, [credits])

  // Mise a jour d'un credit avec recalcul automatique
  const handleCreditUpdate = (id: string, field: string, value: any) => {
    creditsState.updateItem(id, (credit) => {
      const updated = { ...credit, [field]: value }
      return updateCreditWithCalculations(updated)
    })
  }

  // Calculs
  const totalBiens = biensState.items.reduce((sum, b) => sum + b.valeurEstimee, 0)
  const totalCredits = creditsState.items.reduce((sum, c) => sum + (c.capitalRestantDu || 0), 0)
  const patrimoineNet = totalBiens - totalCredits

  const biensColumns = [
    {
      key: 'type',
      header: 'Type de bien',
      render: (item: BienImmobilier, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <select
            value={item.type}
            onChange={(e) => onUpdate('type', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          >
            {TYPES_BIEN.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-gray-900">{TYPES_BIEN.find(t => t.value === item.type)?.label}</span>
        )
      )
    },
    {
      key: 'adresse',
      header: 'Adresse',
      render: (item: BienImmobilier, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="text"
            value={item.adresse}
            onChange={(e) => onUpdate('adresse', e.target.value)}
            placeholder="Adresse du bien"
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <span className="text-gray-900">{item.adresse}</span>
        )
      )
    },
    {
      key: 'valeurEstimee',
      header: 'Valeur estimee',
      align: 'right' as const,
      render: (item: BienImmobilier, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="number"
            value={item.valeurEstimee}
            onChange={(e) => onUpdate('valeurEstimee', Number(e.target.value))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
          />
        ) : (
          <span className="text-gray-900 font-semibold">{item.valeurEstimee.toLocaleString('fr-FR')} EUR</span>
        )
      )
    },
    {
      key: 'loyerMensuel',
      header: 'Loyer mensuel',
      align: 'right' as const,
      render: (item: BienImmobilier, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        item.type === 'Investissement_Locatif' ? (
          isEditing ? (
            <input
              type="number"
              value={item.loyerMensuel || 0}
              onChange={(e) => onUpdate('loyerMensuel', Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-right"
            />
          ) : (
            <span className="text-gray-900">{(item.loyerMensuel || 0).toLocaleString('fr-FR')} EUR</span>
          )
        ) : (
          <span className="text-gray-400">-</span>
        )
      )
    }
  ]

  const creditsColumns = [
    {
      key: 'type',
      header: 'Type',
      render: (item: Credit, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <select
            value={item.type}
            onChange={(e) => onUpdate('type', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          >
            {TYPES_CREDIT.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-gray-900">{TYPES_CREDIT.find(t => t.value === item.type)?.label}</span>
        )
      )
    },
    {
      key: 'organisme',
      header: 'Organisme',
      render: (item: Credit, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
        isEditing ? (
          <input
            type="text"
            value={item.organisme}
            onChange={(e) => onUpdate('organisme', e.target.value)}
            placeholder="Nom de la banque"
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        ) : (
          <span className="text-gray-900">{item.organisme}</span>
        )
      )
    },
    {
      key: 'mensualite',
      header: 'Mensualite',
      align: 'right' as const,
      render: (item: Credit) => (
        <span className="text-gray-900 font-semibold">
          {(item.mensualite || 0).toLocaleString('fr-FR')} EUR
        </span>
      )
    },
    {
      key: 'capitalRestantDu',
      header: 'Capital restant',
      align: 'right' as const,
      render: (item: Credit) => (
        <span className="text-orange-700 font-semibold">
          {(item.capitalRestantDu || 0).toLocaleString('fr-FR')} EUR
        </span>
      )
    }
  ]

  const creditExpandedContent = (item: Credit, isEditing: boolean, onUpdate: (field: string, value: any) => void) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Montant initial</label>
        <input
          type="number"
          value={item.montantInitial}
          onChange={(e) => handleCreditUpdate(item.id, 'montantInitial', Number(e.target.value))}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Date de debut</label>
        <input
          type="date"
          value={item.dateDebut}
          onChange={(e) => handleCreditUpdate(item.id, 'dateDebut', e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Duree (mois)</label>
        <input
          type="number"
          value={item.nombreMois}
          onChange={(e) => handleCreditUpdate(item.id, 'nombreMois', Number(e.target.value))}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Taux (%)</label>
        <input
          type="number"
          step="0.01"
          value={item.tauxInteret}
          onChange={(e) => handleCreditUpdate(item.id, 'tauxInteret', Number(e.target.value))}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
      {biensState.items.length > 0 && (
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Bien associe</label>
          <select
            value={item.bienAssocie || ''}
            onChange={(e) => onUpdate('bienAssocie', e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="">Aucun</option>
            {biensState.items.map(bien => (
              <option key={bien.id} value={bien.id}>{bien.adresse}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  return (
    <FormSection
      title="Patrimoine immobilier"
      description="Renseignez vos biens immobiliers et credits en cours"
    >
      {/* Section Biens */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Home className="h-5 w-5 text-green-600" />
          Biens immobiliers
        </h4>
        <EditableTable
          items={biensState.items}
          columns={biensColumns}
          editingId={biensState.editingId}
          getId={(item) => item.id}
          onAdd={biensState.add}
          onRemove={biensState.remove}
          onValidate={biensState.validate}
          onCancel={biensState.cancel}
          onStartEdit={biensState.startEdit}
          onUpdate={biensState.update}
          addButtonText="Ajouter un bien"
          editingRowClass="bg-green-50"
        />
      </div>

      {/* Section Credits */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          Credits en cours
        </h4>
        <EditableTable
          items={creditsState.items}
          columns={creditsColumns}
          editingId={creditsState.editingId}
          getId={(item) => item.id}
          onAdd={creditsState.add}
          onRemove={creditsState.remove}
          onValidate={creditsState.validate}
          onCancel={creditsState.cancel}
          onStartEdit={creditsState.startEdit}
          onUpdate={(id, field, value) => handleCreditUpdate(id, field, value)}
          addButtonText="Ajouter un credit"
          editingRowClass="bg-orange-50"
          expandedContent={creditExpandedContent}
        />
      </div>

      {/* Recapitulatif */}
      {(biensState.items.length > 0 || creditsState.items.length > 0) && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3">Recapitulatif patrimoine</h5>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total biens immobiliers</span>
              <span className="font-medium text-green-700">
                {totalBiens.toLocaleString('fr-FR')} EUR
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total credits en cours</span>
              <span className="font-medium text-orange-700">
                - {totalCredits.toLocaleString('fr-FR')} EUR
              </span>
            </div>
            <div className="pt-2 border-t border-gray-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">Patrimoine net immobilier</span>
                <span className={`text-xl font-bold ${patrimoineNet >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {patrimoineNet.toLocaleString('fr-FR')} EUR
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </FormSection>
  )
}
