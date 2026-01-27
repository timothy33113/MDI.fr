import React, { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

import { Home, MapPin, Ruler, Camera, Upload, X, Eye } from 'lucide-react'
import { BienImmobilier, Photo } from '@/types'

const bienImmobilierSchema = z.object({
  adresse: z.string().min(1, 'L\'adresse est requise'),
  superficie: z.number().min(1, 'La superficie doit être supérieure à 0'),
  nombrePieces: z.number().min(1, 'Le nombre de pièces doit être supérieur à 0'),
  etatActuel: z.string().min(1, 'L\'état actuel est requis'),
  dpe: z.string().min(1, 'Le DPE est requis'),
  estimationValeur: z.number().min(1, 'L\'estimation de valeur est requise'),
})

type BienImmobilierFormData = z.infer<typeof bienImmobilierSchema>

interface BienImmobilierFormProps {
  initialData?: Partial<BienImmobilier>
  onSave: (data: BienImmobilier) => void
  onNext: () => void
}

const BienImmobilierForm: React.FC<BienImmobilierFormProps> = ({
  initialData,
  onSave,
  onNext
}) => {
  const [photos, setPhotos] = useState<Photo[]>(initialData?.photos || [])
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<BienImmobilierFormData>({
    resolver: zodResolver(bienImmobilierSchema),
    defaultValues: {
      adresse: initialData?.adresse || '',
      superficie: initialData?.superficie || 0,
      nombrePieces: initialData?.nombrePieces || 0,
      etatActuel: initialData?.etatActuel || '',
      dpe: initialData?.dpe || '',
      estimationValeur: initialData?.estimationValeur || 0,
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos: Photo[] = acceptedFiles.map((file, index) => ({
      id: Date.now().toString() + index,
      url: URL.createObjectURL(file),
      description: file.name,
      type: 'Autre' as const
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true
  })

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  const updatePhotoType = (photoId: string, type: 'Avant' | 'Apres' | 'Plan' | 'Autre') => {
    setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, type } : p))
  }

  const onSubmit = (data: BienImmobilierFormData) => {
    const bienImmobilier: BienImmobilier = {
      ...data,
      travauxPrevus: initialData?.travauxPrevus || [],
      photos
    }
    onSave(bienImmobilier)
    onNext()
  }

  const getDPEColor = (dpe: string) => {
    const dpeColors: Record<string, string> = {
      'A': 'text-green-600 bg-green-100',
      'B': 'text-green-700 bg-green-50',
      'C': 'text-yellow-600 bg-yellow-100',
      'D': 'text-orange-600 bg-orange-100',
      'E': 'text-red-600 bg-red-100',
      'F': 'text-red-700 bg-red-50',
      'G': 'text-red-800 bg-red-50'
    }
    return dpeColors[dpe] || 'text-gray-600 bg-gray-100'
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bien immobilier
          </h2>
          <p className="text-gray-600">
            Décrivez le bien immobilier et ajoutez des photos
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations générales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Adresse complète"
                {...register('adresse')}
                error={errors.adresse?.message}
                icon={<MapPin className="h-4 w-4" />}
                placeholder="123 Rue de la Paix, 75001 Paris"
              />

              <Input
                label="Estimation de valeur (€)"
                type="number"
                {...register('estimationValeur', { valueAsNumber: true })}
                error={errors.estimationValeur?.message}
                icon={<Home className="h-4 w-4" />}
              />

              <Input
                label="Superficie (m²)"
                type="number"
                {...register('superficie', { valueAsNumber: true })}
                error={errors.superficie?.message}
                icon={<Ruler className="h-4 w-4" />}
              />

              <Input
                label="Nombre de pièces"
                type="number"
                {...register('nombrePieces', { valueAsNumber: true })}
                error={errors.nombrePieces?.message}
                min="1"
              />
            </div>
          </div>

          {/* État et performance */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">État et performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Diagnostic de Performance Énergétique (DPE)</label>
                <select
                  {...register('dpe')}
                  className="input-field"
                >
                  <option value="">Sélectionner un DPE</option>
                  <option value="A">A - Très performant</option>
                  <option value="B">B - Performant</option>
                  <option value="C">C - Assez performant</option>
                  <option value="D">D - Passable</option>
                  <option value="E">E - Médiocre</option>
                  <option value="F">F - Très médiocre</option>
                  <option value="G">G - Extrêmement médiocre</option>
                </select>
                {errors.dpe && (
                  <p className="mt-1 text-sm text-red-600">{errors.dpe.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">État actuel du bien</label>
                <select
                  {...register('etatActuel')}
                  className="input-field"
                >
                  <option value="">Sélectionner l'état</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Très bon">Très bon</option>
                  <option value="Bon">Bon</option>
                  <option value="Moyen">Moyen</option>
                  <option value="À rénover">À rénover</option>
                  <option value="À démolir">À démolir</option>
                </select>
                {errors.etatActuel && (
                  <p className="mt-1 text-sm text-red-600">{errors.etatActuel.message}</p>
                )}
              </div>
            </div>

            {/* Affichage du DPE */}
            {watch('dpe') && (
              <div className="mt-4">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDPEColor(watch('dpe'))}`}>
                  DPE {watch('dpe')}
                </div>
              </div>
            )}
          </div>

          {/* Upload de photos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Photos du bien
            </h3>

            {/* Zone de drop */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-primary-600">Déposez les fichiers ici...</p>
              ) : (
                <div>
                  <p className="text-gray-600">
                    Glissez-déposez des photos ici, ou <span className="text-primary-600">cliquez pour sélectionner</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Formats acceptés: JPG, PNG, WebP (max 5MB par fichier)
                  </p>
                </div>
              )}
            </div>

            {/* Galerie de photos */}
            {photos.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Photos ajoutées ({photos.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={photo.url}
                          alt={photo.description}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setShowPhotoModal(photo.url)}
                        />
                      </div>
                      
                      {/* Overlay avec actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowPhotoModal(photo.url)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-gray-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Type de photo */}
                      <div className="mt-2">
                        <select
                          value={photo.type}
                          onChange={(e) => updatePhotoType(photo.id, e.target.value as any)}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="Avant">Avant</option>
                          <option value="Apres">Après</option>
                          <option value="Plan">Plan</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* Modal pour voir les photos en grand */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={showPhotoModal}
              alt="Photo en grand"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPhotoModal(null)}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BienImmobilierForm 