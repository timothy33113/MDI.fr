import React from 'react'
import { Plus, X, Users, CheckCircle, AlertTriangle, Crown, Building2 } from 'lucide-react'

interface Coproprietaire {
  structureId: string
  structureNom: string
  pourcentage: number
}

interface StructureDisponible {
  id: string
  nom: string
  type: string
}

interface CoproprietairesEditorProps {
  proprietaireNom: string
  pourcentageDetention: number
  coproprietaires: Coproprietaire[]
  onCoproprietairesChange: (copros: Coproprietaire[]) => void
  structuresDisponibles: StructureDisponible[]
}

const typeLabels: Record<string, string> = {
  'PERSONNE_PHYSIQUE': 'PP',
  'SCI': 'SCI',
  'SARL': 'SARL',
  'SAS': 'SAS',
  'SASU': 'SASU',
  'EURL': 'EURL',
  'SA': 'SA',
  'SNC': 'SNC',
  'AUTRE': 'PM'
}

const typeColors: Record<string, string> = {
  'PERSONNE_PHYSIQUE': 'bg-blue-100 text-blue-700',
  'SCI': 'bg-purple-100 text-purple-700',
  'SARL': 'bg-amber-100 text-amber-700',
  'SAS': 'bg-emerald-100 text-emerald-700',
  'SASU': 'bg-emerald-100 text-emerald-700',
  'EURL': 'bg-amber-100 text-amber-700',
  'SA': 'bg-rose-100 text-rose-700',
  'SNC': 'bg-cyan-100 text-cyan-700',
  'AUTRE': 'bg-gray-100 text-gray-700'
}

// Couleurs pour les segments de la barre
const segmentColors = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-cyan-500',
]

