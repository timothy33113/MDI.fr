import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Trash2, Home, CreditCard, Building2, Wallet, DollarSign, User, Users, Briefcase, TrendingUp, Receipt, Network, CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import SocieteFormV2 from './SocieteFormV2'
import RechercheEntrepriseParDirigeant from '@/components/RechercheEntrepriseParDirigeant'
import { useStructuresContext } from '@/contexts/StructuresContext'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  OnNodesChange,
  OnEdgesChange,
  ReactFlowProvider,
  Handle,
  Position,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

interface Revenu {
  id: string
  type: 'salaire' | 'prime' | 'locatif' | 'investissement' | 'societe' | 'autre'
  libelle: string
  montantMensuel: number
  nombreMois?: number // Pour les salaires : 12, 13, 14 mois, etc.
}

interface Charge {
  id: string
  type?: string
  libelle: string
  montantMensuel: number
}

interface BienImmobilier {
  id: string
  type: 'Residence_Principale' | 'Residence_Secondaire' | 'Investissement_Locatif'
  adresse: string
  valeurEstimee: number
  loyerMensuel?: number
}

interface Credit {
  id: string
  type: 'Immobilier' | 'Consommation' | 'Professionnel' | 'Autre'
  organisme: string
  montantInitial: number
  dateDebut: string
  nombreMois: number
  tauxInteret: number
  bienAssocie?: string // ID du bien immobilier
  // Calculs automatiques
  capitalRestantDu?: number
  mensualite?: number
}

interface CompteBancaire {
  id: string
  nom: string
  typeCompte: 'Compte_Courant' | 'Livret_A' | 'LDDS' | 'PEL' | 'CEL' | 'Assurance_Vie' | 'PEA' | 'Compte_Titre' | 'Autre'
  typeCompteAutre?: string // Champ personnalisé si "Autre" est sélectionné
  banque: string
  solde: number
}

interface SituationProfessionnelle {
  id: string
  statutProfessionnel: 'Salarie' | 'Independant' | 'Dirigeant' | 'Retraite' | 'Sans_activite'
  emploi?: string
  employeur?: string
  societeId?: string // ID de la société si Indépendant/Dirigeant
  typeContrat?: 'CDI' | 'CDD' | 'Interim' | 'Freelance' | 'Fonctionnaire'
  anciennete?: string
  dateDebut: string
  dateFin?: string
  enCours: boolean
}

interface AssocieFormV2Props {
  associeId?: string | null
  onSubmit: (data: any) => void
  onCancel: () => void
  showRechercheDirecteant?: boolean
  onAddEntreprisesAsAssocies?: (entreprises: any[], searchedNom?: string, searchedPrenoms?: string) => void
}

