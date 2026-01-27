import React, { useState } from 'react'
import { useStructuresContext as useStructures } from '@/contexts/StructuresContext'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { Home, Plus, Trash2, CreditCard, Edit } from 'lucide-react'

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
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

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
      dateDebut: credit.dateDebut,
      nombreMois: credit.nombreMois,
      tauxInteret: credit.tauxInteret,
      bienAssocie: credit.bienAssocie || ''
    })
    setShowCreditModal(true)
  }

  const handleAddCredit = () => {
    if (!newCredit.proprietaireId || !newCredit.organisme) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const structure = structures.find(s => s.id === newCredit.proprietaireId)
    if (!structure) return

    // Calcul automatique de la mensualité
    let mensualite = 0
    let capitalRestantDu = newCredit.montantInitial

    if (newCredit.montantInitial > 0 && newCredit.nombreMois > 0 && newCredit.tauxInteret > 0) {
      const capital = newCredit.montantInitial
      const tauxMensuel = newCredit.tauxInteret / 100 / 12
      const nbMois = newCredit.nombreMois

      mensualite = capital * (tauxMensuel * Math.pow(1 + tauxMensuel, nbMois)) / (Math.pow(1 + tauxMensuel, nbMois) - 1)
      mensualite = Math.round(mensualite * 100) / 100

      if (newCredit.dateDebut) {
        const dateDebut = new Date(newCredit.dateDebut)
        const aujourdhui = new Date()
        const moisEcoules = Math.max(0, Math.floor((aujourdhui.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24 * 30)))

        if (moisEcoules < nbMois) {
          capitalRestantDu = capital * (Math.pow(1 + tauxMensuel, nbMois) - Math.pow(1 + tauxMensuel, moisEcoules)) / (Math.pow(1 + tauxMensuel, nbMois) - 1)
          capitalRestantDu = Math.round(capitalRestantDu * 100) / 100
        } else {
          capitalRestantDu = 0
        }
      }
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
      dateDebut: '',
      nombreMois: 240,
      tauxInteret: 3.5,
      bienAssocie: ''
    })
    setEditingCredit(null)
    setShowCreditModal(false)
  }

  const handleDeleteBien = (bien: BienAvecProprietaire) => {
    if (!confirm(`Supprimer le bien ${bien.adresse} ?`)) return

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
    if (!confirm(`Supprimer le crédit ${credit.organisme} ?`)) return

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Patrimoine global</h1>
          <p className="text-gray-600 mt-2">
            Vue d'ensemble de tous vos biens immobiliers et crédits en cours
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="text-sm text-gray-600">Biens immobiliers</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{tousLesBiens.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              Valeur totale: {totalValeurBiens.toLocaleString('fr-FR')} €
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600">Loyers mensuels</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {totalLoyersMensuels.toLocaleString('fr-FR')} €
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Annuel: {(totalLoyersMensuels * 12).toLocaleString('fr-FR')} €
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600">Crédits en cours</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{tousLesCredits.length}</div>
            <div className="text-xs text-gray-500 mt-1">
              Capital emprunté: {totalCapitalEmprunte.toLocaleString('fr-FR')} €
            </div>
          </Card>
          <Card>
            <div className="text-sm text-gray-600">Capital restant dû</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {totalCapitalRestant.toLocaleString('fr-FR')} €
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Mensualités: {totalMensualites.toLocaleString('fr-FR')} €
            </div>
          </Card>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('biens')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'biens'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="inline h-4 w-4 mr-2" />
            Biens immobiliers ({tousLesBiens.length})
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'credits'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="inline h-4 w-4 mr-2" />
            Crédits en cours ({tousLesCredits.length})
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'biens' && (
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Biens immobiliers</h2>
              <Button onClick={() => setShowBienModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un bien
              </Button>
            </div>

            {tousLesBiens.length === 0 ? (
              <div className="text-center py-12">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun bien immobilier renseigné</p>
                <Button onClick={() => setShowBienModal(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier bien
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tousLesBiens.map((bien) => (
                  <div
                    key={`${bien.proprietaireId}-${bien.id}`}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-lg text-gray-900">{bien.adresse}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Propriétaire:</span>
                            <span className="ml-2 font-medium">{bien.proprietaireNom}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Type:</span>
                            <span className="ml-2">{bien.type.replace(/_/g, ' ')}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Valeur estimée:</span>
                            <span className="ml-2 font-medium text-green-600">
                              {bien.valeurEstimee.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                          {bien.loyerMensuel && (
                            <div>
                              <span className="text-gray-600">Loyer mensuel:</span>
                              <span className="ml-2 font-medium text-blue-600">
                                {bien.loyerMensuel.toLocaleString('fr-FR')} €
                              </span>
                            </div>
                          )}
                          {bien.statut && (
                            <div>
                              <span className="text-gray-600">Statut:</span>
                              <span className="ml-2">{bien.statut.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBien(bien)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBien(bien)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'credits' && (
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Crédits en cours</h2>
              <Button onClick={() => setShowCreditModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un crédit
              </Button>
            </div>

            {tousLesCredits.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun crédit en cours</p>
                <Button onClick={() => setShowCreditModal(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter votre premier crédit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tousLesCredits.map((credit) => (
                  <div
                    key={`${credit.proprietaireId}-${credit.id}`}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-5 w-5 text-orange-600" />
                          <h3 className="font-semibold text-lg text-gray-900">
                            {credit.type} - {credit.organisme}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Propriétaire:</span>
                            <span className="ml-2 font-medium">{credit.proprietaireNom}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Montant initial:</span>
                            <span className="ml-2 font-medium">
                              {credit.montantInitial.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                          {credit.mensualite && (
                            <div>
                              <span className="text-gray-600">Mensualité:</span>
                              <span className="ml-2 font-medium text-orange-600">
                                {credit.mensualite.toLocaleString('fr-FR')} €
                              </span>
                            </div>
                          )}
                          {credit.capitalRestantDu !== undefined && (
                            <div>
                              <span className="text-gray-600">Capital restant dû:</span>
                              <span className="ml-2 font-medium text-red-600">
                                {credit.capitalRestantDu.toLocaleString('fr-FR')} €
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-600">Durée:</span>
                            <span className="ml-2">{credit.nombreMois} mois</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Taux:</span>
                            <span className="ml-2">{credit.tauxInteret}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCredit(credit)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCredit(credit)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propriétaire *
            </label>
            <select
              value={newBien.proprietaireId}
              onChange={(e) => setNewBien({ ...newBien, proprietaireId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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

          <Input
            label="Adresse *"
            value={newBien.adresse}
            onChange={(e) => setNewBien({ ...newBien, adresse: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de bien *
            </label>
            <select
              value={newBien.type}
              onChange={(e) => setNewBien({ ...newBien, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Residence_Principale">Résidence principale</option>
              <option value="Residence_Secondaire">Résidence secondaire</option>
              <option value="Investissement_Locatif">Investissement locatif</option>
            </select>
          </div>

          <Input
            label="Valeur estimée (€)"
            type="number"
            value={newBien.valeurEstimee}
            onChange={(e) => setNewBien({ ...newBien, valeurEstimee: Number(e.target.value) })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={newBien.statut}
              onChange={(e) => setNewBien({ ...newBien, statut: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="En_location">En location</option>
              <option value="Vacant">Vacant</option>
              <option value="En_travaux">En travaux</option>
            </select>
          </div>

          {newBien.statut === 'En_location' && (
            <Input
              label="Loyer mensuel (€)"
              type="number"
              value={newBien.loyerMensuel}
              onChange={(e) => setNewBien({ ...newBien, loyerMensuel: Number(e.target.value) })}
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => {
              setShowBienModal(false)
              setEditingBien(null)
            }}>
              Annuler
            </Button>
            <Button onClick={handleAddBien}>
              {editingBien ? "Modifier le bien" : "Ajouter le bien"}
            </Button>
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propriétaire *
            </label>
            <select
              value={newCredit.proprietaireId}
              onChange={(e) => setNewCredit({ ...newCredit, proprietaireId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de crédit *
            </label>
            <select
              value={newCredit.type}
              onChange={(e) => setNewCredit({ ...newCredit, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="Immobilier">Immobilier</option>
              <option value="Consommation">Consommation</option>
              <option value="Professionnel">Professionnel</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <Input
            label="Organisme *"
            value={newCredit.organisme}
            onChange={(e) => setNewCredit({ ...newCredit, organisme: e.target.value })}
            required
            placeholder="Banque / Organisme"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant initial (€)"
              type="number"
              value={newCredit.montantInitial}
              onChange={(e) => setNewCredit({ ...newCredit, montantInitial: Number(e.target.value) })}
            />

            <Input
              label="Date de début"
              type="date"
              value={newCredit.dateDebut}
              onChange={(e) => setNewCredit({ ...newCredit, dateDebut: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Durée (mois)"
              type="number"
              value={newCredit.nombreMois}
              onChange={(e) => setNewCredit({ ...newCredit, nombreMois: Number(e.target.value) })}
              placeholder="240 (20 ans)"
            />

            <Input
              label="Taux d'intérêt (%)"
              type="number"
              step="0.01"
              value={newCredit.tauxInteret}
              onChange={(e) => setNewCredit({ ...newCredit, tauxInteret: Number(e.target.value) })}
            />
          </div>

          {newCredit.type === 'Immobilier' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bien immobilier associé
              </label>
              <select
                value={newCredit.bienAssocie}
                onChange={(e) => setNewCredit({ ...newCredit, bienAssocie: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => {
              setShowCreditModal(false)
              setEditingCredit(null)
            }}>
              Annuler
            </Button>
            <Button onClick={handleAddCredit}>
              {editingCredit ? "Modifier le crédit" : "Ajouter le crédit"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PatrimoinePage
