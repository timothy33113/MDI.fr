import React, { useState, useRef } from 'react'
import { Users, Building2, Plus, User, MoreHorizontal, Pencil, Trash2, MapPin, Mail, Phone } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import AssocieFormV2 from '@/components/forms/AssocieFormV2'
import SocieteFormV2 from '@/components/forms/SocieteFormV2'
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext'
import {
  EntrepriseApiResult,
  findExistingPersonneMorale,
  findExistingPersonnePhysique,
  createStructureFromDirigeantPP,
  createStructureFromDirigeantPM,
  mapFormeJuridiqueToType
} from '@/services/entrepriseApi'

import { TypeStructure } from '@/types'
import { getApeLabel } from '@/utils/apeCodeUtils'

const ProfileV2: React.FC = () => {
  const [showAssocieModal, setShowAssocieModal] = useState(false)
  const [showSocieteModal, setShowSocieteModal] = useState(false)
  const [editingAssocieId, setEditingAssocieId] = useState<string | null>(null)
  const [editingSocieteId, setEditingSocieteId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [structureToDelete, setStructureToDelete] = useState<{ id: string; nom: string; type: string } | null>(null)
  const associeFormRef = React.useRef<{ saveData: () => void } | null>(null)
  const societeFormRef = React.useRef<{ saveData: () => void } | null>(null)

  const { structures, addStructure, updateStructure, deleteStructure, refreshStructures } = useStructures()

  // Filtrer les structures par type
  const associes = structures.filter(s => s.type === 'PERSONNE_PHYSIQUE')
  const societes = structures.filter(s => s.type !== 'PERSONNE_PHYSIQUE')

  const handleCreateAssocie = async (data: any) => {
    if (editingAssocieId) {
      await updateStructure(editingAssocieId, data)
    } else {
      const newStructure = await addStructure(data)

      // Mettre à jour les sociétés qui contiennent un ID temporaire (temp-...) avec le vrai ID
      // Cela évite les doublons quand on crée une personne et sa société en même temps
      for (const structure of structures) {
        if (structure.personneMorale) {
          let needsUpdate = false

          // Mettre à jour les associés
          const updatedAssocies = structure.personneMorale.associes?.map(associe => {
            if (associe.structureId && associe.structureId.startsWith('temp-')) {
              // Vérifier si c'est bien la même personne (nom + prénom correspondent)
              const tempNom = `${data.personnePhysique?.prenom || ''} ${data.personnePhysique?.nom || data.nom || ''}`.trim()
              const associeNom = associe.nom || ''
              if (tempNom === associeNom || associeNom.includes(data.personnePhysique?.nom || '')) {
                needsUpdate = true
                return { ...associe, structureId: newStructure.id }
              }
            }
            return associe
          })

          // Mettre à jour les détenteurs
          const updatedDetenteurs = structure.detenteurs?.map(detenteur => {
            if (detenteur.porteurId && detenteur.porteurId.startsWith('temp-')) {
              needsUpdate = true
              return { ...detenteur, porteurId: newStructure.id }
            }
            return detenteur
          })

          if (needsUpdate) {
            console.log(`✅ Mise à jour de la société ${structure.nom} avec le vrai ID de ${data.nom}`)
            await updateStructure(structure.id, {
              ...structure,
              detenteurs: updatedDetenteurs,
              personneMorale: {
                ...structure.personneMorale,
                associes: updatedAssocies
              }
            })
          }
        }
      }

      localStorage.setItem('lastCreatedStructureId', newStructure.id)
      window.dispatchEvent(new CustomEvent('structureCreated', { detail: { structureId: newStructure.id } }))
    }
  }

  // Handler pour ajouter plusieurs entreprises comme associés depuis la recherche par dirigeant
  const handleAddEntreprisesAsAssocies = async (entreprises: EntrepriseApiResult[], searchedNom?: string, searchedPrenoms?: string) => {
    console.log('🎯 handleAddEntreprisesAsAssocies APPELÉ !')
    console.log(`🔍 Ajout de ${entreprises.length} entreprise(s) avec leurs dirigeants`)
    console.log(`🔍 Personne recherchée: ${searchedPrenoms} ${searchedNom}`)
    console.log('📋 Détails entreprises:', entreprises)

    let totalEntreprisesCreated = 0
    let totalDirigeantsCreated = 0
    let firstPersonnePhysiqueId: string | null = null
    let searchedPersonId: string | null = null // ID de la personne recherchée
    const errors: string[] = [] // Collecter les erreurs sans stopper

    // Créer une copie locale des structures pour la détection de doublons en temps réel
    let currentStructures = [...structures]

    for (const entreprise of entreprises) {
      try {
        // 1. Créer ou récupérer la structure de l'entreprise
        let entrepriseStructure = findExistingPersonneMorale(currentStructures, entreprise.siren, entreprise.nom_raison_sociale)

        if (entrepriseStructure) {
          console.log(`♻️ Entreprise existante: ${entreprise.nom_raison_sociale}`)
        } else {
          const structureData = {
            type: mapFormeJuridiqueToType(entreprise.nature_juridique),
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
              objetSocial: entreprise.activite_principale,
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
          entrepriseStructure = await addStructure(structureData)

          // IMPORTANT: Ajouter immédiatement à la liste locale pour la détection de doublons suivants
          currentStructures.push(entrepriseStructure)

          totalEntreprisesCreated++
          console.log(`✅ Entreprise créée: ${entreprise.nom_raison_sociale}`)
        }

        // 2. Créer les structures pour tous les dirigeants de cette entreprise
        if (entreprise.dirigeants && entreprise.dirigeants.length > 0) {
          console.log(`👥 Traitement de ${entreprise.dirigeants.length} dirigeant(s) pour ${entreprise.nom_raison_sociale}`)

          const dirigeantsStructures: any[] = []
          const dirigeantDetailsMap = new Map() // Map pour garder le lien entre structure et info dirigeant

          for (const dirigeant of entreprise.dirigeants) {
            let dirigeantStructure

            if (dirigeant.type_dirigeant === 'personne physique') {
              // Vérifier si la personne physique existe déjà (avec nom, prénom ET date de naissance)
              const existingPP = findExistingPersonnePhysique(
                currentStructures,  // Utiliser la liste locale qui se met à jour en temps réel
                dirigeant.nom || '',
                dirigeant.prenoms || '',
                dirigeant.date_de_naissance || dirigeant.annee_de_naissance
              )

              if (existingPP) {
                console.log(`  ♻️ Dirigeant PP existant: ${dirigeant.prenoms} ${dirigeant.nom}`)
                dirigeantStructure = existingPP
                // Utiliser la première personne physique (existante ou nouvelle) pour pré-remplir la modal
                if (!firstPersonnePhysiqueId) {
                  firstPersonnePhysiqueId = existingPP.id
                }
                // Vérifier si c'est la personne recherchée
                if (searchedNom && searchedPrenoms && !searchedPersonId) {
                  const nomMatch = dirigeant.nom?.toLowerCase().includes(searchedNom.toLowerCase())
                  const prenomMatch = dirigeant.prenoms?.toLowerCase().includes(searchedPrenoms.toLowerCase())
                  if (nomMatch && prenomMatch) {
                    searchedPersonId = existingPP.id
                    console.log(`  🎯 Personne recherchée trouvée (existante): ${dirigeant.prenoms} ${dirigeant.nom}`)
                  }
                }
              } else {
                try {
                  // Créer nouvelle structure Personne Physique
                  const ppData = createStructureFromDirigeantPP(dirigeant)
                  dirigeantStructure = await addStructure(ppData)

                  // IMPORTANT: Ajouter immédiatement à la liste locale pour la détection de doublons suivants
                  currentStructures.push(dirigeantStructure)

                  totalDirigeantsCreated++
                  console.log(`  ✅ Dirigeant PP créé: ${dirigeant.prenoms} ${dirigeant.nom}`)
                  // Utiliser la première personne physique créée pour pré-remplir la modal
                  if (!firstPersonnePhysiqueId) {
                    firstPersonnePhysiqueId = dirigeantStructure.id
                  }
                  // Vérifier si c'est la personne recherchée
                  if (searchedNom && searchedPrenoms && !searchedPersonId) {
                    const nomMatch = dirigeant.nom?.toLowerCase().includes(searchedNom.toLowerCase())
                    const prenomMatch = dirigeant.prenoms?.toLowerCase().includes(searchedPrenoms.toLowerCase())
                    if (nomMatch && prenomMatch) {
                      searchedPersonId = dirigeantStructure.id
                      console.log(`  🎯 Personne recherchée trouvée (nouvelle): ${dirigeant.prenoms} ${dirigeant.nom}`)
                    }
                  }
                } catch (error) {
                  const errorMsg = `Erreur création dirigeant PP ${dirigeant.prenoms} ${dirigeant.nom}: ${error}`
                  console.error(`  ❌ ${errorMsg}`)
                  errors.push(errorMsg)
                  // Continue avec le prochain dirigeant sans bloquer
                  continue
                }
              }
            } else {
              // Personne Morale
              const existingPM = findExistingPersonneMorale(
                currentStructures,  // Utiliser la liste locale qui se met à jour en temps réel
                dirigeant.siren,
                dirigeant.denomination
              )

              if (existingPM) {
                console.log(`  ♻️ Dirigeant PM existant: ${dirigeant.denomination}`)
                dirigeantStructure = existingPM
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

                try {
                  // Créer nouvelle structure Personne Morale avec les données complètes
                  const pmData = createStructureFromDirigeantPM(dirigeant, entrepriseCompleteData)
                  dirigeantStructure = await addStructure(pmData)

                  // IMPORTANT: Ajouter immédiatement à la liste locale pour la détection de doublons suivants
                  currentStructures.push(dirigeantStructure)

                  totalDirigeantsCreated++
                  console.log(`  ✅ Dirigeant PM créé: ${dirigeant.denomination}`)
                } catch (error) {
                  const errorMsg = `Erreur création dirigeant PM ${dirigeant.denomination}: ${error}`
                  console.error(`  ❌ ${errorMsg}`)
                  errors.push(errorMsg)
                  // Continue avec le prochain dirigeant sans bloquer
                  continue
                }
              }
            }

            // Si le dirigeant n'a pas pu être créé (erreur), on ne l'ajoute pas à la liste
            if (dirigeantStructure) {
              dirigeantsStructures.push(dirigeantStructure)
              // Garder les infos du dirigeant (qualité, type) pour les associés
              dirigeantDetailsMap.set(dirigeantStructure.id, dirigeant)
            }
          }

          // 3. Créer les associés dans personneMorale.associes avec les infos complètes
          const associesForForm = dirigeantsStructures.map(dirigeantStruct => {
            const dirigeant = dirigeantDetailsMap.get(dirigeantStruct.id)
            return {
              id: `associe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: (dirigeantStruct.type === 'PERSONNE_PHYSIQUE' ? 'PP' : 'PM') as 'PP' | 'PM',
              structureId: dirigeantStruct.id,
              nom: dirigeantStruct.nom,
              prenom: dirigeantStruct.personnePhysique?.prenom || '',
              fonction: dirigeant?.qualite || 'Dirigeant',
              pourcentageParts: 0
            }
          })

          // 4. Mettre à jour l'entreprise avec ses associés
          const updatedEntreprise = {
            ...entrepriseStructure,
            personneMorale: {
              ...entrepriseStructure.personneMorale,
              associes: [
                ...(entrepriseStructure.personneMorale?.associes || []),
                ...associesForForm
              ]
            }
          }

          try {
            await updateStructure(entrepriseStructure.id, updatedEntreprise)
            console.log(`📋 ${associesForForm.length} associé(s) ajouté(s) dans personneMorale.associes:`)
            associesForForm.forEach(a => {
              console.log(`   • ${a.prenom} ${a.nom} - ${a.fonction}`)
            })
          } catch (error) {
            const errorMsg = `Erreur mise à jour associés pour ${entreprise.nom_raison_sociale}: ${error}`
            console.error(`  ❌ ${errorMsg}`)
            errors.push(errorMsg)
          }

          // 5. Créer les relations de détention via l'API detenteurs (dirigeants → entreprise)
          console.log(`🔗 Création de ${dirigeantsStructures.length} relation(s) de détention pour ${entreprise.nom_raison_sociale}`)
          for (const dirigeantStruct of dirigeantsStructures) {
            try {
              const url = `/api/structures/${entrepriseStructure.id}/detenteurs`
              const payload = {
                porteurId: dirigeantStruct.id,
                pourcentage: 0
              }
              console.log(`  🌐 POST ${url}`, payload)

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
              })

              if (!response.ok) {
                const errorData = await response.json()
                console.error(`  ❌ Erreur création détenteur (${response.status}):`, errorData)
                errors.push(`Détenteur ${dirigeantStruct.nom} → ${entreprise.nom_raison_sociale}: ${errorData.error || 'erreur inconnue'}`)
              } else {
                const responseData = await response.json()
                console.log(`  ✅ Détenteur créé: ${dirigeantStruct.nom} → ${entreprise.nom_raison_sociale}`)
              }
            } catch (error) {
              console.error(`  ❌ Exception création détenteur:`, error)
              errors.push(`Exception détenteur ${dirigeantStruct.nom}: ${error}`)
            }
          }
        }
      } catch (error) {
        const errorMsg = `Erreur traitement entreprise ${entreprise.nom_raison_sociale}: ${error}`
        console.error(`❌ ${errorMsg}`)
        errors.push(errorMsg)
        // Continue avec la prochaine entreprise
      }
    }

    console.log(`
✅ RÉSUMÉ:
   • ${totalEntreprisesCreated} entreprise(s) créée(s)
   • ${totalDirigeantsCreated} dirigeant(s) créé(s)
   • Dirigeants ajoutés comme associés dans chaque entreprise (personneMorale.associes)
   • Relations de détention créées via API (table detenteurs)
${errors.length > 0 ? `   ⚠️ ${errors.length} erreur(s) rencontrée(s) - vérifiez les logs ci-dessus` : ''}
    `)

    if (errors.length > 0) {
      console.error('❌ Liste des erreurs:', errors)
    }

    // Rafraîchir toutes les structures depuis l'API pour charger les détenteurs créés
    console.log('🔄 Rafraîchissement des structures pour charger les détenteurs...')
    await refreshStructures()
    console.log('✅ Structures rafraîchies avec détenteurs')

    // Ouvrir la modal avec la personne recherchée en priorité, sinon la première personne physique
    const personToEdit = searchedPersonId || firstPersonnePhysiqueId
    if (personToEdit) {
      setEditingAssocieId(personToEdit)
      setShowAssocieModal(true)
      if (searchedPersonId) {
        console.log(`📝 Ouverture de la modal pour la personne recherchée: ${personToEdit}`)
      } else {
        console.log(`📝 Ouverture de la modal pour la première personne: ${personToEdit}`)
      }
    }
  }

  const handleCreateSociete = async (data: any) => {
    if (editingSocieteId) {
      await updateStructure(editingSocieteId, data)
    } else {
      const newStructure = await addStructure(data)
      localStorage.setItem('lastCreatedStructureId', newStructure.id)
      window.dispatchEvent(new CustomEvent('structureCreated', { detail: { structureId: newStructure.id } }))
    }
  }

  const handleEditAssocie = (id: string) => {
    setEditingAssocieId(id)
    setShowAssocieModal(true)
  }

  const handleEditSociete = (id: string) => {
    setEditingSocieteId(id)
    setShowSocieteModal(true)
  }

  const handleDeleteStructure = (id: string) => {
    const structure = structures.find(s => s.id === id)
    if (structure) {
      setStructureToDelete({
        id: structure.id,
        nom: structure.nom,
        type: structure.type
      })
      setShowDeleteModal(true)
    }
  }

  const confirmDelete = () => {
    if (structureToDelete) {
      console.log('🗑️ Suppression de la structure:', structureToDelete.id)
      deleteStructure(structureToDelete.id)
      setShowDeleteModal(false)
      setStructureToDelete(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setStructureToDelete(null)
  }

  const handleCloseAssocieModal = () => {
    // La fermeture se fait simplement en fermant la modale
    // Le formulaire AssocieFormV2 gère déjà l'auto-save dans son handleCancel
    setShowAssocieModal(false)
    setEditingAssocieId(null)
  }

  const handleCloseSocieteModal = () => {
    // La fermeture se fait simplement en fermant la modale
    // Le formulaire SocieteFormV2 gère déjà l'auto-save dans son handleCancel
    setShowSocieteModal(false)
    setEditingSocieteId(null)
  }

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu quand on clique ailleurs
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  // Compter les sociétés liées à un associé
  const countLinkedSocietes = (associeId: string) => {
    return societes.filter(s =>
      s.personneMorale?.associes?.some((a: any) => a.structureId === associeId) ||
      s.detenteurs?.some((d: any) => d.porteurId === associeId)
    ).length
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* ── Section Associés ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Associés <span className="text-gray-400 font-normal text-2xl">({associes.length})</span>
            </h1>
            <button
              onClick={() => setShowAssocieModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {associes.length === 0 ? (
            <div
              onClick={() => setShowAssocieModal(true)}
              className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-coral-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-coral-500" />
              </div>
              <p className="text-sm font-medium text-gray-900">Ajouter un associé</p>
              <p className="text-xs text-gray-500 mt-1">Personnes physiques participant à vos projets</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              {/* En-têtes de colonnes */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_100px_48px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Associé</span>
                <span>Adresse</span>
                <span>Sociétés</span>
                <span></span>
              </div>
              {/* Lignes */}
              {associes.map((associe, index) => {
                const photoUrl = associe.photo || associe.personnePhysique?.photo
                const linkedCount = countLinkedSocietes(associe.id)
                return (
                  <div
                    key={associe.id}
                    onClick={() => handleEditAssocie(associe.id)}
                    className={`flex items-center sm:grid sm:grid-cols-[1fr_1fr_100px_48px] gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      index < associes.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Avatar + Nom */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-coral-100 flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                          <img src={photoUrl} alt={associe.nom} className="w-full h-full object-cover" />
                        ) : associe.personnePhysique?.prenom || associe.personnePhysique?.nom ? (
                          <span className="text-coral-600 text-sm font-semibold">
                            {associe.personnePhysique?.prenom?.[0]?.toUpperCase() || ''}{associe.personnePhysique?.nom?.[0]?.toUpperCase() || ''}
                          </span>
                        ) : (
                          <User className="h-5 w-5 text-coral-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{associe.nom}</p>
                        <p className="text-xs text-gray-400 truncate">{associe.email || 'Personne physique'}</p>
                      </div>
                    </div>
                    {/* Adresse */}
                    <div className="hidden sm:block">
                      <p className="text-sm text-gray-500 truncate">{associe.adresse || '—'}</p>
                    </div>
                    {/* Sociétés liées */}
                    <div className="hidden sm:block">
                      {linkedCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-honey-50 text-honey-700 border border-honey-200">
                          {linkedCount}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                    {/* Menu "..." */}
                    <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === associe.id ? null : associe.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenuId === associe.id && (
                        <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => { handleEditAssocie(associe.id); setOpenMenuId(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modifier
                          </button>
                          <button
                            onClick={() => { handleDeleteStructure(associe.id); setOpenMenuId(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Section Sociétés ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Sociétés <span className="text-gray-400 font-normal text-2xl">({societes.length})</span>
            </h1>
            <button
              onClick={() => setShowSocieteModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Créer
            </button>
          </div>

          {societes.length === 0 ? (
            <div
              onClick={() => setShowSocieteModal(true)}
              className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-honey-100 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-honey-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">Créer une société</p>
              <p className="text-xs text-gray-500 mt-1">SCI, SARL, SASU et autres structures juridiques</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
              {/* En-têtes de colonnes */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_100px_48px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
                <span>Société</span>
                <span>SIREN</span>
                <span>Capital</span>
                <span>Création</span>
                <span></span>
              </div>
              {/* Lignes */}
              {societes.map((societe, index) => (
                <div
                  key={societe.id}
                  onClick={() => handleEditSociete(societe.id)}
                  className={`flex items-center sm:grid sm:grid-cols-[1fr_120px_120px_100px_48px] gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    index < societes.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Icon + Nom + Type */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-honey-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-honey-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{societe.nom}</p>
                      <span className="inline-block text-[11px] font-medium text-honey-700 bg-honey-50 border border-honey-200 px-1.5 py-0.5 rounded-md">
                        {societe.type}
                      </span>
                    </div>
                  </div>
                  {/* SIREN */}
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-500 font-mono">{societe.personneMorale?.siren || '—'}</p>
                  </div>
                  {/* Capital */}
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-500">
                      {societe.personneMorale?.capitalSocial && societe.personneMorale.capitalSocial > 0
                        ? `${societe.personneMorale.capitalSocial.toLocaleString('fr-FR')} €`
                        : '—'}
                    </p>
                  </div>
                  {/* Date création */}
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-500">
                      {societe.personneMorale?.dateCreation
                        ? new Date(societe.personneMorale.dateCreation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' })
                        : '—'}
                    </p>
                  </div>
                  {/* Menu "..." */}
                  <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === societe.id ? null : societe.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenuId === societe.id && (
                      <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => { handleEditSociete(societe.id); setOpenMenuId(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => { handleDeleteStructure(societe.id); setOpenMenuId(null) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Associé */}
      <Modal
        isOpen={showAssocieModal}
        onClose={handleCloseAssocieModal}
        title={editingAssocieId ? 'Modifier un associé' : 'Ajouter un associé'}
        size="xlarge"
        closeOnBackdropClick={true}
      >
        <AssocieFormV2
          associeId={editingAssocieId}
          onSubmit={handleCreateAssocie}
          onCancel={handleCloseAssocieModal}
          showRechercheDirecteant={!editingAssocieId}
          onAddEntreprisesAsAssocies={handleAddEntreprisesAsAssocies}
        />
      </Modal>

      {/* Modal Société */}
      <Modal
        isOpen={showSocieteModal}
        onClose={handleCloseSocieteModal}
        title={editingSocieteId ? 'Modifier une société' : 'Créer une société'}
        size="large"
        closeOnBackdropClick={true}
      >
        <SocieteFormV2
          societeId={editingSocieteId}
          onSubmit={handleCreateSociete}
          onCancel={handleCloseSocieteModal}
        />
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={cancelDelete}
        title="Confirmer la suppression"
        size="small"
        closeOnBackdropClick={true}
      >
        <div className="py-2">
          <p className="text-gray-700 text-sm mb-4">
            Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{structureToDelete?.nom}</span> ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={cancelDelete}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ProfileV2
