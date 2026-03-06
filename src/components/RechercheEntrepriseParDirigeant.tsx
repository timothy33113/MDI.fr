import React, { useState } from 'react'
import { Search, Building2, Loader2, Check, Plus, Sparkles, Link as LinkIcon } from 'lucide-react'
import { searchEntrepriseByDirigeant, searchEntrepriseBySirenOrSiret, searchFilialesByPM, isHolding, EntrepriseApiResult } from '@/services/entrepriseApi'

interface RechercheEntrepriseParDirigeantProps {
  nom: string
  prenoms: string
  onAddEntreprises?: (entreprises: EntrepriseApiResult[], searchedNom?: string, searchedPrenoms?: string) => void
}

// Résultat enrichi avec info de provenance
interface EnrichedResult {
  entreprise: EntrepriseApiResult
  isLinkedPM?: boolean
}

const RechercheEntrepriseParDirigeant: React.FC<RechercheEntrepriseParDirigeantProps> = ({
  nom,
  prenoms,
  onAddEntreprises
}) => {
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchingFiliales, setIsSearchingFiliales] = useState(false)
  const [results, setResults] = useState<EnrichedResult[]>([])
  const [selectedEntreprises, setSelectedEntreprises] = useState<Set<string>>(new Set())
  const [totalResults, setTotalResults] = useState(0)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!nom.trim()) {
      setSearchError('Veuillez renseigner le nom ci-dessus')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setHasSearched(true)
    setSelectedEntreprises(new Set())

    try {
      const response = await searchEntrepriseByDirigeant(nom, prenoms, 1, 25)
      const activeResults = (response.results || []).filter(e => e.etat_administratif === 'A')
      const directResults: EnrichedResult[] = activeResults.map(e => ({
        entreprise: e
      }))

      setResults(directResults)
      setTotalResults(activeResults.length)

      if (activeResults.length === 0) {
        setSearchError(`Aucune entreprise trouvée pour ${prenoms} ${nom}`.trim())
        setIsSearching(false)
        return
      }

      setIsSearching(false)

      // Phase 2 : Trouver les sociétés liées
      const allPmSirens = new Map<string, string>()
      const existingSirens = new Set(activeResults.map(r => r.siren))

      for (const result of activeResults) {
        for (const d of result.dirigeants || []) {
          if (d.type_dirigeant === 'personne morale' && d.siren && d.denomination) {
            allPmSirens.set(d.siren, d.denomination)
          }
        }
      }

      if (allPmSirens.size > 0) {
        setIsSearchingFiliales(true)

        // 2a: Récupérer les PM absents des résultats directs
        const missingSirens = [...allPmSirens.entries()].filter(([siren]) => !existingSirens.has(siren))
        const missingPmPromises = missingSirens.map(async ([siren, denomination]) => {
          try {
            const pmData = await searchEntrepriseBySirenOrSiret(siren)
            if (pmData && pmData.etat_administratif === 'A') {
              existingSirens.add(siren)
              return { entreprise: pmData, isLinkedPM: true } as EnrichedResult
            }
          } catch (err) {
            console.error(`Erreur récupération PM ${denomination}:`, err)
          }
          return null
        })

        const missingPmFetched = await Promise.all(missingPmPromises)
        const missingPmResults = missingPmFetched.filter((r): r is EnrichedResult => r !== null)

        if (missingPmResults.length > 0) {
          setResults(prev => [...prev, ...missingPmResults])
          setTotalResults(prev => prev + missingPmResults.length)
        }

        // Collecter PM des PM manquants
        for (const pmResult of missingPmResults) {
          for (const d of pmResult.entreprise.dirigeants || []) {
            if (d.type_dirigeant === 'personne morale' && d.siren && d.denomination) {
              if (!allPmSirens.has(d.siren)) {
                allPmSirens.set(d.siren, d.denomination)
              }
            }
          }
        }

        // 2b: Chercher les filiales de TOUS les PM
        const filialesPromises = [...allPmSirens.entries()].map(async ([pmSiren, pmDenomination]) => {
          try {
            return await searchFilialesByPM(pmDenomination, pmSiren, 3)
          } catch (err) {
            console.error(`Erreur recherche filiales de ${pmDenomination}:`, err)
            return []
          }
        })

        const filialesArrays = await Promise.all(filialesPromises)
        const allFiliales = filialesArrays.flat()

        const newFiliales: EnrichedResult[] = []
        for (const f of allFiliales) {
          if (!existingSirens.has(f.siren) && f.etat_administratif === 'A') {
            existingSirens.add(f.siren)
            newFiliales.push({
              entreprise: f,
              isLinkedPM: true
            })
          }
        }

        if (newFiliales.length > 0) {
          setResults(prev => [...prev, ...newFiliales])
          setTotalResults(prev => prev + newFiliales.length)
        }

        setIsSearchingFiliales(false)
      }
    } catch (error) {
      console.error('Erreur recherche dirigeant:', error)
      setSearchError('Erreur lors de la recherche. Veuillez réessayer.')
      setResults([])
      setTotalResults(0)
      setIsSearching(false)
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
    const entreprisesToAdd = results
      .filter(r => selectedEntreprises.has(r.entreprise.siren))
      .map(r => r.entreprise)

    if (entreprisesToAdd.length > 0 && onAddEntreprises) {
      onAddEntreprises(entreprisesToAdd, nom, prenoms)
      setSelectedEntreprises(new Set())
      setResults([])
      setHasSearched(false)
    }
  }

  // Séparer résultats directs et sociétés mères liées
  const directResults = results.filter(r => !r.isLinkedPM)
  const linkedPMResults = results.filter(r => r.isLinkedPM)

  const getFormeJuridique = (code: string): string | null => {
    if (!code) return null
    if (code === '5498' || code === '5499') return 'SARL'
    if (code === '5710') return 'SAS'
    if (code === '5720') return 'SASU'
    if (code === '5505' || code === '5510') return 'SA'
    if (code === '5542') return 'EURL'
    if (code === '6540') return 'SCI'
    if (code === '5308') return 'SE'
    if (code === '1000') return 'EI'
    if (code === '5202') return 'SNC'
    if (code.startsWith('54')) return 'SARL'
    if (code.startsWith('57')) return 'SAS'
    if (code.startsWith('55')) return 'SA'
    if (code.startsWith('65')) return 'SCI'
    return null
  }

  const renderEntrepriseCard = (item: EnrichedResult, index: number) => {
    const { entreprise, isLinkedPM } = item
    const dirigeant = entreprise.dirigeants?.find(d =>
      d.nom?.toLowerCase().includes(nom.toLowerCase()) ||
      (prenoms && d.prenoms?.toLowerCase().includes(prenoms.toLowerCase()))
    )
    const isSelected = selectedEntreprises.has(entreprise.siren)
    const holding = isHolding(entreprise)
    const formeJuridique = getFormeJuridique(entreprise.nature_juridique)

    return (
      <button
        key={entreprise.siren || index}
        type="button"
        onClick={() => toggleEntrepriseSelection(entreprise.siren)}
        className={`w-full text-left bg-white rounded-xl border transition-all cursor-pointer ${
          isSelected
            ? 'border-gray-300 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          {/* Left: icon + content */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? 'bg-gray-900'
                : holding ? 'bg-purple-50' : 'bg-gray-100'
            }`}>
              {isSelected ? (
                <Check className="h-4 w-4 text-white" />
              ) : (
                <Building2 className={`h-4 w-4 ${holding ? 'text-purple-600' : 'text-gray-600'}`} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {entreprise.nom_complet || entreprise.nom_raison_sociale}
                </span>
                {holding && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded-full border border-purple-200 flex-shrink-0">
                    Holding
                  </span>
                )}
                {isLinkedPM && !holding && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-medium rounded-full border border-amber-200 flex-shrink-0">
                    Société liée
                  </span>
                )}
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full flex-shrink-0">
                  {entreprise.siren}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {entreprise.siege?.adresse || 'Adresse non disponible'}
              </p>
              {dirigeant && (
                <p className="text-xs text-gray-500 truncate">
                  {dirigeant.prenoms} {dirigeant.nom} — {dirigeant.qualite || 'Dirigeant'}
                </p>
              )}
            </div>
          </div>

          {/* Right: forme juridique badge */}
          {formeJuridique && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full border border-blue-200 flex-shrink-0 ml-3">
              {formeJuridique}
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bouton de recherche */}
      <button
        type="button"
        onClick={handleSearch}
        disabled={isSearching || !nom.trim()}
        className="w-full px-4 py-3 bg-gradient-to-r from-coral-50 via-honey-50 to-honey-100 hover:from-coral-100 hover:via-honey-100 hover:to-honey-150 border border-honey-200 rounded-xl flex items-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        <div className="flex-shrink-0 p-1.5 bg-white/80 rounded-lg shadow-sm">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-coral-500 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-coral-500" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="font-semibold text-gray-900 text-sm">
            {isSearching ? 'Recherche en cours...' : 'Rechercher les entreprises liées'}
          </p>
          <p className="text-xs text-gray-600">
            {nom.trim()
              ? `Trouver les sociétés de ${prenoms ? prenoms + ' ' : ''}${nom}, y compris via ses holdings`
              : 'Renseignez le nom ci-dessus pour lancer la recherche'
            }
          </p>
        </div>
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </button>

      {/* Erreur */}
      {searchError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{searchError}</p>
        </div>
      )}

      {/* Recherche sociétés liées en cours */}
      {isSearchingFiliales && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
          <p className="text-sm text-purple-700">Recherche des sociétés mères liées...</p>
        </div>
      )}

      {/* Résultats */}
      {hasSearched && !isSearching && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {totalResults} entreprise{totalResults > 1 ? 's' : ''} trouvée{totalResults > 1 ? 's' : ''}
              {selectedEntreprises.size > 0 && (
                <span className="ml-1 normal-case tracking-normal text-gray-900">
                  — {selectedEntreprises.size} sélectionnée{selectedEntreprises.size > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {directResults.map((item, index) => renderEntrepriseCard(item, index))}

            {linkedPMResults.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-2 px-1">
                  <LinkIcon className="h-3.5 w-3.5 text-purple-500" />
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                    Sociétés liées
                  </p>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-full border border-purple-200">
                    {linkedPMResults.length}
                  </span>
                </div>
                <div className="space-y-2 pl-3 border-l-2 border-purple-100">
                  {linkedPMResults.map((item, index) => renderEntrepriseCard(item, index))}
                </div>
              </>
            )}
          </div>

          {selectedEntreprises.size > 0 && (
            <button
              type="button"
              onClick={handleAddSelectedEntreprises}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Ajouter {selectedEntreprises.size} entreprise{selectedEntreprises.size > 1 ? 's' : ''} comme associé{selectedEntreprises.size > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default RechercheEntrepriseParDirigeant
