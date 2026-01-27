import React, { useEffect, useMemo } from 'react'
import { Home, Building2, Wallet, Users, DollarSign } from 'lucide-react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { FormSection } from '../shared'
import { Identite, BienImmobilier, Credit, CompteBancaire, Revenu, Charge } from '../shared/types'

// Types pour l'organigramme
interface OrganigrammeSectionProps {
  identite: Identite
  associeId?: string | null
  biens: BienImmobilier[]
  credits: Credit[]
  comptes: CompteBancaire[]
  revenus: Revenu[]
  charges: Charge[]
  societes: Array<{ id: string; nom: string; type: string; detenteurs?: any[] }>
  structures: Array<{ id: string; nom: string; type: string; detenteurs?: any[] }>
}

// Composant de noeud personnalise
const CustomNode = ({ data }: any) => {
  const Icon = data.icon
  const bgColor = data.bgColor || 'bg-gray-100'
  const iconColor = data.iconColor || 'text-gray-600'
  const borderColor = data.borderColor || 'border-gray-300'
  const textColor = data.textColor || 'text-gray-900'
  const subtitleColor = data.subtitleColor || 'text-gray-600'

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      <div
        className={`px-4 py-3 rounded-lg border-2 ${borderColor} ${bgColor} shadow-md min-w-[180px] max-w-[280px] cursor-grab active:cursor-grabbing`}
        style={{ pointerEvents: 'all' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className={`font-semibold ${textColor} text-sm`}>{data.label}</span>
        </div>
        {data.subtitle && (
          <div className={`text-xs ${subtitleColor}`}>{data.subtitle}</div>
        )}
        {data.value && (
          <div className={`text-sm font-bold ${textColor} mt-1`}>{data.value}</div>
        )}
        {data.percentage !== undefined && (
          <div className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {data.percentage}%
          </div>
        )}

        {/* Liste des associes */}
        {data.associes && data.associes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-1">Associes :</div>
            <div className="space-y-1">
              {data.associes.map((associe: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 truncate">{associe.nom}</span>
                  <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-medium ml-2">
                    {associe.pourcentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des comptes bancaires */}
        {data.comptes && data.comptes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-1">Comptes :</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {data.comptes.map((compte: any, index: number) => (
                <div key={index} className="text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-600 flex-1 leading-tight">{compte.nom}</span>
                    <span className="font-medium text-gray-800 whitespace-nowrap">
                      {compte.solde.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                  {compte.banque && (
                    <div className="text-gray-500 text-[10px] mt-0.5">{compte.banque}</div>
                  )}
                </div>
              ))}
            </div>
            {data.totalComptes !== undefined && (
              <div className="mt-2 pt-2 border-t border-gray-400 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-800">Total :</span>
                <span className="text-sm font-bold text-gray-900">
                  {data.totalComptes.toLocaleString('fr-FR')} EUR
                </span>
              </div>
            )}
          </div>
        )}

        {/* Liste des biens immobiliers */}
        {data.biens && data.biens.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-1">Biens immobiliers :</div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.biens.map((bien: any, index: number) => (
                <div key={index} className="text-xs bg-gray-50 rounded p-2">
                  <div className="font-medium text-gray-800">{bien.type}</div>
                  <div className="text-gray-600 text-[10px] mt-0.5">{bien.adresse}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-600">Valeur :</span>
                    <span className="font-semibold text-green-700">
                      {bien.valeur.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                  {bien.credits && bien.credits.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-300">
                      <div className="text-[10px] font-semibold text-orange-700 mb-1">Credits :</div>
                      {bien.credits.map((credit: any, creditIndex: number) => (
                        <div key={creditIndex} className="flex justify-between items-center text-[10px] mb-0.5">
                          <span className="text-gray-600">{credit.organisme}</span>
                          <span className="font-medium text-orange-700">
                            {credit.capitalRestantDu.toLocaleString('fr-FR')} EUR
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {(data.totalBiens !== undefined || data.totalCredits !== undefined) && (
              <div className="mt-2 pt-2 border-t border-gray-400 space-y-1">
                {data.totalBiens !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total biens :</span>
                    <span className="text-sm font-bold text-green-700">
                      {data.totalBiens.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
                {data.totalCredits !== undefined && data.totalCredits > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total credits :</span>
                    <span className="text-sm font-bold text-orange-700">
                      {data.totalCredits.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
                {data.patrimoineNet !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-500">
                    <span className="text-xs font-bold text-gray-900">Patrimoine net :</span>
                    <span className="text-sm font-bold text-gray-900">
                      {data.patrimoineNet.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Liste des revenus et charges */}
        {(data.revenus || data.charges) && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            {data.revenus && data.revenus.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-green-700 mb-1">Revenus :</div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {data.revenus.map((revenu: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 text-[10px] truncate flex-1">{revenu.libelle}</span>
                      <span className="font-medium text-green-700 ml-2 whitespace-nowrap">
                        {revenu.montant.toLocaleString('fr-FR')} EUR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.charges && data.charges.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-red-700 mb-1">Charges :</div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {data.charges.map((charge: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 text-[10px] truncate flex-1">{charge.libelle}</span>
                      <span className="font-medium text-red-700 ml-2 whitespace-nowrap">
                        {charge.montant.toLocaleString('fr-FR')} EUR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(data.totalRevenus !== undefined || data.totalCharges !== undefined) && (
              <div className="mt-2 pt-2 border-t border-gray-400 space-y-1">
                {data.totalRevenus !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total revenus :</span>
                    <span className="text-sm font-bold text-green-700">
                      {data.totalRevenus.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
                {data.totalCharges !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total charges :</span>
                    <span className="text-sm font-bold text-red-700">
                      {data.totalCharges.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
                {data.resteAVivre !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-500">
                    <span className="text-xs font-bold text-gray-900">Reste a vivre :</span>
                    <span className={`text-sm font-bold ${data.resteAVivre >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {data.resteAVivre.toLocaleString('fr-FR')} EUR
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

export function OrganigrammeSection({
  identite,
  associeId,
  biens,
  credits,
  comptes,
  revenus,
  charges,
  societes,
  structures
}: OrganigrammeSectionProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Generer le graphe
  useEffect(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    const centerX = 500
    const centerY = 300

    // Noeud central : la personne physique
    newNodes.push({
      id: 'person-center',
      type: 'custom',
      position: { x: centerX, y: centerY },
      data: {
        label: `${identite.prenom} ${identite.nom}` || 'Personne',
        subtitle: 'Personne physique',
        icon: Wallet,
        bgColor: 'bg-blue-600',
        iconColor: 'text-white',
        borderColor: 'border-blue-700',
        textColor: 'text-white',
        subtitleColor: 'text-blue-100',
      },
    })

    // Trouver les societes detenues par cette personne
    const currentPersonId = associeId
    const societesDetenues: Array<{ societe: any; pourcentage: number }> = []

    societes.forEach(societe => {
      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        const detenteur = societe.detenteurs.find((d: any) => d.porteurId === currentPersonId)
        if (detenteur) {
          societesDetenues.push({
            societe,
            pourcentage: detenteur.pourcentage || 0
          })
        }
      }
    })

    // Collecter les co-associes
    const personnesLiees = new Set<string>()
    societesDetenues.forEach(({ societe }) => {
      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        societe.detenteurs.forEach((detenteur: any) => {
          const detenteurStructure = structures.find(s => s.id === detenteur.porteurId)
          if (detenteurStructure && detenteurStructure.type === 'PERSONNE_PHYSIQUE' && detenteurStructure.id !== currentPersonId) {
            personnesLiees.add(detenteurStructure.id)
          }
        })
      }
    })

    // Ajouter les noeuds des co-associes
    const personnesLieesArray = Array.from(personnesLiees)
    personnesLieesArray.forEach((personId, index) => {
      const personne = structures.find(s => s.id === personId)
      if (personne) {
        const angle = (index / Math.max(personnesLieesArray.length, 1)) * Math.PI * 2
        const radius = 250
        const x = centerX - radius + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        newNodes.push({
          id: `person-${personId}`,
          type: 'custom',
          position: { x, y },
          data: {
            label: personne.nom,
            subtitle: 'Co-associe',
            icon: Users,
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            borderColor: 'border-green-400',
          },
        })
      }
    })

    // Map pour les societes
    const societeNodeMap = new Map<string, string>()

    societesDetenues.forEach((item, index) => {
      const { societe, pourcentage } = item
      const angle = (index / Math.max(societesDetenues.length, 1)) * Math.PI * 2 - Math.PI / 2
      const radius = 300
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const associesList: Array<{ nom: string; pourcentage: number }> = []
      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        societe.detenteurs.forEach((detenteur: any) => {
          const detenteurStructure = structures.find(s => s.id === detenteur.porteurId)
          if (detenteurStructure) {
            associesList.push({
              nom: detenteurStructure.nom,
              pourcentage: detenteur.pourcentage || 0
            })
          }
        })
      }

      const nodeId = `societe-${societe.id}`
      societeNodeMap.set(societe.id, nodeId)

      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x, y },
        data: {
          label: societe.nom,
          subtitle: societe.type,
          icon: Building2,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600',
          borderColor: 'border-blue-400',
          percentage: pourcentage,
          associes: associesList,
        },
      })

      newEdges.push({
        id: `person-${nodeId}`,
        source: 'person-center',
        target: nodeId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 4 },
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
      })

      // Liens des co-associes
      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        societe.detenteurs.forEach((detenteur: any) => {
          const detenteurStructure = structures.find(s => s.id === detenteur.porteurId)
          if (detenteurStructure && detenteurStructure.type === 'PERSONNE_PHYSIQUE' && detenteurStructure.id !== currentPersonId) {
            newEdges.push({
              id: `person-${detenteur.porteurId}-${nodeId}`,
              source: `person-${detenteur.porteurId}`,
              target: nodeId,
              animated: false,
              style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
              type: 'default',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            })
          }
        })
      }
    })

    // Patrimoine immobilier
    if (biens.length > 0 || credits.length > 0) {
      const biensAvecCredits = biens.map(bien => {
        const creditsAssocies = credits.filter(c => c.bienAssocie === bien.id)
        return {
          type: bien.type.replace(/_/g, ' '),
          adresse: bien.adresse,
          valeur: bien.valeurEstimee || 0,
          credits: creditsAssocies.map(c => ({
            organisme: c.organisme,
            capitalRestantDu: c.capitalRestantDu || 0
          }))
        }
      })

      const creditsNonAssocies = credits.filter(c => !c.bienAssocie || !biens.find(b => b.id === c.bienAssocie))
      if (creditsNonAssocies.length > 0) {
        biensAvecCredits.push({
          type: 'Autres credits',
          adresse: '',
          valeur: 0,
          credits: creditsNonAssocies.map(c => ({
            organisme: `${c.type} - ${c.organisme}`,
            capitalRestantDu: c.capitalRestantDu || 0
          }))
        })
      }

      const totalBiens = biens.reduce((sum, bien) => sum + (bien.valeurEstimee || 0), 0)
      const totalCredits = credits.reduce((sum, credit) => sum + (credit.capitalRestantDu || 0), 0)
      const patrimoineNet = totalBiens - totalCredits

      newNodes.push({
        id: 'patrimoine',
        type: 'custom',
        position: { x: centerX - 250, y: centerY },
        data: {
          label: 'Patrimoine',
          subtitle: `${biens.length} bien${biens.length > 1 ? 's' : ''} immobilier${biens.length > 1 ? 's' : ''}`,
          icon: Home,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          borderColor: 'border-green-400',
          biens: biensAvecCredits,
          totalBiens,
          totalCredits,
          patrimoineNet,
        },
      })

      newEdges.push({
        id: 'person-patrimoine',
        source: 'person-center',
        target: 'patrimoine',
        style: { stroke: '#10b981', strokeWidth: 4 },
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      })
    }

    // Economies
    if (comptes.length > 0) {
      const totalEconomies = comptes.reduce((sum, compte) => sum + (compte.solde || 0), 0)
      const nomPersonne = `${identite.prenom} ${identite.nom}`.trim() || 'Associe'
      const comptesFormatted = comptes.map(compte => {
        const typeCompteLabel = compte.typeCompte === 'Autre' && compte.typeCompteAutre
          ? compte.typeCompteAutre
          : compte.typeCompte.replace(/_/g, ' ')
        return {
          nom: `${typeCompteLabel} - ${nomPersonne}`,
          banque: compte.banque,
          solde: compte.solde || 0
        }
      })

      newNodes.push({
        id: 'economies',
        type: 'custom',
        position: { x: centerX, y: centerY + 220 },
        data: {
          label: 'Economies',
          subtitle: `${comptes.length} compte${comptes.length > 1 ? 's' : ''}`,
          icon: Wallet,
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600',
          borderColor: 'border-purple-400',
          comptes: comptesFormatted,
          totalComptes: totalEconomies,
        },
      })

      newEdges.push({
        id: 'person-economies',
        source: 'person-center',
        target: 'economies',
        style: { stroke: '#8b5cf6', strokeWidth: 4, strokeDasharray: '6,3' },
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
      })
    }

    // Revenus et Charges
    if (revenus.length > 0 || charges.length > 0) {
      const totalRevenus = revenus.reduce((sum, r) => sum + (r.montantMensuel || 0), 0)
      const totalCharges = charges.reduce((sum, c) => sum + (c.montantMensuel || 0), 0)
      const resteAVivre = totalRevenus - totalCharges

      newNodes.push({
        id: 'revenus-charges',
        type: 'custom',
        position: { x: centerX + 250, y: centerY },
        data: {
          label: 'Revenus & Charges',
          subtitle: 'Mensuels',
          icon: DollarSign,
          bgColor: 'bg-amber-100',
          iconColor: 'text-amber-600',
          borderColor: 'border-amber-400',
          revenus: revenus.map(r => ({ libelle: r.libelle, montant: r.montantMensuel || 0 })),
          charges: charges.map(c => ({ libelle: c.libelle, montant: c.montantMensuel || 0 })),
          totalRevenus,
          totalCharges,
          resteAVivre,
        },
      })

      newEdges.push({
        id: 'person-revenus-charges',
        source: 'person-center',
        target: 'revenus-charges',
        style: { stroke: '#f59e0b', strokeWidth: 4, strokeDasharray: '8,4' },
        type: 'default',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      })
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [
    identite.nom,
    identite.prenom,
    biens.length,
    credits.length,
    comptes.length,
    revenus.length,
    charges.length,
    societes.length,
    associeId
  ])

  return (
    <FormSection
      title="Organigramme patrimonial"
      description="Visualisation graphique de votre patrimoine et de vos participations"
    >
      {nodes.length <= 1 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Astuce : Ajoutez des societes, biens, credits ou comptes bancaires dans les autres sections pour voir l'organigramme se construire automatiquement !
        </div>
      )}

      <div style={{ width: '100%', height: '600px' }} className="border rounded-lg bg-gray-100">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="#ddd" gap={16} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.id === 'person-center') return '#2563eb'
                if (node.id.startsWith('societe-')) return '#3b82f6'
                if (node.id === 'patrimoine') return '#10b981'
                if (node.id === 'economies') return '#8b5cf6'
                if (node.id === 'revenus-charges') return '#f59e0b'
                return '#6b7280'
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </FormSection>
  )
}
