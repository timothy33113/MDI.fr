import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Mail, Lock, Save, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'

const MonCompte: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  // State pour les informations personnelles
  const [nom, setNom] = useState(user?.nom || '')
  const [prenom, setPrenom] = useState(user?.prenom || '')
  const [telephone, setTelephone] = useState(user?.telephone || '')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // State pour le changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)

    try {
      const response = await api.put('/auth/profile?action=update', {
        nom,
        prenom,
        telephone
      })

      if (response.data.user) {
        updateUser(response.data.user)
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins une majuscule')
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Le mot de passe doit contenir au moins un chiffre')
      return
    }

    setPasswordSaving(true)

    try {
      await api.post('/auth/password?action=change', {
        currentPassword,
        newPassword
      })

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Erreur lors du changement de mot de passe')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Mon Compte</h1>
          <p className="mt-2 text-gray-600">
            Gérez vos informations personnelles et votre mot de passe
          </p>
        </div>

        {/* Informations personnelles */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-coral-100 rounded-xl">
                <User className="h-5 w-5 text-coral-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Informations personnelles
                </h2>
                <p className="text-sm text-gray-600">
                  Mettez à jour vos informations de profil
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                  placeholder="06 12 34 56 78"
                />
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="h-4 w-4" />
                  Informations sauvegardées avec succès
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Changement de mot de passe */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-honey-100 rounded-xl">
                <Lock className="h-5 w-5 text-honey-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Changer le mot de passe
                </h2>
                <p className="text-sm text-gray-600">
                  Sécurisez votre compte avec un nouveau mot de passe
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                    placeholder="Entrez votre mot de passe actuel"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                    placeholder="Entrez votre nouveau mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  8 caractères minimum, 1 majuscule, 1 chiffre
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-colors"
                    placeholder="Confirmez votre nouveau mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="h-4 w-4" />
                  Mot de passe changé avec succès
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={passwordSaving}
                  variant="secondary"
                  className="inline-flex items-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {passwordSaving ? 'Changement...' : 'Changer le mot de passe'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Informations du compte */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Compte créé le {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}

export default MonCompte
