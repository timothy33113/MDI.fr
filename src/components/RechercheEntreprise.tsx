import React, { useState } from 'react'
import { Search, Building2, Loader2, ChevronDown, Sparkles } from 'lucide-react'
import { searchEntrepriseByName, searchEntrepriseBySirenOrSiret } from '@/services/entrepriseApi'

interface RechercheEntrepriseProps {
  onSelectEntreprise?: (entreprise: any) => void
}

const RechercheEntreprise: React.FC<RechercheEntrepriseProps> = ({
  onSelectEntreprise
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Veuillez entrer un nom ou un SIREN')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)

    try {
      // Détecter si c'est un SIREN (9 chiffres) ou un nom
      const isSiren = /^\d{9}$/.test(searchQuery.trim())

      if (isSiren) {
        // Recherche par SIREN
        const entreprise = await searchEntrepriseBySirenOrSiret(searchQuery.trim())
        if (entreprise) {
          setResults([entreprise])
        } else {
          setResults([])
          setSearchError(`Aucune entreprise trouvée pour le SIREN "${searchQuery}"`)
        }
      } else {
        // Recherche par nom
        const response = await searchEntrepriseByName(searchQuery.trim(), 1, 25)
        setResults(response.results || [])

        if (response.results.length === 0) {
          setSearchError(`Aucune entreprise trouvée pour "${searchQuery}"`)
        }
      }
    } catch (error) {
      console.error('Erreur recherche entreprise:', error)
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSelectEntreprise = (entreprise: any) => {
    if (onSelectEntreprise) {
      onSelectEntreprise(entreprise)
    }
    // Réinitialiser
    setSearchQuery('')
    setResults([])
    setHasSearched(false)
    setIsExpanded(false)
  }

  return (
    <div className="border border-honey-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header collapsible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3.5 bg-gradient-to-r from-coral-50 via-honey-50 to-honey-100 hover:from-coral-100 hover:via-honey-100 hover:to-honey-150 flex items-center justify-between transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-white/80 rounded-xl shadow-sm">
            <Sparkles className="h-5 w-5 text-coral-500" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Pré-remplir avec un SIREN ou nom</p>
            <p className="text-xs text-gray-600">Les informations de la société seront importées automatiquement</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Contenu extensible */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="mb-4">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-700" />
              Recherchez par nom ou numéro SIREN
            </p>
          </div>

          {/* Formulaire de recherche */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom ou SIREN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ex: Dupont SARL ou 123456789"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Rechercher
                </>
              )}
            </button>
          </div>

          {/* Erreur */}
          {searchError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
          )}

          {/* Résultats */}
          {hasSearched && !isSearching && results.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                {results.length} entreprise{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
              </h4>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((entreprise, index) => (
                  <button
                    key={entreprise.siren || index}
                    type="button"
                    onClick={() => handleSelectEntreprise(entreprise)}
                    className="w-full text-left p-4 bg-white border-2 border-gray-200 hover:border-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-gray-900 mt-0.5 flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate mb-1">
                          {entreprise.nom_complet || entreprise.nom_raison_sociale}
                        </p>

                        <p className="text-sm text-gray-600 mb-2">
                          {entreprise.siege?.adresse || 'Adresse non disponible'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            SIREN: {entreprise.siren}
                          </span>
                          {entreprise.activite_principale && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              {entreprise.activite_principale}
                            </span>
                          )}
                          {entreprise.etat_administratif === 'A' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                              Cessée
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RechercheEntreprise
