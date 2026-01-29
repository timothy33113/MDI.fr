import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { Home, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const { user, updateUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Aucun token de verification fourni')
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/email?action=verify&token=${token}`, {
          method: 'GET',
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.expired) {
            setExpired(true)
          }
          throw new Error(data.error || 'Une erreur est survenue')
        }

        setSuccess(true)

        // Mettre a jour l'utilisateur si connecte
        if (user) {
          updateUser({ ...user, emailVerified: true } as any)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [token, user, updateUser])

  const handleResendVerification = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setResending(true)
    setResendSuccess(false)

    try {
      const authToken = localStorage.getItem('token')
      const response = await fetch('/api/auth/email?action=resend', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      setResendSuccess(true)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setResending(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Verification en cours...
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Veuillez patienter pendant que nous verifions votre adresse email.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Email verifie
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Votre adresse email a ete verifiee avec succes
            </p>
          </div>

          <Card>
            <div className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Vous pouvez maintenant profiter de toutes les fonctionnalites de MDI.fr.
              </p>
              <Link to="/">
                <Button className="w-full">
                  Acceder au tableau de bord
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Resend success state
  if (resendSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Email envoye
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Un nouveau lien de verification a ete envoye
            </p>
          </div>

          <Card>
            <div className="text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Verifiez votre boite de reception et cliquez sur le lien de verification.
              </p>
              <Link to="/">
                <Button variant="secondary" className="w-full">
                  Retour au tableau de bord
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-red-600 rounded-lg flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Echec de la verification
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {error}
          </p>
        </div>

        <Card>
          <div className="text-center space-y-4">
            {expired && user ? (
              <>
                <p className="text-gray-600 dark:text-gray-400">
                  Votre lien de verification a expire. Cliquez ci-dessous pour recevoir un nouveau lien.
                </p>
                <Button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full"
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Renvoyer le lien de verification
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Le lien de verification est invalide ou a deja ete utilise.
              </p>
            )}
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Retour a la connexion
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default VerifyEmail
