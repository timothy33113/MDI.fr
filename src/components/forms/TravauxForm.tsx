import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Wrench, Plus, Trash2, Calendar, Euro, AlertTriangle } from 'lucide-react'
import { TravauxDetail } from '@/types'

const travauxSchema = z.object({
  description: z.string().min(1, 'La description est requise'),
  montant: z.number().min(1, 'Le montant doit être supérieur à 0'),
  priorite: z.enum(['Haute', 'Moyenne', 'Basse']),
  dureeEstimee: z.number().min(1, 'La durée estimée doit être supérieure à 0'),
  artisan: z.string().optional(),
  dateDebut: z.string().optional(),
})

type TravauxFormData = z.infer<typeof travauxSchema>

interface TravauxFormProps {
  initialData?: TravauxDetail[]
  onSave: (data: TravauxDetail[]) => void
  onNext: () => void
}

const TravauxForm: React.FC<TravauxFormProps> = ({
  initialData = [],
  onSave
}) => {
  const [travaux, setTravaux] = useState<TravauxDetail[]>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid }
  } = useForm<TravauxFormData>({
    resolver: zodResolver(travauxSchema)
  })

  const onSubmit = (data: TravauxFormData) => {
    const nouveauTravail: TravauxDetail = {
      id: editingIndex !== null ? travaux[editingIndex].id : Date.now().toString(),
      description: data.description,
      montant: data.montant,
      priorite: data.priorite,
      dureeEstimee: data.dureeEstimee,
      artisan: data.artisan || '',
      dateDebut: data.dateDebut || '',
    }

    if (editingIndex !== null) {
      const updatedTravaux = [...travaux]
      updatedTravaux[editingIndex] = nouveauTravail
      setTravaux(updatedTravaux)
      setEditingIndex(null)
    } else {
      setTravaux([...travaux, nouveauTravail])
    }

    setShowForm(false)
    reset()
  }

  const handleEdit = (index: number) => {
    const travail = travaux[index]
    reset({
      description: travail.description,
      montant: travail.montant,
      priorite: travail.priorite,
      dureeEstimee: travail.dureeEstimee,
      artisan: travail.artisan,
      dateDebut: travail.dateDebut,
    })
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleDelete = (index: number) => {
    setTravaux(travaux.filter((_, i) => i !== index))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingIndex(null)
    reset()
  }

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'Haute':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Moyenne':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Basse':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const totalTravaux = travaux.reduce((sum, t) => sum + t.montant, 0)
  const dureeTotale = travaux.reduce((sum, t) => sum + t.dureeEstimee, 0)

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Travaux prévus
          </h2>
          <p className="text-gray-600">
            Planifiez les travaux nécessaires pour votre projet immobilier
          </p>
        </div>

        {/* Résumé des travaux */}
        {travaux.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {travaux.length}
                  </div>
                  <div className="text-sm text-blue-800">Postes de travaux</div>
                </div>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {totalTravaux.toLocaleString('fr-FR')} €
                  </div>
                  <div className="text-sm text-green-800">Budget total</div>
                </div>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {dureeTotale} semaines
                  </div>
                  <div className="text-sm text-purple-800">Durée estimée</div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Liste des travaux */}
        {travaux.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Travaux planifiés</h3>
            <div className="space-y-3">
              {travaux.map((travail, index) => (
                <Card key={travail.id} className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{travail.description}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPrioriteColor(travail.priorite)}`}>
                          {travail.priorite}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 mr-1" />
                          <span>{travail.montant.toLocaleString('fr-FR')} €</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{travail.dureeEstimee} semaines</span>
                        </div>
                        {travail.artisan && (
                          <div className="flex items-center">
                            <Wrench className="h-4 w-4 mr-1" />
                            <span>{travail.artisan}</span>
                          </div>
                        )}
                        {travail.dateDebut && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Début: {new Date(travail.dateDebut).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire d'ajout/modification */}
        {showForm ? (
          <Card className="bg-gray-50">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingIndex !== null ? 'Modifier le travail' : 'Ajouter un travail'}
              </h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Description du travail"
                  {...register('description')}
                  error={errors.description?.message}
                  placeholder="Ex: Rénovation cuisine complète"
                />

                <Input
                  label="Montant estimé (€)"
                  type="number"
                  {...register('montant', { valueAsNumber: true })}
                  error={errors.montant?.message}
                  icon={<Euro className="h-4 w-4" />}
                />

                <div>
                  <label className="form-label">Priorité</label>
                  <select
                    {...register('priorite')}
                    className="input-field"
                  >
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                  </select>
                  {errors.priorite && (
                    <p className="mt-1 text-sm text-red-600">{errors.priorite.message}</p>
                  )}
                </div>

                <Input
                  label="Durée estimée (semaines)"
                  type="number"
                  {...register('dureeEstimee', { valueAsNumber: true })}
                  error={errors.dureeEstimee?.message}
                  min="1"
                />

                <Input
                  label="Artisan/Entreprise (optionnel)"
                  {...register('artisan')}
                  placeholder="Nom de l'artisan"
                />

                <Input
                  label="Date de début souhaitée"
                  type="date"
                  {...register('dateDebut')}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid}
                >
                  {editingIndex !== null ? 'Modifier' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un poste de travaux
          </Button>
        )}

        {/* Recommandations */}
        {travaux.length === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Aucun travail planifié</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Ajoutez les travaux prévus pour votre projet. Cela permettra de mieux planifier 
                  le budget et les délais de votre investissement.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex justify-end space-x-3 pt-6">
          <Button
            onClick={() => onSave(travaux)}
            disabled={travaux.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default TravauxForm 