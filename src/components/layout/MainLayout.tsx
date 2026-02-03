import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import { Home, User, LogOut, AlertTriangle, Mail, X, Loader2 } from 'lucide-react'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, resendVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendError('')
    try {
      await resendVerificationEmail()
      setResendSuccess(true)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setResendLoading(false)
    }
  }

  const showEmailBanner = user && user.emailVerified === false && !bannerDismissed

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!user) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Banner verification email */}
      {showEmailBanner && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {resendSuccess ? (
                    <span className="text-green-700 dark:text-green-400">
                      Un email de verification a ete envoye a {user.email}
                    </span>
                  ) : resendError ? (
                    <span className="text-red-700 dark:text-red-400">{resendError}</span>
                  ) : (
                    <>
                      Votre adresse email n'est pas encore verifiee. Verifiez votre boite de reception ou{' '}
                      <button
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="font-medium underline hover:text-amber-900 dark:hover:text-amber-100 inline-flex items-center gap-1"
                      >
                        {resendLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            envoi...
                          </>
                        ) : (
                          <>
                            <Mail className="h-3 w-3" />
                            renvoyez le lien
                          </>
                        )}
                      </button>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 rounded transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header commun */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                <Home className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">MDI.fr</span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/mon-compte"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{user.email}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu de la page */}
      <main>
        {children}
      </main>
    </div>
  )
}

export default MainLayout
