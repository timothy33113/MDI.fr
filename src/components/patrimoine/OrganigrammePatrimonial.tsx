import React, { useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Position,
  Handle,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Users, Building2, Home, CreditCard, Wallet } from 'lucide-react'

interface VuePatrimoniale {
  structure: any
  societes: Array<{
    societe: any
    pourcentageDetention: number
  }>
  biens: Array<{
    bien: any
    pourcentageDetention: number
  }>
  comptes: any[]
  credits: Array<{
    credit: any
    pourcentageEngagement: number
  }>
  detenuePar: Array<{
    detenteur: any
    pourcentageDetention: number
  }>
}

interface OrganigrammePatrimonialProps {
  patrimoine: VuePatrimoniale
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const CustomNode = ({ data }: any) => {
  const Icon = data.icon
  const bgColor = data.bgColor || 'bg-gray-100'
  const iconColor = data.iconColor || 'text-gray-600'
  const borderColor = data.borderColor || 'border-gray-300'

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Right} />
      <Handle type="target" position={Position.Bottom} />

      <div className={`px-4 py-3 rounded-lg border-2 ${borderColor} ${bgColor} shadow-md min-w-[200px]`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span className="font-semibold text-gray-900">{data.label}</span>
        </div>
        {data.subtitle && (
          <div className="text-xs text-gray-600">{data.subtitle}</div>
        )}
        {data.value && (
          <div className="text-sm font-bold text-gray-900 mt-1">{data.value}</div>
        )}
        {data.percentage && (
          <div className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {data.percentage}%
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Top} />
      <Handle type="source" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

const nodeTypes = {
  custom: CustomNode,
}

const OrganigrammePatrimonial: React.FC<OrganigrammePatrimonialProps> = ({ patrimoine }) => {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    console.log('OrganigrammePatrimonial - patrimoine:', patrimoine)

    const isPersonnePhysique = patrimoine.structure.type === 'PERSONNE_PHYSIQUE'

    // Noeud central : la structure
    nodes.push({
      id: 'structure-center',
      type: 'custom',
      position: { x: 500, y: 300 },
      data: {
        label: patrimoine.structure.nom,
        subtitle: patrimoine.structure.type,
        icon: isPersonnePhysique ? Users : Building2,
        bgColor: isPersonnePhysique ? 'bg-blue-50' : 'bg-green-50',
        iconColor: isPersonnePhysique ? 'text-blue-600' : 'text-green-600',
        borderColor: isPersonnePhysique ? 'border-blue-400' : 'border-green-400',
      },
    })

    let yOffset = 0
    const spacing = 120

    // Détenteurs (qui détient cette structure) - en haut
    if (patrimoine.detenuePar.length > 0) {
      const startX = 500 - ((patrimoine.detenuePar.length - 1) * 250) / 2
      patrimoine.detenuePar.forEach((detention, index) => {
        const nodeId = `detenteur-${index}`
        const isPP = detention.detenteur.type === 'PERSONNE_PHYSIQUE'

        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: startX + index * 250, y: 50 },
          data: {
            label: detention.detenteur.nom,
            subtitle: detention.detenteur.type,
            percentage: detention.pourcentageDetention,
            icon: isPP ? Users : Building2,
            bgColor: isPP ? 'bg-blue-50' : 'bg-green-50',
            iconColor: isPP ? 'text-blue-600' : 'text-green-600',
            borderColor: isPP ? 'border-blue-300' : 'border-green-300',
          },
        })

        edges.push({
          id: `${nodeId}-structure`,
          source: nodeId,
          target: 'structure-center',
          label: `${detention.pourcentageDetention}%`,
          animated: true,
          style: { stroke: isPP ? '#3b82f6' : '#10b981', strokeWidth: 2 },
        })
      })
    }

    // Sociétés détenues - à droite haut
    if (patrimoine.societes.length > 0) {
      const startY = 100
      patrimoine.societes.forEach((item, index) => {
        const nodeId = `societe-${index}`

        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 900, y: startY + index * spacing },
          data: {
            label: item.societe.nom,
            subtitle: item.societe.type,
            percentage: item.pourcentageDetention,
            icon: Building2,
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
            borderColor: 'border-green-300',
          },
        })

