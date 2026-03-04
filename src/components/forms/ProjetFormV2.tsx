import React, { useState, useEffect, useRef } from 'react'
import { CreateProjetForm, Structure, Projet, AnalysesRentabilite, ChecklistDocument } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Trash2, FileText, Home, Users, Hammer, Euro, CheckCircle, Camera, X, Link as LinkIcon, TrendingUp, ChevronDown, Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import api from '@/services/api'

interface ProjetFormV2Props {
  structures: Structure[]
  onSubmit: (data: CreateProjetForm) => void
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
  const [photos, setPhotos] = useState<string[]>(
    initialProjet?.bienImmobilier?.photos
      ? initialProjet.bienImmobilier.photos.map(p => p.url)
      : []
  )
  // Map: displayUrl -> base64 data URL (pour les nouveaux uploads via createObjectURL)
  const photosBase64Ref = useRef<Map<string, string>>(new Map())

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

  // Onglet 5: Financement
  const [financement, setFinancement] = useState({
    prixAchat: Number(initialProjet?.financement?.prixAchat) || 0,
    fraisNotaire: Number(initialProjet?.financement?.fraisNotaire) || 0,
    montantTravaux: Number(initialProjet?.financement?.montantTravaux) || 0,
    apportPersonnel: Number(initialProjet?.financement?.apportPersonnel) || 0,
    dureeCredit: Number(initialProjet?.financement?.dureeCredit) || 20,
    tauxInteretEstime: Number(initialProjet?.financement?.tauxInteretEstime) || 3.5
  })

  // Import Leboncoin
  const [isLeboncoinExpanded, setIsLeboncoinExpanded] = useState(false)
  const [leboncoinUrl, setLeboncoinUrl] = useState('')
  const [isLoadingLeboncoin, setIsLoadingLeboncoin] = useState(false)

  // Onglet 6: Analyse serveur
  const [analysisData, setAnalysisData] = useState<AnalysesRentabilite | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  // Onglet 7: Checklist documents
  const [checklistDocs, setChecklistDocs] = useState<ChecklistDocument[]>([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [checklistGenerated, setChecklistGenerated] = useState(false)

  // API: Calculer la rentabilité
  const handleCalculateRentabilite = async () => {
    if (!initialProjet?.id) return
    setAnalysisLoading(true)
    try {
      const response = await api.post(`/projets/actions?id=${initialProjet.id}&action=analyser`)
      setAnalysisData(response.data.data)
    } catch (err: any) {
      console.error('Erreur calcul rentabilité:', err)
      alert('Erreur lors du calcul de rentabilité. Sauvegardez d\'abord le projet.')
    } finally {
      setAnalysisLoading(false)
    }
  }

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
    if (activeTab === 'recapitulatif' && initialProjet?.id && !analysisData) {
      handleCalculateRentabilite()
    }
  }, [activeTab])

  useEffect(() => {
    const total = porteurs.reduce((sum, p) => sum + p.pourcentageProjet, 0)
    setTotalPourcentage(total)
  }, [porteurs])

