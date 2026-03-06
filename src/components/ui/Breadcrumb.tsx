import React from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Home, Briefcase, FolderOpen, Building2, Settings, FileText, ChevronRight } from 'lucide-react'

interface Crumb {
  label: string
  path?: string
  icon?: React.FC<{ className?: string }>
}

const routeConfig: Record<string, { label: string; icon: React.FC<{ className?: string }>; parent?: string }> = {
  '/': { label: 'Accueil', icon: Home },
  '/profile': { label: 'Associes', icon: Briefcase, parent: '/' },
  '/projets': { label: 'Projets', icon: FolderOpen, parent: '/' },
  '/projets/nouveau': { label: 'Nouveau projet', icon: FileText, parent: '/projets' },
  '/patrimoine': { label: 'Patrimoine', icon: Building2, parent: '/' },
  '/mon-compte': { label: 'Mon Compte', icon: Settings, parent: '/' },
}

function buildCrumbs(pathname: string): Crumb[] {
  // Check exact match first
  if (routeConfig[pathname]) {
    const crumbs: Crumb[] = []
    let current: string | undefined = pathname

    while (current && routeConfig[current]) {
      const config = routeConfig[current]
      crumbs.unshift({
        label: config.label,
        path: current,
        icon: config.icon,
      })
      current = config.parent
    }

    return crumbs
  }

  // Dynamic routes
  if (pathname.match(/^\/projets\/[^/]+\/edit$/)) {
    return [
      { label: 'Accueil', path: '/', icon: Home },
      { label: 'Projets', path: '/projets', icon: FolderOpen },
      { label: 'Modifier', icon: FileText },
    ]
  }

  if (pathname.match(/^\/projets\/[^/]+\/analyse$/)) {
    return [
      { label: 'Accueil', path: '/', icon: Home },
      { label: 'Projets', path: '/projets', icon: FolderOpen },
      { label: 'Analyse', icon: FileText },
    ]
  }

  if (pathname.match(/^\/projets\/[^/]+$/)) {
    return [
      { label: 'Accueil', path: '/', icon: Home },
      { label: 'Projets', path: '/projets', icon: FolderOpen },
      { label: 'Detail', icon: FileText },
    ]
  }

  if (pathname.match(/^\/structure\/[^/]+$/)) {
    return [
      { label: 'Accueil', path: '/', icon: Home },
      { label: 'Associes', path: '/profile', icon: Briefcase },
      { label: 'Detail', icon: Building2 },
    ]
  }

  // Fallback: just show Accueil
  return [{ label: 'Accueil', path: '/', icon: Home }]
}

const Breadcrumb: React.FC = () => {
  const location = useLocation()
  const crumbs = buildCrumbs(location.pathname)

  // Don't show breadcrumb on home page
  if (location.pathname === '/') return null

  // Don't show on auth pages
  if (['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(location.pathname)) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0">
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const Icon = crumb.icon

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-gray-300 mx-0.5">/</span>
              )}
              {!isLast && crumb.path ? (
                <Link
                  to={crumb.path}
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-gray-600 font-medium">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{crumb.label}</span>
                </span>
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </div>
  )
}

export default Breadcrumb
