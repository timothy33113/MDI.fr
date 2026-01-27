import React, { useState, useEffect } from 'react'
import { User, Briefcase, Home, CreditCard, Building2, Save, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

const Profile: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'identity' | 'work' | 'income' | 'charges' | 'patrimoine'>('identity')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Données du profil
  const [profileData, setProfileData] = useState({
    // Identité
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Française',
    situationFamiliale: 'Celibataire',

    // Situation professionnelle
    statutProfessionnel: 'Salarie',
    emploi: '',
    employeur: '',
    typeContrat: 'CDI',
    anciennete: '',

    // Revenus
    salaireMensuelNet: '',
    primesAnnuelles: '',
    revenusLocatifs: '',
    autresRevenus: '',

    // Charges
    loyerMensuel: '',
    mensualitesCredits: '',
    pensionAlimentaire: '',
    autresCharges: '',

    // Patrimoine
    biensImmobiliers: [] as any[],
    creditsEnCours: [] as any[]
  })

  const [initialData, setInitialData] = useState(profileData)

  // Détection des modifications
  useEffect(() => {
    const isChanged = JSON.stringify(profileData) !== JSON.stringify(initialData)
    setHasChanges(isChanged)
  }, [profileData, initialData])

  const { showModal, handleNavigation, confirmNavigation, saveAndNavigate, cancelNavigation } = useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    onSave: handleSave
  })

  async function handleSave() {
    setIsSaving(true)
    try {
      // TODO: Appel API pour sauvegarder le profil
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulation
      setInitialData(profileData)
      setHasChanges(false)
      console.log('Profil sauvegardé:', profileData)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }))
  }

  const tabs = [
    { id: 'identity' as const, label: 'Identité', icon: User },
    { id: 'work' as const, label: 'Situation pro', icon: Briefcase },
    { id: 'income' as const, label: 'Revenus', icon: CreditCard },
    { id: 'charges' as const, label: 'Charges', icon: CreditCard },
    { id: 'patrimoine' as const, label: 'Patrimoine', icon: Building2 }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigation('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
                <p className="text-sm text-gray-500">Informations personnelles réutilisables pour tous vos projets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-sm text-orange-600 font-medium">
                  Modifications non sauvegardées
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Identité */}
        {activeTab === 'identity' && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Informations d'identité</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nom"
                  value={profileData.nom}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                  placeholder="Dupont"
                />
                <Input
                  label="Prénom"
                  value={profileData.prenom}
                  onChange={(e) => handleInputChange('prenom', e.target.value)}
                  placeholder="Jean"
                />
                <Input
                  label="Date de naissance"
                  type="date"
                  value={profileData.dateNaissance}
                  onChange={(e) => handleInputChange('dateNaissance', e.target.value)}
                />
                <Input
                  label="Lieu de naissance"
                  value={profileData.lieuNaissance}
                  onChange={(e) => handleInputChange('lieuNaissance', e.target.value)}
                  placeholder="Paris"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationalité
                  </label>
                  <select
                    value={profileData.nationalite}
                    onChange={(e) => handleInputChange('nationalite', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Française">Française</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Situation familiale
                  </label>
                  <select
                    value={profileData.situationFamiliale}
                    onChange={(e) => handleInputChange('situationFamiliale', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Celibataire">Célibataire</option>
                    <option value="Marie">Marié(e)</option>
                    <option value="Pacse">Pacsé(e)</option>
                    <option value="Divorce">Divorcé(e)</option>
                    <option value="Veuf">Veuf/Veuve</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Situation professionnelle */}
        {activeTab === 'work' && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Situation professionnelle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut professionnel
                  </label>
                  <select
                    value={profileData.statutProfessionnel}
                    onChange={(e) => handleInputChange('statutProfessionnel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Salarie">Salarié</option>
                    <option value="Independant">Indépendant</option>
                    <option value="Dirigeant">Dirigeant</option>
                    <option value="Retraite">Retraité</option>
                    <option value="Sans_activite">Sans activité</option>
                  </select>
                </div>
                <Input
                  label="Emploi / Profession"
                  value={profileData.emploi}
                  onChange={(e) => handleInputChange('emploi', e.target.value)}
                  placeholder="Ingénieur"
                />
                <Input
                  label="Employeur / Entreprise"
                  value={profileData.employeur}
                  onChange={(e) => handleInputChange('employeur', e.target.value)}
                  placeholder="Nom de l'entreprise"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de contrat
                  </label>
                  <select
                    value={profileData.typeContrat}
                    onChange={(e) => handleInputChange('typeContrat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Interim">Intérim</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Fonctionnaire">Fonctionnaire</option>
                  </select>
                </div>
                <Input
                  label="Ancienneté"
                  value={profileData.anciennete}
                  onChange={(e) => handleInputChange('anciennete', e.target.value)}
                  placeholder="5 ans"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Revenus */}
        {activeTab === 'income' && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Revenus mensuels</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Salaire mensuel net"
                  type="number"
                  value={profileData.salaireMensuelNet}
                  onChange={(e) => handleInputChange('salaireMensuelNet', e.target.value)}
                  placeholder="3000"
                  helperText="€ / mois"
                />
                <Input
                  label="Primes annuelles"
                  type="number"
                  value={profileData.primesAnnuelles}
                  onChange={(e) => handleInputChange('primesAnnuelles', e.target.value)}
                  placeholder="5000"
                  helperText="€ / an"
                />
                <Input
                  label="Revenus locatifs"
                  type="number"
                  value={profileData.revenusLocatifs}
                  onChange={(e) => handleInputChange('revenusLocatifs', e.target.value)}
                  placeholder="800"
                  helperText="€ / mois"
                />
                <Input
                  label="Autres revenus"
                  type="number"
                  value={profileData.autresRevenus}
                  onChange={(e) => handleInputChange('autresRevenus', e.target.value)}
                  placeholder="200"
                  helperText="€ / mois"
                />
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Total mensuel estimé :{' '}
                  <span className="text-lg">
                    {(
                      (parseFloat(profileData.salaireMensuelNet) || 0) +
                      (parseFloat(profileData.primesAnnuelles) || 0) / 12 +
                      (parseFloat(profileData.revenusLocatifs) || 0) +
                      (parseFloat(profileData.autresRevenus) || 0)
                    ).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Charges */}
        {activeTab === 'charges' && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6">Charges mensuelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Loyer mensuel"
                  type="number"
                  value={profileData.loyerMensuel}
                  onChange={(e) => handleInputChange('loyerMensuel', e.target.value)}
                  placeholder="800"
                  helperText="€ / mois"
                />
                <Input
                  label="Mensualités crédits en cours"
                  type="number"
                  value={profileData.mensualitesCredits}
                  onChange={(e) => handleInputChange('mensualitesCredits', e.target.value)}
                  placeholder="500"
                  helperText="€ / mois"
                />
                <Input
                  label="Pension alimentaire"
                  type="number"
                  value={profileData.pensionAlimentaire}
                  onChange={(e) => handleInputChange('pensionAlimentaire', e.target.value)}
                  placeholder="300"
                  helperText="€ / mois"
                />
                <Input
                  label="Autres charges"
                  type="number"
                  value={profileData.autresCharges}
                  onChange={(e) => handleInputChange('autresCharges', e.target.value)}
                  placeholder="200"
                  helperText="€ / mois"
                />
              </div>
              <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-orange-900">
                  Total mensuel :{' '}
                  <span className="text-lg">
                    {(
                      (parseFloat(profileData.loyerMensuel) || 0) +
                      (parseFloat(profileData.mensualitesCredits) || 0) +
                      (parseFloat(profileData.pensionAlimentaire) || 0) +
                      (parseFloat(profileData.autresCharges) || 0)
                    ).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Patrimoine */}
        {activeTab === 'patrimoine' && (
          <div className="space-y-6">
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Biens immobiliers existants</h2>
                <p className="text-gray-600 text-sm">
                  Listez ici vos biens immobiliers actuels (résidence principale, investissements locatifs, etc.)
                </p>
                <Button variant="outline" className="mt-4">
                  <Home className="h-4 w-4 mr-2" />
                  Ajouter un bien
                </Button>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Crédits en cours</h2>
                <p className="text-gray-600 text-sm">
                  Listez vos crédits immobiliers, crédits à la consommation, etc.
                </p>
                <Button variant="outline" className="mt-4">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Ajouter un crédit
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Modal de confirmation de sortie */}
      <Modal
        isOpen={showModal}
        onClose={cancelNavigation}
        title="Modifications non sauvegardées"
        onConfirm={confirmNavigation}
        confirmText="Quitter sans sauvegarder"
        cancelText="Rester sur la page"
        confirmVariant="danger"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Vous avez des modifications non sauvegardées. Si vous quittez maintenant, ces modifications seront perdues.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={saveAndNavigate} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder et quitter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Profile
