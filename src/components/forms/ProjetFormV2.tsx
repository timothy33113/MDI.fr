import React, { useState, useEffect } from 'react'
import { CreateProjetForm, Structure, Projet, ChecklistDocument, BienImmobilier } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, FileText, Home, Users, Hammer, Euro, CheckCircle, Link as LinkIcon, TrendingUp, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import api from '@/services/api'
import SortablePhotoGrid from '@/components/ui/SortablePhotoGrid'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'

interface ProjetFormV2Props {
  structures: Structure[]
  onSubmit: (data: CreateProjetForm) => void | Promise<any>
  onCancel?: () => void
  onGeneratePDF?: () => void
  initialProjet?: Projet | null
}

type TabType = 'general' | 'porteurs' | 'composition' | 'travaux' | 'financement' | 'recapitulatif' | 'documents'

interface ElementBien {
  id: string
  type: 'Appartement' | 'Local_Commercial' | 'Maison' | 'Studio' | 'Parking' | 'Cave'
  superficie: number
  nombrePieces?: number
  etat: 'Bon' | 'Moyen' | 'A_Renover' | 'Neuf'
  enLocation: boolean
  loyerMensuel?: number
  chargesMensuelles?: number
}

interface Travaux {
  id: string
  type: string
  description: string
  montant: number
}