const CoproprietairesEditor: React.FC<CoproprietairesEditorProps> = ({
  proprietaireNom,
  pourcentageDetention,
  coproprietaires,
  onCoproprietairesChange,
  structuresDisponibles
}) => {
  const totalCopro = coproprietaires.reduce((sum, c) => sum + c.pourcentage, 0)
  const total = pourcentageDetention + totalCopro
  const isValid = total === 100
  const hasCopros = coproprietaires.length > 0
  const hasOtherStructures = structuresDisponibles.length > 0

  const structuresRestantes = structuresDisponibles.filter(
    s => !coproprietaires.some(c => c.structureId === s.id)
  )

  const handleAdd = () => {
    if (structuresRestantes.length === 0) return
    const first = structuresRestantes[0]
    onCoproprietairesChange([
      ...coproprietaires,
      { structureId: first.id, structureNom: first.nom, pourcentage: 0 }
    ])
  }

  const handleRemove = (structureId: string) => {
    onCoproprietairesChange(coproprietaires.filter(c => c.structureId !== structureId))
  }

  const handleChangeStructure = (index: number, newStructureId: string) => {
    const structure = structuresDisponibles.find(s => s.id === newStructureId)
    if (!structure) return
    const updated = [...coproprietaires]
    updated[index] = { ...updated[index], structureId: newStructureId, structureNom: structure.nom }
    onCoproprietairesChange(updated)
  }

  const handleChangePourcentage = (index: number, value: number) => {
    const updated = [...coproprietaires]
    updated[index] = { ...updated[index], pourcentage: Math.max(0, Math.min(100, value)) }
    onCoproprietairesChange(updated)
  }

  // Trouver le type d'une structure par son id
  const getStructureType = (structureId: string): string => {
    const s = structuresDisponibles.find(st => st.id === structureId)
    return s?.type || 'PERSONNE_PHYSIQUE'
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Users className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Répartition de la détention</span>
          </div>
          {hasCopros && (
            <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isValid
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-orange-50 text-orange-700 ring-1 ring-orange-200'
            }`}>
              {isValid ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {total}%
            </div>
          )}
          {!hasCopros && (
            <span className="text-xs text-gray-400 font-medium">Propriétaire unique</span>
          )}
        </div>
      </div>

      {/* Barre de progression visuelle */}
      {hasCopros && (
        <div className="px-4 pt-3">
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            {pourcentageDetention > 0 && (
              <div
                className="bg-blue-500 transition-all duration-300 first:rounded-l-full"
                style={{ width: `${Math.min(pourcentageDetention, 100)}%` }}
              />
            )}
            {coproprietaires.map((copro, index) => (
              copro.pourcentage > 0 && (
                <div
                  key={copro.structureId}
                  className={`${segmentColors[(index + 1) % segmentColors.length]} transition-all duration-300`}
                  style={{ width: `${Math.min(copro.pourcentage, 100)}%` }}
                />
              )
            ))}
            {total < 100 && (
              <div
                className="bg-gray-200 transition-all duration-300 last:rounded-r-full"
                style={{ width: `${100 - total}%` }}
              />
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Propriétaire principal */}
        <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-colors ${
          hasCopros ? 'bg-blue-50/60 border-blue-100' : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="p-1 bg-blue-100 rounded-md flex-shrink-0">
              <Crown className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-800 block truncate">
                {proprietaireNom || 'Propriétaire principal'}
              </span>
              {hasCopros && (
                <span className="text-[11px] text-gray-400">Propriétaire principal</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-lg font-bold tabular-nums ${
              pourcentageDetention < 0 ? 'text-red-600' : 'text-blue-600'
            }`}>
              {pourcentageDetention}
            </span>
            <span className="text-xs text-gray-400 font-medium">%</span>
          </div>
          {/* Spacer pour aligner avec le bouton X des copros */}
          {hasCopros && <div className="w-8 flex-shrink-0" />}
        </div>

        {/* Copropriétaires */}
        {coproprietaires.map((copro, index) => {
          const structureType = getStructureType(copro.structureId)
          return (
            <div key={copro.structureId} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-gray-100 bg-white hover:border-gray-200 transition-colors group">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="p-1 bg-gray-100 rounded-md flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <select
                    value={copro.structureId}
                    onChange={(e) => handleChangeStructure(index, e.target.value)}
                    className="w-full text-sm font-medium text-gray-800 bg-transparent border-none p-0 focus:ring-0 cursor-pointer truncate appearance-none"
                  >
                    <option value={copro.structureId}>{copro.structureNom}</option>
                    {structuresDisponibles
                      .filter(s => s.id !== copro.structureId && !coproprietaires.some(c => c.structureId === s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nom} ({typeLabels[s.type] || s.type})
                        </option>
                      ))
                    }
                  </select>
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                    typeColors[structureType] || typeColors['AUTRE']
                  }`}>
                    {typeLabels[structureType] || structureType}
                  </span>
                </div>
              </div>

              {/* Input pourcentage avec slider */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={copro.pourcentage}
                  onChange={(e) => handleChangePourcentage(index, Number(e.target.value))}
                  className="w-16 h-1.5 accent-blue-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={copro.pourcentage}
                  onChange={(e) => handleChangePourcentage(index, Number(e.target.value))}
                  className="w-14 px-1.5 py-1 border border-gray-200 rounded-md text-sm text-right font-semibold tabular-nums focus:ring-1 focus:ring-blue-300 focus:border-blue-300"
                />
                <span className="text-xs text-gray-400 font-medium">%</span>
              </div>

              <button
                type="button"
                onClick={() => handleRemove(copro.structureId)}
                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Retirer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}

        {/* Bouton ajouter */}
        {hasOtherStructures && structuresRestantes.length > 0 && (
          <button
            type="button"
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-2.5 rounded-lg border border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all mt-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un copropriétaire
          </button>
        )}
        {!hasOtherStructures && (
          <p className="text-[11px] text-gray-400 text-center py-1">
            Ajoutez d'autres associés pour partager la détention
          </p>
        )}
      </div>
    </div>
  )
}

export default CoproprietairesEditor