  // Calculer automatiquement le montant total des travaux
  useEffect(() => {
    const montantTotal = travaux.reduce((sum, t) => sum + t.montant, 0)
    setFinancement(prev => ({ ...prev, montantTravaux: montantTotal }))
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

  // Photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`Le fichier "${file.name}" n'est pas une image.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`Le fichier "${file.name}" depasse 5 MB.`)
        return
      }

      // Affichage immediat avec createObjectURL (fiable, pas de base64)
      const objectUrl = URL.createObjectURL(file)
      setPhotos(prev => [...prev, objectUrl])

      // Conversion base64 en arriere-plan pour la sauvegarde en BDD
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        if (base64) {
          photosBase64Ref.current.set(objectUrl, base64)
        }
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    const url = photos[index]
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      photosBase64Ref.current.delete(url)
    }
    setPhotos(photos.filter((_, i) => i !== index))
  }

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
        setFinancement(prev => ({
          ...prev,
          prixAchat: data.price,
          fraisNotaire: estimatedNotaryFees
        }))
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

        // Convertir en base64 data URLs pour l'affichage temporaire
        setPhotos(data.images)

        console.log(`✅ ${photosImportees.length} photos importées depuis Leboncoin`)
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

  const handleSubmit = (e: React.FormEvent) => {
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
        type: bienPrincipal?.type || 'Appartement',
        superficie: elementsBien.reduce((sum, e) => sum + e.superficie, 0),
        nombrePieces: elementsBien.reduce((sum, e) => sum + (e.nombrePieces || 0), 0),
        etatActuel: bienPrincipal?.etat || 'Bon',
        destinationBien: elementsBien.some(e => e.enLocation) ? 'Location' : 'Residence_Principale',
        loyerMensuelEstime: elementsBien.reduce((sum, e) => sum + (e.loyerMensuel || 0), 0),
        chargesMensuelles: 0
      },
      elementsBien: elementsBien.length > 0 ? elementsBien.map(({ id, ...rest }) => rest) : undefined,
      travaux: travaux.length > 0 ? travaux.map(({ id, ...rest }) => rest) : undefined,
      photos: photos.length > 0 ? photos.map(p => photosBase64Ref.current.get(p) || p) : undefined,
      financement
    }

    console.log('📦 Données du projet à enregistrer:', data)
    console.log('🔄 Appel de onSubmit...')
    onSubmit(data)
    console.log('✅ onSubmit appelé avec succès')
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
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-4 flex-wrap">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
            <div className="border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Header collapsible */}
              <button
                type="button"
                onClick={() => setIsLeboncoinExpanded(!isLeboncoinExpanded)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 flex items-center justify-between transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                    <LinkIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm">Importer depuis Leboncoin</p>
                    <p className="text-xs text-gray-600">Gagnez du temps en important automatiquement les informations d'une annonce</p>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                    isLeboncoinExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Contenu extensible */}
              {isLeboncoinExpanded && (
                <div className="p-4 bg-white border-t border-blue-100">
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900 font-medium">
                        Comment ça marche ?
                      </p>
                      <ol className="list-decimal list-inside text-xs text-blue-800 mt-2 space-y-1">
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
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        <LinkIcon className="h-4 w-4" />
                        {isLoadingLeboncoin ? 'Analyse en cours...' : 'Analyser le projet'}
                      </button>
                    </div>

                    {isLoadingLeboncoin && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="animate-spin inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Décrivez brièvement votre projet..."
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-4">Adresse du bien</h3>

              <Input
                label="Adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Numéro et nom de rue"
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  label="Code postal"
                  value={codePostal}
                  onChange={(e) => setCodePostal(e.target.value)}
                />

                <Input
                  label="Ville"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xl font-semibold mb-4">Photos du bien</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez des photos qui pourront être jointes au dossier bancaire
              </p>

              <div className="space-y-4">
                {/* Upload button */}
                <div>
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Cliquez pour ajouter des photos
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG ou WEBP (max 5MB par photo)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Photos preview */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative group w-full h-32 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {photos.length} photo{photos.length > 1 ? 's' : ''} ajoutée{photos.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
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
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                      className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
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
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter un élément
              </button>
            </div>

            {elementsBien.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun élément ajouté</p>
                <button
                  type="button"
                  onClick={addElementBien}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg inline-flex items-center gap-2"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                              className="rounded border-gray-300"
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
              <Card className="p-4 bg-blue-50">
                <h4 className="font-medium mb-2">Récapitulatif</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Nombre d'éléments: {elementsBien.length}</p>
                  <p>Superficie totale: {elementsBien.reduce((sum, e) => sum + e.superficie, 0)} m²</p>
                  <p>Loyers mensuels totaux: {elementsBien.reduce((sum, e) => sum + (e.loyerMensuel || 0), 0).toLocaleString('fr-FR')} €</p>
                  <p>Charges mensuelles totales: {elementsBien.reduce((sum, e) => sum + (e.chargesMensuelles || 0), 0).toLocaleString('fr-FR')} €</p>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Onglet 4: Travaux */}
        {activeTab === 'travaux' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-semibold">Travaux prévus</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Montant total: <span className="font-semibold text-blue-600">{travaux.reduce((sum, t) => sum + t.montant, 0).toLocaleString('fr-FR')} €</span>
                </p>
              </div>
              <button
                type="button"
                onClick={addTravaux}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter des travaux
              </button>
            </div>

            {travaux.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Hammer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucun travaux prévu</p>
                <button
                  type="button"
                  onClick={addTravaux}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg inline-flex items-center gap-2"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                        className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
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

        {/* Onglet 5: Financement */}
        {activeTab === 'financement' && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Plan de financement</h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prix d'achat (€)"
                type="number"
                min="0"
                value={financement.prixAchat}
                onChange={(e) => setFinancement({ ...financement, prixAchat: Number(e.target.value) })}
              />

              <Input
                label="Frais de notaire (€)"
                type="number"
                min="0"
                value={financement.fraisNotaire}
                onChange={(e) => setFinancement({ ...financement, fraisNotaire: Number(e.target.value) })}
              />

              <Input
                label="Montant travaux (€)"
                type="number"
                min="0"
                value={financement.montantTravaux}
                onChange={(e) => setFinancement({ ...financement, montantTravaux: Number(e.target.value) })}
                disabled={travaux.length > 0}
                helperText={travaux.length > 0 ? "Calculé automatiquement depuis l'onglet Travaux" : ""}
              />

              <Input
                label="Apport personnel (€)"
                type="number"
                min="0"
                value={financement.apportPersonnel}
                onChange={(e) => setFinancement({ ...financement, apportPersonnel: Number(e.target.value) })}
              />

              <Input
                label="Durée du crédit (années)"
                type="number"
                min="1"
                max="30"
                value={financement.dureeCredit}
                onChange={(e) => setFinancement({ ...financement, dureeCredit: Number(e.target.value) })}
              />

              <Input
                label="Taux d'intérêt estimé (%)"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={financement.tauxInteretEstime}
                onChange={(e) => setFinancement({ ...financement, tauxInteretEstime: Number(e.target.value) })}
              />
            </div>

            <Card className="p-4 bg-blue-50 mt-6">
              <h4 className="font-medium mb-3">Récapitulatif financier</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Coût total du projet:</span>
                  <span className="font-medium">
                    {(financement.prixAchat + financement.fraisNotaire + financement.montantTravaux).toLocaleString('fr-FR')} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Apport personnel:</span>
                  <span className="font-medium">{financement.apportPersonnel.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Montant à emprunter:</span>
                  <span className="font-semibold text-blue-600">
                    {Math.max(0, financement.prixAchat + financement.fraisNotaire + financement.montantTravaux - financement.apportPersonnel).toLocaleString('fr-FR')} €
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Onglet 6: Récapitulatif et Rentabilité */}
        {activeTab === 'recapitulatif' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Récapitulatif du projet</h3>

            {/* Calculs automatiques */}
            {(() => {
              // Calcul du coût total du projet
              const coutTotal = financement.prixAchat + financement.fraisNotaire + financement.montantTravaux
              const montantCredit = Math.max(0, coutTotal - financement.apportPersonnel)

              // Calcul des loyers potentiels (tous les loyers, actuels et estimatifs)
              const loyersMensuelsTotal = elementsBien.reduce((sum, el) =>
                sum + (el.loyerMensuel || 0), 0
              )
              const loyersAnnuelsTotal = loyersMensuelsTotal * 12

              // Séparation loyers actuels / estimatifs
              const loyersActuels = elementsBien.filter(el => el.enLocation && el.loyerMensuel)
              const loyersEstimatifs = elementsBien.filter(el => !el.enLocation && el.loyerMensuel)

              // Règle des 70% (règle bancaire)
              const loyerNetBancaire = loyersAnnuelsTotal * 0.7
              const loyerNetMensuelBancaire = loyerNetBancaire / 12

              // Calcul de la mensualité de crédit (formule d'amortissement)
              const tauxMensuel = (financement.tauxInteretEstime / 100) / 12
              const nombreMois = financement.dureeCredit * 12
              const mensualiteCredit = montantCredit > 0 && tauxMensuel > 0
                ? montantCredit * (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMois)) / (Math.pow(1 + tauxMensuel, nombreMois) - 1)
                : 0

              // Cash-flow mensuel (selon règle bancaire 70%)
              const cashflowMensuel70 = loyerNetMensuelBancaire - mensualiteCredit
              const cashflowAnnuel70 = cashflowMensuel70 * 12

              // Cash-flow mensuel avec 100% des loyers (situation réelle)
              const cashflowMensuel100 = loyersMensuelsTotal - mensualiteCredit
              const cashflowAnnuel100 = cashflowMensuel100 * 12

              // Rentabilité brute
              const rentabiliteBrute = coutTotal > 0 ? (loyersAnnuelsTotal / coutTotal) * 100 : 0

              // Rentabilité nette (approximative, hors charges et taxes)
              const rentabiliteNette = coutTotal > 0 ? (loyerNetBancaire / coutTotal) * 100 : 0

              return (
                <>
                  {/* Section 1: Coûts du projet */}
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                      <Euro className="h-5 w-5" />
                      Coûts du projet
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Prix d'achat</span>
                        <span className="font-semibold">{financement.prixAchat.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Frais de notaire</span>
                        <span className="font-semibold">{financement.fraisNotaire.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Montant travaux</span>
                        <span className="font-semibold">{financement.montantTravaux.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="border-t border-blue-300 pt-3 mt-3"></div>
                      <div className="flex justify-between text-lg">
                        <span className="font-bold text-blue-900">Coût total du projet</span>
                        <span className="font-bold text-blue-900">{coutTotal.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Apport personnel</span>
                        <span className="font-semibold text-green-600">- {financement.apportPersonnel.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span className="font-bold text-blue-900">Montant à financer</span>
                        <span className="font-bold text-blue-900">{montantCredit.toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  </Card>

                  {/* Section 2: Revenus locatifs */}
                  <Card className="p-6 bg-green-50 border-green-200">
                    <h4 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                      <Home className="h-5 w-5" />
                      Revenus locatifs potentiels
                    </h4>
                    <div className="space-y-3">
                      {elementsBien.filter(el => el.loyerMensuel).length > 0 ? (
                        <>
                          {/* Loyers actuels */}
                          {loyersActuels.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-green-800 mb-2">📍 Lots actuellement loués</p>
                              {loyersActuels.map((el, idx) => (
                                <div key={idx} className="flex justify-between text-sm bg-white rounded px-2 py-1">
                                  <span className="text-gray-700">{el.type} - {el.superficie}m²</span>
                                  <span className="font-semibold text-green-700">{(el.loyerMensuel || 0).toLocaleString('fr-FR')} € / mois</span>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Loyers estimatifs */}
                          {loyersEstimatifs.length > 0 && (
                            <>
                              <p className="text-xs font-semibold text-blue-800 mb-2 mt-3">💡 Lots avec loyers estimatifs</p>
                              {loyersEstimatifs.map((el, idx) => (
                                <div key={idx} className="flex justify-between text-sm bg-blue-50 rounded px-2 py-1 border border-blue-200">
                                  <span className="text-gray-700">{el.type} - {el.superficie}m²</span>
                                  <span className="font-semibold text-blue-700">{(el.loyerMensuel || 0).toLocaleString('fr-FR')} € / mois <span className="text-xs">(estimatif)</span></span>
                                </div>
                              ))}
                            </>
                          )}

                          <div className="border-t border-green-300 pt-3 mt-3"></div>
                          <div className="flex justify-between text-lg">
                            <span className="font-bold text-green-900">Total mensuel</span>
                            <span className="font-bold text-green-900">{loyersMensuelsTotal.toLocaleString('fr-FR')} € / mois</span>
                          </div>
                          <div className="flex justify-between text-lg">
                            <span className="font-bold text-green-900">Total annuel</span>
                            <span className="font-bold text-green-900">{loyersAnnuelsTotal.toLocaleString('fr-FR')} € / an</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500 text-sm">Aucun lot avec loyer configuré</p>
                      )}
                    </div>
                  </Card>

                  {/* Section 3: Financement et règle des 70% */}
                  {montantCredit > 0 && (
                    <Card className="p-6 bg-orange-50 border-orange-200">
                      <h4 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Analyse du financement
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-white rounded-lg p-3 border border-orange-200">
                          <p className="text-xs text-gray-600 mb-2">Règle bancaire des 70%</p>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Loyers bruts annuels</span>
                            <span className="font-semibold">{loyersAnnuelsTotal.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Loyers nets (70%)</span>
                            <span className="font-semibold text-orange-700">{loyerNetBancaire.toLocaleString('fr-FR')} €</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-gray-700">Par mois</span>
                            <span className="font-semibold text-orange-700">{loyerNetMensuelBancaire.toLocaleString('fr-FR')} € / mois</span>
                          </div>
                        </div>

                        <div className="border-t border-orange-300 pt-3"></div>

                        <div className="flex justify-between">
                          <span className="text-gray-700">Durée du crédit</span>
                          <span className="font-semibold">{financement.dureeCredit} ans</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Taux d'intérêt estimé</span>
                          <span className="font-semibold">{financement.tauxInteretEstime}%</span>
                        </div>
                        <div className="flex justify-between text-lg">
                          <span className="font-bold text-orange-900">Mensualité crédit</span>
                          <span className="font-bold text-orange-900">{mensualiteCredit.toLocaleString('fr-FR')} € / mois</span>
                        </div>

                        <div className="border-t border-orange-300 pt-3"></div>

                        <div className="space-y-2">
                          {/* Cash-flow avec 70% (règle bancaire) */}
                          <div className={`p-3 rounded-lg ${cashflowMensuel70 >= 0 ? 'bg-orange-100 border border-orange-300' : 'bg-red-100 border border-red-300'}`}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">Cash-flow mensuel (70% des loyers)</span>
                              <span className={`font-bold ${cashflowMensuel70 >= 0 ? 'text-orange-700' : 'text-red-700'}`}>
                                {cashflowMensuel70 >= 0 ? '+' : ''}{cashflowMensuel70.toLocaleString('fr-FR')} € / mois
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Cash-flow annuel</span>
                              <span className={`font-semibold ${cashflowAnnuel70 >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                {cashflowAnnuel70 >= 0 ? '+' : ''}{cashflowAnnuel70.toLocaleString('fr-FR')} € / an
                              </span>
                            </div>
                          </div>

                          {/* Cash-flow avec 100% (situation réelle) */}
                          <div className={`p-3 rounded-lg ${cashflowMensuel100 >= 0 ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'}`}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">Cash-flow mensuel (100% des loyers)</span>
                              <span className={`font-bold ${cashflowMensuel100 >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {cashflowMensuel100 >= 0 ? '+' : ''}{cashflowMensuel100.toLocaleString('fr-FR')} € / mois
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Cash-flow annuel</span>
                              <span className={`font-semibold ${cashflowAnnuel100 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {cashflowAnnuel100 >= 0 ? '+' : ''}{cashflowAnnuel100.toLocaleString('fr-FR')} € / an
                              </span>
                            </div>
                          </div>
                        </div>

                        {cashflowMensuel70 < 0 && (() => {
                          // Calcul de l'augmentation de loyer nécessaire
                          // Pour équilibrer : loyerNetMensuelBancaire doit égaler mensualiteCredit
                          // Avec règle 70% : nouveauLoyersMensuelsTotal * 0.7 = mensualiteCredit
                          const loyersMensuelsNecessaires = mensualiteCredit / 0.7
                          const augmentationLoyerNecessaire = loyersMensuelsNecessaires - loyersMensuelsTotal

                          // Calcul de la réduction du coût total nécessaire
                          // Pour équilibrer : mensualiteCredit doit égaler loyerNetMensuelBancaire
                          // Formule inverse de la mensualité de crédit
                          const facteurAmortissement = tauxMensuel > 0
                            ? (tauxMensuel * Math.pow(1 + tauxMensuel, nombreMois)) / (Math.pow(1 + tauxMensuel, nombreMois) - 1)
                            : 1 / nombreMois
                          const nouveauMontantCredit = loyerNetMensuelBancaire / facteurAmortissement
                          const reductionCreditNecessaire = montantCredit - nouveauMontantCredit
                          const reductionCoutTotalNecessaire = reductionCreditNecessaire

                          return (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-3">
                              <p className="text-sm font-semibold text-red-900 mb-3">
                                ⚠️ Le projet nécessite un apport mensuel de <strong>{Math.abs(cashflowMensuel70).toLocaleString('fr-FR')} €</strong> pour couvrir la mensualité du crédit.
                              </p>
                              <p className="text-xs text-red-800 mb-2 font-semibold">💡 Pour équilibrer le projet :</p>
                              <div className="space-y-2 text-xs text-red-800">
                                <div className="bg-white bg-opacity-50 rounded p-2 border border-red-300">
                                  <p className="font-semibold mb-1">Option 1 : Augmenter les loyers</p>
                                  <p>Les loyers mensuels doivent être augmentés de <strong>+{augmentationLoyerNecessaire.toLocaleString('fr-FR')} €/mois</strong></p>
                                  <p className="text-gray-600 mt-1">(soit passer de {loyersMensuelsTotal.toLocaleString('fr-FR')} € à {loyersMensuelsNecessaires.toLocaleString('fr-FR')} €/mois)</p>
                                </div>
                                <div className="bg-white bg-opacity-50 rounded p-2 border border-red-300">
                                  <p className="font-semibold mb-1">Option 2 : Réduire le coût du projet</p>
                                  <p>Le coût total du projet doit être réduit de <strong>-{reductionCoutTotalNecessaire.toLocaleString('fr-FR')} €</strong></p>
                                  <p className="text-gray-600 mt-1">(soit passer de {coutTotal.toLocaleString('fr-FR')} € à {(coutTotal - reductionCoutTotalNecessaire).toLocaleString('fr-FR')} €)</p>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </Card>
                  )}

                  {/* Section 4: Rentabilité */}
                  <Card className="p-6 bg-purple-50 border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Indicateurs de rentabilité
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Rentabilité brute</p>
                            <p className="text-xs text-gray-500 mt-1">Loyers annuels / Coût total</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-bold ${rentabiliteBrute >= 5 ? 'text-green-600' : rentabiliteBrute >= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                              {rentabiliteBrute.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-600">Rentabilité nette (70%)</p>
                            <p className="text-xs text-gray-500 mt-1">Loyers nets (70%) / Coût total</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-bold ${rentabiliteNette >= 3.5 ? 'text-green-600' : rentabiliteNette >= 2 ? 'text-orange-600' : 'text-red-600'}`}>
                              {rentabiliteNette.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Guide de lecture */}
                      <div className="bg-purple-100 rounded-lg p-3 mt-4">
                        <p className="text-xs font-semibold text-purple-900 mb-2">📊 Guide de lecture</p>
                        <ul className="text-xs text-purple-800 space-y-1">
                          <li>• Rentabilité brute {'>'} 5% : Excellent</li>
                          <li>• Rentabilité brute 3-5% : Correct</li>
                          <li>• Rentabilité brute {'<'} 3% : Faible</li>
                          <li>• Règle des 70% : les banques considèrent que 30% des loyers partent en charges/vacance</li>
                        </ul>
                      </div>
                    </div>
                  </Card>

                  {/* Section 5: Analyse serveur (projet sauvegardé) */}
                  {initialProjet?.id && (
                    <Card className="p-6 bg-indigo-50 border-indigo-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Analyse complète (serveur)
                        </h4>
                        <button
                          type="button"
                          onClick={handleCalculateRentabilite}
                          disabled={analysisLoading}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          {analysisLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          {analysisLoading ? 'Calcul...' : 'Recalculer'}
                        </button>
                      </div>

                      {analysisLoading && !analysisData && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                        </div>
                      )}

                      {analysisData && (
                        <div className="space-y-3">
                          {/* KPI Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">Rentabilité brute</p>
                              <p className={`text-xl font-bold ${(analysisData.rentabiliteBrute || 0) >= 5 ? 'text-green-600' : (analysisData.rentabiliteBrute || 0) >= 3 ? 'text-orange-600' : 'text-red-600'}`}>
                                {(analysisData.rentabiliteBrute || 0).toFixed(2)}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">Rentabilité nette</p>
                              <p className={`text-xl font-bold ${(analysisData.rentabiliteNette || 0) >= 3.5 ? 'text-green-600' : (analysisData.rentabiliteNette || 0) >= 2 ? 'text-orange-600' : 'text-red-600'}`}>
                                {(analysisData.rentabiliteNette || 0).toFixed(2)}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">Cash-flow mensuel</p>
                              <p className={`text-xl font-bold ${(analysisData.cashFlowMensuel || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(analysisData.cashFlowMensuel || 0) >= 0 ? '+' : ''}{(analysisData.cashFlowMensuel || 0).toLocaleString('fr-FR')} €
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">Cash-flow annuel</p>
                              <p className={`text-xl font-bold ${(analysisData.cashFlowAnnuel || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(analysisData.cashFlowAnnuel || 0) >= 0 ? '+' : ''}{(analysisData.cashFlowAnnuel || 0).toLocaleString('fr-FR')} €
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">ROI</p>
                              <p className="text-xl font-bold text-indigo-700">
                                {(analysisData.roi || 0).toFixed(2)}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-indigo-200 text-center">
                              <p className="text-xs text-gray-500">Taux endettement</p>
                              <p className={`text-xl font-bold ${(analysisData.tauxEndettementProjet || 0) <= 35 ? 'text-green-600' : 'text-red-600'}`}>
                                {(analysisData.tauxEndettementProjet || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Détails supplémentaires */}
                          <div className="bg-white rounded-lg p-3 border border-indigo-200">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Charges annuelles estimées</span>
                              <span className="font-semibold">{(analysisData.chargesAnnuelles || 0).toLocaleString('fr-FR')} €</span>
                            </div>
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-600">Récupération de l'apport</span>
                              <span className="font-semibold">
                                {(analysisData.anneesRecuperationApport || 0) > 0
                                  ? `${(analysisData.anneesRecuperationApport || 0).toFixed(1)} ans`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-indigo-600 italic">
                            Analyse calculée sur les données sauvegardées en base. Sauvegardez le projet puis recalculez pour mettre à jour.
                          </p>
                        </div>
                      )}

                      {!analysisData && !analysisLoading && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Cliquez sur "Recalculer" pour lancer l'analyse complète du projet.
                        </p>
                      )}
                    </Card>
                  )}
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
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
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
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Sauvegardez d'abord le projet pour générer la checklist des documents</p>
              </div>
            )}

            {/* Loading */}
            {checklistLoading && checklistDocs.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
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
                'Valide': 'bg-blue-100 text-blue-700 border-blue-300'
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
                      <span className="text-sm font-bold text-blue-600">{fournis}/{total} documents ({progression}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${progression === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progression}%` }}
                      />
                    </div>
                  </Card>

                  {/* Documents par catégorie */}
                  {Object.entries(categories).map(([categorie, docs]) => (
                    <Card key={categorie} className="p-4">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {categorieLabels[categorie] || categorie}
                        <span className="text-xs text-gray-400 font-normal">({docs.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {docs.map(doc => {
                          const structure = doc.concerneStructureId
                            ? structures.find(s => s.id === doc.concerneStructureId)
                            : null
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
                                className={`ml-3 px-3 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors ${statutColors[doc.statut] || 'bg-gray-100 text-gray-600 border-gray-300'}`}
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
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aucune checklist générée pour ce projet</p>
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Générer la checklist des documents
                </button>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
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
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center justify-center gap-2"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          Enregistrer le projet
        </button>
        {onGeneratePDF && initialProjet && (
          <button
            type="button"
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white border-2 border-green-600 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            onClick={() => {
              console.log('🎯 Bouton "Générer le dossier" cliqué !');
              onGeneratePDF()
            }}
          >
            <FileText className="h-5 w-5" />
            Générer le dossier bancaire
          </button>
        )}
      </div>
    </form>
  )
}

export default ProjetFormV2