// Composant de nœud personnalisé pour ReactFlow
const CustomNode = ({ data }: any) => {
  const Icon = data.icon
  const bgColor = data.bgColor || 'bg-gray-100'
  const iconColor = data.iconColor || 'text-gray-600'
  const borderColor = data.borderColor || 'border-gray-300'
  const textColor = data.textColor || 'text-gray-900'
  const subtitleColor = data.subtitleColor || 'text-gray-600'

  return (
    <>
      {/* Handles pour connecter les edges */}
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
        {/* Liste des associés */}
        {data.associes && data.associes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <div className="text-xs font-semibold text-gray-700 mb-1">Associés :</div>
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
                      {compte.solde.toLocaleString('fr-FR')} €
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
                  {data.totalComptes.toLocaleString('fr-FR')} €
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
                      {bien.valeur.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  {/* Crédits associés à ce bien */}
                  {bien.credits && bien.credits.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-300">
                      <div className="text-[10px] font-semibold text-orange-700 mb-1">Crédits :</div>
                      {bien.credits.map((credit: any, creditIndex: number) => (
                        <div key={creditIndex} className="flex justify-between items-center text-[10px] mb-0.5">
                          <span className="text-gray-600">{credit.organisme}</span>
                          <span className="font-medium text-orange-700">
                            {credit.capitalRestantDu.toLocaleString('fr-FR')} €
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Totaux */}
            {(data.totalBiens !== undefined || data.totalCredits !== undefined) && (
              <div className="mt-2 pt-2 border-t border-gray-400 space-y-1">
                {data.totalBiens !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total biens :</span>
                    <span className="text-sm font-bold text-green-700">
                      {data.totalBiens.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
                {data.totalCredits !== undefined && data.totalCredits > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total crédits :</span>
                    <span className="text-sm font-bold text-orange-700">
                      {data.totalCredits.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
                {data.patrimoineNet !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-500">
                    <span className="text-xs font-bold text-gray-900">Patrimoine net :</span>
                    <span className="text-sm font-bold text-gray-900">
                      {data.patrimoineNet.toLocaleString('fr-FR')} €
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
            {/* Revenus */}
            {data.revenus && data.revenus.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-green-700 mb-1">Revenus :</div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {data.revenus.map((revenu: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 text-[10px] truncate flex-1">{revenu.libelle}</span>
                      <span className="font-medium text-green-700 ml-2 whitespace-nowrap">
                        {revenu.montant.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Charges */}
            {data.charges && data.charges.length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-red-700 mb-1">Charges :</div>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {data.charges.map((charge: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 text-[10px] truncate flex-1">{charge.libelle}</span>
                      <span className="font-medium text-red-700 ml-2 whitespace-nowrap">
                        {charge.montant.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Totaux et reste à vivre */}
            {(data.totalRevenus !== undefined || data.totalCharges !== undefined) && (
              <div className="mt-2 pt-2 border-t border-gray-400 space-y-1">
                {data.totalRevenus !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total revenus :</span>
                    <span className="text-sm font-bold text-green-700">
                      {data.totalRevenus.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
                {data.totalCharges !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Total charges :</span>
                    <span className="text-sm font-bold text-red-700">
                      {data.totalCharges.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
                {data.resteAVivre !== undefined && (
                  <div className="flex justify-between items-center pt-1 border-t border-gray-500">
                    <span className="text-xs font-bold text-gray-900">Reste à vivre :</span>
                    <span className={`text-sm font-bold ${data.resteAVivre >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {data.resteAVivre.toLocaleString('fr-FR')} €
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

const AssocieFormV2: React.FC<AssocieFormV2Props> = ({ associeId, onSubmit, onCancel, showRechercheDirecteant, onAddEntreprisesAsAssocies }) => {
  const [activeSection, setActiveSection] = useState<'identite' | 'situation' | 'revenus' | 'charges' | 'patrimoine' | 'economies' | 'organigramme'>('identite')
  const { structures, addStructure, getStructureById } = useStructuresContext()
  const [showSocieteModal, setShowSocieteModal] = useState(false)

  // Ref pour savoir si c'est le premier chargement
  const isFirstLoad = useRef(true)

  // États pour ReactFlow avec hooks de ReactFlow
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Filtrer uniquement les sociétés (pas les personnes physiques)
  const societes = structures.filter(s => s.type !== 'PERSONNE_PHYSIQUE')

  // Récupérer tous les biens et crédits existants de toutes les structures
  const getAllBiens = () => {
    const biens: Array<BienImmobilier & { proprietaireId: string, proprietaireNom: string }> = []
    structures.forEach(structure => {
      if (structure.personnePhysique?.biens) {
        structure.personnePhysique.biens.forEach((bien: any) => {
          biens.push({
            ...bien,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom
          })
        })
      }
      if (structure.personneMorale?.biens) {
        structure.personneMorale.biens.forEach((bien: any) => {
          biens.push({
            ...bien,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom
          })
        })
      }
    })
    return biens
  }

  const getAllCredits = () => {
    const credits: Array<Credit & { proprietaireId: string, proprietaireNom: string }> = []
    structures.forEach(structure => {
      if (structure.personnePhysique?.credits) {
        structure.personnePhysique.credits.forEach((credit: any) => {
          credits.push({
            ...credit,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom
          })
        })
      }
      if (structure.personneMorale?.credits) {
        structure.personneMorale.credits.forEach((credit: any) => {
          credits.push({
            ...credit,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom
          })
        })
      }
    })
    return credits
  }

  const tousLesBiens = getAllBiens()
  const tousLesCredits = getAllCredits()

  // Debug: afficher le nombre de sociétés disponibles quand structures change
  useEffect(() => {
    console.log('🏢 Sociétés disponibles dans AssocieFormV2:', societes.length, societes.map(s => s.nom));
  }, [structures.length])

  // Identité
  const [identite, setIdentite] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    nationalite: 'Française',
    situationFamiliale: 'Celibataire' as const,
    adresse: '',
    telephone: '',
    email: '',
    photo: ''
  })

  // Situations professionnelles multiples
  const [situations, setSituations] = useState<SituationProfessionnelle[]>([])

  // Revenus multiples
  const [revenus, setRevenus] = useState<Revenu[]>([])

  // Charges multiples
  const [charges, setCharges] = useState<Charge[]>([])

  // Biens immobiliers
  const [biens, setBiens] = useState<BienImmobilier[]>([])

  // Crédits en cours
  const [credits, setCredits] = useState<Credit[]>([])

  // Comptes bancaires
  const [comptes, setComptes] = useState<CompteBancaire[]>([])

  // États pour gérer l'édition
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null)
  const [editingBienId, setEditingBienId] = useState<string | null>(null)
  const [editingRevenuId, setEditingRevenuId] = useState<string | null>(null)
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)
  const [editingSituationId, setEditingSituationId] = useState<string | null>(null)
  const [editingCompteId, setEditingCompteId] = useState<string | null>(null)

  // Charger les données de l'associé si on est en mode édition
  useEffect(() => {
    // Réinitialiser le flag quand associeId change
    if (associeId) {
      isFirstLoad.current = true
    }
  }, [associeId])

  useEffect(() => {
    // Ne charger que lors du premier chargement pour éviter d'écraser les modifications locales
    if (associeId && isFirstLoad.current) {
      isFirstLoad.current = false
      const structure = getStructureById(associeId)
      console.log('📊 Structure chargée pour organigramme:', structure)
      if (structure && structure.personnePhysique) {
        const pp = structure.personnePhysique
        console.log('👤 PersonnePhysique:', pp)

        // Charger l'identité
        setIdentite({
          nom: structure.nom.split(' ').pop() || '',
          prenom: pp.prenom || '',
          dateNaissance: pp.dateNaissance ? new Date(pp.dateNaissance).toISOString().split('T')[0] : '',
          lieuNaissance: pp.lieuNaissance || '',
          nationalite: pp.nationalite || 'Française',
          situationFamiliale: pp.situationFamiliale || 'Celibataire',
          adresse: structure.adresse || '',
          telephone: structure.telephone || '',
          email: structure.email || '',
          photo: pp.photo || structure.photo || ''
        })

        // Charger les situations professionnelles
        if (pp.situations && Array.isArray(pp.situations) && pp.situations.length > 0) {
          // Nouveau format: tableau de situations
          setSituations(pp.situations.map((s: any) => ({
            id: s.id || Date.now().toString(),
            statutProfessionnel: s.statutProfessionnel,
            emploi: s.emploi || '',
            employeur: s.employeur || '',
            typeContrat: s.typeContrat,
            dateDebut: s.dateDebut || '',
            enCours: s.enCours !== undefined ? s.enCours : true,
            societeId: s.societeId || undefined
          })))
        } else if (pp.statutProfessionnel) {
          // Ancien format: compatibilité ascendante
          setSituations([{
            id: Date.now().toString(),
            statutProfessionnel: pp.statutProfessionnel,
            emploi: pp.emploi || '',
            employeur: pp.employeur || '',
            typeContrat: pp.typeContrat,
            dateDebut: '',
            enCours: true
          }])
        }

        // Charger les revenus (nouveau format tableau)
        if (pp.revenus && Array.isArray(pp.revenus) && pp.revenus.length > 0) {
          setRevenus(pp.revenus.map((r: any) => ({
            id: r.id || Date.now().toString(),
            type: r.type,
            libelle: r.libelle,
            montantMensuel: r.montantMensuel
          })))
        } else if (pp.revenus && typeof pp.revenus === 'object') {
          // Ancien format objet pour compatibilité
          const revenusList: Revenu[] = []
          if (pp.revenus.salaireMensuelNet > 0) {
            revenusList.push({
              id: Date.now().toString(),
              type: 'salaire',
              libelle: 'Salaire principal',
              montantMensuel: pp.revenus.salaireMensuelNet
            })
          }
          if (pp.revenus.revenusLocatifs > 0) {
            revenusList.push({
              id: (Date.now() + 1).toString(),
              type: 'locatif',
              libelle: 'Revenus locatifs',
              montantMensuel: pp.revenus.revenusLocatifs
            })
          }
          if (revenusList.length > 0) {
            setRevenus(revenusList)
          }
        }

        // Charger les charges (nouveau format tableau)
        if (pp.charges && Array.isArray(pp.charges) && pp.charges.length > 0) {
          setCharges(pp.charges.map((c: any) => ({
            id: c.id || Date.now().toString(),
            libelle: c.libelle,
            montantMensuel: c.montantMensuel
          })))
        } else if (pp.charges && typeof pp.charges === 'object') {
          // Ancien format objet pour compatibilité
          const chargesList: Charge[] = []
          if (pp.charges.loyerMensuel > 0) {
            chargesList.push({
              id: Date.now().toString(),
              libelle: 'Loyer',
              montantMensuel: pp.charges.loyerMensuel
            })
          }
          if (pp.charges.pensionAlimentaire > 0) {
            chargesList.push({
              id: (Date.now() + 1).toString(),
              libelle: 'Pension alimentaire',
              montantMensuel: pp.charges.pensionAlimentaire
            })
          }
          if (chargesList.length > 0) {
            setCharges(chargesList)
          }
        }

        // Charger les biens (nouveau format direct)
        if (pp.biens && Array.isArray(pp.biens) && pp.biens.length > 0) {
          setBiens(pp.biens.map((b: any) => ({
            id: b.id || Date.now().toString(),
            type: b.type,
            adresse: b.adresse,
            valeurEstimee: b.valeurEstimee,
            loyerMensuel: b.loyerMensuel
          })))
        } else if (pp.patrimoine?.biensImmobiliers && pp.patrimoine.biensImmobiliers.length > 0) {
          // Ancien format pour compatibilité
          setBiens(pp.patrimoine.biensImmobiliers.map((b: any) => ({
            id: b.id,
            type: b.type,
            adresse: b.adresse,
            valeurEstimee: b.valeurEstimee,
            loyerMensuel: b.loyerMensuel
          })))
        }

        // Charger les crédits (nouveau format direct)
        if (pp.credits && Array.isArray(pp.credits) && pp.credits.length > 0) {
          setCredits(pp.credits.map((c: any) => ({
            id: c.id || Date.now().toString(),
            type: c.type,
            organisme: c.organisme,
            montantInitial: c.montantInitial,
            dateDebut: c.dateDebut || '',
            nombreMois: c.nombreMois || 240,
            tauxInteret: c.tauxInteret,
            bienAssocie: c.bienAssocie || '',
            capitalRestantDu: c.capitalRestantDu,
            mensualite: c.mensualite
          })))
        } else if (pp.patrimoine?.creditsEnCours && pp.patrimoine.creditsEnCours.length > 0) {
          // Ancien format pour compatibilité
          setCredits(pp.patrimoine.creditsEnCours.map((c: any) => ({
            id: c.id,
            type: c.type,
            organisme: c.organisme,
            montantInitial: c.montantInitial,
            dateDebut: c.dateFinPrevue ? new Date(c.dateFinPrevue).toISOString().split('T')[0] : '',
            nombreMois: 240,
            tauxInteret: c.tauxInteret,
            bienAssocie: c.bienAssocie || '',
            capitalRestantDu: c.capitalRestantDu,
            mensualite: c.mensualite
          })))
        }

        // Charger les comptes bancaires (nouveau format direct)
        if (pp.comptes && Array.isArray(pp.comptes) && pp.comptes.length > 0) {
          setComptes(pp.comptes.map((c: any) => ({
            id: c.id || Date.now().toString(),
            nom: c.nom,
            typeCompte: c.typeCompte,
            typeCompteAutre: c.typeCompteAutre,
            banque: c.banque,
            solde: c.solde
          })))
        }
      }
    }
  }, [associeId, getStructureById])

  // === SITUATIONS PROFESSIONNELLES ===
  const addSituation = () => {
    const newId = Date.now().toString()
    setSituations([...situations, {
      id: newId,
      statutProfessionnel: 'Salarie',
      dateDebut: '',
      enCours: true
    }])
    setEditingSituationId(newId)
  }

  const removeSituation = (id: string) => {
    if (situations.length > 1) {
      setSituations(situations.filter(s => s.id !== id))
      if (editingSituationId === id) {
        setEditingSituationId(null)
      }
    }
  }

  const validateSituation = (id: string) => {
    setEditingSituationId(null)
  }

  const cancelSituationEdit = (id: string) => {
    console.log('🚫 cancelSituationEdit appelé pour:', id);
    const situation = situations.find(s => s.id === id)
    console.log('📋 Situation trouvée:', situation);

    // Ne pas supprimer la situation si elle a un statut professionnel ou une société sélectionnée
    const hasContent = situation && (
      situation.statutProfessionnel ||
      situation.societeId ||
      situation.employeur ||
      situation.emploi
    )

    console.log('❓ La situation a du contenu?', hasContent, {
      statutProfessionnel: situation?.statutProfessionnel,
      societeId: situation?.societeId,
      employeur: situation?.employeur,
      emploi: situation?.emploi
    });

    if (situation && !hasContent && situations.length > 1) {
      console.log('🗑️ Suppression de la situation car elle est vide');
      removeSituation(id)
    } else {
      console.log('✅ Situation conservée, sortie du mode édition');
      setEditingSituationId(null)
    }
  }

  const updateSituation = (id: string, field: string, value: any) => {
    setSituations(situations.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  // === REVENUS ===
  const addRevenu = () => {
    const newId = Date.now().toString()
    setRevenus([...revenus, {
      id: newId,
      type: 'autre',
      libelle: '',
      montantMensuel: 0
    }])
    setEditingRevenuId(newId)
  }

  const removeRevenu = (id: string) => {
    if (revenus.length > 1) {
      setRevenus(revenus.filter(r => r.id !== id))
      if (editingRevenuId === id) {
        setEditingRevenuId(null)
      }
    }
  }

  const validateRevenu = (id: string) => {
    setEditingRevenuId(null)
  }

  const cancelRevenuEdit = (id: string) => {
    const revenu = revenus.find(r => r.id === id)
    if (revenu && !revenu.libelle && revenus.length > 1) {
      removeRevenu(id)
    } else {
      setEditingRevenuId(null)
    }
  }

  const updateRevenu = (id: string, field: string, value: any) => {
    setRevenus(revenus.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const totalRevenus = revenus.reduce((sum, r) => sum + r.montantMensuel, 0)

  // === CHARGES ===
  const addCharge = () => {
    const newId = Date.now().toString()
    setCharges([...charges, {
      id: newId,
      libelle: '',
      montantMensuel: 0
    }])
    setEditingChargeId(newId)
  }

  const removeCharge = (id: string) => {
    if (charges.length > 1) {
      setCharges(charges.filter(c => c.id !== id))
      if (editingChargeId === id) {
        setEditingChargeId(null)
      }
    }
  }

  const validateCharge = (id: string) => {
    setEditingChargeId(null)
  }

  const cancelChargeEdit = (id: string) => {
    const charge = charges.find(c => c.id === id)
    if (charge && !charge.libelle && charges.length > 1) {
      removeCharge(id)
    } else {
      setEditingChargeId(null)
    }
  }

  const updateCharge = (id: string, field: string, value: any) => {
    setCharges(charges.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const totalCharges = charges.reduce((sum, c) => sum + c.montantMensuel, 0)
  const totalMensualitesCredits = credits.reduce((sum, c) => sum + (c.mensualite || 0), 0)
  const totalChargesAvecCredits = totalCharges + totalMensualitesCredits

  // === BIENS IMMOBILIERS ===
  const addBien = () => {
    const newId = Date.now().toString()
    setBiens([...biens, {
      id: newId,
      type: 'Residence_Principale',
      adresse: '',
      valeurEstimee: 0
    }])
    setEditingBienId(newId)
  }

  const removeBien = (id: string) => {
    setBiens(biens.filter(b => b.id !== id))
    if (editingBienId === id) {
      setEditingBienId(null)
    }
  }

  const validateBien = (id: string) => {
    setEditingBienId(null)
  }

  const cancelBienEdit = (id: string) => {
    const bien = biens.find(b => b.id === id)
    if (bien && !bien.adresse) {
      removeBien(id)
    } else {
      setEditingBienId(null)
    }
  }

  const updateBien = (id: string, field: string, value: any) => {
    setBiens(biens.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  // === CRÉDITS ===
  const addCredit = () => {
    const newId = Date.now().toString()
    setCredits([...credits, {
      id: newId,
      type: 'Immobilier',
      organisme: '',
      montantInitial: 0,
      dateDebut: '',
      nombreMois: 240, // 20 ans par défaut
      tauxInteret: 3.5
    }])
    // Nouveau crédit en mode édition par défaut
    setEditingCreditId(newId)
  }

  const removeCredit = (id: string) => {
    setCredits(credits.filter(c => c.id !== id))
    if (editingCreditId === id) {
      setEditingCreditId(null)
    }
  }

  const validateCredit = (id: string) => {
    // Passer en mode lecture seule
    setEditingCreditId(null)
  }

  const cancelCreditEdit = (id: string) => {
    // Si c'est un nouveau crédit, le supprimer
    const credit = credits.find(c => c.id === id)
    if (credit && !credit.organisme) {
      removeCredit(id)
    } else {
      setEditingCreditId(null)
    }
  }

  const updateCredit = (id: string, field: string, value: any) => {
    const updatedCredits = credits.map(c => {
      if (c.id === id) {
        const updatedCredit = { ...c, [field]: value }

        // Calcul automatique de la mensualité et du capital restant dû
        if (updatedCredit.montantInitial > 0 && updatedCredit.nombreMois > 0 && updatedCredit.tauxInteret > 0) {
          const capital = updatedCredit.montantInitial
          const tauxMensuel = updatedCredit.tauxInteret / 100 / 12
          const nbMois = updatedCredit.nombreMois

          // Formule de mensualité d'un crédit amortissable
          const mensualite = capital * (tauxMensuel * Math.pow(1 + tauxMensuel, nbMois)) / (Math.pow(1 + tauxMensuel, nbMois) - 1)
          updatedCredit.mensualite = Math.round(mensualite * 100) / 100

          // Calcul du capital restant dû
          if (updatedCredit.dateDebut) {
            const dateDebut = new Date(updatedCredit.dateDebut)
            const aujourdhui = new Date()
            const moisEcoules = Math.max(0, Math.floor((aujourdhui.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24 * 30)))

            if (moisEcoules < nbMois) {
              // Formule du capital restant dû
              const capitalRestant = capital * (Math.pow(1 + tauxMensuel, nbMois) - Math.pow(1 + tauxMensuel, moisEcoules)) / (Math.pow(1 + tauxMensuel, nbMois) - 1)
              updatedCredit.capitalRestantDu = Math.round(capitalRestant * 100) / 100
            } else {
              updatedCredit.capitalRestantDu = 0
            }
          } else {
            updatedCredit.capitalRestantDu = capital
          }
        }

        return updatedCredit
      }
      return c
    })

    setCredits(updatedCredits)
  }

  // === COMPTES BANCAIRES ===
  const addCompte = () => {
    const newId = Date.now().toString()
    setComptes([...comptes, {
      id: newId,
      nom: '',
      typeCompte: 'Compte_Courant',
      banque: '',
      solde: 0
    }])
    setEditingCompteId(newId)
  }

  const removeCompte = (id: string) => {
    setComptes(comptes.filter(c => c.id !== id))
    if (editingCompteId === id) {
      setEditingCompteId(null)
    }
  }

  const validateCompte = (id: string) => {
    setEditingCompteId(null)
  }

  const cancelCompteEdit = (id: string) => {
    const compte = comptes.find(c => c.id === id)
    if (compte && !compte.nom) {
      removeCompte(id)
    } else {
      setEditingCompteId(null)
    }
  }

  const updateCompte = (id: string, field: string, value: any) => {
    setComptes(comptes.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const totalEconomies = comptes.reduce((sum, c) => sum + c.solde, 0)

  const handleCreateSociete = (data: any) => {
    console.log('🏭 Création de société depuis AssocieFormV2...');
    const nouvelleSociete = addStructure(data)
    console.log('✅ Société créée:', nouvelleSociete.id, nouvelleSociete.nom);

    // NE PAS appeler refreshStructures() car cela recharge un ancien état depuis localStorage
    // Le hook useStructures sauvegarde automatiquement via useEffect

    // Sélectionner automatiquement la société créée dans la situation professionnelle EN COURS D'ÉDITION
    if (editingSituationId) {
      // Si une situation est en cours d'édition, utiliser la forme callback pour une mise à jour immédiate
      setSituations(prevSituations => {
        return prevSituations.map(s => {
          if (s.id === editingSituationId) {
            console.log('✏️ Sélection automatique de la société:', nouvelleSociete.id);
            const updatedSituation = { ...s, societeId: nouvelleSociete.id }

            // Si le statut n'est pas encore défini, le définir automatiquement
            if (!s.statutProfessionnel) {
              console.log('📋 Statut non défini, mise à Dirigeant par défaut');
              updatedSituation.statutProfessionnel = 'Dirigeant'
            }

            console.log('✅ Situation mise à jour:', updatedSituation);
            return updatedSituation
          }
          return s
        })
      })

      // Ne PAS valider automatiquement car cela cause des problèmes de timing
      // L'utilisateur doit cliquer sur le bouton de validation (CheckCircle)
      console.log('✅ Société sélectionnée, situation reste en mode édition');
    } else {
      // Sinon, trouver la première situation Indépendant ou Dirigeant
      setSituations(prevSituations => {
        const situationIndex = prevSituations.findIndex(s =>
          s.statutProfessionnel === 'Independant' || s.statutProfessionnel === 'Dirigeant'
        )

        console.log('🔍 Index de la situation trouvée:', situationIndex);

        if (situationIndex !== -1) {
          return prevSituations.map((s, idx) => {
            if (idx === situationIndex) {
              console.log('✏️ Sélection automatique de la société:', nouvelleSociete.id);
              return { ...s, societeId: nouvelleSociete.id }
            }
            return s
          })
        }
        return prevSituations
      })
    }

    // Fermer le modal
    console.log('🚪 Fermeture du modal société');
    setShowSocieteModal(false)
  }

  const saveData = () => {
    // Générer automatiquement les noms de comptes avant sauvegarde
    const nomPersonne = `${identite.prenom} ${identite.nom}`.trim() || 'Associé'
    const comptesAvecNoms = comptes.map(compte => {
      const typeCompteLabel = compte.typeCompte === 'Autre' && compte.typeCompteAutre
        ? compte.typeCompteAutre
        : compte.typeCompte.replace(/_/g, ' ')
      return {
        ...compte,
        nom: `${typeCompteLabel} - ${nomPersonne}`
      }
    })

    // Sauvegarder les données (même partielles)
    const data = {
      type: 'PERSONNE_PHYSIQUE',
      nom: `${identite.prenom} ${identite.nom}` || 'Brouillon',
      adresse: identite.adresse,
      telephone: identite.telephone,
      email: identite.email,
      photo: identite.photo,
      personnePhysique: {
        ...identite,
        situations,
        revenus,
        charges,
        biens,
        credits,
        comptes: comptesAvecNoms
      }
    }

    onSubmit(data)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveData()
    onCancel() // Fermer après sauvegarde
  }

  const handleCancel = () => {
    // Fermer sans sauvegarder
    onCancel()
  }

  const sections = [
    { id: 'identite' as const, label: 'Identité', icon: User },
    { id: 'situation' as const, label: 'Situation pro', icon: Briefcase },
    { id: 'revenus' as const, label: 'Revenus', icon: TrendingUp },
    { id: 'economies' as const, label: 'Économies', icon: Wallet },
    { id: 'patrimoine' as const, label: 'Patrimoine', icon: Home },
    { id: 'charges' as const, label: 'Charges', icon: Receipt },
    { id: 'organigramme' as const, label: 'Organigramme', icon: Network }
  ]

  // Génération du graphe pour l'organigramme
  useEffect(() => {
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Nœud central : la personne physique
    const centerX = 500
    const centerY = 300

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

    // Sociétés (positions autour du centre - en cercle)
    // Calculer les sociétés détenues
    const currentPersonId = associeId
    const societesDetenues: Array<{ societe: any; pourcentage: number }> = []

    console.log('🔍 Recherche des sociétés pour currentPersonId:', currentPersonId)
    console.log('🏢 Nombre de sociétés à analyser:', societes.length)

    societes.forEach(societe => {
      console.log(`📊 Analyse société "${societe.nom}":`, {
        hasDetenteurs: !!societe.detenteurs,
        isArray: Array.isArray(societe.detenteurs),
        detenteurs: societe.detenteurs
      })

      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        const detenteur = societe.detenteurs.find((d: any) => d.porteurId === currentPersonId)
        console.log(`  → Détenteur trouvé pour "${societe.nom}":`, detenteur)
        if (detenteur) {
          societesDetenues.push({
            societe,
            pourcentage: detenteur.pourcentage || 0
          })
        }
      }
    })

    console.log('✅ Sociétés détenues finales:', societesDetenues.length, societesDetenues.map(s => s.societe.nom))

    // Collecter toutes les personnes physiques liées (co-associés)
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

    // Ajouter les nœuds des personnes physiques liées
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
            subtitle: 'Co-associé',
            icon: Users,
            bgColor: 'bg-green-100',
            iconColor: 'text-green-600',
            borderColor: 'border-green-400',
          },
        })
      }
    })

    // Créer un map pour les sociétés avec leur nodeId
    const societeNodeMap = new Map<string, string>()

    societesDetenues.forEach((item, index) => {
      const { societe, pourcentage } = item
      const angle = (index / Math.max(societesDetenues.length, 1)) * Math.PI * 2 - Math.PI / 2
      const radius = 300
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Récupérer tous les associés de cette société
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
          percentage: pourcentage, // Pourcentage de la personne centrale
          associes: associesList, // Liste de tous les associés
        },
      })

      // Lien de la personne centrale vers la société
      newEdges.push({
        id: `person-${nodeId}`,
        source: 'person-center',
        target: nodeId,
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 4 },
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3b82f6',
        },
      })

      // Liens des autres personnes physiques vers cette société
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
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#10b981',
              },
            })
          }
        })
      }
    })

    // Ajouter les liens entre sociétés (PM détenant des parts dans d'autres sociétés)
    societesDetenues.forEach(({ societe }) => {
      if (societe.detenteurs && Array.isArray(societe.detenteurs)) {
        societe.detenteurs.forEach((detenteur: any) => {
          const detenteurStructure = structures.find(s => s.id === detenteur.porteurId)
          // Si le détenteur est une société et qu'elle est dans l'organigramme
          if (detenteurStructure && detenteurStructure.type !== 'PERSONNE_PHYSIQUE' && societeNodeMap.has(detenteurStructure.id)) {
            const sourceNodeId = societeNodeMap.get(detenteurStructure.id)!
            const targetNodeId = societeNodeMap.get(societe.id)!

            newEdges.push({
              id: `societe-${sourceNodeId}-${targetNodeId}`,
              source: sourceNodeId,
              target: targetNodeId,
              animated: false,
              style: { stroke: '#f59e0b', strokeWidth: 3 },
              type: 'default',
              label: `${detenteur.pourcentage || 0}%`,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#f59e0b',
              },
            })
          }
        })
      }
    })

    // Patrimoine immobilier regroupé dans une seule box
    if (biens.length > 0 || credits.length > 0) {
      // Associer les crédits aux biens
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

      // Crédits non associés à un bien
      const creditsNonAssocies = credits.filter(c => !c.bienAssocie || !biens.find(b => b.id === c.bienAssocie))

      // Si il y a des crédits non associés, on les ajoute comme un "bien" fictif
      if (creditsNonAssocies.length > 0) {
        biensAvecCredits.push({
          type: 'Autres crédits',
          adresse: '',
          valeur: 0,
          credits: creditsNonAssocies.map(c => ({
            organisme: `${c.type} - ${c.organisme}`,
            capitalRestantDu: c.capitalRestantDu || 0
          }))
        })
      }

      // Calculer les totaux
      const totalBiens = biens.reduce((sum, bien) => sum + (bien.valeurEstimee || 0), 0)
      const totalCredits = credits.reduce((sum, credit) => sum + (credit.capitalRestantDu || 0), 0)
      const patrimoineNet = totalBiens - totalCredits

      // Positionner la box du patrimoine à gauche
      const angle = Math.PI // À gauche
      const radius = 250
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const nodeId = 'patrimoine'
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x, y },
        data: {
          label: 'Patrimoine',
          subtitle: `${biens.length} bien${biens.length > 1 ? 's' : ''} immobilier${biens.length > 1 ? 's' : ''}`,
          icon: Home,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600',
          borderColor: 'border-green-400',
          biens: biensAvecCredits,
          totalBiens: totalBiens,
          totalCredits: totalCredits,
          patrimoineNet: patrimoineNet,
        },
      })

      newEdges.push({
        id: `person-${nodeId}`,
        source: 'person-center',
        target: nodeId,
        style: { stroke: '#10b981', strokeWidth: 4 },
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#10b981',
        },
      })
    }

    // Comptes bancaires regroupés dans une seule box "Économies"
    if (comptes.length > 0) {
      // Calculer le total
      const totalEconomies = comptes.reduce((sum, compte) => sum + (compte.solde || 0), 0)

      // Préparer la liste des comptes pour affichage
      const nomPersonne = `${identite.prenom} ${identite.nom}`.trim() || 'Associé'
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

      // Positionner la box des économies en bas
      const angle = Math.PI / 2 // En bas
      const radius = 220
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const nodeId = 'economies'
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x, y },
        data: {
          label: 'Économies',
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
        id: `person-${nodeId}`,
        source: 'person-center',
        target: nodeId,
        style: {
          stroke: '#8b5cf6',
          strokeWidth: 4,
          strokeDasharray: '6,3'
        },
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      })
    }

    // Revenus et Charges regroupés dans une seule box
    if (revenus.length > 0 || charges.length > 0) {
      // Calculer les totaux
      const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montantMensuel || 0), 0)
      const totalCharges = charges.reduce((sum, charge) => sum + (charge.montantMensuel || 0), 0)
      const resteAVivre = totalRevenus - totalCharges

      // Préparer les revenus pour affichage
      const revenusFormatted = revenus.map(revenu => ({
        libelle: revenu.libelle,
        montant: revenu.montantMensuel || 0
      }))

      // Préparer les charges pour affichage
      const chargesFormatted = charges.map(charge => ({
        libelle: charge.libelle,
        montant: charge.montantMensuel || 0
      }))

      // Positionner la box à droite
      const angle = 0 // À droite
      const radius = 250
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const nodeId = 'revenus-charges'
      newNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x, y },
        data: {
          label: 'Revenus & Charges',
          subtitle: 'Mensuels',
          icon: DollarSign,
          bgColor: 'bg-amber-100',
          iconColor: 'text-amber-600',
          borderColor: 'border-amber-400',
          revenus: revenusFormatted,
          charges: chargesFormatted,
          totalRevenus: totalRevenus,
          totalCharges: totalCharges,
          resteAVivre: resteAVivre,
        },
      })

      newEdges.push({
        id: `person-${nodeId}`,
        source: 'person-center',
        target: nodeId,
        style: {
          stroke: '#f59e0b',
          strokeWidth: 4,
          strokeDasharray: '8,4'
        },
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#f59e0b',
        },
      })
    }

    console.log('🔷 Organigramme - Nœuds créés:', newNodes.length)
    console.log('🔗 Organigramme - Edges créés:', newEdges.length, newEdges)
    console.log('🏢 Sociétés détenues trouvées:', societesDetenues.length, societesDetenues)

    setNodes(newNodes)
    setEdges(newEdges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    identite.nom,
    identite.prenom,
    biens.length,
    credits.length,
    comptes.length,
    revenus.length,
    charges.length,
    societes.length,
    associeId,
    activeSection
  ])

  return (
    <>
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        {/* Navigation sections - Style ProjetFormV2 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-4 flex-wrap">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeSection === section.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </nav>
        </div>

      {/* Identité */}
      {activeSection === 'identite' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Informations d'identité</h3>
            <p className="text-sm text-gray-600 mt-1">Renseignez les informations personnelles de l'associé</p>
          </div>

          <div className="space-y-4">
            {/* Photo de profil */}
            <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-shrink-0">
                <div className="relative">
                  {identite.photo ? (
                    <img
                      src={identite.photo}
                      alt="Photo de profil"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-4 border-white shadow-lg">
                      {identite.prenom || identite.nom ? (
                        <span className="text-white text-4xl font-bold">
                          {identite.prenom?.[0]?.toUpperCase() || ''}{identite.nom?.[0]?.toUpperCase() || ''}
                        </span>
                      ) : (
                        <User className="h-16 w-16 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo de profil
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Cette photo sera affichée dans l'application. Format recommandé : JPG, PNG
                </p>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // Convertir en base64
                          const reader = new FileReader()
                          reader.onloadend = () => {
                            setIdentite({ ...identite, photo: reader.result as string })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                    <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Choisir une photo
                    </span>
                  </label>
                  {identite.photo && (
                    <button
                      type="button"
                      onClick={() => setIdentite({ ...identite, photo: '' })}
                      className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Recherche par dirigeant */}
            {showRechercheDirecteant && onAddEntreprisesAsAssocies && (
              <RechercheEntrepriseParDirigeant
                onAddEntreprises={onAddEntreprisesAsAssocies}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom"
                value={identite.nom}
                onChange={(e) => setIdentite({ ...identite, nom: e.target.value })}
                required
              />
              <Input
                label="Prénom"
                value={identite.prenom}
                onChange={(e) => setIdentite({ ...identite, prenom: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date de naissance"
                type="date"
                value={identite.dateNaissance}
                onChange={(e) => setIdentite({ ...identite, dateNaissance: e.target.value })}
                required
              />
              <Input
                label="Lieu de naissance"
                value={identite.lieuNaissance}
                onChange={(e) => setIdentite({ ...identite, lieuNaissance: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Situation familiale
                </label>
                <select
                  value={identite.situationFamiliale}
                  onChange={(e) => setIdentite({ ...identite, situationFamiliale: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Celibataire">Célibataire</option>
                  <option value="Marie">Marié(e)</option>
                  <option value="Pacse">Pacsé(e)</option>
                  <option value="Divorce">Divorcé(e)</option>
                  <option value="Veuf">Veuf(ve)</option>
                </select>
              </div>

              <Input
                label="Nationalité"
                value={identite.nationalite}
                onChange={(e) => setIdentite({ ...identite, nationalite: e.target.value })}
              />
            </div>

            <Input
              label="Adresse complète"
              value={identite.adresse}
              onChange={(e) => setIdentite({ ...identite, adresse: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Téléphone"
                type="tel"
                value={identite.telephone}
                onChange={(e) => setIdentite({ ...identite, telephone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={identite.email}
                onChange={(e) => setIdentite({ ...identite, email: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Situations professionnelles */}
      {activeSection === 'situation' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Situation professionnelle</h3>
            <p className="text-sm text-gray-600 mt-1">Renseignez vos activités professionnelles actuelles et passées</p>
          </div>

          {/* Tableau des situations professionnelles */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Employeur / Société</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Poste / Fonction</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">En cours</th>
                  <th className="w-20 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {situations.map((situation, index) => {
                  const isEditing = editingSituationId === situation.id
                  const getSocieteNom = () => {
                    if (!situation.societeId) return '-'
                    const soc = societes.find(s => s.id === situation.societeId)
                    return soc ? `${soc.nom} (${soc.type})` : '-'
                  }
                  return (
                    <React.Fragment key={situation.id}>
                      <tr
                        className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : 'cursor-pointer'}`}
                        onClick={() => !isEditing && setEditingSituationId(situation.id)}
                      >
                        {/* Statut */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <select
                              value={situation.statutProfessionnel}
                              onChange={(e) => updateSituation(situation.id, 'statutProfessionnel', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="Salarie">Salarié</option>
                              <option value="Independant">Indépendant</option>
                              <option value="Dirigeant">Dirigeant</option>
                              <option value="Retraite">Retraité</option>
                              <option value="Sans_activite">Sans activité</option>
                            </select>
                          ) : (
                            <span className="text-gray-900">{situation.statutProfessionnel.replace(/_/g, ' ')}</span>
                          )}
                        </td>

                        {/* Employeur / Société */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            situation.statutProfessionnel === 'Salarie' ? (
                              <input
                                type="text"
                                value={situation.employeur || ''}
                                onChange={(e) => updateSituation(situation.id, 'employeur', e.target.value)}
                                placeholder="Nom de l'employeur"
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                              />
                            ) : (situation.statutProfessionnel === 'Independant' || situation.statutProfessionnel === 'Dirigeant') ? (
                              <div className="flex gap-2">
                                <select
                                  value={situation.societeId || ''}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateSituation(situation.id, 'societeId', e.target.value)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">Sélectionnez une société</option>
                                  {societes.map(soc => (
                                    <option key={soc.id} value={soc.id}>
                                      {soc.nom} ({soc.type})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setShowSocieteModal(true)}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )
                          ) : (
                            <span className="text-gray-900">
                              {situation.statutProfessionnel === 'Salarie'
                                ? (situation.employeur || '-')
                                : (situation.statutProfessionnel === 'Independant' || situation.statutProfessionnel === 'Dirigeant')
                                ? getSocieteNom()
                                : '-'}
                            </span>
                          )}
                        </td>

                        {/* Poste / Fonction */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={situation.emploi || ''}
                              onChange={(e) => updateSituation(situation.id, 'emploi', e.target.value)}
                              placeholder={
                                situation.statutProfessionnel === 'Salarie' ? "Ex: Développeur" :
                                situation.statutProfessionnel === 'Dirigeant' ? "Ex: Gérant" :
                                situation.statutProfessionnel === 'Independant' ? "Ex: Consultant" : ""
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-gray-900">{situation.emploi || '-'}</span>
                          )}
                        </td>

                        {/* En cours */}
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={situation.enCours}
                              onChange={(e) => updateSituation(situation.id, 'enCours', e.target.checked)}
                              className="h-4 w-4"
                            />
                          ) : (
                            situation.enCours ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                ✓ Actuel
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex gap-1 justify-end">
                            {!isEditing ? (
                              <>
                                {situations.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeSituation(situation.id); }}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); validateSituation(situation.id); }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Valider"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); cancelSituationEdit(situation.id); }}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                  title="Annuler"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Ligne d'édition étendue pour champs supplémentaires */}
                      {isEditing && (
                        <tr className="bg-blue-50 border-b border-blue-200">
                          <td colSpan={5} className="py-4 px-4">
                            <div className="space-y-3">
                              {/* Pour Salarié : Type de contrat */}
                              {situation.statutProfessionnel === 'Salarie' && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Type de contrat</label>
                                    <select
                                      value={situation.typeContrat || 'CDI'}
                                      onChange={(e) => updateSituation(situation.id, 'typeContrat', e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    >
                                      <option value="CDI">CDI</option>
                                      <option value="CDD">CDD</option>
                                      <option value="Interim">Intérim</option>
                                      <option value="Freelance">Freelance</option>
                                      <option value="Fonctionnaire">Fonctionnaire</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* Dates */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Date de début</label>
                                  <input
                                    type="date"
                                    value={situation.dateDebut}
                                    onChange={(e) => updateSituation(situation.id, 'dateDebut', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                {!situation.enCours && (
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin</label>
                                    <input
                                      type="date"
                                      value={situation.dateFin || ''}
                                      onChange={(e) => updateSituation(situation.id, 'dateFin', e.target.value)}
                                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bouton Ajouter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              addSituation()
            }}
            className="w-full py-3 px-6 bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
          >
            <Plus className="h-5 w-5" />
            Ajouter une situation
          </button>
        </div>
      )}

      {/* Revenus */}
      {activeSection === 'revenus' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Revenus mensuels</h3>
            <p className="text-sm text-gray-600 mt-1">Renseignez tous vos revenus réguliers perçus chaque mois</p>
          </div>

          {/* Tableau des revenus */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type de revenu</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Libellé</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Nb mois</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Montant</th>
                  <th className="w-20 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {revenus.map((revenu, index) => {
                  const isEditing = editingRevenuId === revenu.id
                  return (
                    <tr
                      key={revenu.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-green-50' : 'cursor-pointer'}`}
                      onClick={() => !isEditing && setEditingRevenuId(revenu.id)}
                    >
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={revenu.type}
                            onChange={(e) => updateRevenu(revenu.id, 'type', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="salaire">Salaire</option>
                            <option value="prime">Prime</option>
                            <option value="locatif">Revenus locatifs</option>
                            <option value="investissement">Investissements</option>
                            <option value="societe">Revenus de société</option>
                            <option value="autre">Autre</option>
                          </select>
                        ) : (
                          <span className="text-gray-900 capitalize">{revenu.type.replace('_', ' ')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={revenu.libelle}
                            onChange={(e) => updateRevenu(revenu.id, 'libelle', e.target.value)}
                            placeholder="Ex: Salaire principal"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-900">{revenu.libelle}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {revenu.type === 'salaire' ? (
                          isEditing ? (
                            <select
                              value={revenu.nombreMois || 12}
                              onChange={(e) => updateRevenu(revenu.id, 'nombreMois', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                            >
                              <option value="12">12 mois</option>
                              <option value="13">13 mois</option>
                              <option value="14">14 mois</option>
                              <option value="15">15 mois</option>
                              <option value="16">16 mois</option>
                            </select>
                          ) : (
                            <span className="text-gray-900">{revenu.nombreMois || 12} mois</span>
                          )
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={revenu.montantMensuel}
                            onChange={(e) => updateRevenu(revenu.id, 'montantMensuel', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-gray-900 font-semibold">{revenu.montantMensuel.toLocaleString('fr-FR')} €</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          {!isEditing ? (
                            <>
                              {revenus.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeRevenu(revenu.id); }}
                                  className="text-red-600 hover:text-red-700"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); validateRevenu(revenu.id); }}
                                className="text-green-600 hover:text-green-700"
                                title="Valider"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); cancelRevenuEdit(revenu.id); }}
                                className="text-gray-600 hover:text-gray-700"
                                title="Annuler"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bouton Ajouter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              addRevenu()
            }}
            className="w-full py-3 px-6 bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
          >
            <Plus className="h-5 w-5" />
            Ajouter un revenu
          </button>

          {/* Total */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total des revenus mensuels</span>
            <span className="text-2xl font-bold text-green-600">{totalRevenus.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      )}

      {/* Charges */}
      {activeSection === 'charges' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Charges mensuelles</h3>
            <p className="text-sm text-gray-600 mt-1">Listez toutes vos charges fixes et variables récurrentes chaque mois</p>
          </div>

          {/* Tableau des charges */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type de charge</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Libellé</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Montant</th>
                  <th className="w-20 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge, index) => {
                  const isEditing = editingChargeId === charge.id
                  return (
                    <tr
                      key={charge.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-red-50' : 'cursor-pointer'}`}
                      onClick={() => !isEditing && setEditingChargeId(charge.id)}
                    >
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={charge.type || 'Logement'}
                            onChange={(e) => updateCharge(charge.id, 'type', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          >
                            <option value="Logement">Logement</option>
                            <option value="Transport">Transport</option>
                            <option value="Alimentation">Alimentation</option>
                            <option value="Assurance">Assurance</option>
                            <option value="Crédit">Crédit</option>
                            <option value="Abonnement">Abonnement</option>
                            <option value="Impôt">Impôt</option>
                            <option value="Autre">Autre</option>
                          </select>
                        ) : (
                          <span className="text-gray-900">{charge.type || 'Autre'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={charge.libelle}
                            onChange={(e) => updateCharge(charge.id, 'libelle', e.target.value)}
                            placeholder="Ex: Loyer, Crédit voiture..."
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-900">{charge.libelle}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={charge.montantMensuel}
                            onChange={(e) => updateCharge(charge.id, 'montantMensuel', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-gray-900 font-semibold">{charge.montantMensuel.toLocaleString('fr-FR')} €</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          {!isEditing ? (
                            <>
                              {charges.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeCharge(charge.id); }}
                                  className="text-red-600 hover:text-red-700"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); validateCharge(charge.id); }}
                                className="text-green-600 hover:text-green-700"
                                title="Valider"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); cancelChargeEdit(charge.id); }}
                                className="text-gray-600 hover:text-gray-700"
                                title="Annuler"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Afficher les crédits en lecture seule */}
                {credits.map((credit) => {
                  const getBienDescription = () => {
                    if (credit.type === 'Immobilier' && credit.bienAssocie) {
                      const bien = biens.find(b => b.id === credit.bienAssocie)
                      return bien ? `${bien.adresse}` : credit.bienAssocie
                    }
                    return credit.bienAssocie || ''
                  }

                  return (
                    <tr key={`credit-${credit.id}`} className="border-b border-gray-200 bg-orange-50">
                      <td className="py-3 px-4">
                        <span className="text-gray-700">Crédit</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-700">
                          {credit.type === 'Immobilier' ? 'Crédit immobilier' : `Crédit ${credit.type.toLowerCase()}`}
                          {getBienDescription() && ` - ${getBienDescription()}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-700 font-semibold">{(credit.mensualite || 0).toLocaleString('fr-FR')} €</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <span className="text-xs text-gray-500 italic">Géré dans Patrimoine</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Détail des charges */}
          {credits.length > 0 && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Charges courantes</span>
                <span className="font-semibold text-gray-900">{totalCharges.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-700">Mensualités de crédits</span>
                <span className="font-semibold text-orange-600">{totalMensualitesCredits.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          )}

          {/* Bouton Ajouter */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              addCharge()
            }}
            className="w-full py-3 px-6 bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
          >
            <Plus className="h-5 w-5" />
            Ajouter une charge
          </button>

          {/* Total charges */}
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total des charges mensuelles</span>
            <span className="text-2xl font-bold text-red-600">{totalChargesAvecCredits.toLocaleString('fr-FR')} €</span>
          </div>

          {/* Reste à vivre */}
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Reste à vivre</span>
            <span className="text-2xl font-bold text-blue-600">{(totalRevenus - totalChargesAvecCredits).toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      )}

      {/* Patrimoine */}
      {activeSection === 'patrimoine' && (
        <div className="space-y-6">
          {/* Biens immobiliers de cet associé */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Biens immobiliers personnels</h3>
              <p className="text-sm text-gray-600 mt-1">Renseignez tous les biens immobiliers détenus avec leur valeur estimée</p>
            </div>

            {biens.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">Aucun bien immobilier pour cet associé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type de bien</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Adresse</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Valeur estimée</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Crédit restant</th>
                      <th className="w-20 py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {biens.map((bien, index) => {
                      const isEditing = editingBienId === bien.id
                      const bienCredits = credits.filter(c => c.bienAssocie === bien.id)
                      const totalCreditsDuBien = bienCredits.reduce((sum, c) => sum + (c.capitalRestantDu || 0), 0)
                      return (
                        <React.Fragment key={bien.id}>
                          <tr
                            className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-green-50' : 'cursor-pointer'}`}
                            onClick={() => !isEditing && setEditingBienId(bien.id)}
                          >
                            {/* Type de bien */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <select
                                  value={bien.type}
                                  onChange={(e) => updateBien(bien.id, 'type', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="Residence_Principale">Résidence principale</option>
                                  <option value="Residence_Secondaire">Résidence secondaire</option>
                                  <option value="Investissement_Locatif">Investissement locatif</option>
                                </select>
                              ) : (
                                <span className="text-gray-900">{bien.type.replace(/_/g, ' ')}</span>
                              )}
                            </td>

                            {/* Adresse */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={bien.adresse}
                                  onChange={(e) => updateBien(bien.id, 'adresse', e.target.value)}
                                  placeholder="Adresse du bien"
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              ) : (
                                <span className="text-gray-900">{bien.adresse}</span>
                              )}
                            </td>

                            {/* Valeur estimée */}
                            <td className="py-3 px-4 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={bien.valeurEstimee}
                                  onChange={(e) => updateBien(bien.id, 'valeurEstimee', Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                />
                              ) : (
                                <span className="font-semibold text-green-600">{bien.valeurEstimee.toLocaleString('fr-FR')} €</span>
                              )}
                            </td>

                            {/* Crédit restant */}
                            <td className="py-3 px-4 text-right">
                              {totalCreditsDuBien > 0 ? (
                                <span className="text-orange-600 font-medium">{totalCreditsDuBien.toLocaleString('fr-FR')} €</span>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4">
                              <div className="flex gap-1 justify-end">
                                {!isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); removeBien(bien.id); }}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); validateBien(bien.id); }}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Valider"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); cancelBienEdit(bien.id); }}
                                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      title="Annuler"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Ligne d'édition étendue pour loyer si investissement locatif */}
                          {isEditing && bien.type === 'Investissement_Locatif' && (
                            <tr className="bg-green-50 border-b border-green-200">
                              <td colSpan={5} className="py-4 px-4">
                                <div className="flex items-center gap-4">
                                  <label className="text-xs font-medium text-gray-700">Loyer mensuel (€)</label>
                                  <input
                                    type="number"
                                    value={bien.loyerMensuel || 0}
                                    onChange={(e) => updateBien(bien.id, 'loyerMensuel', Number(e.target.value))}
                                    placeholder="Ex: 800"
                                    className="px-2 py-1 border border-gray-300 rounded text-sm w-40"
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bouton Ajouter */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                addBien()
              }}
              className="w-full py-3 px-6 bg-purple-100 hover:bg-purple-200 text-purple-700 border-2 border-purple-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
            >
              <Plus className="h-5 w-5" />
              Ajouter un bien
            </button>
          </div>

          {/* Crédits en cours de cet associé */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Crédits immobiliers personnels</h3>
              <p className="text-sm text-gray-600 mt-1">Listez tous vos crédits actuels avec leurs caractéristiques et montants</p>
            </div>

            {credits.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">Aucun crédit en cours pour cet associé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Organisme</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Bien / Description</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Mensualité</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Capital restant dû</th>
                      <th className="w-20 py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map((credit, index) => {
                      const isEditing = editingCreditId === credit.id
                      const getBienDescription = () => {
                        if (credit.type === 'Immobilier' && credit.bienAssocie) {
                          const bien = biens.find(b => b.id === credit.bienAssocie)
                          return bien ? `${bien.adresse} (${bien.type.replace(/_/g, ' ')})` : credit.bienAssocie
                        }
                        return credit.bienAssocie || '-'
                      }
                      return (
                        <React.Fragment key={credit.id}>
                          <tr
                            className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-orange-50' : 'cursor-pointer'}`}
                            onClick={() => !isEditing && setEditingCreditId(credit.id)}
                          >
                            {/* Type */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <select
                                  value={credit.type}
                                  onChange={(e) => updateCredit(credit.id, 'type', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                >
                                  <option value="Immobilier">Immobilier</option>
                                  <option value="Consommation">Consommation</option>
                                  <option value="Professionnel">Professionnel</option>
                                  <option value="Autre">Autre</option>
                                </select>
                              ) : (
                                <span className="text-gray-900">{credit.type}</span>
                              )}
                            </td>

                            {/* Organisme */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={credit.organisme}
                                  onChange={(e) => updateCredit(credit.id, 'organisme', e.target.value)}
                                  placeholder="Banque / Organisme"
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                />
                              ) : (
                                <span className="text-gray-900">{credit.organisme}</span>
                              )}
                            </td>

                            {/* Bien / Description */}
                            <td className="py-3 px-4">
                              {isEditing ? (
                                credit.type === 'Immobilier' ? (
                                  <select
                                    value={credit.bienAssocie || ''}
                                    onChange={(e) => updateCredit(credit.id, 'bienAssocie', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  >
                                    <option value="">Sélectionnez un bien</option>
                                    {biens.map(bien => (
                                      <option key={bien.id} value={bien.id}>
                                        {bien.adresse} - {bien.type.replace(/_/g, ' ')}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={credit.bienAssocie || ''}
                                    onChange={(e) => updateCredit(credit.id, 'bienAssocie', e.target.value)}
                                    placeholder="Ex: Voiture, Travaux..."
                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                  />
                                )
                              ) : (
                                <span className="text-gray-900 text-sm">{getBienDescription()}</span>
                              )}
                            </td>

                            {/* Mensualité */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-orange-600">
                                {(credit.mensualite || 0).toLocaleString('fr-FR')} €
                              </span>
                            </td>

                            {/* Capital restant dû */}
                            <td className="py-3 px-4 text-right">
                              <span className="font-semibold text-red-600">
                                {(credit.capitalRestantDu || 0).toLocaleString('fr-FR')} €
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4">
                              <div className="flex gap-1 justify-end">
                                {!isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); removeCredit(credit.id); }}
                                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); validateCredit(credit.id); }}
                                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Valider"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); cancelCreditEdit(credit.id); }}
                                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                      title="Annuler"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Ligne d'édition étendue pour champs détaillés */}
                          {isEditing && (
                            <tr className="bg-orange-50 border-b border-orange-200">
                              <td colSpan={6} className="py-4 px-4">
                                <div className="space-y-3">
                                  {/* Ligne 1: Montant, Date, Durée */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Montant initial (€)</label>
                                      <input
                                        type="number"
                                        value={credit.montantInitial}
                                        onChange={(e) => updateCredit(credit.id, 'montantInitial', Number(e.target.value))}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Date de début</label>
                                      <input
                                        type="date"
                                        value={credit.dateDebut}
                                        onChange={(e) => updateCredit(credit.id, 'dateDebut', e.target.value)}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Durée (mois)</label>
                                      <input
                                        type="number"
                                        value={credit.nombreMois}
                                        onChange={(e) => updateCredit(credit.id, 'nombreMois', Number(e.target.value))}
                                        placeholder="240 (20 ans)"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                  </div>

                                  {/* Ligne 2: Taux */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Taux d'intérêt (%)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={credit.tauxInteret}
                                        onChange={(e) => updateCredit(credit.id, 'tauxInteret', Number(e.target.value))}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </div>
                                  </div>

                                  {/* Info coût total */}
                                  {credit.montantInitial > 0 && credit.mensualite && (
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-xs">
                                      <p className="text-blue-900">
                                        💡 <strong>Coût total du crédit :</strong>{' '}
                                        {((credit.mensualite * credit.nombreMois) - credit.montantInitial).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                                        {' '}({((((credit.mensualite * credit.nombreMois) / credit.montantInitial) - 1) * 100).toFixed(1)}% du capital emprunté)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bouton Ajouter */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                addCredit()
              }}
              className="w-full py-3 px-6 bg-orange-100 hover:bg-orange-200 text-orange-700 border-2 border-orange-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
            >
              <Plus className="h-5 w-5" />
              Ajouter un crédit
            </button>
          </div>
        </div>
      )}

      {/* Économies */}
      {activeSection === 'economies' && (
        <div className="space-y-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Économies et épargne</h3>
            <p className="text-sm text-gray-600 mt-1">Listez vos comptes bancaires et placements avec leurs soldes actuels</p>
          </div>

          {/* Tableau des comptes */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type de compte</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Banque</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Solde</th>
                  <th className="w-20 py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {comptes.map((compte, index) => {
                  const isEditing = editingCompteId === compte.id
                  const typeCompteLabel = compte.typeCompte === 'Autre' && compte.typeCompteAutre
                    ? compte.typeCompteAutre
                    : compte.typeCompte.replace(/_/g, ' ')

                  return (
                    <tr
                      key={compte.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${isEditing ? 'bg-purple-50' : 'cursor-pointer'}`}
                      onClick={() => !isEditing && setEditingCompteId(compte.id)}
                    >
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <select
                              value={compte.typeCompte}
                              onChange={(e) => updateCompte(compte.id, 'typeCompte', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="Compte_Courant">Compte Courant</option>
                              <option value="Livret_A">Livret A</option>
                              <option value="LDDS">LDDS</option>
                              <option value="PEL">PEL</option>
                              <option value="CEL">CEL</option>
                              <option value="Assurance_Vie">Assurance Vie</option>
                              <option value="PEA">PEA</option>
                              <option value="Compte_Titre">Compte Titre</option>
                              <option value="Autre">Autre</option>
                            </select>
                            {compte.typeCompte === 'Autre' && (
                              <input
                                type="text"
                                value={compte.typeCompteAutre || ''}
                                onChange={(e) => updateCompte(compte.id, 'typeCompteAutre', e.target.value)}
                                placeholder="Précisez..."
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-900">{typeCompteLabel}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={compte.banque}
                            onChange={(e) => updateCompte(compte.id, 'banque', e.target.value)}
                            placeholder="Ex: Crédit Agricole"
                            className="w-full px-2 py-1 border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-900">{compte.banque}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={compte.solde}
                            onChange={(e) => updateCompte(compte.id, 'solde', Number(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        ) : (
                          <span className="text-gray-900 font-semibold">{compte.solde.toLocaleString('fr-FR')} €</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          {!isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeCompte(compte.id); }}
                                className="text-red-600 hover:text-red-700"
                                title="Supprimer"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); validateCompte(compte.id); }}
                                className="text-green-600 hover:text-green-700"
                                title="Valider"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); cancelCompteEdit(compte.id); }}
                                className="text-gray-600 hover:text-gray-700"
                                title="Annuler"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Bouton Ajouter */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              addCompte()
            }}
            className="w-full py-3 px-6 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-2 border-indigo-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2 mt-6"
          >
            <Plus className="h-5 w-5" />
            Ajouter un compte
          </button>

          {/* Total */}
          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700">Total des économies</span>
            <span className="text-2xl font-bold text-purple-600">{totalEconomies.toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      )}

      {/* Organigramme */}
      {activeSection === 'organigramme' && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold mb-4">Organigramme patrimonial</h3>

          {nodes.length <= 1 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              💡 <strong>Astuce :</strong> Ajoutez des sociétés, biens, crédits ou comptes bancaires dans les autres sections pour voir l'organigramme se construire automatiquement !
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
                    if (node.id.startsWith('bien-')) return '#10b981'
                    if (node.id.startsWith('credit-')) return '#f97316'
                    if (node.id.startsWith('compte-')) return '#8b5cf6'
                    return '#6b7280'
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
        >
          Enregistrer et fermer
        </button>
      </div>
      </Card>
    </form>

    {/* Modal Société */}
    <Modal
      isOpen={showSocieteModal}
      onClose={() => setShowSocieteModal(false)}
      title="Créer une société"
      size="large"
      closeOnBackdropClick={false}
    >
      <SocieteFormV2
        onSubmit={handleCreateSociete}
        onCancel={() => setShowSocieteModal(false)}
        personneEnCreation={
          // Si on crée une nouvelle personne (pas d'associeId), passer ses infos pour éviter les doublons
          !associeId && identite.nom && identite.prenom ? {
            id: `temp-${Date.now()}`, // ID temporaire
            nom: identite.nom,
            prenom: identite.prenom
          } : null
        }
      />
    </Modal>
    </>
  )
}

export default AssocieFormV2
