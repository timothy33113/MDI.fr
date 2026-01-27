import React from 'react'
import { User } from 'lucide-react'
import Input from '@/components/ui/Input'
import { FormSection } from '../shared'
import { Identite } from '../shared/types'
import RechercheEntrepriseParDirigeant from '@/components/RechercheEntrepriseParDirigeant'

interface IdentiteSectionProps {
  identite: Identite
  onChange: (identite: Identite) => void
  showRechercheDirecteant?: boolean
  onAddEntreprisesAsAssocies?: (entreprises: any[], searchedNom?: string, searchedPrenoms?: string) => void
}

export function IdentiteSection({
  identite,
  onChange,
  showRechercheDirecteant,
  onAddEntreprisesAsAssocies
}: IdentiteSectionProps) {
  const updateField = (field: keyof Identite, value: string) => {
    onChange({ ...identite, [field]: value })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        onChange({ ...identite, photo: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <FormSection
      title="Informations d'identite"
      description="Renseignez les informations personnelles de l'associe"
    >
      <div className="space-y-4">
        {/* Photo de profil */}
        <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0">
            <div className="relative">
              {identite.photo ? (
                <img
                  src={identite.photo}
                  alt="Photo de profil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                  {identite.prenom || identite.nom ? (
                    <span className="text-white text-4xl font-bold">
                      {identite.prenom?.[0]?.toUpperCase() || ''}{identite.nom?.[0]?.toUpperCase() || ''}
                    </span>
                  ) : (
                    <User className="h-16 w-16 text-white" />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo de profil
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Cette photo sera affichee dans l'application. Format recommande : JPG, PNG
            </p>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Choisir une photo
                </span>
              </label>
              {identite.photo && (
                <button
                  type="button"
                  onClick={() => onChange({ ...identite, photo: '' })}
                  className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recherche par dirigeant */}
        {showRechercheDirecteant && onAddEntreprisesAsAssocies && (
          <RechercheEntrepriseParDirigeant
            onAddEntreprises={onAddEntreprisesAsAssocies}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom"
            value={identite.nom}
            onChange={(e) => updateField('nom', e.target.value)}
            required
          />
          <Input
            label="Prenom"
            value={identite.prenom}
            onChange={(e) => updateField('prenom', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date de naissance"
            type="date"
            value={identite.dateNaissance}
            onChange={(e) => updateField('dateNaissance', e.target.value)}
            required
          />
          <Input
            label="Lieu de naissance"
            value={identite.lieuNaissance}
            onChange={(e) => updateField('lieuNaissance', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Situation familiale
            </label>
            <select
              value={identite.situationFamiliale}
              onChange={(e) => updateField('situationFamiliale', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Celibataire">Celibataire</option>
              <option value="Marie">Marie(e)</option>
              <option value="Pacse">Pacse(e)</option>
              <option value="Divorce">Divorce(e)</option>
              <option value="Veuf">Veuf(ve)</option>
            </select>
          </div>

          <Input
            label="Nationalite"
            value={identite.nationalite}
            onChange={(e) => updateField('nationalite', e.target.value)}
          />
        </div>

        <Input
          label="Adresse complete"
          value={identite.adresse}
          onChange={(e) => updateField('adresse', e.target.value)}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Telephone"
            type="tel"
            value={identite.telephone}
            onChange={(e) => updateField('telephone', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={identite.email}
            onChange={(e) => updateField('email', e.target.value)}
          />
        </div>
      </div>
    </FormSection>
  )
}
