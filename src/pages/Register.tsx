import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { Mail, Lock, Eye, EyeOff, UserIcon } from 'lucide-react'

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!formData.nom.trim() || !formData.prenom.trim()) {
      setError('Le nom et le prénom sont obligatoires')
      return
    }

    setLoading(true)

    try {
      await register({
        email: formData.email,
        password: formData.password,
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim()
      })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">MDI.fr</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Creer un compte
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Commencez a creer vos dossiers bancaires immobiliers
          </p>
        </div>

        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                required
                placeholder="Jean"
              />
              <Input
                label="Nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                placeholder="Dupont"
              />
            </div>

            <Input
              label="Adresse email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              icon={<Mail className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                icon={<Lock className="h-4 w-4" />}
                helperText="Minimum 8 caractères"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                icon={<Lock className="h-4 w-4" />}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Deja un compte ?{' '}
              <Link
                to="/login"
                className="font-medium text-gray-900 hover:text-gray-700"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Register 