        edges.push({
          id: `structure-${nodeId}`,
          source: 'structure-center',
          target: nodeId,
          label: `Détient ${item.pourcentageDetention}%`,
          style: { stroke: '#10b981', strokeWidth: 2 },
          sourceHandle: 'right',
          targetHandle: 'left',
        })
      })
    }

    // Biens immobiliers - à gauche
    if (patrimoine.biens.length > 0) {
      const startY = 100
      patrimoine.biens.forEach((item, index) => {
        const nodeId = `bien-${index}`
        const isPerso = item.bien.type_patrimoine === 'Personnel'

        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 100, y: startY + index * spacing },
          data: {
            label: item.bien.nom,
            subtitle: `${item.bien.type_bien} - ${item.bien.ville || ''}`,
            value: item.bien.valeur_actuelle ? formatCurrency(item.bien.valeur_actuelle) : undefined,
            percentage: item.pourcentageDetention,
            icon: Home,
            bgColor: isPerso ? 'bg-blue-50' : 'bg-green-50',
            iconColor: isPerso ? 'text-blue-600' : 'text-green-600',
            borderColor: isPerso ? 'border-blue-300' : 'border-green-300',
          },
        })

        edges.push({
          id: `${nodeId}-structure`,
          source: nodeId,
          target: 'structure-center',
          label: `${item.pourcentageDetention}%`,
          style: { stroke: isPerso ? '#3b82f6' : '#10b981', strokeWidth: 2 },
          sourceHandle: 'right',
          targetHandle: 'left',
        })
      })
    }

    // Comptes bancaires (Économies) - en bas à gauche
    if (patrimoine.comptes.length > 0) {
      const startY = 500
      const startX = 100
      patrimoine.comptes.forEach((compte, index) => {
        const nodeId = `compte-${index}`
        const isPerso = compte.typePatrimoine === 'Personnel'

        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: startX + (index % 2) * 250, y: startY + Math.floor(index / 2) * 100 },
          data: {
            label: compte.nom,
            subtitle: compte.typeCompte.replace(/_/g, ' '),
            value: formatCurrency(compte.solde),
            icon: Wallet,
            bgColor: isPerso ? 'bg-blue-50' : 'bg-green-50',
            iconColor: isPerso ? 'text-blue-600' : 'text-green-600',
            borderColor: isPerso ? 'border-blue-300' : 'border-green-300',
          },
        })

        edges.push({
          id: `${nodeId}-structure`,
          source: nodeId,
          target: 'structure-center',
          style: { stroke: isPerso ? '#3b82f6' : '#10b981', strokeWidth: 1, strokeDasharray: '5,5' },
        })
      })
    }

    // Crédits - en bas à droite
    if (patrimoine.credits.length > 0) {
      const startY = 500
      patrimoine.credits.forEach((item, index) => {
        const nodeId = `credit-${index}`
        const isPerso = item.credit.type_patrimoine === 'Personnel'

        nodes.push({
          id: nodeId,
          type: 'custom',
          position: { x: 700 + (index % 2) * 250, y: startY + Math.floor(index / 2) * 100 },
          data: {
            label: item.credit.nom,
            subtitle: `${item.credit.banque || ''} - ${item.credit.duree_mois} mois`,
            value: formatCurrency(item.credit.montant_restant_du),
            percentage: item.pourcentageEngagement,
            icon: CreditCard,
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
            borderColor: 'border-orange-300',
          },
        })

        edges.push({
          id: `structure-${nodeId}`,
          source: 'structure-center',
          target: nodeId,
          label: item.pourcentageEngagement < 100 ? `${item.pourcentageEngagement}%` : undefined,
          style: { stroke: '#f97316', strokeWidth: 2, strokeDasharray: '5,5' },
        })
      })
    }

    return { nodes, edges }
  }, [patrimoine])

  console.log('Nodes:', nodes.length, 'Edges:', edges.length)
  console.log('Edges details:', edges)

  return (
    <div style={{ width: '100%', height: '600px' }} className="border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          animated: false,
          style: { strokeWidth: 2 }
        }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === 'structure-center') return '#3b82f6'
            if (node.id.startsWith('societe-')) return '#10b981'
            if (node.id.startsWith('bien-')) return '#3b82f6'
            if (node.id.startsWith('compte-')) return '#8b5cf6'
            if (node.id.startsWith('credit-')) return '#f97316'
            if (node.id.startsWith('detenteur-')) return '#3b82f6'
            return '#6b7280'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default OrganigrammePatrimonial
