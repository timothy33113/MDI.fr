import React, { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Home, User, LogOut, AlertTriangle, Mail, X, Loader2, Briefcase, FolderOpen, Building2, Settings } from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'

interface MainLayoutProps {
  children: React.ReactNode
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout, resendVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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

  // Pages publiques : pas de layout
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
  if (!user && publicPaths.some(p => location.pathname.startsWith(p))) {
    return <>{children}</>
  }

  // Pas authentifié sur une route protégée : rediriger vers login
  if (!user && !isAuthenticated) {
    return <>{children}</>
  }

  // Authentifié mais user pas encore propagé : loader temporaire
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent" />
      </div>
    )
  }

  const navItems = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/profile', label: 'Associes', icon: Briefcase },
    { path: '/projets', label: 'Projets', icon: FolderOpen },
    { path: '/patrimoine', label: 'Patrimoine', icon: Building2 },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Sliding pill navigation
  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement>>({})
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({ top: 0, left: 0, width: 0, height: 0, opacity: 0 })

  const activePath = navItems.find(item => isActive(item.path))?.path || '/'

  const updatePill = useCallback(() => {
    const link = linkRefs.current[activePath]
    const nav = navRef.current
    if (link && nav) {
      const navRect = nav.getBoundingClientRect()
      const linkRect = link.getBoundingClientRect()
      setPillStyle({
        top: linkRect.top - navRect.top,
        left: linkRect.left - navRect.left,
        width: linkRect.width,
        height: linkRect.height,
        opacity: 1,
      })
    }
  }, [activePath])

  useLayoutEffect(() => {
    updatePill()
  }, [activePath, updatePill])

  useEffect(() => {
    window.addEventListener('resize', updatePill)
    return () => window.removeEventListener('resize', updatePill)
  }, [updatePill])

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Banner verification email */}
      {showEmailBanner && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  {resendSuccess ? (
                    <span className="text-green-700">
                      Un email de verification a ete envoye a {user.email}
                    </span>
                  ) : resendError ? (
                    <span className="text-red-700">{resendError}</span>
                  ) : (
                    <>
                      Votre adresse email n'est pas encore verifiee.{' '}
                      <button
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        className="font-medium underline hover:text-amber-900 inline-flex items-center gap-1"
                      >
                        {resendLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            envoi...
                          </>
                        ) : (
                          <>
                            <Mail className="h-3 w-3" />
                            Renvoyer le lien
                          </>
                        )}
                      </button>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 text-amber-600 hover:text-amber-800 rounded transition-colors"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="28" height="28" rx="8" fill="#111827"/>
                <path d="M6 20V8L10.5 14L15 8V20" stroke="#FF9270" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 8V20" stroke="#FFE989" strokeWidth="2.2" strokeLinecap="round"/>
                <circle cx="19" cy="8" r="1.5" fill="#FFE989"/>
              </svg>
              <span className="text-lg font-bold text-gray-900 tracking-tight">MDI<span className="text-gray-400">.fr</span></span>
            </Link>

            {/* Navigation centrale with sliding pill */}
            <nav ref={navRef} className="hidden md:flex items-center gap-1 relative">
              {/* Sliding pill background */}
              <div
                className="absolute bg-gray-900 rounded-xl transition-all duration-300 ease-out"
                style={pillStyle}
              />
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  ref={(el) => { if (el) linkRefs.current[path] = el }}
                  to={path}
                  className={`relative z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    isActive(path)
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* Actions droite */}
            <div className="flex items-center gap-2">
              <Link
                to="/mon-compte"
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all"
                aria-label="Mon compte"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  {user.prenom || user.nom ? (
                    <span className="text-white text-xs font-bold">
                      {user.prenom?.[0]?.toUpperCase() || ''}{user.nom?.[0]?.toUpperCase() || ''}
                    </span>
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Contenu */}
      <main className="pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                isActive(path)
                  ? 'text-gray-900'
                  : 'text-gray-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default MainLayout
