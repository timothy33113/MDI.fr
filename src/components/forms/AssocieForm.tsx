import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { User, Building, Percent, Mail, Phone, MapPin } from 'lucide-react'
import { Associe } from '@/types'

const associeSchema = z.object({
  type: z.enum(['PERSONNE_PHYSIQUE', 'PERSONNE_MORALE']),
  pourcentageParts: z.number().min(1).max(100),
  nom: z.string().min(1, 'Le nom est requis'),
  adresse: z.string().min(1, 'L\'adresse est requise'),
  telephone: z.string().min(1, 'Le téléphone est requis'),
  email: z.string().email('Email invalide'),
  
  // Personne physique
  prenom: z.string().optional(),
  dateNaissance: z.string().optional(),
  lieuNaissance: z.string().optional(),
  situationFamiliale: z.enum(['Celibataire', 'Marie', 'Pacse', 'Divorce', 'Veuf']).optional(),
  nationalite: z.string().optional(),
  emploi: z.string().optional(),
  employeur: z.string().optional(),
  salaire: z.number().optional(),
  anciennete: z.string().optional(),
  typeContrat: z.enum(['CDI', 'CDD', 'Freelance', 'Fonctionnaire']).optional(),
  
  // Personne morale
  denominationSociale: z.string().optional(),
  siret: z.string().optional(),
  siren: z.string().optional(),
  formeJuridique: z.enum(['SARL', 'SAS', 'SA', 'EURL', 'SASU', 'SCI', 'Autre']).optional(),
  capitalSocial: z.number().optional(),
  chiffreAffaires: z.number().optional(),
  resultatNet: z.number().optional(),
})

type AssocieFormData = z.infer<typeof associeSchema>

interface AssocieFormProps {
  initialData?: Partial<Associe>
  onSave: (data: Associe) => void
  onCancel: () => void
  partsDisponibles: number
}

