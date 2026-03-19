import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [localLoading, setLocalLoading] = useState(false)

  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Si déjà authentifié (visite directe de /login), rediriger
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLocalLoading(true)

    try {
      await login({ email, password })
      // Naviguer immédiatement après login (même batch React que les setState)
      navigate('/', { replace: true })
    } catch (err) {
      setError('Email ou mot de passe incorrect')
      setLocalLoading(false)
    }
  }

  // Loader pendant la redirection
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="#111827"/>
              <path d="M6 20V8L10.5 14L15 8V20" stroke="#FF9270" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 8V20" stroke="#FFE989" strokeWidth="2.2" strokeLinecap="round"/>
              <circle cx="19" cy="8" r="1.5" fill="#FFE989"/>
            </svg>
            <span className="text-2xl font-bold text-gray-900 tracking-tight">MDI<span className="text-gray-400">.fr</span></span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Accedez a vos dossiers bancaires immobiliers
          </p>
        </div>

        <Card>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Input
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="h-4 w-4" />}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                icon={<Lock className="h-4 w-4" />}
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 py-2.5 px-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Mot de passe oublie ?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={localLoading}
            >
              {localLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Pas encore de compte ?{' '}
              <Link
                to="/register"
                className="font-medium text-gray-900 hover:text-gray-700"
              >
                Creer un compte
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Login
