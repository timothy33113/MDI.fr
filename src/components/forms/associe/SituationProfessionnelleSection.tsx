import React from 'react'
import { Plus, Trash2, CheckCircle, X } from 'lucide-react'
import { FormSection, useEditableList } from '../shared'
import { SituationProfessionnelle } from '../shared/types'
import Modal from '@/components/ui/Modal'
import SocieteFormV2 from '../SocieteFormV2'

interface SituationProfessionnelleSectionProps {
  situations: SituationProfessionnelle[]
  onSituationsChange: (situations: SituationProfessionnelle[]) => void
  societes: Array<{ id: string; nom: string; type: string }>
  onCreateSociete: (data: any) => void
}

const STATUTS_PRO = [
  { value: 'Salarie', label: 'Salarie' },
  { value: 'Independant', label: 'Independant' },
  { value: 'Dirigeant', label: 'Dirigeant' },
  { value: 'Retraite', label: 'Retraite' },
  { value: 'Sans_activite', label: 'Sans activite' }
]

const TYPES_CONTRAT = [
  { value: 'CDI', label: 'CDI' },
  { value: 'CDD', label: 'CDD' },
  { value: 'Interim', label: 'Interim' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Fonctionnaire', label: 'Fonctionnaire' }
]

export function SituationProfessionnelleSection({
  situations,
  onSituationsChange,
  societes,
  onCreateSociete
}: SituationProfessionnelleSectionProps) {
  const [showSocieteModal, setShowSocieteModal] = React.useState(false)

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
  } = useEditableList<SituationProfessionnelle>({
    initialItems: situations,
    createNewItem: () => ({
      id: Date.now().toString(),
      statutProfessionnel: 'Salarie',
      dateDebut: '',
      enCours: true
    }),
    getId: (item) => item.id,
    isEmpty: (item) => !item.statutProfessionnel,
    minItems: 0
  })

  // Synchroniser avec le parent
  React.useEffect(() => {
    if (JSON.stringify(items) !== JSON.stringify(situations)) {
      onSituationsChange(items)
    }
  }, [items])

  React.useEffect(() => {
    if (JSON.stringify(situations) !== JSON.stringify(items)) {
      setItems(situations)
    }
  }, [situations])

  const handleCreateSociete = (data: any) => {
    onCreateSociete(data)
    setShowSocieteModal(false)
  }

  const getSocieteNom = (societeId?: string) => {
    if (!societeId) return '-'
    const soc = societes.find(s => s.id === societeId)
    return soc ? `${soc.nom} (${soc.type})` : '-'
  }

  return (
    <FormSection
      title="Situation professionnelle"
      description="Renseignez vos activites professionnelles actuelles et passees"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Employeur / Societe</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Poste / Fonction</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">En cours</th>
              <th className="w-20 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((situation) => {
              const isEditing = editingId === situation.id
              return (
                <React.Fragment key={situation.id}>
                  <tr
                    className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-gray-50' : 'cursor-pointer'}`}
                    onClick={() => !isEditing && startEdit(situation.id)}
                  >
                    {/* Statut */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          value={situation.statutProfessionnel}
                          onChange={(e) => update(situation.id, 'statutProfessionnel', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded-xl"
                        >
                          {STATUTS_PRO.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-900">
                          {STATUTS_PRO.find(s => s.value === situation.statutProfessionnel)?.label}
                        </span>
                      )}
                    </td>

                    {/* Employeur / Societe */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        situation.statutProfessionnel === 'Salarie' ? (
                          <input
                            type="text"
                            value={situation.employeur || ''}
                            onChange={(e) => update(situation.id, 'employeur', e.target.value)}
                            placeholder="Nom de l'employeur"
                            className="w-full px-2 py-1 border border-gray-200 rounded-xl"
                          />
                        ) : (situation.statutProfessionnel === 'Independant' || situation.statutProfessionnel === 'Dirigeant') ? (
                          <div className="flex gap-2">
                            <select
                              value={situation.societeId || ''}
                              onChange={(e) => update(situation.id, 'societeId', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded-xl text-sm"
                            >
                              <option value="">Selectionnez une societe</option>
                              {societes.map(soc => (
                                <option key={soc.id} value={soc.id}>
                                  {soc.nom} ({soc.type})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setShowSocieteModal(true) }}
                              className="px-2 py-1 text-xs bg-gray-900 text-white rounded-xl hover:bg-gray-800"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )
                      ) : (
                        <span className="text-gray-900">
                          {situation.statutProfessionnel === 'Salarie'
                            ? (situation.employeur || '-')
                            : (situation.statutProfessionnel === 'Independant' || situation.statutProfessionnel === 'Dirigeant')
                            ? getSocieteNom(situation.societeId)
                            : '-'}
                        </span>
                      )}
                    </td>

                    {/* Poste / Fonction */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={situation.emploi || ''}
                          onChange={(e) => update(situation.id, 'emploi', e.target.value)}
                          placeholder={
                            situation.statutProfessionnel === 'Salarie' ? "Ex: Developpeur" :
                            situation.statutProfessionnel === 'Dirigeant' ? "Ex: Gerant" :
                            situation.statutProfessionnel === 'Independant' ? "Ex: Consultant" : ""
                          }
                          className="w-full px-2 py-1 border border-gray-200 rounded-xl"
                        />
                      ) : (
                        <span className="text-gray-900">{situation.emploi || '-'}</span>
                      )}
                    </td>

                    {/* En cours */}
                    <td className="py-3 px-4 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={situation.enCours}
                          onChange={(e) => update(situation.id, 'enCours', e.target.checked)}
                          className="h-4 w-4"
                        />
                      ) : (
                        situation.enCours ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Actuel
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex gap-1 justify-end">
                        {!isEditing ? (
                          items.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); remove(situation.id) }}
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
                              onClick={(e) => { e.stopPropagation(); validate(situation.id) }}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Valider"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); cancel(situation.id) }}
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

                  {/* Ligne d'edition etendue */}
                  {isEditing && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan={5} className="py-4 px-4">
                        <div className="space-y-3">
                          {situation.statutProfessionnel === 'Salarie' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type de contrat</label>
                                <select
                                  value={situation.typeContrat || 'CDI'}
                                  onChange={(e) => update(situation.id, 'typeContrat', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded-xl text-sm"
                                >
                                  {TYPES_CONTRAT.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Date de debut</label>
                              <input
                                type="date"
                                value={situation.dateDebut}
                                onChange={(e) => update(situation.id, 'dateDebut', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded-xl text-sm"
                              />
                            </div>
                            {!situation.enCours && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin</label>
                                <input
                                  type="date"
                                  value={situation.dateFin || ''}
                                  onChange={(e) => update(situation.id, 'dateFin', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded-xl text-sm"
                                />
                              </div>
                            )}
                          </div>
                        </div>
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
        onClick={(e) => { e.stopPropagation(); add() }}
        className="w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 text-white border-2 border-gray-900 rounded-xl font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
      >
        <Plus className="h-5 w-5" />
        Ajouter une situation
      </button>

      {/* Modal creation societe */}
      <Modal
        isOpen={showSocieteModal}
        onClose={() => setShowSocieteModal(false)}
        title="Creer une nouvelle societe"
        size="lg"
      >
        <SocieteFormV2
          onSubmit={handleCreateSociete}
          onCancel={() => setShowSocieteModal(false)}
        />
      </Modal>
    </FormSection>
  )
}