const AssocieForm: React.FC<AssocieFormProps> = ({
  initialData,
  onSave,
  onCancel,
  partsDisponibles
}) => {
  const [type, setType] = useState<'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE'>(
    initialData?.type || 'PERSONNE_PHYSIQUE'
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<AssocieFormData>({
    resolver: zodResolver(associeSchema),
    defaultValues: {
      type: initialData?.type || 'PERSONNE_PHYSIQUE',
      pourcentageParts: initialData?.pourcentageParts || 0,
      nom: initialData?.nom || '',
      adresse: initialData?.adresse || '',
      telephone: initialData?.telephone || '',
      email: initialData?.email || '',
      prenom: initialData?.personnePhysique?.prenom || '',
      dateNaissance: initialData?.personnePhysique?.dateNaissance?.toISOString().split('T')[0] || '',
      lieuNaissance: initialData?.personnePhysique?.lieuNaissance || '',
      situationFamiliale: initialData?.personnePhysique?.situationFamiliale || 'Celibataire',
      nationalite: initialData?.personnePhysique?.nationalite || '',
      emploi: initialData?.personnePhysique?.emploi || '',
      employeur: initialData?.personnePhysique?.employeur || '',
      salaire: initialData?.personnePhysique?.salaire || 0,
      anciennete: initialData?.personnePhysique?.anciennete || '',
      typeContrat: initialData?.personnePhysique?.typeContrat || 'CDI',
      denominationSociale: initialData?.personneMorale?.denominationSociale || '',
      siret: initialData?.personneMorale?.siret || '',
      siren: initialData?.personneMorale?.siren || '',
      formeJuridique: initialData?.personneMorale?.formeJuridique || 'SARL',
      capitalSocial: initialData?.personneMorale?.capitalSocial || 0,
      chiffreAffaires: initialData?.personneMorale?.chiffreAffaires || 0,
      resultatNet: initialData?.personneMorale?.resultatNet || 0
    }
  })

  const pourcentageParts = watch('pourcentageParts')

  const onSubmit = (data: AssocieFormData) => {
    const associe: Associe = {
      id: initialData?.id || Date.now().toString(),
      type: data.type,
      pourcentageParts: data.pourcentageParts,
      nom: data.nom,
      adresse: data.adresse,
      telephone: data.telephone,
      email: data.email,
    }

    if (data.type === 'PERSONNE_PHYSIQUE') {
      associe.personnePhysique = {
        prenom: data.prenom || '',
        dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : new Date(),
        lieuNaissance: data.lieuNaissance || '',
        situationFamiliale: data.situationFamiliale || 'Celibataire',
        nationalite: data.nationalite || 'Française',
        emploi: data.emploi || '',
        employeur: data.employeur || '',
        salaire: data.salaire || 0,
        anciennete: data.anciennete || '',
        typeContrat: data.typeContrat || 'CDI',
        revenus: {
          salaire: data.salaire || 0,
          totalRevenus: data.salaire || 0
        },
        charges: {
          totalCharges: 0
        },
        epargne: 0,
        creditsEnCours: [],
        biensImmobiliers: []
      }
    } else {
      associe.personneMorale = {
        denominationSociale: data.denominationSociale || '',
        siret: data.siret || '',
        siren: data.siren || '',
        formeJuridique: data.formeJuridique || 'SARL',
        dateCreation: new Date(),
        capitalSocial: data.capitalSocial || 0,
        representantLegal: {
          nom: '',
          prenom: '',
          fonction: 'Gerant',
          dateNaissance: new Date()
        },
        chiffreAffaires: data.chiffreAffaires || 0,
        resultatNet: data.resultatNet || 0,
        bilanComptable: {
          totalActif: 0,
          totalPassif: 0,
          capitauxPropres: 0,
          dettesFinancieres: 0,
          tresorerie: 0,
          exercice: new Date().getFullYear().toString()
        },
        actionnariat: [],
        banquePrincipale: ''
      }
    }

    onSave(associe)
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {initialData ? 'Modifier l\'associé' : 'Ajouter un associé'}
        </h2>
        <p className="text-gray-600">
          Définissez les informations de l'associé et sa participation
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Type d'associé */}
        <div>
          <label className="form-label">Type d'associé</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('PERSONNE_PHYSIQUE')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                type === 'PERSONNE_PHYSIQUE'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <div>
                  <div className="font-medium">Personne physique</div>
                  <div className="text-sm text-gray-600">Particulier</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType('PERSONNE_MORALE')}
              className={`p-4 border rounded-lg text-left transition-colors ${
                type === 'PERSONNE_MORALE'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                <div>
                  <div className="font-medium">Personne morale</div>
                  <div className="text-sm text-gray-600">Société</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Pourcentage de parts */}
        <Input
          label={`Pourcentage de parts (${partsDisponibles}% disponibles)`}
          type="number"
          {...register('pourcentageParts', { valueAsNumber: true })}
          error={errors.pourcentageParts?.message}
          icon={<Percent className="h-4 w-4" />}
          min="1"
          max="100"
        />

        {/* Informations communes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom"
            {...register('nom')}
            error={errors.nom?.message}
            icon={<User className="h-4 w-4" />}
          />

          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            icon={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Téléphone"
            {...register('telephone')}
            error={errors.telephone?.message}
            icon={<Phone className="h-4 w-4" />}
          />

          <Input
            label="Adresse"
            {...register('adresse')}
            error={errors.adresse?.message}
            icon={<MapPin className="h-4 w-4" />}
          />
        </div>

        {/* Informations spécifiques selon le type */}
        {type === 'PERSONNE_PHYSIQUE' ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Informations personnelles</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                {...register('prenom')}
                error={errors.prenom?.message}
              />

              <Input
                label="Date de naissance"
                type="date"
                {...register('dateNaissance')}
                error={errors.dateNaissance?.message}
              />

              <Input
                label="Lieu de naissance"
                {...register('lieuNaissance')}
                error={errors.lieuNaissance?.message}
              />

              <div>
                <label className="form-label">Situation familiale</label>
                <select
                  {...register('situationFamiliale')}
                  className="input-field"
                >
                  <option value="Celibataire">Célibataire</option>
                  <option value="Marie">Marié(e)</option>
                  <option value="Pacse">Pacsé(e)</option>
                  <option value="Divorce">Divorcé(e)</option>
                  <option value="Veuf">Veuf/Veuve</option>
                </select>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900">Informations professionnelles</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Emploi"
                {...register('emploi')}
                error={errors.emploi?.message}
              />

              <Input
                label="Employeur"
                {...register('employeur')}
                error={errors.employeur?.message}
              />

              <Input
                label="Salaire mensuel (€)"
                type="number"
                {...register('salaire', { valueAsNumber: true })}
                error={errors.salaire?.message}
              />

              <div>
                <label className="form-label">Type de contrat</label>
                <select
                  {...register('typeContrat')}
                  className="input-field"
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Fonctionnaire">Fonctionnaire</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Informations de la société</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Dénomination sociale"
                {...register('denominationSociale')}
                error={errors.denominationSociale?.message}
              />

              <Input
                label="SIRET"
                {...register('siret')}
                error={errors.siret?.message}
              />

              <Input
                label="SIREN"
                {...register('siren')}
                error={errors.siren?.message}
              />

              <div>
                <label className="form-label">Forme juridique</label>
                <select
                  {...register('formeJuridique')}
                  className="input-field"
                >
                  <option value="SARL">SARL</option>
                  <option value="SAS">SAS</option>
                  <option value="SA">SA</option>
                  <option value="EURL">EURL</option>
                  <option value="SASU">SASU</option>
                  <option value="SCI">SCI</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <Input
                label="Capital social (€)"
                type="number"
                {...register('capitalSocial', { valueAsNumber: true })}
                error={errors.capitalSocial?.message}
              />

              <Input
                label="Chiffre d'affaires annuel (€)"
                type="number"
                {...register('chiffreAffaires', { valueAsNumber: true })}
                error={errors.chiffreAffaires?.message}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!isValid || pourcentageParts > partsDisponibles}
          >
            {initialData ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default AssocieForm 