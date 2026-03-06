import React, { useState, useRef } from 'react'
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'
import { Home, Plus, Trash2, CreditCard, Pencil, MoreHorizontal } from 'lucide-react'

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
  bienAssocie?: string
  capitalRestantDu?: number
  mensualite?: number
}

interface BienAvecProprietaire extends BienImmobilier {
  proprietaireId: string
  proprietaireNom: string
  proprietaireType: string
}

interface CreditAvecProprietaire extends Credit {
  proprietaireId: string
  proprietaireNom: string
  proprietaireType: string
}

const PatrimoinePage: React.FC = () => {
  const { structures, updateStructure } = useStructures()
  const [activeTab, setActiveTab] = useState<'biens' | 'credits'>('biens')
  const [showBienModal, setShowBienModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [editingBien, setEditingBien] = useState<BienAvecProprietaire | null>(null)
  const [editingCredit, setEditingCredit] = useState<CreditAvecProprietaire | null>(null)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'bien' | 'credit', item: any } | null>(null)

  // Formulaire nouveau bien
  const [newBien, setNewBien] = useState({
    proprietaireId: '',
    type: 'Investissement_Locatif' as const,
    adresse: '',
    valeurEstimee: 0,
    loyerMensuel: 0,
    statut: 'En_location' as const
  })

  // Formulaire nouveau crédit
  const [newCredit, setNewCredit] = useState({
    proprietaireId: '',
    type: 'Immobilier' as const,
    organisme: '',
    montantInitial: 0,
    mensualite: 0,
    dateDebut: '',
    nombreMois: 240,
    tauxInteret: 3.5,
    bienAssocie: ''
  })

  // Récupérer tous les biens de toutes les structures
  const getAllBiens = (): BienAvecProprietaire[] => {
    const biens: BienAvecProprietaire[] = []
    structures.forEach(structure => {
      if (structure.personnePhysique?.biens) {
        structure.personnePhysique.biens.forEach((bien: any) => {
          biens.push({
            ...bien,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom,
            proprietaireType: structure.type
          })
        })
      }
      if (structure.personneMorale?.biens) {
        structure.personneMorale.biens.forEach((bien: any) => {
          biens.push({
            ...bien,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom,
            proprietaireType: structure.type
          })
        })
      }
    })
    return biens
  }

  // Récupérer tous les crédits de toutes les structures
  const getAllCredits = (): CreditAvecProprietaire[] => {
    const credits: CreditAvecProprietaire[] = []
    structures.forEach(structure => {
      if (structure.personnePhysique?.credits) {
        structure.personnePhysique.credits.forEach((credit: any) => {
          credits.push({
            ...credit,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom,
            proprietaireType: structure.type
          })
        })
      }
      if (structure.personneMorale?.credits) {
        structure.personneMorale.credits.forEach((credit: any) => {
          credits.push({
            ...credit,
            proprietaireId: structure.id,
            proprietaireNom: structure.nom,
            proprietaireType: structure.type
          })
        })
      }
    })
    return credits
  }

  const tousLesBiens = getAllBiens()
  const tousLesCredits = getAllCredits()

  const handleEditBien = (bien: BienAvecProprietaire) => {
    setEditingBien(bien)
    setNewBien({
      proprietaireId: bien.proprietaireId,
      type: bien.type,
      adresse: bien.adresse,
      valeurEstimee: bien.valeurEstimee,
      loyerMensuel: bien.loyerMensuel || 0,
      statut: bien.statut || 'En_location'
    })
    setShowBienModal(true)
  }

  const handleAddBien = () => {
    if (!newBien.proprietaireId || !newBien.adresse) {
      setFormError('Veuillez remplir tous les champs obligatoires')
      return
    }
    setFormError('')

    const structure = structures.find(s => s.id === newBien.proprietaireId)
    if (!structure) return

    const biens = structure.personnePhysique?.biens || structure.personneMorale?.biens || []

    let nouveauxBiens
    if (editingBien) {
      // Mode édition - mettre à jour le bien existant
      nouveauxBiens = biens.map((b: any) =>
        b.id === editingBien.id ? {
          ...b,
          type: newBien.type,
          adresse: newBien.adresse,
          valeurEstimee: newBien.valeurEstimee,
          loyerMensuel: newBien.loyerMensuel,
          statut: newBien.statut
        } : b
      )
    } else {
      // Mode création - ajouter un nouveau bien
      const nouveauBien = {
        id: Date.now().toString(),
        type: newBien.type,
        adresse: newBien.adresse,
        valeurEstimee: newBien.valeurEstimee,
        loyerMensuel: newBien.loyerMensuel,
        statut: newBien.statut
      }
      nouveauxBiens = [...biens, nouveauBien]
    }

    if (structure.type === 'PERSONNE_PHYSIQUE') {
      updateStructure(structure.id, {
        personnePhysique: {
          ...structure.personnePhysique,
          biens: nouveauxBiens
        }
      })
    } else {
      updateStructure(structure.id, {
        personneMorale: {
          ...structure.personneMorale,
          biens: nouveauxBiens
        }
      })
    }

    // Réinitialiser le formulaire et fermer le modal
    setNewBien({
      proprietaireId: '',
      type: 'Investissement_Locatif',
      adresse: '',
      valeurEstimee: 0,
      loyerMensuel: 0,
      statut: 'En_location'
    })
    setEditingBien(null)
    setShowBienModal(false)
  }

  const handleEditCredit = (credit: CreditAvecProprietaire) => {
    setEditingCredit(credit)
    setNewCredit({
      proprietaireId: credit.proprietaireId,
      type: credit.type,
      organisme: credit.organisme,
      montantInitial: credit.montantInitial,
      mensualite: credit.mensualite || 0,
      dateDebut: credit.dateDebut,
      nombreMois: credit.nombreMois,
      tauxInteret: credit.tauxInteret,
      bienAssocie: credit.bienAssocie || ''
    })
    setShowCreditModal(true)
  }

  const handleAddCredit = () => {
    if (!newCredit.proprietaireId || !newCredit.organisme) {
      setFormError('Veuillez remplir tous les champs obligatoires')
      return
    }
    setFormError('')

    const structure = structures.find(s => s.id === newCredit.proprietaireId)
    if (!structure) return

    // Mensualité saisie manuellement (inclut assurance, etc.)
    const mensualite = newCredit.mensualite || 0

    // Calcul du capital restant dû basé sur les mois écoulés
    let capitalRestantDu = newCredit.montantInitial
    if (newCredit.dateDebut && mensualite > 0 && newCredit.nombreMois > 0) {
      const dateDebut = new Date(newCredit.dateDebut)
      const aujourdhui = new Date()
      const moisEcoules = Math.max(0, Math.floor((aujourdhui.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      const moisRestants = Math.max(0, newCredit.nombreMois - moisEcoules)
      capitalRestantDu = Math.round(mensualite * moisRestants * 100) / 100
      if (moisEcoules >= newCredit.nombreMois) capitalRestantDu = 0
    }

    const credits = structure.personnePhysique?.credits || structure.personneMorale?.credits || []

    let nouveauxCredits
    if (editingCredit) {
      // Mode édition - mettre à jour le crédit existant
      nouveauxCredits = credits.map((c: any) =>
        c.id === editingCredit.id ? {
          ...c,
          type: newCredit.type,
          organisme: newCredit.organisme,
          montantInitial: newCredit.montantInitial,
          dateDebut: newCredit.dateDebut,
          nombreMois: newCredit.nombreMois,
          tauxInteret: newCredit.tauxInteret,
          bienAssocie: newCredit.bienAssocie,
          mensualite,
          capitalRestantDu
        } : c
      )
    } else {
      // Mode création - ajouter un nouveau crédit
      const nouveauCredit = {
        id: Date.now().toString(),
        type: newCredit.type,
        organisme: newCredit.organisme,
        montantInitial: newCredit.montantInitial,
        dateDebut: newCredit.dateDebut,
        nombreMois: newCredit.nombreMois,
        tauxInteret: newCredit.tauxInteret,
        bienAssocie: newCredit.bienAssocie,
        mensualite,
        capitalRestantDu
      }
      nouveauxCredits = [...credits, nouveauCredit]
    }

    if (structure.type === 'PERSONNE_PHYSIQUE') {
      updateStructure(structure.id, {
        personnePhysique: {
          ...structure.personnePhysique,
          credits: nouveauxCredits
        }
      })
    } else {
      updateStructure(structure.id, {
        personneMorale: {
          ...structure.personneMorale,
          credits: nouveauxCredits
        }
      })
    }

    // Réinitialiser le formulaire et fermer le modal
    setNewCredit({
      proprietaireId: '',
      type: 'Immobilier',
      organisme: '',
      montantInitial: 0,
      mensualite: 0,
      dateDebut: '',
      nombreMois: 240,
      tauxInteret: 3.5,
      bienAssocie: ''
    })
    setEditingCredit(null)
    setShowCreditModal(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === 'bien') {
      doDeleteBien(deleteTarget.item)
    } else {
      doDeleteCredit(deleteTarget.item)
    }
    setDeleteTarget(null)
  }

  const doDeleteBien = (bien: BienAvecProprietaire) => {
    const structure = structures.find(s => s.id === bien.proprietaireId)
    if (!structure) return

    const biens = structure.personnePhysique?.biens || structure.personneMorale?.biens || []
    const nouveauxBiens = biens.filter((b: any) => b.id !== bien.id)

    if (structure.type === 'PERSONNE_PHYSIQUE') {
      updateStructure(structure.id, {
        personnePhysique: {
          ...structure.personnePhysique,
          biens: nouveauxBiens
        }
      })
    } else {
      updateStructure(structure.id, {
        personneMorale: {
          ...structure.personneMorale,
          biens: nouveauxBiens
        }
      })
    }
  }

  const handleDeleteCredit = (credit: CreditAvecProprietaire) => {
    setDeleteTarget({ type: 'credit', item: credit })
  }

  const handleDeleteBien = (bien: BienAvecProprietaire) => {
    setDeleteTarget({ type: 'bien', item: bien })
  }

  const doDeleteCredit = (credit: CreditAvecProprietaire) => {
    const structure = structures.find(s => s.id === credit.proprietaireId)
    if (!structure) return

    const credits = structure.personnePhysique?.credits || structure.personneMorale?.credits || []
    const nouveauxCredits = credits.filter((c: any) => c.id !== credit.id)

    if (structure.type === 'PERSONNE_PHYSIQUE') {
      updateStructure(structure.id, {
        personnePhysique: {
          ...structure.personnePhysique,
          credits: nouveauxCredits
        }
      })
    } else {
      updateStructure(structure.id, {
        personneMorale: {
          ...structure.personneMorale,
          credits: nouveauxCredits
        }
      })
    }
  }

  // Calculer les totaux
  const totalValeurBiens = tousLesBiens.reduce((sum, bien) => sum + bien.valeurEstimee, 0)
  const totalLoyersMensuels = tousLesBiens.reduce((sum, bien) => sum + (bien.loyerMensuel || 0), 0)
  const totalCapitalEmprunte = tousLesCredits.reduce((sum, credit) => sum + credit.montantInitial, 0)
  const totalCapitalRestant = tousLesCredits.reduce((sum, credit) => sum + (credit.capitalRestantDu || 0), 0)
  const totalMensualites = tousLesCredits.reduce((sum, credit) => sum + (credit.mensualite || 0), 0)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    if (openMenuId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  const getStatutBadge = (statut?: string) => {
    if (!statut) return null
    const styles: Record<string, string> = {
      En_location: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      Vacant: 'bg-gray-50 text-gray-600 border border-gray-200',
      En_travaux: 'bg-honey-50 text-honey-700 border border-honey-200',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[statut] || styles.Vacant}`}>
        {statut.replace(/_/g, ' ')}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-6">Patrimoine</h1>

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Biens</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{tousLesBiens.length}</p>
            <p className="text-xs text-gray-400 mt-1">{totalValeurBiens.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Loyers / mois</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{totalLoyersMensuels.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-gray-400 mt-1">{(totalLoyersMensuels * 12).toLocaleString('fr-FR')} € / an</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Crédits</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{tousLesCredits.length}</p>
            <p className="text-xs text-gray-400 mt-1">{totalCapitalEmprunte.toLocaleString('fr-FR')} € emprunté</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/60 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Capital restant</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{totalCapitalRestant.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-gray-400 mt-1">{totalMensualites.toLocaleString('fr-FR')} € / mois</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('biens')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'biens'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Biens ({tousLesBiens.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'credits'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Crédits ({tousLesCredits.length})
          </button>
        </div>

        {/* ── Biens ── */}
        {activeTab === 'biens' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div />
              <button
                onClick={() => setShowBienModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>

            {tousLesBiens.length === 0 ? (
              <div
                onClick={() => setShowBienModal(true)}
                className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Home className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">Ajouter un bien</p>
                <p className="text-xs text-gray-500 mt-1">Renseignez vos biens immobiliers</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                <div className="hidden sm:grid sm:grid-cols-[1fr_140px_140px_100px_48px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <span>Bien</span>
                  <span>Valeur</span>
                  <span>Loyer</span>
                  <span>Statut</span>
                  <span></span>
                </div>
                {tousLesBiens.map((bien, index) => {
                  const menuKey = `bien-${bien.proprietaireId}-${bien.id}`
                  return (
                    <div
                      key={menuKey}
                      className={`flex items-center sm:grid sm:grid-cols-[1fr_140px_140px_100px_48px] gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
                        index < tousLesBiens.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Home className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{bien.adresse}</p>
                          <p className="text-xs text-gray-400 truncate">{bien.proprietaireNom} · {bien.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">{bien.valeurEstimee.toLocaleString('fr-FR')} €</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm text-gray-500">
                          {bien.loyerMensuel ? `${bien.loyerMensuel.toLocaleString('fr-FR')} €` : '—'}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        {getStatutBadge(bien.statut)}
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenuId === menuKey && (
                          <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => { handleEditBien(bien); setOpenMenuId(null) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </button>
                            <button
                              onClick={() => { handleDeleteBien(bien); setOpenMenuId(null) }}
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
        )}

        {/* ── Crédits ── */}
        {activeTab === 'credits' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div />
              <button
                onClick={() => setShowCreditModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-coral-200 via-honey-200 to-honey-100 hover:from-coral-300 hover:via-honey-300 hover:to-honey-200 text-gray-900 rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>

            {tousLesCredits.length === 0 ? (
              <div
                onClick={() => setShowCreditModal(true)}
                className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-gray-300 transition-colors"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-900">Ajouter un crédit</p>
                <p className="text-xs text-gray-500 mt-1">Renseignez vos crédits en cours</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
                <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_120px_48px] gap-4 px-6 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <span>Crédit</span>
                  <span>Montant</span>
                  <span>Mensualité</span>
                  <span>Restant dû</span>
                  <span></span>
                </div>
                {tousLesCredits.map((credit, index) => {
                  const menuKey = `credit-${credit.proprietaireId}-${credit.id}`
                  return (
                    <div
                      key={menuKey}
                      className={`flex items-center sm:grid sm:grid-cols-[1fr_120px_120px_120px_48px] gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
                        index < tousLesCredits.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{credit.organisme}</p>
                          <p className="text-xs text-gray-400 truncate">{credit.proprietaireNom} · {credit.type} · {credit.tauxInteret}%</p>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">{credit.montantInitial.toLocaleString('fr-FR')} €</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm text-gray-500">
                          {credit.mensualite ? `${credit.mensualite.toLocaleString('fr-FR')} €` : '—'}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-orange-600">
                          {credit.capitalRestantDu !== undefined ? `${credit.capitalRestantDu.toLocaleString('fr-FR')} €` : '—'}
                        </p>
                      </div>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenuId === menuKey && (
                          <div ref={menuRef} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => { handleEditCredit(credit); setOpenMenuId(null) }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </button>
                            <button
                              onClick={() => { handleDeleteCredit(credit); setOpenMenuId(null) }}
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
        )}
      </main>

      {/* Modal Ajouter un bien */}
      <Modal
        isOpen={showBienModal}
        onClose={() => {
          setShowBienModal(false)
          setEditingBien(null)
        }}
        title={editingBien ? "Modifier le bien immobilier" : "Ajouter un bien immobilier"}
        size="large"
      >
        <div className="space-y-5">
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Propriétaire *
            </label>
            <select
              value={newBien.proprietaireId}
              onChange={(e) => setNewBien({ ...newBien, proprietaireId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              required
            >
              <option value="">Sélectionnez un propriétaire</option>
              {structures.map(structure => (
                <option key={structure.id} value={structure.id}>
                  {structure.nom} ({structure.type === 'PERSONNE_PHYSIQUE' ? 'Personne physique' : structure.type})
                </option>
              ))}
            </select>
          </div>

          <AddressAutocomplete
            label="Adresse *"
            value={newBien.adresse}
            onChange={(val) => setNewBien({ ...newBien, adresse: val })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Type de bien *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'Residence_Principale', label: 'Résidence principale' },
                { value: 'Residence_Secondaire', label: 'Résidence secondaire' },
                { value: 'Investissement_Locatif', label: 'Investissement locatif' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewBien({ ...newBien, type: option.value as any })}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    newBien.type === option.value
                      ? 'bg-gradient-to-br from-coral-100 via-honey-100 to-honey-50 border border-honey-200 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Valeur estimée (€)"
            type="number"
            value={newBien.valeurEstimee || ''}
            onChange={(e) => setNewBien({ ...newBien, valeurEstimee: Number(e.target.value) })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Statut
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'En_location', label: 'En location' },
                { value: 'Vacant', label: 'Vacant' },
                { value: 'En_travaux', label: 'En travaux' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewBien({ ...newBien, statut: option.value as any })}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    newBien.statut === option.value
                      ? 'bg-gradient-to-br from-coral-100 via-honey-100 to-honey-50 border border-honey-200 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {newBien.statut === 'En_location' && (
            <Input
              label="Loyer mensuel (€)"
              type="number"
              value={newBien.loyerMensuel || ''}
              onChange={(e) => setNewBien({ ...newBien, loyerMensuel: Number(e.target.value) })}
            />
          )}

          <div className="flex justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={() => {
                setShowBienModal(false)
                setEditingBien(null)
              }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddBien}
              className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {editingBien ? "Modifier le bien" : "Ajouter le bien"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Ajouter un crédit */}
      <Modal
        isOpen={showCreditModal}
        onClose={() => {
          setShowCreditModal(false)
          setEditingCredit(null)
        }}
        title={editingCredit ? "Modifier le crédit" : "Ajouter un crédit"}
        size="large"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Propriétaire *
            </label>
            <select
              value={newCredit.proprietaireId}
              onChange={(e) => setNewCredit({ ...newCredit, proprietaireId: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              required
            >
              <option value="">Sélectionnez un propriétaire</option>
              {structures.map(structure => (
                <option key={structure.id} value={structure.id}>
                  {structure.nom} ({structure.type === 'PERSONNE_PHYSIQUE' ? 'Personne physique' : structure.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Type de crédit *
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[
                { value: 'Immobilier', label: 'Immobilier' },
                { value: 'Consommation', label: 'Consommation' },
                { value: 'Professionnel', label: 'Professionnel' },
                { value: 'Autre', label: 'Autre' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNewCredit({ ...newCredit, type: option.value as any })}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    newCredit.type === option.value
                      ? 'bg-gradient-to-br from-coral-100 via-honey-100 to-honey-50 border border-honey-200 text-gray-900'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisme *</label>
            <select
              value={newCredit.organisme}
              onChange={(e) => setNewCredit({ ...newCredit, organisme: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
            >
              <option value="">Sélectionnez un organisme</option>
              {['Banque Populaire', 'Banque Postale (La)', 'Banque POUYANNE', 'BNP Paribas', 'Boursorama', 'BPIfrance', 'Caixa', 'Caisse d\'Épargne', 'CCF', 'CIC', 'Crédit Agricole', 'Crédit du Nord', 'Crédit Foncier', 'Crédit Mutuel', 'Fortuneo', 'HSBC', 'ING', 'LCL', 'La Banque Palatine', 'Milleis Banque', 'Monabanq', 'N26', 'Nickel', 'Orange Bank', 'Revolut', 'Société Générale', 'Autre'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant initial (€)"
              type="number"
              value={newCredit.montantInitial || ''}
              onChange={(e) => setNewCredit({ ...newCredit, montantInitial: Number(e.target.value) })}
            />

            <Input
              label="Date de début"
              type="date"
              value={newCredit.dateDebut}
              onChange={(e) => setNewCredit({ ...newCredit, dateDebut: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Durée (mois)"
              type="number"
              value={newCredit.nombreMois || ''}
              onChange={(e) => setNewCredit({ ...newCredit, nombreMois: Number(e.target.value) })}
              placeholder="240 (20 ans)"
            />

            <Input
              label="Taux d'intérêt (%)"
              type="number"
              step="0.01"
              value={newCredit.tauxInteret || ''}
              onChange={(e) => setNewCredit({ ...newCredit, tauxInteret: Number(e.target.value) })}
            />

            <Input
              label="Mensualité (€)"
              type="number"
              value={newCredit.mensualite || ''}
              onChange={(e) => setNewCredit({ ...newCredit, mensualite: Number(e.target.value) })}
              helperText="Assurance incluse"
            />
          </div>

          {newCredit.type === 'Immobilier' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Bien immobilier associé
              </label>
              <select
                value={newCredit.bienAssocie}
                onChange={(e) => setNewCredit({ ...newCredit, bienAssocie: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              >
                <option value="">Sélectionnez un bien</option>
                {tousLesBiens.map(bien => (
                  <option key={`${bien.proprietaireId}-${bien.id}`} value={bien.id}>
                    {bien.adresse} ({bien.proprietaireNom})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={() => {
                setShowCreditModal(false)
                setEditingCredit(null)
              }}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAddCredit}
              className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {editingCredit ? "Modifier le crédit" : "Ajouter le crédit"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        size="small"
        onConfirm={confirmDelete}
        confirmText="Supprimer"
        confirmVariant="danger"
      >
        <p className="text-sm text-gray-600">
          {deleteTarget?.type === 'bien'
            ? `Supprimer le bien "${deleteTarget.item.adresse}" ?`
            : `Supprimer le crédit "${deleteTarget?.item.organisme}" ?`
          }
        </p>
        <p className="text-xs text-gray-400 mt-2">Cette action est irréversible.</p>
      </Modal>
    </div>
  )
}

export default PatrimoinePage
