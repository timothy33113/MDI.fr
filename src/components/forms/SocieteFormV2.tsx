import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Building2, Home, CreditCard, User, Briefcase, FileText, Wallet, Check, X, Search, Loader2 } from 'lucide-react'
import { TypeStructure } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import AssocieFormV2 from './AssocieFormV2'
import RechercheEntrepriseParDirigeant from '@/components/RechercheEntrepriseParDirigeant'
import RechercheEntreprise from '@/components/RechercheEntreprise'
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext'
import { searchEntrepriseBySirenOrSiret, mapEntrepriseToFormData, mapDirigeantsToAssocies, createStructureFromDirigeantPP, createStructureFromDirigeantPM, findExistingPersonnePhysique, findExistingPersonneMorale, EntrepriseApiResult } from '@/services/entrepriseApi'

interface Associe {
  id: string
  type: 'PP' | 'PM' // Physical Person or Legal Entity
  structureId?: string // ID of existing structure (if selected)
  nom?: string // For manual entry
  prenom?: string // For manual entry (PP only)
  fonction: string
  pourcentageParts: number
}

interface BienImmobilier {
  id: string
  type: 'Residence_Principale' | 'Residence_Secondaire' | 'Investissement_Locatif'
  adresse: string
  valeurEstimee: number
  loyerMensuel?: number
  statut?: 'En_location' | 'Vacant' | 'En_travaux'
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
  capitalRestantDu?: number
  mensualite?: number
}

interface SocieteFormV2Props {
  societeId?: string | null
  onSubmit: (data: any) => void
  onCancel: () => void
  personneEnCreation?: { // Personne physique en cours de création (pour éviter les doublons)
    id: string
    nom: string
    prenom: string
  } | null
}

