import React, { useState } from 'react'
import { Search, Building2, User, Loader2, Check, Plus, ChevronDown } from 'lucide-react'
import { searchEntrepriseByDirigeant, EntrepriseApiResult } from '@/services/entrepriseApi'

interface RechercheEntrepriseParDirigeantProps {
  onAddEntreprises?: (entreprises: EntrepriseApiResult[], searchedNom?: string, searchedPrenoms?: string) => void
}

const RechercheEntrepriseParDirigeant: React.FC<RechercheEntrepriseParDirigeantProps> = ({
  onAddEntreprises
}) => {
  console.log('🔍 RechercheEntrepriseParDirigeant monté')

  const [isExpanded, setIsExpanded] = useState(false)
  const [nom, setNom] = useState('')
  const [prenoms, setPrenoms] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<EntrepriseApiResult[]>([])
  const [selectedEntreprises, setSelectedEntreprises] = useState<Set<string>>(new Set())
  const [totalResults, setTotalResults] = useState(0)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!nom.trim()) {
      setSearchError('Veuillez entrer au moins un nom')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)
    setSelectedEntreprises(new Set()) // Reset selection

    try {
      const response = await searchEntrepriseByDirigeant(nom, prenoms, 1, 25)
      setResults(response.results || [])
      setTotalResults(response.total_results || 0)

      if (response.results.length === 0) {
        setSearchError(`Aucune entreprise trouvée pour ${prenoms} ${nom}`.trim())
      }
    } catch (error) {
      console.error('Erreur recherche dirigeant:', error)
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.')
      setResults([])
      setTotalResults(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const toggleEntrepriseSelection = (siren: string) => {
    setSelectedEntreprises(prev => {
      const newSet = new Set(prev)
      if (newSet.has(siren)) {
        newSet.delete(siren)
      } else {
        newSet.add(siren)
      }
      return newSet
    })
  }

  const handleAddSelectedEntreprises = () => {
    console.log('🔘 handleAddSelectedEntreprises appelé')
    const entreprisesToAdd = results.filter(e => selectedEntreprises.has(e.siren))
    console.log('📊 Entreprises à ajouter:', entreprisesToAdd.length)
    console.log('🔍 onAddEntreprises existe?', !!onAddEntreprises)
    console.log('🔍 Type de onAddEntreprises:', typeof onAddEntreprises)
    console.log('🔍 onAddEntreprises:', onAddEntreprises)

    if (entreprisesToAdd.length > 0 && onAddEntreprises) {
      console.log('✅ JUSTE AVANT appel de onAddEntreprises avec', entreprisesToAdd.length, 'entreprises')
      console.log('✅ APPEL MAINTENANT de onAddEntreprises()')
      onAddEntreprises(entreprisesToAdd, nom, prenoms)
      console.log('✅ APRÈS appel de onAddEntreprises')
      // Reset après ajout
      setSelectedEntreprises(new Set())
      setResults([])
      setHasSearched(false)
      setNom('')
      setPrenoms('')
    } else {
      console.log('❌ Conditions non remplies - entreprises:', entreprisesToAdd.length, 'callback:', !!onAddEntreprises)
    }
  }

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header collapsible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 flex items-center justify-between transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Rechercher par dirigeant</p>
            <p className="text-xs text-gray-600">Importer automatiquement depuis l'API entreprise</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Contenu extensible */}
      {isExpanded && (
        <div className="p-4 bg-white border-t border-blue-100">
          <div className="mb-4">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              Trouvez toutes les entreprises où une personne est dirigeante
            </p>
          </div>

          {/* Formulaire de recherche */}
          <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ex: Dupont"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom(s) (optionnel)
                  </label>
                  <input
                    type="text"
                    value={prenoms}
                    onChange={(e) => setPrenoms(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ex: Jean"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !nom.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{searchError}</p>
              </div>
            )}

            {/* Résultats */}
            {hasSearched && !isSearching && results.length > 0 && (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {totalResults} entreprise{totalResults > 1 ? 's' : ''} trouvée{totalResults > 1 ? 's' : ''}
                    {selectedEntreprises.size > 0 && (
                      <span className="ml-2 text-purple-600">
                        ({selectedEntreprises.size} sélectionnée{selectedEntreprises.size > 1 ? 's' : ''})
                      </span>
                    )}
                  </h4>
                  {totalResults > 25 && (
                    <p className="text-xs text-gray-500">
                      Affichage des 25 premiers résultats
                    </p>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto mb-3">
                  {results.map((entreprise, index) => {
                    // Trouver le dirigeant correspondant à la recherche
                    const dirigeant = entreprise.dirigeants?.find(d =>
                      d.nom?.toLowerCase().includes(nom.toLowerCase()) ||
                      d.prenoms?.toLowerCase().includes(prenoms.toLowerCase())
                    )
                    const isSelected = selectedEntreprises.has(entreprise.siren)

                    return (
                      <button
                        key={entreprise.siren || index}
                        type="button"
                        onClick={() => toggleEntrepriseSelection(entreprise.siren)}
                        className={`w-full text-left p-4 bg-white border-2 rounded-lg transition-all group ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'bg-white border-gray-300 group-hover:border-purple-400'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <p className="font-semibold text-gray-900 group-hover:text-purple-700 truncate">
                                {entreprise.nom_complet || entreprise.nom_raison_sociale}
                              </p>
                            </div>

                            <p className="text-sm text-gray-600 ml-6 mb-2">
                              {entreprise.siege?.adresse || 'Adresse non disponible'}
                            </p>

                            {dirigeant && (
                              <div className="ml-6 mb-2">
                                <p className="text-sm text-purple-700 font-medium">
                                  {dirigeant.prenoms} {dirigeant.nom} - {dirigeant.qualite || 'Dirigeant'}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 ml-6">
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
                    )
                  })}
                </div>

                {/* Bouton pour ajouter les entreprises sélectionnées */}
                {selectedEntreprises.size > 0 && (
                  <button
                    type="button"
                    onClick={handleAddSelectedEntreprises}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    Ajouter {selectedEntreprises.size} entreprise{selectedEntreprises.size > 1 ? 's' : ''} comme associé{selectedEntreprises.size > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default RechercheEntrepriseParDirigeant
