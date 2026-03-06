import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Building2, X } from 'lucide-react'
import { useStructuresContext } from '@/contexts/StructuresContext'
import SearchBar from '@/components/ui/SearchBar'
import { cn } from '@/utils/cn'
import { Structure, TypeStructure } from '@/types'

interface SearchResult {
  id: string
  nom: string
  type: TypeStructure
  subtitle?: string
}

interface GroupedResults {
  associes: SearchResult[]
  societes: SearchResult[]
}

const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroupedResults>({ associes: [], societes: [] })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { structures } = useStructuresContext()

  // Filter structures based on query
  const searchStructures = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ associes: [], societes: [] })
      return
    }

    const normalizedQuery = searchQuery.toLowerCase().trim()

    const filteredStructures = structures.filter((structure) => {
      const nom = structure.nom?.toLowerCase() || ''
      const prenom = structure.personnePhysique?.prenom?.toLowerCase() || ''
      const denomination = structure.personneMorale?.denominationSociale?.toLowerCase() || ''

      return (
        nom.includes(normalizedQuery) ||
        prenom.includes(normalizedQuery) ||
        denomination.includes(normalizedQuery) ||
        `${prenom} ${nom}`.includes(normalizedQuery)
      )
    })

    const grouped: GroupedResults = {
      associes: [],
      societes: []
    }

    filteredStructures.forEach((structure) => {
      const result: SearchResult = {
        id: structure.id,
        nom: getDisplayName(structure),
        type: structure.type,
        subtitle: getSubtitle(structure)
      }

      if (structure.type === 'PERSONNE_PHYSIQUE') {
        grouped.associes.push(result)
      } else {
        grouped.societes.push(result)
      }
    })

    setResults(grouped)
  }, [structures])

  // Get display name for a structure
  const getDisplayName = (structure: Structure): string => {
    if (structure.type === 'PERSONNE_PHYSIQUE' && structure.personnePhysique) {
      return `${structure.personnePhysique.prenom} ${structure.nom}`
    }
    return structure.nom
  }

  // Get subtitle for a structure
  const getSubtitle = (structure: Structure): string => {
    if (structure.type === 'PERSONNE_PHYSIQUE' && structure.personnePhysique) {
      return structure.personnePhysique.statutProfessionnel?.replace('_', ' ') || 'Personne physique'
    }
    if (structure.personneMorale) {
      return structure.personneMorale.formeJuridique || structure.type
    }
    return structure.type
  }

  // Handle search input
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    if (searchQuery.trim()) {
      setIsOpen(true)
      searchStructures(searchQuery)
    } else {
      setIsOpen(false)
      setResults({ associes: [], societes: [] })
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(`/structure/${result.id}`)
    setIsOpen(false)
    setQuery('')
    setResults({ associes: [], societes: [] })
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const hasResults = results.associes.length > 0 || results.societes.length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <SearchBar
        onSearch={handleSearch}
        placeholder="Rechercher un associe ou une societe..."
        className="w-64 lg:w-80"
      />

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-2 z-50',
          'bg-white',
          'border border-gray-200',
          'rounded-xl shadow-lg',
          'max-h-96 overflow-y-auto'
        )}>
          {!hasResults ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">Aucun resultat pour "{query}"</p>
            </div>
          ) : (
            <>
              {/* Associes Section */}
              {results.associes.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Associes ({results.associes.length})
                    </h3>
                  </div>
                  <ul>
                    {results.associes.map((result) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            'w-full px-4 py-3 flex items-center gap-3',
                            'hover:bg-gray-50',
                            'transition-colors text-left'
                          )}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.nom}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Societes Section */}
              {results.societes.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Societes ({results.societes.length})
                    </h3>
                  </div>
                  <ul>
                    {results.societes.map((result) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleResultClick(result)}
                          className={cn(
                            'w-full px-4 py-3 flex items-center gap-3',
                            'hover:bg-gray-50',
                            'transition-colors text-left'
                          )}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.nom}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