const SocieteFormV2: React.FC<SocieteFormV2Props> = ({ societeId, onSubmit, onCancel, personneEnCreation }) => {
  const [activeSection, setActiveSection] = useState<'generale' | 'juridique' | 'associes' | 'patrimoine'>('generale')
  const [type, setType] = useState<TypeStructure>('SCI')
  const { structures, addStructure, refreshStructures, getStructureById } = useStructures()
  const [showAssocieModal, setShowAssocieModal] = useState(false)

  // États pour la recherche d'entreprise
  const [siretSearch, setSiretSearch] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchSuccess, setSearchSuccess] = useState(false)

  // États pour l'auto-complétion
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [lastSelectedValue, setLastSelectedValue] = useState<string>('')

  // Filtrer les structures et ajouter la personne en cours de création si applicable
  const personnesPhysiques = [
    ...structures.filter(s => s.type === 'PERSONNE_PHYSIQUE'),
    // Ajouter la personne en cours de création comme option temporaire
    ...(personneEnCreation ? [{
      id: personneEnCreation.id,
      type: 'PERSONNE_PHYSIQUE' as const,
      nom: `${personneEnCreation.prenom} ${personneEnCreation.nom}`,
      adresse: '',
      telephone: '',
      email: '',
      _isTemporary: true // Marqueur pour identifier cette structure temporaire
    }] : [])
  ]
  const personnesMorales = structures.filter(s => s.type !== 'PERSONNE_PHYSIQUE')

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

  const [formData, setFormData] = useState({
    nom: '',
    adresse: '',
    telephone: '',
    email: '',

    // Personne morale
    denominationSociale: '',
    siret: '',
    siren: '',
    dateCreation: '',
    capitalSocial: 0,
    banquePrincipale: ''
  })

  // Associés avec parts
  const [associes, setAssocies] = useState<Associe[]>([
    { id: Date.now().toString(), type: 'PP', fonction: 'Associé', pourcentageParts: 100 }
  ])

  // Biens immobiliers
  const [biens, setBiens] = useState<BienImmobilier[]>([])

  // Crédits en cours
  const [credits, setCredits] = useState<Credit[]>([])

  // États pour gérer l'édition
  const [editingAssocieId, setEditingAssocieId] = useState<string | null>(null)
  const [editingBienId, setEditingBienId] = useState<string | null>(null)
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null)

  // Charger les données de la société si on est en mode édition
  useEffect(() => {
    if (societeId) {
      const structure = getStructureById(societeId)
      if (structure && structure.personneMorale) {
        const pm = structure.personneMorale

        setType(structure.type)
        setFormData({
          nom: structure.nom,
          adresse: structure.adresse,
          telephone: structure.telephone || '',
          email: structure.email || '',
          denominationSociale: pm.denominationSociale,
          siret: pm.siret,
          siren: pm.siren,
          dateCreation: pm.dateCreation ? new Date(pm.dateCreation).toISOString().split('T')[0] : '',
          capitalSocial: pm.capitalSocial,
          banquePrincipale: pm.banquePrincipale || ''
        })

        // En mode édition, marquer la dénomination comme déjà sélectionnée
        // pour éviter que les suggestions ne s'affichent
        setLastSelectedValue(pm.denominationSociale)
        setSuggestions([])
        setShowSuggestions(false)

        // Charger les associés si disponibles
        if (pm.associes && Array.isArray(pm.associes) && pm.associes.length > 0) {
          setAssocies(pm.associes.map((a: any) => ({
            id: a.id || Date.now().toString(),
            type: a.type || 'PP',
            structureId: a.structureId,
            nom: a.nom,
            prenom: a.prenom,
            fonction: a.fonction || 'Associé',
            pourcentageParts: a.pourcentageParts || 0
          })))
        }

        // Charger les biens immobiliers si disponibles
        if (pm.biens && Array.isArray(pm.biens) && pm.biens.length > 0) {
          setBiens(pm.biens.map((b: any) => ({
            id: b.id || Date.now().toString(),
            type: b.type,
            adresse: b.adresse,
            valeurEstimee: b.valeurEstimee,
            loyerMensuel: b.loyerMensuel,
            statut: b.statut
          })))
        }

        // Charger les crédits si disponibles
        if (pm.credits && Array.isArray(pm.credits) && pm.credits.length > 0) {
          setCredits(pm.credits.map((c: any) => ({
            id: c.id || Date.now().toString(),
            type: c.type,
            organisme: c.organisme,
            montantInitial: c.montantInitial,
            dateDebut: c.dateDebut || '',
            nombreMois: c.nombreMois || 240,
            tauxInteret: c.tauxInteret,
            bienAssocie: c.bienAssocie,
            capitalRestantDu: c.capitalRestantDu,
            mensualite: c.mensualite
          })))
        }
      }
    }
  }, [societeId, getStructureById])

  const handleTypeChange = (newType: TypeStructure) => {
    if (newType !== 'PERSONNE_PHYSIQUE') {
      setType(newType)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleCreateAssocie = (data: any) => {
    addStructure(data)
    setShowAssocieModal(false)
    refreshStructures()
  }

  // Recherche et pré-remplissage depuis l'API entreprise
  const handleSearchEntreprise = async () => {
    if (!siretSearch.trim()) {
      setSearchError('Veuillez saisir un SIREN ou SIRET')
      return
    }

    setIsSearching(true)
    setSearchError(null)
    setSearchSuccess(false)

    try {
      const result = await searchEntrepriseBySirenOrSiret(siretSearch)

      if (!result) {
        setSearchError('Aucune entreprise trouvée avec ce SIREN/SIRET')
        return
      }

      // Mapper les données de l'API vers le formulaire
      const mappedData = mapEntrepriseToFormData(result)

      // Pré-remplir le formulaire
      setType(mappedData.type as TypeStructure)
      setFormData({
        ...formData,
        denominationSociale: mappedData.denominationSociale,
        siret: mappedData.siret,
        siren: mappedData.siren,
        adresse: mappedData.adresse,
        dateCreation: mappedData.dateCreation
      })

      // Créer automatiquement les structures pour les dirigeants et les lier comme associés
      if (result.dirigeants && result.dirigeants.length > 0) {
        const createdStructuresMap = new Map<string, string>()

        // Créer une structure pour chaque dirigeant
        for (const dirigeant of result.dirigeants) {
          let structure
          let dirigeantKey

          if (dirigeant.type_dirigeant === 'personne physique') {
            dirigeantKey = `${dirigeant.nom}-${dirigeant.prenoms}`

            // Vérifier si la personne existe déjà
            const existing = findExistingPersonnePhysique(
              structures,
              dirigeant.nom || '',
              dirigeant.prenoms || ''
            )

            if (existing) {
              console.log(`♻️ Structure PP existante trouvée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
              structure = existing
            } else {
              // Créer une nouvelle structure Personne Physique
              const structureData = createStructureFromDirigeantPP(dirigeant)
              structure = addStructure(structureData)
              console.log(`✅ Structure PP créée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
            }
          } else {
            dirigeantKey = dirigeant.siren || `pm-${Date.now()}`

            // Vérifier si la personne morale existe déjà
            const existing = findExistingPersonneMorale(
              structures,
              dirigeant.siren,
              dirigeant.denomination
            )

            if (existing) {
              console.log(`♻️ Structure PM existante trouvée pour ${dirigeant.denomination}`)
              structure = existing
            } else {
              // Récupérer les données complètes de l'entreprise via l'API
              console.log(`🔍 Récupération des données complètes pour ${dirigeant.denomination} (SIREN: ${dirigeant.siren})`)
              let entrepriseCompleteData = null
              try {
                const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${dirigeant.siren}`)
                const data = await response.json()
                if (data.results && data.results.length > 0) {
                  entrepriseCompleteData = data.results[0]
                  console.log(`✅ Données récupérées pour ${dirigeant.denomination}`)
                }
              } catch (error) {
                console.error(`❌ Erreur lors de la récupération des données pour ${dirigeant.denomination}:`, error)
              }

              // Créer une nouvelle structure Personne Morale avec les données complètes
              const structureData = createStructureFromDirigeantPM(dirigeant, entrepriseCompleteData)
              structure = addStructure(structureData)
              console.log(`✅ Structure PM créée pour ${dirigeant.denomination}`)
            }
          }

          // Stocker l'ID de la structure (nouvelle ou existante)
          createdStructuresMap.set(dirigeantKey, structure.id)
        }

        // Créer les associés en les liant aux structures créées
        const nouveauxAssocies = mapDirigeantsToAssocies(result.dirigeants, createdStructuresMap)
        setAssocies(nouveauxAssocies)
        console.log(`✅ ${nouveauxAssocies.length} dirigeant(s) importé(s) et liés comme associés`)
      }

      setSearchSuccess(true)
      console.log('✅ Données entreprise récupérées:', result)
    } catch (error: any) {
      console.error('❌ Erreur recherche entreprise:', error)
      setSearchError(error.message || 'Erreur lors de la recherche')
    } finally {
      setIsSearching(false)
    }
  }

  // Recherche d'entreprises par nom avec debounce
  const searchByName = async (name: string) => {
    if (name.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const { searchEntrepriseByName } = await import('@/services/entrepriseApi')
      const results = await searchEntrepriseByName(name, 1, 5)
      setSuggestions(results.results || [])
      setShowSuggestions(results.results && results.results.length > 0)
    } catch (error) {
      console.error('Erreur recherche par nom:', error)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Debounce pour la recherche auto-complète
  useEffect(() => {
    // Ne pas rechercher si la valeur actuelle est celle qu'on vient de sélectionner
    if (formData.denominationSociale === lastSelectedValue) {
      return
    }

    const timer = setTimeout(() => {
      if (formData.denominationSociale && formData.denominationSociale.length >= 3) {
        searchByName(formData.denominationSociale)
      } else {
        // Effacer les suggestions si moins de 3 caractères
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 500) // Attendre 500ms après la dernière frappe

    return () => clearTimeout(timer)
  }, [formData.denominationSociale, lastSelectedValue])

  // Sélectionner une suggestion
  const handleSelectSuggestion = async (entreprise: any) => {
    const mappedData = mapEntrepriseToFormData(entreprise)

    // Pré-remplir le formulaire
    setType(mappedData.type as TypeStructure)
    setFormData({
      ...formData,
      denominationSociale: mappedData.denominationSociale,
      siret: mappedData.siret,
      siren: mappedData.siren,
      adresse: mappedData.adresse,
      dateCreation: mappedData.dateCreation
    })

    // Enregistrer la valeur sélectionnée pour éviter de relancer une recherche
    setLastSelectedValue(mappedData.denominationSociale)

    // Fermer la liste de suggestions après sélection
    setShowSuggestions(false)
    setSuggestions([])

    // Créer automatiquement les structures pour les dirigeants et les lier comme associés
    if (entreprise.dirigeants && entreprise.dirigeants.length > 0) {
      const createdStructuresMap = new Map<string, string>()

      // Créer une structure pour chaque dirigeant
      for (const dirigeant of entreprise.dirigeants) {
        let structure
        let dirigeantKey

        if (dirigeant.type_dirigeant === 'personne physique') {
          dirigeantKey = `${dirigeant.nom}-${dirigeant.prenoms}`

          // Vérifier si c'est la personne en cours de création
          const isPersonneEnCreation = personneEnCreation &&
            dirigeant.nom?.toUpperCase() === personneEnCreation.nom.toUpperCase() &&
            dirigeant.prenoms?.toUpperCase().includes(personneEnCreation.prenom.toUpperCase())

          if (isPersonneEnCreation) {
            console.log(`👤 Dirigeant ${dirigeant.prenoms} ${dirigeant.nom} correspond à la personne en cours de création - utilisation de l'ID temporaire`)
            // Utiliser l'ID temporaire de la personne en création
            structure = { id: personneEnCreation.id, nom: `${personneEnCreation.prenom} ${personneEnCreation.nom}` } as any
          } else {
            // Vérifier si la personne existe déjà
            const existing = findExistingPersonnePhysique(
              structures,
              dirigeant.nom || '',
              dirigeant.prenoms || ''
            )

            if (existing) {
              console.log(`♻️ Structure PP existante trouvée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
              structure = existing
            } else {
              // Créer une nouvelle structure Personne Physique
              const structureData = createStructureFromDirigeantPP(dirigeant)
              structure = addStructure(structureData)
              console.log(`✅ Structure PP créée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
            }
          }
        } else {
          dirigeantKey = dirigeant.siren || `pm-${Date.now()}`

          // Vérifier si la personne morale existe déjà
          const existing = findExistingPersonneMorale(
            structures,
            dirigeant.siren,
            dirigeant.denomination
          )

          if (existing) {
            console.log(`♻️ Structure PM existante trouvée pour ${dirigeant.denomination}`)
            structure = existing
          } else {
            // Récupérer les données complètes de l'entreprise via l'API
            console.log(`🔍 Récupération des données complètes pour ${dirigeant.denomination} (SIREN: ${dirigeant.siren})`)
            let entrepriseCompleteData = null
            try {
              const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${dirigeant.siren}`)
              const data = await response.json()
              if (data.results && data.results.length > 0) {
                entrepriseCompleteData = data.results[0]
                console.log(`✅ Données récupérées pour ${dirigeant.denomination}`)
              }
            } catch (error) {
              console.error(`❌ Erreur lors de la récupération des données pour ${dirigeant.denomination}:`, error)
            }

            // Créer une nouvelle structure Personne Morale avec les données complètes
            const structureData = createStructureFromDirigeantPM(dirigeant, entrepriseCompleteData)
            structure = addStructure(structureData)
            console.log(`✅ Structure PM créée pour ${dirigeant.denomination}`)
          }
        }

        // Stocker l'ID de la structure (nouvelle ou existante)
        createdStructuresMap.set(dirigeantKey, structure.id)
      }

      // Créer les associés en les liant aux structures créées
      const nouveauxAssocies = mapDirigeantsToAssocies(entreprise.dirigeants, createdStructuresMap)
      setAssocies(nouveauxAssocies)
      console.log(`✅ ${nouveauxAssocies.length} dirigeant(s) importé(s) et liés comme associés`)
    }

    // Fermer les suggestions
    setShowSuggestions(false)
    setSuggestions([])

    console.log('✅ Entreprise sélectionnée:', entreprise)
  }

  // Handler pour ajouter plusieurs entreprises comme associés (depuis la recherche par dirigeant)
  const handleAddEntreprisesAsAssocies = async (entreprises: EntrepriseApiResult[], searchedNom?: string, searchedPrenoms?: string) => {
    console.log(`🔍 Ajout de ${entreprises.length} entreprise(s) comme associé(s)`)
    console.log(`👤 Dirigeant recherché: ${searchedPrenoms} ${searchedNom}`)

    const nouveauxAssocies: Associe[] = []
    const createdStructuresMap = new Map<string, string>()
    const relationsDetentionToCreate: Array<{ entrepriseId: string; dirigeantId: string; qualite: string }> = []

    // ÉTAPE 1: Créer toutes les structures pour les entreprises sélectionnées
    for (const entreprise of entreprises) {
      console.log(`\n📋 Traitement de l'entreprise: ${entreprise.nom_raison_sociale}`)

      // Vérifier si l'entreprise n'existe pas déjà
      const existing = findExistingPersonneMorale(structures, entreprise.siren, entreprise.nom_raison_sociale)

      let structureEntreprise
      if (existing) {
        console.log(`♻️ Structure PM existante trouvée pour ${entreprise.nom_raison_sociale}`)
        structureEntreprise = existing
      } else {
        // Créer une nouvelle structure pour l'entreprise
        const structureData = {
          type: 'SAS' as TypeStructure, // Type par défaut
          nom: entreprise.nom_raison_sociale || entreprise.nom_complet,
          adresse: entreprise.siege.adresse,
          telephone: '',
          email: '',
          personneMorale: {
            denominationSociale: entreprise.nom_raison_sociale || entreprise.nom_complet,
            siret: entreprise.siege.siret,
            siren: entreprise.siren,
            formeJuridique: entreprise.nature_juridique,
            dateCreation: entreprise.date_creation,
            capitalSocial: 0,
            nombreParts: 0,
            activitePrincipale: entreprise.activite_principale,
            adresseSiegeSocial: entreprise.siege.adresse,
            banquePrincipale: '',
            associes: [],
            patrimoine: {
              biensImmobiliers: [],
              comptesEpargne: [],
              valeursMonetaires: []
            },
            credits: []
          }
        }
        try {
          structureEntreprise = await addStructure(structureData)
          console.log(`✅ Structure PM créée pour ${entreprise.nom_raison_sociale}`)
        } catch (error) {
          console.error(`❌ Erreur création PM ${entreprise.nom_raison_sociale}:`, error)
          continue
        }
      }

      // Ajouter l'entreprise comme associé
      nouveauxAssocies.push({
        id: `associe-${Date.now()}-${entreprise.siren}`,
        type: 'PM',
        structureId: structureEntreprise.id,
        nom: entreprise.nom_raison_sociale || entreprise.nom_complet,
        fonction: 'Associé',
        pourcentageParts: 0
      })

      // ÉTAPE 2: Créer les structures pour TOUS les dirigeants de cette entreprise
      if (entreprise.dirigeants && entreprise.dirigeants.length > 0) {
        console.log(`\n👥 ÉTAPE 2: Traitement de ${entreprise.dirigeants.length} dirigeant(s) de ${entreprise.nom_raison_sociale}`)

        for (const dirigeant of entreprise.dirigeants) {
          console.log(`  👤 Dirigeant: ${dirigeant.prenoms} ${dirigeant.nom} (${dirigeant.type_dirigeant})`)

          // Créer une clé unique pour ce dirigeant
          let dirigeantKey: string
          let structureDirigeant: any

          if (dirigeant.type_dirigeant === 'personne physique') {
            // PERSONNE PHYSIQUE
            dirigeantKey = `${dirigeant.nom}-${dirigeant.prenoms}`.toUpperCase()

            // Vérifier si on n'a pas déjà créé cette structure
            if (createdStructuresMap.has(dirigeantKey)) {
              console.log(`  ♻️ Structure PP déjà créée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
              structureDirigeant = { id: createdStructuresMap.get(dirigeantKey) }
            } else {
              // Vérifier si la personne physique existe déjà
              const existing = findExistingPersonnePhysique(
                structures,
                dirigeant.nom || '',
                dirigeant.prenoms || '',
                dirigeant.date_de_naissance
              )

              if (existing) {
                console.log(`  ♻️ Structure PP existante trouvée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
                structureDirigeant = existing
              } else {
                // Créer une nouvelle structure Personne Physique
                const structureData = createStructureFromDirigeantPP(dirigeant)
                try {
                  structureDirigeant = await addStructure(structureData)
                  console.log(`  ✅ Structure PP créée pour ${dirigeant.prenoms} ${dirigeant.nom}`)
                } catch (error) {
                  console.error(`  ❌ Erreur création PP ${dirigeant.prenoms} ${dirigeant.nom}:`, error)
                  continue
                }
              }

              // Stocker l'ID de la structure
              createdStructuresMap.set(dirigeantKey, structureDirigeant.id)
            }

            // Enregistrer la relation de détention à créer (PP)
            console.log(`  🔗 Ajout relation PP: dirigeant=${structureDirigeant.id}, entreprise=${structureEntreprise.id}`)
            relationsDetentionToCreate.push({
              entrepriseId: structureEntreprise.id,
              dirigeantId: structureDirigeant.id,
              qualite: dirigeant.qualite || 'Dirigeant'
            })

          } else if (dirigeant.type_dirigeant === 'personne morale') {
            // PERSONNE MORALE (dirigeant)
            dirigeantKey = dirigeant.siren || `pm-${dirigeant.denomination}`

            // Vérifier si on n'a pas déjà créé cette structure
            if (createdStructuresMap.has(dirigeantKey)) {
              console.log(`  ♻️ Structure PM déjà créée pour ${dirigeant.denomination}`)
              structureDirigeant = { id: createdStructuresMap.get(dirigeantKey) }
            } else {
              // Vérifier si la personne morale existe déjà
              const existing = findExistingPersonneMorale(
                structures,
                dirigeant.siren,
                dirigeant.denomination
              )

              if (existing) {
                console.log(`  ♻️ Structure PM existante trouvée pour ${dirigeant.denomination}`)
                structureDirigeant = existing
              } else {
                // Récupérer les données complètes de l'entreprise via l'API
                console.log(`  🔍 Récupération des données complètes pour ${dirigeant.denomination} (SIREN: ${dirigeant.siren})`)
                let entrepriseCompleteData = null
                try {
                  const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${dirigeant.siren}`)
                  const data = await response.json()
                  if (data.results && data.results.length > 0) {
                    entrepriseCompleteData = data.results[0]
                    console.log(`  ✅ Données récupérées pour ${dirigeant.denomination}`)
                  }
                } catch (error) {
                  console.error(`  ❌ Erreur lors de la récupération des données pour ${dirigeant.denomination}:`, error)
                }

                // Créer une nouvelle structure Personne Morale avec les données complètes
                const structureData = createStructureFromDirigeantPM(dirigeant, entrepriseCompleteData)
                try {
                  structureDirigeant = await addStructure(structureData)
                  console.log(`  ✅ Structure PM créée pour ${dirigeant.denomination}`)
                } catch (error) {
                  console.error(`  ❌ Erreur création PM ${dirigeant.denomination}:`, error)
                  continue
                }
              }

              // Stocker l'ID de la structure
              createdStructuresMap.set(dirigeantKey, structureDirigeant.id)
            }

            // Enregistrer la relation de détention à créer (PM)
            console.log(`  🔗 Ajout relation PM: dirigeant=${structureDirigeant.id}, entreprise=${structureEntreprise.id}`)
            relationsDetentionToCreate.push({
              entrepriseId: structureEntreprise.id,
              dirigeantId: structureDirigeant.id,
              qualite: dirigeant.qualite || 'Dirigeant'
            })
            console.log(`  ✅ Relation PM ajoutée au tableau`)
          }
        }
      } else {
        console.log(`⚠️ Aucun dirigeant trouvé pour ${entreprise.nom_raison_sociale}`)
      }
    }

    console.log(`\n📊 FIN ÉTAPE 1-2: ${nouveauxAssocies.length} entreprises, ${relationsDetentionToCreate.length} relations prêtes`)

    // ÉTAPE 3: Créer les relations de détention (dirigeants → entreprises)
    console.log(`\n🔗 ÉTAPE 3: Création de ${relationsDetentionToCreate.length} relation(s) de détention`)
    console.log(`📋 Relations à créer:`, relationsDetentionToCreate)

    if (relationsDetentionToCreate.length === 0) {
      console.warn(`⚠️ AUCUNE relation de détention à créer! Vérifier ÉTAPE 2`)
    }

    for (const relation of relationsDetentionToCreate) {
      try {
        console.log(`  📊 Création détenteur API: dirigeant ${relation.dirigeantId} → entreprise ${relation.entrepriseId}`)

        const url = `/api/structures/${relation.entrepriseId}/detenteurs`
        const payload = {
          porteurId: relation.dirigeantId,
          pourcentage: 0
        }
        console.log(`  🌐 POST ${url}`, payload)

        // Appeler l'API pour créer la relation de détention
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        })

        console.log(`  📡 Response status: ${response.status}`)

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`  ❌ Erreur création détenteur (${response.status}):`, errorData)
        } else {
          const responseData = await response.json()
          console.log(`  ✅ Détenteur créé avec succès:`, responseData)
        }
      } catch (error) {
        console.error(`  ❌ Exception lors de la création du détenteur:`, error)
      }
    }

    // ÉTAPE 3.5: Mettre à jour chaque entreprise importée avec ses dirigeants comme associés
    console.log(`\n👥 Mise à jour des entreprises importées avec leurs dirigeants comme associés`)

    // Grouper les relations par entreprise
    const relationsByEntreprise = new Map<string, Array<{ dirigeantId: string; qualite: string }>>()
    for (const relation of relationsDetentionToCreate) {
      if (!relationsByEntreprise.has(relation.entrepriseId)) {
        relationsByEntreprise.set(relation.entrepriseId, [])
      }
      relationsByEntreprise.get(relation.entrepriseId)!.push({
        dirigeantId: relation.dirigeantId,
        qualite: relation.qualite
      })
    }

    // Rafraîchir pour avoir toutes les structures à jour
    await refreshStructures()

    // Pour chaque entreprise, créer et sauvegarder ses associés
    for (const [entrepriseId, dirigeants] of relationsByEntreprise.entries()) {
      const entreprise = structures.find(s => s.id === entrepriseId)
      if (!entreprise || !entreprise.personneMorale) {
        console.warn(`  ⚠️ Entreprise ${entrepriseId} non trouvée ou n'est pas une PM`)
        continue
      }

      console.log(`  📝 Mise à jour de ${entreprise.nom} avec ${dirigeants.length} associé(s)`)

      // Créer les associés pour cette entreprise
      const associesEntreprise: Associe[] = dirigeants.map(({ dirigeantId, qualite }) => {
        const structureDirigeant = structures.find(s => s.id === dirigeantId)
        if (!structureDirigeant) return null

        const isDirigeantPP = structureDirigeant.type === 'PERSONNE_PHYSIQUE'

        return {
          id: `associe-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          type: isDirigeantPP ? 'PP' as const : 'PM' as const,
          structureId: dirigeantId,
          nom: structureDirigeant.nom,
          prenom: isDirigeantPP && structureDirigeant.personnePhysique?.prenom ? structureDirigeant.personnePhysique.prenom : undefined,
          fonction: qualite,
          pourcentageParts: 0
        }
      }).filter(Boolean) as Associe[]

      // Mettre à jour l'entreprise avec ses associés
      try {
        const updateData = {
          ...entreprise,
          personneMorale: {
            ...entreprise.personneMorale,
            associes: associesEntreprise
          }
        }

        const response = await fetch(`/api/structures/${entrepriseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`  ❌ Erreur mise à jour ${entreprise.nom}:`, errorData)
        } else {
          console.log(`  ✅ ${entreprise.nom} mise à jour avec ${associesEntreprise.length} associé(s)`)
        }
      } catch (error) {
        console.error(`  ❌ Erreur lors de la mise à jour de ${entreprise.nom}:`, error)
      }
    }

    // ÉTAPE 4: Créer les associés pour chaque dirigeant des entreprises importées
    // Ces dirigeants deviennent aussi des associés directs de la société en cours de création/édition
    console.log(`\n👥 Ajout des dirigeants comme associés de la société en cours`)
    const associesDirigeants: Associe[] = []

    // Parcourir toutes les structures créées (dirigeants)
    for (const [key, dirigeantId] of createdStructuresMap.entries()) {
      // Récupérer la structure complète depuis structures ou depuis les nouvellement créées
      await refreshStructures() // Rafraîchir pour avoir les dernières structures
      const allStructures = structures
      const structureDirigeant = allStructures.find(s => s.id === dirigeantId)

      if (structureDirigeant) {
        const isDirigeantPP = structureDirigeant.type === 'PERSONNE_PHYSIQUE'

        // Trouver la qualité/fonction depuis les relations
        const relation = relationsDetentionToCreate.find(r => r.dirigeantId === dirigeantId)

        associesDirigeants.push({
          id: `associe-dirigeant-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          type: isDirigeantPP ? 'PP' : 'PM',
          structureId: dirigeantId,
          nom: structureDirigeant.nom,
          prenom: isDirigeantPP && structureDirigeant.personnePhysique?.prenom ? structureDirigeant.personnePhysique.prenom : undefined,
          fonction: relation?.qualite || 'Dirigeant',
          pourcentageParts: 0 // À définir manuellement
        })

        console.log(`  ✅ Associé créé: ${structureDirigeant.nom} (${isDirigeantPP ? 'PP' : 'PM'})`)
      }
    }

    // Ajouter TOUS les associés à la liste existante (entreprises + dirigeants)
    setAssocies([...associes, ...nouveauxAssocies, ...associesDirigeants])
    console.log(`✅ ${nouveauxAssocies.length} entreprise(s) ajoutée(s) comme associé(s)`)
    console.log(`✅ ${associesDirigeants.length} dirigeant(s) ajouté(s) comme associé(s)`)
    console.log(`✅ ${createdStructuresMap.size} structure(s) de dirigeants créées`)
    console.log(`✅ ${relationsDetentionToCreate.length} relation(s) de détention créées`)

    // Fermer la modal
    setShowAssocieModal(false)
  }

  // Gestion des associés
  const addAssocie = () => {
    const newId = Date.now().toString()
    setAssocies([...associes, {
      id: newId,
      type: 'PP',
      fonction: 'Associé',
      pourcentageParts: 0
    }])
    setEditingAssocieId(newId)
  }

  const removeAssocie = (id: string) => {
    if (associes.length > 1) {
      setAssocies(associes.filter(a => a.id !== id))
      if (editingAssocieId === id) {
        setEditingAssocieId(null)
      }
    }
  }

  const validateAssocie = (id: string) => {
    setEditingAssocieId(null)
  }

  const cancelAssocieEdit = (id: string) => {
    const associe = associes.find(a => a.id === id)
    if (associe && !associe.structureId && !associe.nom && associes.length > 1) {
      removeAssocie(id)
    } else {
      setEditingAssocieId(null)
    }
  }

  const updateAssocie = (id: string, field: string, value: any) => {
    setAssocies(associes.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const totalParts = associes.reduce((sum, a) => sum + a.pourcentageParts, 0)

  // === BIENS IMMOBILIERS ===
  const addBien = () => {
    const newId = Date.now().toString()
    setBiens([...biens, {
      id: newId,
      type: 'Investissement_Locatif',
      adresse: '',
      valeurEstimee: 0,
      statut: 'En_location'
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
      nombreMois: 240,
      tauxInteret: 3.5
    }])
    setEditingCreditId(newId)
  }

  const removeCredit = (id: string) => {
    setCredits(credits.filter(c => c.id !== id))
    if (editingCreditId === id) {
      setEditingCreditId(null)
    }
  }

  const validateCredit = (id: string) => {
    setEditingCreditId(null)
  }

  const cancelCreditEdit = (id: string) => {
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

  const saveData = () => {
    // Convertir les associés en détenteurs pour la structure
    const detenteurs = associes
      .filter(a => a.structureId) // Uniquement les associés avec structureId (structures existantes)
      .map(a => ({
        id: `detenteur_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        structureId: societeId || 'temp', // ID de la société (sera mis à jour après création)
        porteurId: a.structureId!, // ID de la structure qui détient
        pourcentage: a.pourcentageParts || 0,
        createdAt: new Date()
      }))

    const data = {
      type,
      nom: formData.denominationSociale || formData.nom || 'Brouillon société',
      adresse: formData.adresse,
      telephone: formData.telephone,
      email: formData.email,
      detenteurs: detenteurs, // Ajout des détenteurs au niveau de la structure
      personneMorale: {
        denominationSociale: formData.denominationSociale || 'Brouillon',
        siret: formData.siret,
        siren: formData.siren,
        formeJuridique: type,
        dateCreation: formData.dateCreation ? new Date(formData.dateCreation) : new Date(),
        capitalSocial: formData.capitalSocial,
        banquePrincipale: formData.banquePrincipale,
        associes: associes,
        biens: biens,
        credits: credits
      }
    }

    onSubmit(data)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveData()
    // Ne pas appeler onCancel() ici car onSubmit s'occupe de fermer la modal
  }

  const handleCancel = () => {
    // Fermer sans sauvegarder
    onCancel()
  }

  const typesSociete: TypeStructure[] = ['SCI', 'SARL', 'SASU', 'EURL', 'SAS', 'SA', 'HOLDING', 'AUTRE']

  const sections = [
    { id: 'generale' as const, label: 'Infos générales', icon: FileText },
    { id: 'juridique' as const, label: 'Infos juridiques', icon: Briefcase },
    { id: 'associes' as const, label: 'Associés', icon: Users },
    { id: 'patrimoine' as const, label: 'Patrimoine', icon: Home }
  ]

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
                      ? 'border-green-600 text-green-600'
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

        {/* Informations générales */}
        {activeSection === 'generale' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Type de société</h3>
              <p className="text-sm text-gray-600 mt-1 mb-4">Sélectionnez le type de structure juridique</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {typesSociete.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                      type === t
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">Informations de contact</h3>
              <p className="text-sm text-gray-600 mt-1 mb-4">Coordonnées de la société</p>

              {/* Recherche d'entreprise */}
              <RechercheEntreprise
                onSelectEntreprise={handleSelectSuggestion}
              />

              <div className="space-y-4">
                {/* Champ Dénomination sociale */}
                <Input
                  label="Dénomination sociale"
                  value={formData.denominationSociale}
                  onChange={(e) => handleChange('denominationSociale', e.target.value)}
                  required
                  placeholder="Ex: La Poste, Carrefour, BNP Paribas..."
                />

                <Input
                  label="Adresse du siège social"
                  value={formData.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  required
                  placeholder="123 Rue de Paris, 75001 Paris"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Téléphone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    placeholder="01 23 45 67 89"
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contact@sci.fr"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informations juridiques */}
        {activeSection === 'juridique' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Informations juridiques</h3>
              <p className="text-sm text-gray-600 mt-1">Renseignements légaux et administratifs de la société</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SIRET"
                  value={formData.siret}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  maxLength={14}
                  placeholder="12345678901234"
                />

                <Input
                  label="SIREN"
                  value={formData.siren}
                  onChange={(e) => handleChange('siren', e.target.value)}
                  maxLength={9}
                  placeholder="123456789"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date de création"
                  type="date"
                  value={formData.dateCreation}
                  onChange={(e) => handleChange('dateCreation', e.target.value)}
                />

                <Input
                  label="Capital social (€)"
                  type="number"
                  value={formData.capitalSocial}
                  onChange={(e) => handleChange('capitalSocial', Number(e.target.value))}
                  placeholder="1000"
                />
              </div>

              <Input
                label="Banque principale"
                value={formData.banquePrincipale}
                onChange={(e) => handleChange('banquePrincipale', e.target.value)}
                placeholder="Banque Populaire, Crédit Agricole..."
              />
            </div>
          </div>
        )}

        {/* Associés */}
        {activeSection === 'associes' && (
          <div className="space-y-6">
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Associés</h3>
                  <p className="text-sm text-gray-600 mt-1">Gérez les associés et leur participation</p>
                </div>
                <div className={`text-sm font-medium ${totalParts === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalParts}%
                </div>
              </div>
            </div>

            <div className="space-y-4">
            {associes.map((associe, index) => {
              const isEditing = editingAssocieId === associe.id
              return (
              <div key={associe.id} className={`p-4 border border-gray-200 rounded-lg space-y-4 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Associé #{index + 1}</span>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingAssocieId(associe.id)}
                          className="text-sm"
                        >
                          Modifier
                        </Button>
                        {associes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAssocie(associe.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => validateAssocie(associe.id)}
                          className="text-sm"
                        >
                          Valider
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => cancelAssocieEdit(associe.id)}
                          className="text-sm"
                        >
                          Annuler
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Type selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type d'associé</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateAssocie(associe.id, 'type', 'PP')}
                      disabled={!isEditing}
                      className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                        associe.type === 'PP'
                          ? 'bg-blue-600 text-white disabled:bg-blue-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      Personne Physique
                    </button>
                    <button
                      type="button"
                      onClick={() => updateAssocie(associe.id, 'type', 'PM')}
                      disabled={!isEditing}
                      className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                        associe.type === 'PM'
                          ? 'bg-green-500 text-white disabled:bg-green-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      Personne Morale
                    </button>
                  </div>
                </div>

                {/* Structure selection */}
                {associe.type === 'PP' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sélectionner un associé existant
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={associe.structureId || ''}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateAssocie(associe.id, 'structureId', e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">Sélectionnez un associé</option>
                        {personnesPhysiques.map(pp => (
                          <option key={pp.id} value={pp.id}>
                            {pp.nom}
                          </option>
                        ))}
                      </select>
                      {isEditing && (
                        <Button
                          type="button"
                          onClick={() => setShowAssocieModal(true)}
                          variant="secondary"
                          className="whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Créer
                        </Button>
                      )}
                    </div>
                    {personnesPhysiques.length === 0 && isEditing && (
                      <p className="text-xs text-orange-600 mt-1">
                        💡 Cliquez sur "Créer" pour ajouter un nouvel associé
                      </p>
                    )}
                  </div>
                )}

                {associe.type === 'PM' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sélectionner une société existante
                    </label>
                    <select
                      value={associe.structureId || ''}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateAssocie(associe.id, 'structureId', e.target.value)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Sélectionnez une société</option>
                      {personnesMorales.map(pm => (
                        <option key={pm.id} value={pm.id}>
                          {pm.nom} ({pm.type})
                        </option>
                      ))}
                    </select>
                    {personnesMorales.length === 0 && isEditing && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Aucune société disponible. Créez d'abord une autre société.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Fonction"
                    value={associe.fonction}
                    onChange={(e) => updateAssocie(associe.id, 'fonction', e.target.value)}
                    placeholder="Gérant, Associé, Président..."
                    disabled={!isEditing}
                  />

                  <Input
                    label="Pourcentage de parts (%)"
                    type="number"
                    value={associe.pourcentageParts}
                    onChange={(e) => updateAssocie(associe.id, 'pourcentageParts', Number(e.target.value))}
                    required
                    min={0}
                    max={100}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            )})}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={addAssocie}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un associé
            </Button>

            {totalParts !== 100 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                ⚠️ Le total des parts doit être exactement 100%
              </div>
            )}
          </div>
        )}

        {/* Patrimoine */}
        {activeSection === 'patrimoine' && (
          <div className="space-y-6">
            {/* Biens immobiliers de cette société */}
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Biens immobiliers de cette société</h3>
                <p className="text-sm text-gray-600 mt-1">Propriétés détenues par la société</p>
              </div>

              {biens.length === 0 ? (
                <p className="text-gray-500 text-sm mb-4">Aucun bien immobilier pour cette société</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Type de bien</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Adresse</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Loyer mensuel</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Valeur estimée</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Crédit restant</th>
                        <th className="w-20 py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {biens.map((bien) => {
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

                              {/* Statut */}
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <select
                                    value={bien.statut || 'En_location'}
                                    onChange={(e) => updateBien(bien.id, 'statut', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded"
                                  >
                                    <option value="En_location">En location</option>
                                    <option value="Vacant">Vacant</option>
                                    <option value="En_travaux">En travaux</option>
                                  </select>
                                ) : (
                                  <span className="text-gray-900">{(bien.statut || 'En_location').replace(/_/g, ' ')}</span>
                                )}
                              </td>

                              {/* Loyer mensuel */}
                              <td className="py-3 px-4 text-right">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={bien.loyerMensuel || 0}
                                    onChange={(e) => updateBien(bien.id, 'loyerMensuel', Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                                    disabled={bien.statut !== 'En_location'}
                                  />
                                ) : (
                                  bien.statut === 'En_location' && bien.loyerMensuel ? (
                                    <span className="font-semibold text-blue-600">{bien.loyerMensuel.toLocaleString('fr-FR')} €</span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                  )
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
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); cancelBienEdit(bien.id); }}
                                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                        title="Annuler"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
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

            {/* Crédits en cours de cette société */}
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Crédits en cours de cette société</h3>
                <p className="text-sm text-gray-600 mt-1">Emprunts et financements en cours</p>
              </div>

              {credits.length === 0 ? (
                <p className="text-gray-500 text-sm mb-4">Aucun crédit en cours pour cette société</p>
            ) : (
              <div className="space-y-4">
                {credits.map((credit) => {
                  const isEditing = editingCreditId === credit.id
                  return (
                  <div key={credit.id} className={`p-4 border border-gray-200 rounded-lg space-y-4 ${isEditing ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">Crédit</span>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingCreditId(credit.id)}
                              className="text-sm"
                            >
                              Modifier
                            </Button>
                            <button
                              type="button"
                              onClick={() => removeCredit(credit.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="primary"
                              onClick={() => validateCredit(credit.id)}
                              className="text-sm"
                            >
                              Valider
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => cancelCreditEdit(credit.id)}
                              className="text-sm"
                            >
                              Annuler
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de crédit
                        </label>
                        <select
                          value={credit.type}
                          onChange={(e) => updateCredit(credit.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          disabled={!isEditing}
                        >
                          <option value="Immobilier">Immobilier</option>
                          <option value="Consommation">Consommation</option>
                          <option value="Professionnel">Professionnel</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>

                      <Input
                        label="Organisme"
                        value={credit.organisme}
                        onChange={(e) => updateCredit(credit.id, 'organisme', e.target.value)}
                        placeholder="Banque / Organisme"
                        disabled={!isEditing}
                      />
                    </div>

                    {/* Si crédit immobilier, permettre de sélectionner un bien */}
                    {credit.type === 'Immobilier' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bien immobilier associé
                        </label>
                        <select
                          value={credit.bienAssocie || ''}
                          onChange={(e) => updateCredit(credit.id, 'bienAssocie', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          disabled={!isEditing}
                        >
                          <option value="">Sélectionnez un bien</option>
                          {biens.map(bien => (
                            <option key={bien.id} value={bien.id}>
                              {bien.adresse} - {bien.type}
                            </option>
                          ))}
                        </select>
                        {biens.length === 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ Aucun bien créé. Ajoutez d'abord un bien immobilier ci-dessus.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Montant initial (€)"
                        type="number"
                        value={credit.montantInitial}
                        onChange={(e) => updateCredit(credit.id, 'montantInitial', Number(e.target.value))}
                        placeholder="200000"
                        disabled={!isEditing}
                      />

                      <Input
                        label="Date de début"
                        type="date"
                        value={credit.dateDebut}
                        onChange={(e) => updateCredit(credit.id, 'dateDebut', e.target.value)}
                        disabled={!isEditing}
                      />

                      <Input
                        label="Durée (mois)"
                        type="number"
                        value={credit.nombreMois}
                        onChange={(e) => updateCredit(credit.id, 'nombreMois', Number(e.target.value))}
                        placeholder="240 (20 ans)"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Taux d'intérêt (%)"
                        type="number"
                        step="0.01"
                        value={credit.tauxInteret}
                        onChange={(e) => updateCredit(credit.id, 'tauxInteret', Number(e.target.value))}
                        placeholder="3.5"
                        disabled={!isEditing}
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mensualité (€)
                          <span className="text-green-600 ml-2">✓ Calculé</span>
                        </label>
                        <input
                          type="number"
                          value={credit.mensualite || 0}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Capital restant dû (€)
                          <span className="text-green-600 ml-2">✓ Calculé</span>
                        </label>
                        <input
                          type="number"
                          value={credit.capitalRestantDu || 0}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                        />
                      </div>
                    </div>

                    {credit.montantInitial > 0 && credit.mensualite && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="text-blue-900">
                          💡 <strong>Coût total du crédit :</strong>{' '}
                          {((credit.mensualite * credit.nombreMois) - credit.montantInitial).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                          {' '}({((((credit.mensualite * credit.nombreMois) / credit.montantInitial) - 1) * 100).toFixed(1)}% du capital emprunté)
                        </p>
                      </div>
                    )}
                  </div>
                )})}
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

        {/* Actions at the end, inside the Card */}
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
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white border-2 border-green-500 rounded-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
          >
            Enregistrer et fermer
          </button>
        </div>
      </Card>
    </form>

    {/* Modal Associé */}
    <Modal
      isOpen={showAssocieModal}
      onClose={() => setShowAssocieModal(false)}
      title="Ajouter un associé"
      size="xlarge"
    >
      <div className="space-y-6">
        {/* Recherche par dirigeant - Version collapsible */}
        <RechercheEntrepriseParDirigeant
          onAddEntreprises={handleAddEntreprisesAsAssocies}
        />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 font-medium">OU créer manuellement</span>
          </div>
        </div>

        {/* Formulaire manuel */}
        <AssocieFormV2
          onSubmit={handleCreateAssocie}
          onCancel={() => setShowAssocieModal(false)}
        />
      </div>
    </Modal>
    </>
  )
}

export default SocieteFormV2