const ProjetFormV2: React.FC<ProjetFormV2Props> = ({ structures, onSubmit, onCancel, onGeneratePDF, initialProjet }) => {
  const [activeTab, setActiveTab] = useState<TabType>('general')

  // Onglet 1: Informations générales
  const [nom, setNom] = useState(initialProjet?.nom || '')
  const [description, setDescription] = useState(initialProjet?.description || '')
  const [adresse, setAdresse] = useState(initialProjet?.bienImmobilier?.adresse || '')
  const [codePostal, setCodePostal] = useState(initialProjet?.bienImmobilier?.codePostal || '')
  const [ville, setVille] = useState(initialProjet?.bienImmobilier?.ville || '')
  const [typeBien, setTypeBien] = useState(initialProjet?.bienImmobilier?.type || '')
  const [dpe, setDpe] = useState(initialProjet?.bienImmobilier?.dpe || '')
  const [ges, setGes] = useState(initialProjet?.bienImmobilier?.ges || '')
  const [taxeFonciere, setTaxeFonciere] = useState(Number(initialProjet?.bienImmobilier?.taxeFonciere) || 0)
  interface PhotoItem {
    id: string
    url: string
    filename: string
    description?: string
    type: string
    position: number
    isUploading?: boolean
  }
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialProjet?.bienImmobilier?.photos
      ? initialProjet.bienImmobilier.photos.map((p, i) => ({
          id: p.id || `photo-${i}-${Date.now()}`,
          url: p.url,
          filename: p.filename || `photo_${i}.jpg`,
          description: p.description,
          type: p.type || 'Autre',
          position: (p as any).position ?? i,
        }))
      : []
  )
  const [photoCouverture, setPhotoCouverture] = useState<string | null>(
    initialProjet?.photoCouverture || null
  )

  // Onglet 2: Porteurs du projet
  // Filtre les porteurs avec des IDs invalides (ancien localStorage)
  const isValidUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  const [porteurs, setPorteurs] = useState<{ structureId: string; pourcentageProjet: number }[]>(
    initialProjet?.porteurs && initialProjet.porteurs.length > 0
      ? initialProjet.porteurs
          .filter(p => isValidUUID(p.structureId)) // Filtrer les IDs invalides
          .map(p => ({ structureId: p.structureId, pourcentageProjet: Number(p.pourcentageProjet) || 0 }))
      : [] // Commencer sans porteurs pour permettre la création de projets sans structures
  )
  const [totalPourcentage, setTotalPourcentage] = useState(0)

  // Onglet 3: Composition du bien
  const [elementsBien, setElementsBien] = useState<ElementBien[]>(
    initialProjet?.bienImmobilier?.elements?.map(e => ({
      id: e.id || crypto.randomUUID(),
      type: e.type,
      superficie: Number(e.superficie) || 0,
      nombrePieces: e.nombrePieces ? Number(e.nombrePieces) : undefined,
      etat: e.etatActuel || 'Bon',
      enLocation: e.loyerMensuel && Number(e.loyerMensuel) > 0 ? true : false,
      loyerMensuel: Number(e.loyerMensuel) || 0,
      chargesMensuelles: Number(e.chargesMensuelles) || 0
    })) || []
  )

  // Onglet 4: Travaux
  const [travaux, setTravaux] = useState<Travaux[]>(
    initialProjet?.bienImmobilier?.travauxPrevus?.map(t => ({
      id: t.id || crypto.randomUUID(),
      type: t.categorie,  // Map 'categorie' from backend to 'type' for frontend
      description: t.description,
      montant: Number(t.montant) || 0
    })) || []
  )

  // Onglet 5: Financement (multi-scénarios)
  interface Scenario {
    id: string
    nom: string
    prixAchat: number
    fraisNotaire: number
    fraisAgence: number
    montantTravaux: number
    apportPersonnel: number
    dureeCredit: number
    tauxInteretEstime: number
    typePret: 'Amortissable' | 'In_Fine' | 'Palier' | 'Autre'
  }

  const createScenario = (index: number, initial?: any): Scenario => ({
    id: String(Date.now()) + index,
    nom: `Hypothèse ${index}`,
    prixAchat: Number(initial?.prixAchat) || 0,
    fraisNotaire: Number(initial?.fraisNotaire) || 0,
    fraisAgence: Number(initial?.fraisAgence) || 0,
    montantTravaux: Number(initial?.montantTravaux) || 0,
    apportPersonnel: Number(initial?.apportPersonnel) || 0,
    dureeCredit: Number(initial?.dureeCredit) || 20,
    tauxInteretEstime: Number(initial?.tauxInteretEstime) || 3.5,
    typePret: initial?.typePret || 'Amortissable' as 'Amortissable' | 'In_Fine' | 'Palier' | 'Autre',
  })

  const [scenarios, setScenarios] = useState<Scenario[]>([
    createScenario(1, initialProjet?.financement)
  ])
  const [activeScenarioId, setActiveScenarioId] = useState(scenarios[0].id)

  // Getter pour le scénario actif
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0]
  const updateActiveScenario = (updates: Partial<Scenario>) => {
    setScenarios(prev => prev.map(s => s.id === activeScenarioId ? { ...s, ...updates } : s))
  }

  // Compatibilité: le premier scénario sert de "financement" principal
  const financement = scenarios[0]

  // Import Leboncoin
  const [isLeboncoinExpanded, setIsLeboncoinExpanded] = useState(false)
  const [leboncoinUrl, setLeboncoinUrl] = useState('')
  const [isLoadingLeboncoin, setIsLoadingLeboncoin] = useState(false)

  // Comparables de marche
  interface ComparableInput {
    url: string
    titre?: string
    prix?: number
    surface?: number
    pieces?: number
    loyer?: number
    ville?: string
    codePostal?: string
    images?: string[]
    loading?: boolean
    error?: string
  }
  const [comparables, setComparables] = useState<ComparableInput[]>(
    initialProjet?.comparables?.map(c => ({
      url: c.url,
      titre: c.titre,
      prix: c.prix,
      surface: c.surface,
      pieces: c.pieces,
      loyer: c.loyer,
      ville: c.ville,
      codePostal: c.codePostal,
      images: c.images,
    })) || []
  )
  const [comparableUrl, setComparableUrl] = useState('')
  const [comparableLoading, setComparableLoading] = useState(false)

  // Onglet 7: Checklist documents
  const [checklistDocs, setChecklistDocs] = useState<ChecklistDocument[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [checklistGenerated, setChecklistGenerated] = useState(false)

  // API: Charger la checklist existante
  const handleLoadChecklist = async () => {
    if (!initialProjet?.id) return
    setChecklistLoading(true)
    try {
      const response = await api.get(`/projets/actions?id=${initialProjet.id}&action=checklist`)
      const docs = response.data.data || []
      setChecklistDocs(docs)
      setChecklistGenerated(docs.length > 0)
    } catch {
      // Pas de checklist existante, c'est normal
      setChecklistGenerated(false)
    } finally {
      setChecklistLoading(false)
    }
  }

  // API: Générer la checklist
  const handleGenerateChecklist = async () => {
    if (!initialProjet?.id) return
    setChecklistLoading(true)
    try {
      const response = await api.post(`/projets/actions?id=${initialProjet.id}&action=checklist`)
      setChecklistDocs(response.data.data)
      setChecklistGenerated(true)
    } catch (err: any) {
      console.error('Erreur génération checklist:', err)
      alert('Erreur lors de la génération de la checklist')
    } finally {
      setChecklistLoading(false)
    }
  }

  // API: Mettre à jour le statut d'un document
  const handleUpdateDocumentStatus = async (documentId: string, newStatut: string) => {
    if (!initialProjet?.id) return
    try {
      await api.patch(`/projets/actions?id=${initialProjet.id}&action=checklist&documentId=${documentId}`, { statut: newStatut })
      setChecklistDocs(prev => prev.map(d =>
        d.id === documentId ? { ...d, statut: newStatut as ChecklistDocument['statut'] } : d
      ))
    } catch (err: any) {
      console.error('Erreur mise à jour statut:', err)
    }
  }

  // Auto-charger les données serveur au changement d'onglet
  useEffect(() => {
    if (activeTab === 'documents' && initialProjet?.id && !checklistGenerated && checklistDocs.length === 0) {
      handleLoadChecklist()
    }
  }, [activeTab])

  useEffect(() => {
    const total = porteurs.reduce((sum, p) => sum + p.pourcentageProjet, 0)
    setTotalPourcentage(total)
  }, [porteurs])

  // Calculer automatiquement le montant total des travaux
  useEffect(() => {
    const montantTotal = travaux.reduce((sum, t) => sum + t.montant, 0)
    setScenarios(prev => prev.map(s => ({ ...s, montantTravaux: montantTotal })))
  }, [travaux])

  // Écouter la création de nouvelles structures et les sélectionner automatiquement
  useEffect(() => {
    const handleStructureCreated = (event: any) => {
      const structureId = event.detail?.structureId
      if (structureId) {
        // Trouver le premier porteur vide et le remplir avec la nouvelle structure
        const firstEmptyIndex = porteurs.findIndex(p => !p.structureId)
        if (firstEmptyIndex !== -1) {
          updatePorteur(firstEmptyIndex, 'structureId', structureId)
        } else {
          // Si tous les porteurs sont remplis, ajouter un nouveau porteur
          setPorteurs([...porteurs, { structureId, pourcentageProjet: 0 }])
        }
        // Nettoyer le localStorage
        localStorage.removeItem('lastCreatedStructureId')
      }
    }

    window.addEventListener('structureCreated', handleStructureCreated)

    // Vérifier s'il y a une structure créée récemment au chargement
    const lastCreatedId = localStorage.getItem('lastCreatedStructureId')
    if (lastCreatedId) {
      handleStructureCreated({ detail: { structureId: lastCreatedId } })
    }

    return () => {
      window.removeEventListener('structureCreated', handleStructureCreated)
    }
  }, [porteurs])

  // Porteurs
  const addPorteur = () => {
    setPorteurs([...porteurs, { structureId: '', pourcentageProjet: 0 }])
  }

  const removePorteur = (index: number) => {
    // Permettre de supprimer tous les porteurs pour créer un projet sans porteurs
    setPorteurs(porteurs.filter((_, i) => i !== index))
  }

  const updatePorteur = (index: number, field: 'structureId' | 'pourcentageProjet', value: string | number) => {
    const newPorteurs = [...porteurs]
    newPorteurs[index] = { ...newPorteurs[index], [field]: value }
    setPorteurs(newPorteurs)
  }

  // Éléments du bien
  const addElementBien = () => {
    const newElement: ElementBien = {
      id: Date.now().toString(),
      type: 'Appartement',
      superficie: 0,
      nombrePieces: 0,
      etat: 'Bon',
      enLocation: false,
      loyerMensuel: 0,
      chargesMensuelles: 0
    }
    setElementsBien([...elementsBien, newElement])
  }

  const removeElementBien = (id: string) => {
    setElementsBien(elementsBien.filter(e => e.id !== id))
  }

  const updateElementBien = (id: string, field: keyof ElementBien, value: any) => {
    setElementsBien(elementsBien.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ))
  }

  // Travaux
  const addTravaux = () => {
    const newTravaux: Travaux = {
      id: Date.now().toString(),
      type: '',
      description: '',
      montant: 0
    }
    setTravaux([...travaux, newTravaux])
  }

  const removeTravaux = (id: string) => {
    setTravaux(travaux.filter(t => t.id !== id))
  }

  const updateTravaux = (id: string, field: keyof Travaux, value: any) => {
    setTravaux(travaux.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ))
  }

  // Photos (gérées par SortablePhotoGrid)

  // Import depuis Leboncoin
  const handleLeboncoinImport = async () => {
    if (!leboncoinUrl.trim()) {
      alert('Veuillez saisir une URL Leboncoin')
      return
    }

    setIsLoadingLeboncoin(true)
    try {
      const response = await api.post('/leboncoin/scrape', {
        url: leboncoinUrl
      })

      console.log('Réponse Leboncoin:', response)

      if (!response.data || !response.data.data) {
        throw new Error('Format de réponse invalide')
      }

      const data = response.data.data

      // Pré-remplir les champs avec les données récupérées
      if (data.title) setNom(data.title)

      // Utiliser la description enrichie si disponible, sinon la description normale
      if (data.enrichedDescription) {
        setDescription(data.enrichedDescription)
      } else if (data.description) {
        setDescription(data.description)
      }
      if (data.price) {
        const estimatedNotaryFees = data.price * 0.08 // Estimation 8% de frais de notaire
        setScenarios(prev => prev.map(s => ({
          ...s,
          prixAchat: data.price,
          fraisNotaire: estimatedNotaryFees
        })))
      }

      // Adresse - gérer les deux formats (string ou objet)
      if (data.location) {
        if (typeof data.location === 'object') {
          // Format objet de l'API Leboncoin: { city, zipcode, address, ... }
          if (data.location.city) setVille(data.location.city)
          if (data.location.zipcode || data.location.postalCode) {
            setCodePostal(data.location.zipcode || data.location.postalCode)
          }
          if (data.location.address) setAdresse(data.location.address)
        } else if (typeof data.location === 'string') {
          // Format string legacy
          const locationParts = data.location.split(',')
          if (locationParts.length >= 2) {
            const cityPostal = locationParts[locationParts.length - 1].trim().split(' ')
            if (cityPostal.length >= 2) {
              setCodePostal(cityPostal[0])
              setVille(cityPostal.slice(1).join(' '))
            }
            if (locationParts.length > 2) {
              setAdresse(locationParts.slice(0, -1).join(', '))
            }
          }
        }
      }

      // Photos - créer des objets Photo directement avec les URLs Leboncoin
      if (data.images && data.images.length > 0) {
        const photosImportees = data.images.map((imageUrl: string, index: number) => ({
          id: `temp-${Date.now()}-${index}`,
          bienImmobilierId: '', // Sera assigné à la sauvegarde
          url: imageUrl,
          filename: `leboncoin-image-${index + 1}.jpg`,
          description: `Photo ${index + 1} importée depuis Leboncoin`,
          type: 'Facade' as const,
          size: 0,
          mimeType: 'image/jpeg',
          uploadedAt: new Date()
        }))

        setPhotos(photosImportees.map((p: any, i: number) => ({
          id: p.id,
          url: p.url,
          filename: p.filename,
          description: p.description,
          type: p.type,
          position: i,
        })))

        console.log(`✅ ${photosImportees.length} photos importées depuis Leboncoin`)
      }

      // Determiner le type principal du bien (immeuble si multi-unit ou type brut)
      const rawPropertyType = (data.analysis?.propertyType || data.propertyType || '').toLowerCase()
      if (rawPropertyType.includes('immeuble') || data.analysis?.isMultiUnit) {
        setTypeBien('Immeuble')
      } else if (rawPropertyType.includes('maison') || rawPropertyType.includes('house')) {
        setTypeBien('Maison')
      } else if (rawPropertyType.includes('appartement') || rawPropertyType.includes('apartment')) {
        setTypeBien('Appartement')
      } else if (rawPropertyType.includes('local') || rawPropertyType.includes('commerce')) {
        setTypeBien('Local_Commercial')
      } else if (rawPropertyType.includes('terrain')) {
        setTypeBien('Terrain')
      }

      // Créer les éléments de bien basés sur l'analyse LLM
      if (data.analysis?.isMultiUnit && data.analysis?.units && data.analysis.units.length > 0) {
        // Cas d'un immeuble multi-logements - créer un élément pour chaque unité
        const createdUnits = data.analysis.units.map((unit: any, index: number) => {
          const mappedType = mapLeboncoinPropertyType(unit.type)
          return {
            id: (Date.now() + index).toString(),
            type: mappedType || 'Appartement',
            superficie: unit.surface || 0,
            nombrePieces: unit.rooms || 0,
            etat: 'Bon',
            enLocation: unit.currentlyRented || false,
            loyerMensuel: unit.estimatedRent || 0,
            chargesMensuelles: 0
          } as ElementBien
        })
        setElementsBien(createdUnits)
        console.log(`✅ ${createdUnits.length} logements importés depuis l'analyse`)
      } else if (data.propertyType || data.surface || data.rooms || data.analysis) {
        // Cas d'un bien unique
        const propertyType = data.analysis?.propertyType || data.propertyType
        const estimatedRent = data.analysis?.estimatedRent || 0

        const newElement: ElementBien = {
          id: Date.now().toString(),
          type: mapLeboncoinPropertyType(propertyType) || 'Appartement',
          superficie: data.surface || 0,
          nombrePieces: data.rooms || 0,
          etat: 'Bon',
          enLocation: false,
          loyerMensuel: estimatedRent,
          chargesMensuelles: 0
        }
        setElementsBien([newElement])
      }

      // Importer les travaux détaillés depuis l'estimation basée sur la grille tarifaire
      if (data.detailedWorkEstimates && data.detailedWorkEstimates.estimates && data.detailedWorkEstimates.estimates.length > 0) {
        // Utiliser les estimations détaillées basées sur la grille tarifaire
        const importedWorks: any[] = []

        data.detailedWorkEstimates.estimates.forEach((estimate: any) => {
          // Créer un travail pour chaque catégorie avec le détail des items
          const itemsDescription = estimate.items.map((item: any) =>
            `• ${item.name}: ${item.quantity} ${item.unit} × ${item.unitPrice}€ = ${item.totalCost.toLocaleString('fr-FR')}€`
          ).join('\n')

          importedWorks.push({
            id: `${Date.now()}_${estimate.category}`,
            type: estimate.categoryName,
            description: `${itemsDescription}\n\nPriorité: ${estimate.priority}`,
            montant: estimate.subtotal
          })
        })

        setTravaux(importedWorks)
        console.log(`✅ ${importedWorks.length} devis de travaux détaillés importés (grille tarifaire)`)
        console.log(`💰 Coût total: ${data.detailedWorkEstimates.totalCost.toLocaleString('fr-FR')}€`)
      } else if (data.analysis?.workEstimates && data.analysis.workEstimates.length > 0) {
        // Fallback: Utiliser les devis LLM si pas d'estimation détaillée
        const importedWorks = data.analysis.workEstimates.map((work: any, index: number) => ({
          id: (Date.now() + index).toString(),
          type: work.category,
          description: `${work.description}${work.details ? '\n' + work.details : ''}\nPriorité: ${work.priority}`,
          montant: work.estimatedCost
        }))
        setTravaux(importedWorks)
        console.log(`✅ ${importedWorks.length} devis de travaux importés (LLM)`)
      } else if (data.analysis?.workNeeded && data.analysis.workNeeded.length > 0) {
        // Fallback: liste simple des travaux
        const importedWorks = data.analysis.workNeeded.map((work: string, index: number) => ({
          id: (Date.now() + index).toString(),
          type: work,
          description: '',
          montant: index === 0 && data.analysis?.estimatedWorkCost
            ? data.analysis.estimatedWorkCost
            : Math.round(data.analysis?.estimatedWorkCost || 0) / data.analysis.workNeeded.length
        }))
        setTravaux(importedWorks)
      }

      // DPE / GES / Taxe foncière depuis les attributs Leboncoin
      if (data.energyRate) {
        const dpeValue = String(data.energyRate).toUpperCase().trim()
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(dpeValue)) {
          setDpe(dpeValue)
        }
      }
      if (data.ges) {
        const gesValue = String(data.ges).toUpperCase().trim()
        if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(gesValue)) {
          setGes(gesValue)
        }
      }
      if (data.taxeFonciere) {
        const taxeValue = Number(data.taxeFonciere)
        if (taxeValue > 0) setTaxeFonciere(taxeValue)
      }

      setIsLeboncoinExpanded(false)
      setLeboncoinUrl('')

      // Message de succès avec détails de l'analyse
      let successMessage = '✅ Les informations ont été importées avec succès !'
      if (data.analysis) {
        // Détails sur les logements importés
        if (data.analysis.isMultiUnit && data.analysis.units) {
          successMessage += `\n\n🏢 ${data.analysis.units.length} logement(s) importé(s)`
        }

        // Loyer total
        if (data.analysis.estimatedRent) {
          successMessage += `\n💰 Loyer total : ${data.analysis.estimatedRent.toLocaleString('fr-FR')}€/mois`
        }

        // Potentiel d'investissement
        if (data.analysis.investmentPotential) {
          successMessage += `\n📊 Potentiel : ${data.analysis.investmentPotential}`
        }

        // Travaux
        if (data.detailedWorkEstimates && data.detailedWorkEstimates.estimates) {
          successMessage += `\n🔨 ${data.detailedWorkEstimates.estimates.length} catégories de travaux estimées`
          successMessage += `\n💵 Coût total : ${data.detailedWorkEstimates.totalCost.toLocaleString('fr-FR')}€ (grille tarifaire)`
        } else if (data.analysis.workEstimates && data.analysis.workEstimates.length > 0) {
          const totalWorkCost = data.analysis.workEstimates.reduce((sum: number, work: any) => sum + work.estimatedCost, 0)
          successMessage += `\n🔨 ${data.analysis.workEstimates.length} devis de travaux importés`
          successMessage += `\n💵 Coût total : ${totalWorkCost.toLocaleString('fr-FR')}€`
        } else if (data.analysis.workNeeded && data.analysis.workNeeded.length > 0) {
          successMessage += `\n🔨 ${data.analysis.workNeeded.length} travaux identifiés`
          if (data.analysis.estimatedWorkCost) {
            successMessage += ` - ${data.analysis.estimatedWorkCost.toLocaleString('fr-FR')}€`
          }
        }
      }
      alert(successMessage)
    } catch (error: any) {
      console.error('Erreur complète:', error)
      console.error('Détails:', error.response?.data)

      let errorMessage = 'Une erreur est survenue lors de l\'import des données Leboncoin'

      if (error.response?.data?.message) {
        errorMessage += `\n\nDétails: ${error.response.data.message}`
      } else if (error.message) {
        errorMessage += `\n\nDétails: ${error.message}`
      }

      alert(errorMessage)
    } finally {
      setIsLoadingLeboncoin(false)
    }
  }

  // Mapper les types de biens Leboncoin vers nos types
  const mapLeboncoinPropertyType = (type: string): ElementBien['type'] | null => {
    if (!type) return null
    const typeLower = type.toLowerCase()
    const mapping: Record<string, ElementBien['type']> = {
      'appartement': 'Appartement',
      'apartment': 'Appartement',
      'flat': 'Appartement',
      'maison': 'Maison',
      'house': 'Maison',
      'villa': 'Maison',
      'studio': 'Studio',
      'parking': 'Parking',
      'garage': 'Parking',
      'box': 'Parking',
      'cave': 'Cave',
      'local commercial': 'Local_Commercial',
      'local': 'Local_Commercial',
      'commerce': 'Local_Commercial',
      'immeuble': 'Appartement', // Par défaut pour immeubles
      'terrain': 'Maison', // Approximation
      'loft': 'Appartement',
      'duplex': 'Appartement',
      'triplex': 'Appartement'
    }
    // Recherche exacte d'abord
    if (mapping[typeLower]) return mapping[typeLower]
    // Recherche partielle
    for (const [key, value] of Object.entries(mapping)) {
      if (typeLower.includes(key) || key.includes(typeLower)) {
        return value
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 handleSubmit appelé - Début de l\'enregistrement du projet')
    console.log('📝 Nom du projet:', nom)
    console.log('📝 Porteurs:', porteurs)

    // Filtrer les porteurs valides (ceux qui ont une structure sélectionnée)
    // On vérifie simplement que structureId n'est pas vide et que la structure existe
    const porteursValides = porteurs.filter(p => {
      if (!p.structureId) {
        console.log('❌ Porteur ignoré: structureId vide')
        return false
      }

      const structureExists = structures.find(s => s.id === p.structureId)
      if (!structureExists) {
        console.log('❌ Porteur ignoré: structure non trouvée pour ID:', p.structureId)
        return false
      }

      console.log('✅ Porteur valide:', p.structureId, '- Pourcentage:', p.pourcentageProjet)
      return true
    })
    console.log('✅ Porteurs valides au total:', porteursValides.length)

    // Créer un élément de bien synthétique pour la compatibilité avec l'ancien format
    const bienPrincipal = elementsBien.length > 0 ? elementsBien[0] : null

    const data: CreateProjetForm = {
      nom: nom || 'Nouveau projet',
      description,
      porteurs: porteursValides,
      bien: {
        adresse: adresse || '',
        codePostal: codePostal || '',
        ville: ville || '',
        type: (typeBien || bienPrincipal?.type || 'Appartement') as BienImmobilier['type'],
        superficie: elementsBien.reduce((sum, e) => sum + e.superficie, 0),
        nombrePieces: elementsBien.reduce((sum, e) => sum + (e.nombrePieces || 0), 0),
        etatActuel: bienPrincipal?.etat || 'Bon',
        destinationBien: elementsBien.some(e => e.enLocation) ? 'Location' : 'Residence_Principale',
        loyerMensuelEstime: elementsBien.reduce((sum, e) => sum + (e.loyerMensuel || 0), 0),
        chargesMensuelles: 0,
        dpe: dpe || undefined,
        ges: ges || undefined,
        taxeFonciere: taxeFonciere || 0,
      },
      elementsBien: elementsBien.length > 0 ? elementsBien.map(({ id, ...rest }) => rest) : undefined,
      travaux: travaux.length > 0 ? travaux.map(({ id, ...rest }) => rest) : undefined,
      photos: photos.length > 0 ? photos.map(p => ({
        url: p.url,
        filename: p.filename,
        description: p.description,
        type: p.type,
        position: p.position,
      })) : undefined,
      photoCouverture: photoCouverture || undefined,
      comparables: comparables.filter(c => !c.loading && !c.error).map(({ loading, error, ...rest }) => rest),
      financement: {
        prixAchat: financement.prixAchat,
        fraisNotaire: financement.fraisNotaire,
        fraisAgence: financement.fraisAgence,
        montantTravaux: financement.montantTravaux,
        apportPersonnel: financement.apportPersonnel,
        dureeCredit: financement.dureeCredit,
        tauxInteretEstime: financement.tauxInteretEstime,
        typePret: financement.typePret,
      }
    }

    console.log('📦 Données du projet à enregistrer:', data)
    console.log('🔄 Appel de onSubmit...')
    try {
      await onSubmit(data)
      console.log('✅ onSubmit appelé avec succès')
    } catch (err) {
      console.error('❌ Erreur onSubmit:', err)
    }
  }

  const tabs = [
    { id: 'general' as const, label: 'Informations', icon: FileText },
    { id: 'porteurs' as const, label: 'Porteurs', icon: Users },
    { id: 'composition' as const, label: 'Composition', icon: Home },
    { id: 'travaux' as const, label: 'Travaux', icon: Hammer },
    { id: 'financement' as const, label: 'Financement', icon: Euro },
    { id: 'recapitulatif' as const, label: 'Récapitulatif', icon: TrendingUp },
    { id: 'documents' as const, label: 'Documents', icon: CheckCircle }
  ]

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{initialProjet ? 'Modifier le projet' : 'Créer un nouveau projet'}</h2>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-2 flex-wrap gap-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-3 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white rounded-xl'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Onglet 1: Informations générales */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Import Leboncoin collapsible */}
            <div className="border border-honey-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {/* Header collapsible */}
              <button
                type="button"
                onClick={() => setIsLeboncoinExpanded(!isLeboncoinExpanded)}
                className="w-full px-4 py-3 bg-gradient-to-r from-coral-50 via-honey-50 to-honey-100 hover:from-coral-100 hover:via-honey-100 hover:to-honey-150 flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-1.5 bg-white/80 rounded-lg shadow-sm">
                    <LinkIcon className="h-4 w-4 text-coral-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Importer depuis Leboncoin</p>
                    <p className="text-xs text-gray-600">Gagnez du temps en important automatiquement les informations d'une annonce</p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                    isLeboncoinExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Contenu extensible */}
              {isLeboncoinExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <p className="text-sm text-gray-900 font-medium">
                        Comment ça marche ?
                      </p>
                      <ol className="list-decimal list-inside text-xs text-gray-700 mt-2 space-y-1">
                        <li>Copiez l'URL d'une annonce immobilière Leboncoin</li>
                        <li>Collez-la dans le champ ci-dessous</li>
                        <li>Cliquez sur "Analyser" pour importer automatiquement les informations</li>
                      </ol>
                    </div>

                    <Input
                      label="URL de l'annonce Leboncoin"
                      value={leboncoinUrl}
                      onChange={(e) => setLeboncoinUrl(e.target.value)}
                      placeholder="https://www.leboncoin.fr/ventes_immobilieres/..."
                      helperText="L'URL doit commencer par https://www.leboncoin.fr/"
                    />

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleLeboncoinImport}
                        disabled={isLoadingLeboncoin || !leboncoinUrl.trim()}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {isLoadingLeboncoin ? 'Analyse en cours...' : 'Analyser le projet'}
                      </button>
                    </div>

                    {isLoadingLeboncoin && (
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full mb-2"></div>
                        <p className="text-xs text-gray-600">Récupération des informations en cours...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Nom du projet"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Immeuble rue de la Paix"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-gray-900/10 focus:border-gray-400"
                placeholder="Décrivez brièvement votre projet..."
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-4">Adresse du bien</h3>

              <AddressAutocomplete
                label="Adresse"
                value={adresse}
                onChange={(val) => setAdresse(val)}
                onSelect={(result) => {
                  if (result.postcode) setCodePostal(result.postcode)
                  if (result.city) setVille(result.city)
                }}
                placeholder="Rechercher une adresse..."
              />

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DPE</label>
                  <select
                    value={dpe}
                    onChange={(e) => setDpe(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">-</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GES</label>
                  <select
                    value={ges}
                    onChange={(e) => setGes(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">-</option>
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Taxe fonciere (EUR/an)"
                  type="number"
                  min="0"
                  value={taxeFonciere || ''}
                  onChange={(e) => setTaxeFonciere(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-4">Photos du bien</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez des photos et glissez-les pour choisir l'ordre dans le dossier bancaire. Cliquez sur l'étoile pour définir la photo de couverture.
              </p>
              <SortablePhotoGrid
                photos={photos}
                onChange={setPhotos}
                coverPhotoUrl={photoCouverture}
                onCoverPhotoChange={setPhotoCouverture}
              />
            </div>
          </div>
        )}

        {/* Onglet 2: Porteurs du projet */}
        {activeTab === 'porteurs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold">Porteurs du projet</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Total: <span className={totalPourcentage === 100 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{totalPourcentage}%</span>
                </p>
              </div>
              <button
                type="button"
                onClick={addPorteur}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un porteur
              </button>
            </div>

            {porteurs.map((porteur, index) => (
              <Card key={index} className="p-4 bg-gray-50">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Structure
                    </label>
                    <select
                      value={porteur.structureId}
                      onChange={(e) => updatePorteur(index, 'structureId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    >
                      <option value="">Sélectionnez une structure</option>
                      {structures.map(structure => (
                        <option key={structure.id} value={structure.id}>
                          {structure.nom} ({structure.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <Input
                      label="Pourcentage"
                      type="number"
                      min="0"
                      max="100"
                      value={porteur.pourcentageProjet}
                      onChange={(e) => updatePorteur(index, 'pourcentageProjet', Number(e.target.value))}
                    />
                  </div>

                  {porteurs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePorteur(index)}
                      className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Supprimer ce porteur"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Onglet 3: Composition du bien */}
        {activeTab === 'composition' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Composition du bien immobilier</h3>
              <button
                type="button"
                onClick={addElementBien}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un élément
              </button>
            </div>

            {elementsBien.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun élément ajouté</p>
                <button
                  type="button"
                  onClick={addElementBien}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter le premier élément
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {elementsBien.map((element) => (
                  <Card key={element.id} className="p-4 bg-gray-50">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-lg text-gray-900">Lot #{elementsBien.indexOf(element) + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeElementBien(element.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Supprimer cet élément"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={element.type}
                            onChange={(e) => updateElementBien(element.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                          >
                            <option value="Appartement">Appartement</option>
                            <option value="Local_Commercial">Local Commercial</option>
                            <option value="Maison">Maison</option>
                            <option value="Studio">Studio</option>
                            <option value="Parking">Parking</option>
                            <option value="Cave">Cave</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            État
                          </label>
                          <select
                            value={element.etat}
                            onChange={(e) => updateElementBien(element.id, 'etat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                          >
                            <option value="Neuf">Neuf</option>
                            <option value="Bon">Bon état</option>
                            <option value="Moyen">État moyen</option>
                            <option value="A_Renover">À rénover</option>
                          </select>
                        </div>

                        <Input
                          label="Superficie (m²)"
                          type="number"
                          min="0"
                          value={element.superficie}
                          onChange={(e) => updateElementBien(element.id, 'superficie', Number(e.target.value))}
                        />

                        {!['Parking', 'Cave'].includes(element.type) && (
                          <Input
                            label="Nombre de pièces"
                            type="number"
                            min="0"
                            value={element.nombrePieces || 0}
                            onChange={(e) => updateElementBien(element.id, 'nombrePieces', Number(e.target.value))}
                          />
                        )}

                        <Input
                          label="Loyer mensuel (€)"
                          type="number"
                          min="0"
                          value={element.loyerMensuel || 0}
                          onChange={(e) => updateElementBien(element.id, 'loyerMensuel', Number(e.target.value))}
                          helperText="Loyer actuel ou estimé"
                        />

                        <Input
                          label="Charges mensuelles (€)"
                          type="number"
                          min="0"
                          value={element.chargesMensuelles || 0}
                          onChange={(e) => updateElementBien(element.id, 'chargesMensuelles', Number(e.target.value))}
                          helperText="Charges actuelles ou estimées"
                        />

                        <div className="col-span-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={element.enLocation}
                              onChange={(e) => updateElementBien(element.id, 'enLocation', e.target.checked)}
                              className="rounded border-gray-200"
                            />
                            <span className="text-sm font-medium text-gray-700">Actuellement en location</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {elementsBien.length > 0 && (
              <Card className="p-4 bg-gray-50">
                <h4 className="font-medium mb-2">Récapitulatif</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Nombre d'éléments: {elementsBien.length}</p>
                  <p>Superficie totale: {elementsBien.reduce((sum, e) => sum + e.superficie, 0)} m²</p>
                  <p>Loyers mensuels totaux: {elementsBien.reduce((sum, e) => sum + (e.loyerMensuel || 0), 0).toLocaleString('fr-FR')} €</p>
                  <p>Charges mensuelles totales: {elementsBien.reduce((sum, e) => sum + (e.chargesMensuelles || 0), 0).toLocaleString('fr-FR')} €</p>
                </div>
              </Card>
            )}

            {/* Comparables de marche */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-xl font-semibold mb-2">Comparables de marche</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez des annonces Leboncoin similaires pour justifier les loyers estimes dans le dossier bancaire
              </p>

              <div className="flex gap-2 mb-4">
                <Input
                  value={comparableUrl}
                  onChange={(e) => setComparableUrl(e.target.value)}
                  placeholder="URL Leboncoin (ex: https://www.leboncoin.fr/...)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  disabled={!comparableUrl || comparableLoading}
                  onClick={async () => {
                    if (!comparableUrl) return
                    setComparableLoading(true)
                    try {
                      const response = await api.post('/leboncoin/scrape', { url: comparableUrl })
                      const data = response.data?.data
                      if (data) {
                        setComparables(prev => [...prev, {
                          url: comparableUrl,
                          titre: data.title || '',
                          prix: Number(data.price) || 0,
                          surface: Number(data.surface || data.attributes?.surface) || 0,
                          pieces: Number(data.rooms || data.attributes?.rooms) || 0,
                          loyer: undefined,
                          ville: data.location?.city || '',
                          codePostal: data.location?.postalCode || data.location?.zipcode || '',
                          images: data.images || [],
                        }])
                        setComparableUrl('')
                      }
                    } catch (err: any) {
                      console.error('Erreur scrape comparable:', err)
                      alert('Impossible de recuperer les donnees de cette annonce')
                    }
                    setComparableLoading(false)
                  }}
                >
                  {comparableLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ajouter
                </Button>
              </div>

              {comparables.length > 0 && (
                <div className="space-y-3">
                  {comparables.map((comp, i) => (
                    <Card key={i} className="p-3 flex gap-3 items-start">
                      {comp.images && comp.images.length > 0 && (
                        <img
                          src={comp.images[0]}
                          alt={comp.titre || 'Comparable'}
                          className="w-24 h-16 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{comp.titre || comp.url}</p>
                        <div className="text-xs text-gray-500 space-x-3 mt-1">
                          {comp.prix ? <span>{comp.prix.toLocaleString('fr-FR')} €</span> : null}
                          {comp.surface ? <span>{comp.surface} m²</span> : null}
                          {comp.pieces ? <span>{comp.pieces} pieces</span> : null}
                          {comp.ville ? <span>{comp.ville}</span> : null}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setComparables(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet 4: Travaux */}
        {activeTab === 'travaux' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold">Travaux prévus</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Montant total: <span className="font-semibold text-gray-900">{travaux.reduce((sum, t) => sum + t.montant, 0).toLocaleString('fr-FR')} €</span>
                </p>
              </div>
              <button
                type="button"
                onClick={addTravaux}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter des travaux
              </button>
            </div>

            {travaux.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Hammer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun travaux prévu</p>
                <button
                  type="button"
                  onClick={addTravaux}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter les premiers travaux
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {travaux.map((item) => (
                  <Card key={item.id} className="p-4 bg-gray-50">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-4">
                        <Input
                          label="Type de travaux"
                          value={item.type}
                          onChange={(e) => updateTravaux(item.id, 'type', e.target.value)}
                          placeholder="Ex: Rénovation cuisine, Peinture, Plomberie..."
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={item.description}
                            onChange={(e) => updateTravaux(item.id, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                            placeholder="Détails des travaux..."
                          />
                        </div>

                        <Input
                          label="Montant estimé (€)"
                          type="number"
                          min="0"
                          value={item.montant}
                          onChange={(e) => updateTravaux(item.id, 'montant', Number(e.target.value))}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTravaux(item.id)}
                        className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Supprimer ces travaux"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet 5: Financement (multi-scénarios) */}
        {activeTab === 'financement' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Plan de financement</h3>

            {/* Scenario tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveScenarioId(s.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                    activeScenarioId === s.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.nom}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newScenario = createScenario(scenarios.length + 1)
                  // Copier les valeurs du scénario actif comme base
                  newScenario.prixAchat = activeScenario.prixAchat
                  newScenario.fraisNotaire = activeScenario.fraisNotaire
                  newScenario.fraisAgence = activeScenario.fraisAgence
                  newScenario.montantTravaux = activeScenario.montantTravaux
                  setScenarios(prev => [...prev, newScenario])
                  setActiveScenarioId(newScenario.id)
                }}
                className="px-3 py-2 text-sm font-medium rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300 whitespace-nowrap transition-colors"
              >
                <Plus className="h-4 w-4 inline -mt-0.5 mr-1" />
                Hypothèse
              </button>
            </div>

            {/* Delete scenario button */}
            {scenarios.length > 1 && (
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={activeScenario.nom}
                  onChange={(e) => updateActiveScenario({ nom: e.target.value })}
                  className="text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-gray-900 focus:outline-none px-1 py-0.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    const remaining = scenarios.filter(s => s.id !== activeScenarioId)
                    setScenarios(remaining)
                    setActiveScenarioId(remaining[0].id)
                  }}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prix d'achat (€)"
                type="number"
                min="0"
                value={activeScenario.prixAchat || ''}
                onChange={(e) => {
                  const prix = Number(e.target.value)
                  updateActiveScenario({
                    prixAchat: prix,
                    fraisNotaire: Math.round(prix * 0.1)
                  })
                }}
              />

              <Input
                label="Frais de notaire ~10% (€)"
                type="number"
                min="0"
                value={activeScenario.fraisNotaire || ''}
                onChange={(e) => updateActiveScenario({ fraisNotaire: Number(e.target.value) })}
              />

              <Input
                label="Frais d'agence (€)"
                type="number"
                min="0"
                value={activeScenario.fraisAgence || ''}
                onChange={(e) => updateActiveScenario({ fraisAgence: Number(e.target.value) || 0 })}
                placeholder="0"
              />

              <Input
                label="Montant travaux (€)"
                type="number"
                min="0"
                value={activeScenario.montantTravaux}
                onChange={(e) => updateActiveScenario({ montantTravaux: Number(e.target.value) })}
                disabled={travaux.length > 0}
                helperText={travaux.length > 0 ? "Calculé automatiquement depuis l'onglet Travaux" : ""}
              />

              <Input
                label="Apport personnel (€)"
                type="number"
                min="0"
                value={activeScenario.apportPersonnel}
                onChange={(e) => updateActiveScenario({ apportPersonnel: Number(e.target.value) })}
              />

              <Input
                label="Durée du crédit (années)"
                type="number"
                min="1"
                max="30"
                value={activeScenario.dureeCredit}
                onChange={(e) => updateActiveScenario({ dureeCredit: Number(e.target.value) })}
              />

              <Input
                label="Taux d'intérêt estimé (%)"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={activeScenario.tauxInteretEstime}
                onChange={(e) => updateActiveScenario({ tauxInteretEstime: Number(e.target.value) })}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de prêt</label>
                <select
                  value={activeScenario.typePret}
                  onChange={(e) => updateActiveScenario({ typePret: e.target.value as Scenario['typePret'] })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="Amortissable">Amortissable</option>
                  <option value="In_Fine">In Fine</option>
                  <option value="Palier">Palier</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Récap inline du scénario actif */}
            {(() => {
              const s = activeScenario
              const coutTotal = s.prixAchat + s.fraisNotaire + (s.fraisAgence || 0) + s.montantTravaux
              const montantEmprunt = Math.max(0, coutTotal - s.apportPersonnel)
              return (
                <Card className="p-4 bg-gray-50 mt-6">
                  <h4 className="font-medium mb-3">Récapitulatif financier</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Coût total du projet:</span>
                      <span className="font-medium">{coutTotal.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Apport personnel:</span>
                      <span className="font-medium">{s.apportPersonnel.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Montant à emprunter:</span>
                      <span className="font-semibold text-gray-900">{montantEmprunt.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>
                </Card>
              )
            })()}
          </div>
        )}

        {/* Onglet 6: Récapitulatif */}
        {activeTab === 'recapitulatif' && (
          <div className="space-y-6">
            {(() => {
              const loyersMensuelsTotal = elementsBien.reduce((sum, el) => sum + (el.loyerMensuel || 0), 0)
              const loyersAnnuelsTotal = loyersMensuelsTotal * 12
              const loyerNetBancaire = loyersAnnuelsTotal * 0.7
              const loyerNetMensuelBancaire = loyerNetBancaire / 12
              const totalTravaux = travaux.reduce((sum, t) => sum + (t.montant || 0), 0)
              const coutTotal = financement.prixAchat + financement.fraisNotaire + (financement.fraisAgence || 0) + financement.montantTravaux
              const montantCredit = Math.max(0, coutTotal - financement.apportPersonnel)
              const tauxMensuel = (financement.tauxInteretEstime / 100) / 12
              const nombreMois = financement.dureeCredit * 12
              const mensualiteCredit = montantCredit > 0 && tauxMensuel > 0
                ? montantCredit * (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMois)) / (Math.pow(1 + tauxMensuel, nombreMois) - 1)
                : 0
              const cashflowMensuel = loyerNetMensuelBancaire - mensualiteCredit
              const rentabiliteBrute = coutTotal > 0 ? (loyersAnnuelsTotal / coutTotal) * 100 : 0

              return (
                <>
                  {/* Le bien */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Le bien</h4>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-lg font-bold text-gray-900">{adresse || 'Adresse non renseignée'}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {typeBien || 'Type non défini'}
                          {elementsBien.length > 0 && ` — ${elementsBien.reduce((s, e) => s + e.superficie, 0)} m²`}
                          {dpe && ` — DPE ${dpe}`}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{financement.prixAchat.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>

                  {/* Les lots */}
                  {elementsBien.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Composition ({elementsBien.length} lot{elementsBien.length > 1 ? 's' : ''})
                      </h4>
                      <div className="space-y-2">
                        {elementsBien.map((el, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 font-medium">{el.type}</span>
                              <span className="text-gray-400">{el.superficie} m²{el.nombrePieces ? ` — ${el.nombrePieces} p.` : ''}</span>
                              {el.enLocation && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">Loué</span>}
                            </div>
                            {el.loyerMensuel ? (
                              <span className="font-semibold text-green-600">{el.loyerMensuel.toLocaleString('fr-FR')} €/mois</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </div>
                        ))}
                        {loyersMensuelsTotal > 0 && (
                          <div className="flex justify-between pt-2 text-sm font-bold text-gray-900">
                            <span>Total loyers</span>
                            <span>{loyersMensuelsTotal.toLocaleString('fr-FR')} €/mois</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Travaux */}
                  {travaux.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Travaux</h4>
                      <div className="space-y-2">
                        {travaux.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                            <span className="text-gray-900 font-medium">{t.type || t.description || `Poste ${idx + 1}`}</span>
                            <span className="font-semibold text-gray-900">{(t.montant || 0).toLocaleString('fr-FR')} €</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 text-sm font-bold text-gray-900">
                          <span>Total travaux</span>
                          <span>{totalTravaux.toLocaleString('fr-FR')} €</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financement */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Financement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Prix d'achat</span><span className="font-medium">{financement.prixAchat.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Frais de notaire</span><span className="font-medium">{financement.fraisNotaire.toLocaleString('fr-FR')} €</span></div>
                      {financement.montantTravaux > 0 && <div className="flex justify-between"><span className="text-gray-600">Travaux</span><span className="font-medium">{financement.montantTravaux.toLocaleString('fr-FR')} €</span></div>}
                      <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900"><span>Coût total</span><span>{coutTotal.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Apport</span><span className="font-medium text-green-600">- {financement.apportPersonnel.toLocaleString('fr-FR')} €</span></div>
                      <div className="flex justify-between font-bold text-gray-900"><span>Emprunt</span><span>{montantCredit.toLocaleString('fr-FR')} €</span></div>
                      {montantCredit > 0 && (
                        <div className="flex justify-between text-gray-600"><span>{financement.dureeCredit} ans à {financement.tauxInteretEstime}%</span><span className="font-semibold text-gray-900">{Math.round(mensualiteCredit).toLocaleString('fr-FR')} €/mois</span></div>
                      )}
                    </div>
                  </div>

                  {/* Conclusion */}
                  <div className={`rounded-xl border p-5 ${cashflowMensuel >= 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Conclusion</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Rentabilité brute</p>
                        <p className={`text-xl font-bold ${rentabiliteBrute >= 5 ? 'text-green-600' : rentabiliteBrute >= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                          {rentabiliteBrute.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cash-flow (70%)</p>
                        <p className={`text-xl font-bold ${cashflowMensuel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cashflowMensuel >= 0 ? '+' : ''}{Math.round(cashflowMensuel).toLocaleString('fr-FR')} €
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Mensualité</p>
                        <p className="text-xl font-bold text-gray-900">{Math.round(mensualiteCredit).toLocaleString('fr-FR')} €</p>
                      </div>
                    </div>
                    {cashflowMensuel >= 0 ? (
                      <p className="text-sm text-green-800 mt-4">
                        Le projet s'autofinance avec un excédent de {Math.round(cashflowMensuel).toLocaleString('fr-FR')} €/mois après application de la règle bancaire des 70%.
                      </p>
                    ) : (
                      <p className="text-sm text-orange-800 mt-4">
                        Le projet nécessite un effort d'épargne de {Math.abs(Math.round(cashflowMensuel)).toLocaleString('fr-FR')} €/mois après application de la règle bancaire des 70%.
                      </p>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Onglet 7: Documents nécessaires */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Checklist des documents</h3>
              {initialProjet?.id && (
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  disabled={checklistLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  {checklistLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {checklistGenerated ? 'Régénérer' : 'Générer la checklist'}
                </button>
              )}
            </div>

            {/* Pas de projet sauvegardé */}
            {!initialProjet?.id && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Sauvegardez d'abord le projet pour générer la checklist des documents</p>
              </div>
            )}

            {/* Loading */}
            {checklistLoading && checklistDocs.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-gray-900 animate-spin" />
              </div>
            )}

            {/* Checklist avec barre de progression */}
            {checklistDocs.length > 0 && (() => {
              const total = checklistDocs.length
              const fournis = checklistDocs.filter(d => d.statut === 'Fourni' || d.statut === 'Valide').length
              const progression = total > 0 ? Math.round((fournis / total) * 100) : 0

              // Grouper par catégorie
              const categories = checklistDocs.reduce((acc, doc) => {
                const cat = doc.categorie || 'Autre'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(doc)
                return acc
              }, {} as Record<string, ChecklistDocument[]>)

              const categorieLabels: Record<string, string> = {
                'Identite': 'Identité',
                'Revenus': 'Revenus',
                'Patrimoine': 'Patrimoine',
                'Fiscalite': 'Fiscalité',
                'Societe': 'Société',
                'Bien_Immobilier': 'Bien Immobilier',
                'Travaux': 'Travaux',
                'Autre': 'Autre'
              }

              const statutColors: Record<string, string> = {
                'Non_Fourni': 'bg-red-100 text-red-700 border-red-300',
                'En_Attente': 'bg-orange-100 text-orange-700 border-orange-300',
                'Fourni': 'bg-green-100 text-green-700 border-green-300',
                'Valide': 'bg-gray-100 text-gray-700 border-gray-200'
              }

              const statutLabels: Record<string, string> = {
                'Non_Fourni': 'Non fourni',
                'En_Attente': 'En attente',
                'Fourni': 'Fourni',
                'Valide': 'Validé'
              }

              const nextStatut: Record<string, string> = {
                'Non_Fourni': 'En_Attente',
                'En_Attente': 'Fourni',
                'Fourni': 'Valide',
                'Valide': 'Non_Fourni'
              }

              return (
                <>
                  {/* Barre de progression */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progression</span>
                      <span className="text-sm font-bold text-gray-900">{fournis}/{total} documents ({progression}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${progression === 100 ? 'bg-green-500' : 'bg-gray-900'}`}
                        style={{ width: `${progression}%` }}
                      />
                    </div>
                  </Card>

                  {/* Documents par catégorie */}
                  {Object.entries(categories).map(([categorie, docs]) => (
                    <Card key={categorie} className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-700" />
                        {categorieLabels[categorie] || categorie}
                        <span className="text-xs text-gray-400 font-normal">({docs.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {docs.map(doc => {
                          const structure = doc.concerneStructureId
                            ? structures.find(s => s.id === doc.concerneStructureId)
                            : null
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{doc.nomDocument}</p>
                                {structure && (
                                  <p className="text-xs text-gray-500 truncate">{structure.nom}</p>
                                )}
                                {doc.description && (
                                  <p className="text-xs text-gray-400 truncate">{doc.description}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateDocumentStatus(doc.id, nextStatut[doc.statut] || 'Non_Fourni')}
                                className={`ml-3 px-3 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors ${statutColors[doc.statut] || 'bg-gray-100 text-gray-600 border-gray-200'}`}
                              >
                                {statutLabels[doc.statut] || doc.statut}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  ))}
                </>
              )
            })()}

            {/* Checklist non générée et projet sauvegardé */}
            {initialProjet?.id && !checklistLoading && checklistDocs.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucune checklist générée pour ce projet</p>
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm transition-colors"
                >
                  Générer la checklist des documents
                </button>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-2">
              <p className="text-sm text-yellow-800">
                <strong>Note :</strong> Cliquez sur le statut d'un document pour le faire évoluer : Non fourni → En attente → Fourni → Validé.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Enregistrer
        </button>
        {onGeneratePDF && initialProjet && (
          <button
            type="button"
            className="px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2"
            onClick={() => {
              console.log('🎯 Bouton "Générer le dossier" cliqué !');
              onGeneratePDF()
            }}
          >
            <FileText className="h-4 w-4" />
            Générer le dossier bancaire
          </button>
        )}
      </div>
    </form>
  )
}

export default ProjetFormV2
