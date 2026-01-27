import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useStructuresContext } from '@/contexts/StructuresContext'

const UpdateHoldings: React.FC = () => {
  const navigate = useNavigate()
  const { structures, updateStructure } = useStructuresContext()
  const [result, setResult] = useState<string>('')
  const [updated, setUpdated] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const showDebugInfo = () => {
    let info = `=== TOTAL: ${structures.length} structures ===\n\n`
    structures.forEach((s, i) => {
      info += `[${i}] ${s.nom} (${s.type})\n`
      if (s.personneMorale?.siren) {
        info += `    SIREN: ${s.personneMorale.siren}\n`
      }
      if (s.nom.toUpperCase().includes('AMET') || s.nom.toUpperCase().includes('ARBOR')) {
        info += `    ⭐ CORRESPOND À AMETXEA/ARBORE\n`
        info += `    Détails: ${JSON.stringify(s, null, 2)}\n`
      }
      info += '\n'
    })
    setDebugInfo(info)
  }

  const updateHoldings = () => {
    try {
      let ametxeaFound = false
      let arboreFound = false

      console.log('🔍 Recherche dans', structures.length, 'structures')

      // Trouver AMETXEA
      const ametxea = structures.find(s => {
        const match = s.personneMorale?.siren === '907885958' ||
          s.nom.toUpperCase().includes('AMETXEA') ||
          s.nom.toUpperCase().includes('AMET')
        console.log('Test AMETXEA:', s.nom, '→', match)
        return match
      })

      if (ametxea) {
        ametxeaFound = true
        const updatedAmetxea = {
          ...ametxea,
          adresse: '34 B RUE DES PYRENEES 64190 GURS',
          personneMorale: {
            ...ametxea.personneMorale,
            denominationSociale: 'AMETXEA',
            siret: '90788595800013',
            siren: '907885958',
            formeJuridique: 'SAS',
            dateCreation: '2021-10-18',
            activitePrincipale: '66.30Z',
            objetSocial: 'Gestion de fonds',
            adresseSiegeSocial: '34 B RUE DES PYRENEES 64190 GURS',
            capitalSocial: ametxea.personneMorale?.capitalSocial || 0,
            nombreParts: ametxea.personneMorale?.nombreParts || 0,
            banquePrincipale: ametxea.personneMorale?.banquePrincipale || '',
            associes: ametxea.personneMorale?.associes || [],
            patrimoine: ametxea.personneMorale?.patrimoine || {
              biensImmobiliers: [],
              comptesEpargne: [],
              valeursMonetaires: []
            },
            credits: ametxea.personneMorale?.credits || []
          }
        }
        updateStructure(ametxea.id, updatedAmetxea)
        console.log('✅ AMETXEA mise à jour')
      }

      // Trouver ARBORE
      const arbore = structures.find(s => {
        const match = s.personneMorale?.siren === '907888358' ||
          s.nom.toUpperCase().includes('ARBORE') ||
          s.nom.toUpperCase().includes('ARBOR')
        console.log('Test ARBORE:', s.nom, '→', match)
        return match
      })

      if (arbore) {
        arboreFound = true
        const updatedArbore = {
          ...arbore,
          adresse: '34 B RUE DES PYRENEES 64190 GURS',
          personneMorale: {
            ...arbore.personneMorale,
            denominationSociale: 'ARBORE',
            siret: '90788835800013',
            siren: '907888358',
            formeJuridique: 'SAS',
            dateCreation: '2021-10-20',
            activitePrincipale: '64.20Z',
            objetSocial: 'Activités des sociétés holding',
            adresseSiegeSocial: '34 B RUE DES PYRENEES 64190 GURS',
            capitalSocial: arbore.personneMorale?.capitalSocial || 0,
            nombreParts: arbore.personneMorale?.nombreParts || 0,
            banquePrincipale: arbore.personneMorale?.banquePrincipale || '',
            associes: arbore.personneMorale?.associes || [],
            patrimoine: arbore.personneMorale?.patrimoine || {
              biensImmobiliers: [],
              comptesEpargne: [],
              valeursMonetaires: []
            },
            credits: arbore.personneMorale?.credits || []
          }
        }
        updateStructure(arbore.id, updatedArbore)
        console.log('✅ ARBORE mise à jour')
      }

      if (!ametxeaFound && !arboreFound) {
        setResult('❌ Aucune structure AMETXEA ou ARBORE trouvée')
        return
      }

      let message = '✅ Mise à jour réussie !\n'
      if (ametxeaFound) message += '• AMETXEA mise à jour avec activité "Gestion de fonds"\n'
      if (arboreFound) message += '• ARBORE mise à jour avec activité "Activités des sociétés holding"\n'
      message += '\nRetournez à la page Profile pour voir les changements.'

      setResult(message)
      setUpdated(true)

    } catch (error: any) {
      console.error('❌ Erreur:', error)
      setResult(`❌ Erreur: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/profile')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mise à jour AMETXEA et ARBORE</h1>
              <p className="text-sm text-gray-500">
                Ajouter les informations complètes depuis l'API
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 Informations qui seront ajoutées :</h2>

          <div className="space-y-4 mb-6">
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">AMETXEA (907885958)</h3>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>• Activité principale : 66.30Z - Gestion de fonds</li>
                <li>• Adresse : 34 B RUE DES PYRENEES 64190 GURS</li>
                <li>• Date de création : 18/10/2021</li>
                <li>• SIRET : 90788595800013</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">ARBORE (907888358)</h3>
              <ul className="mt-2 space-y-1 text-sm text-green-800">
                <li>• Activité principale : 64.20Z - Activités des sociétés holding</li>
                <li>• Adresse : 34 B RUE DES PYRENEES 64190 GURS</li>
                <li>• Date de création : 20/10/2021</li>
                <li>• SIRET : 90788835800013</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={showDebugInfo}
              variant="outline"
              className="w-full"
            >
              🔍 Afficher toutes les structures (debug)
            </Button>

            <Button
              onClick={updateHoldings}
              disabled={updated}
              className="w-full"
            >
              {updated ? '✅ Structures mises à jour' : 'Mettre à jour les structures'}
            </Button>
          </div>

          {debugInfo && (
            <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Debug Info:</h3>
              <pre className="whitespace-pre-wrap text-xs text-gray-700 overflow-x-auto">{debugInfo}</pre>
            </div>
          )}

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.includes('❌')
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              <pre className="whitespace-pre-wrap font-medium">{result}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default UpdateHoldings
