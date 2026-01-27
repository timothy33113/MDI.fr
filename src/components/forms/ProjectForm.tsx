import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { Building2, MapPin, Euro, Wrench } from 'lucide-react'

const projectSchema = z.object({
  nomSCI: z.string().min(1, 'Le nom de la SCI est requis'),
  localisation: z.string().min(1, 'La localisation est requise'),
  prixAcquisition: z.number().min(1, 'Le prix d\'acquisition doit être supérieur à 0'),
  montantTravaux: z.number().min(0, 'Le montant des travaux ne peut pas être négatif'),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>
  onSave: (data: ProjectFormData) => void
  onNext: () => void
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSave,
  onNext
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: initialData
  })

  const onSubmit = (data: ProjectFormData) => {
    onSave(data)
    onNext()
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Informations générales du projet
        </h2>
        <p className="text-gray-600">
          Définissez les informations de base de votre projet immobilier
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Nom de la SCI"
          {...register('nomSCI')}
          error={errors.nomSCI?.message}
          icon={<Building2 className="h-4 w-4" />}
          placeholder="Ex: SCI Les Jardins de Pau"
        />

        <Input
          label="Localisation du bien"
          {...register('localisation')}
          error={errors.localisation?.message}
          icon={<MapPin className="h-4 w-4" />}
          placeholder="Ex: 64 Avenue des Pyrénées, 64000 Pau"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prix d'acquisition (€)"
            type="number"
            {...register('prixAcquisition', { valueAsNumber: true })}
            error={errors.prixAcquisition?.message}
            icon={<Euro className="h-4 w-4" />}
            placeholder="750000"
          />

          <Input
            label="Montant des travaux (€)"
            type="number"
            {...register('montantTravaux', { valueAsNumber: true })}
            error={errors.montantTravaux?.message}
            icon={<Wrench className="h-4 w-4" />}
            placeholder="50000"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="submit"
            disabled={!isValid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      </form>
    </Card>
  )
}

export default ProjectForm 