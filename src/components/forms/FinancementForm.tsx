import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { Euro, Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { PlanFinancement, Associe } from '@/types'

const financementSchema = z.object({
  prixAchat: z.number().min(1, 'Le prix d\'achat est requis'),
  fraisNotaire: z.number().min(0, 'Les frais de notaire ne peuvent pas être négatifs'),
  montantTravaux: z.number().min(0, 'Le montant des travaux ne peut pas être négatif'),
  apportPersonnel: z.number().min(0, 'L\'apport personnel ne peut pas être négatif'),
  dureeCredit: z.number().min(1).max(30, 'La durée du crédit doit être entre 1 et 30 ans'),
  tauxEstime: z.number().min(0.1).max(10, 'Le taux doit être entre 0.1% et 10%'),
})

type FinancementFormData = z.infer<typeof financementSchema>

interface FinancementFormProps {
  initialData?: Partial<PlanFinancement>
  associes: Associe[]
  onSave: (data: PlanFinancement) => void
  onNext: () => void
}

interface CalculsFinanciers {
  montantEmprunt: number
  mensualiteEstimee: number
  coutTotalCredit: number
  tauxEndettement: number
  resteAVivre: number
  rentabilitePrevisionnelle: number
  apportMinimum: number
  capaciteEmprunt: number
}

const FinancementForm: React.FC<FinancementFormProps> = ({
  initialData,
  associes,
  onSave,
  onNext
}) => {
  const [calculs, setCalculs] = useState<CalculsFinanciers>({
    montantEmprunt: 0,
    mensualiteEstimee: 0,
    coutTotalCredit: 0,
    tauxEndettement: 0,
    resteAVivre: 0,
    rentabilitePrevisionnelle: 0,
    apportMinimum: 0,
    capaciteEmprunt: 0
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid }
  } = useForm<FinancementFormData>({
    resolver: zodResolver(financementSchema),
    defaultValues: {
      prixAchat: initialData?.prixAchat || 0,
      fraisNotaire: initialData?.fraisNotaire || 0,
      montantTravaux: initialData?.montantTravaux || 0,
      apportPersonnel: initialData?.apportPersonnel || 0,
      dureeCredit: initialData?.dureeCredit || 20,
      tauxEstime: initialData?.tauxEstime || 3.5,
    }
  })

  const watchedValues = watch()

  // Calculs automatiques
  useEffect(() => {
    const {
      prixAchat,
      fraisNotaire,
      montantTravaux,
      apportPersonnel,
      dureeCredit,
      tauxEstime
    } = watchedValues

    if (prixAchat > 0) {
      // Calculs de base
      const coutTotal = prixAchat + fraisNotaire + montantTravaux
      const montantEmprunt = Math.max(0, coutTotal - apportPersonnel)
      
      // Calcul de la mensualité
      const tauxMensuel = tauxEstime / 100 / 12
      const nombreMensualites = dureeCredit * 12
      const mensualiteEstimee = montantEmprunt > 0 
        ? (montantEmprunt * tauxMensuel * Math.pow(1 + tauxMensuel, nombreMensualites)) / 
          (Math.pow(1 + tauxMensuel, nombreMensualites) - 1)
        : 0

      // Coût total du crédit
      const coutTotalCredit = (mensualiteEstimee * nombreMensualites) - montantEmprunt

      // Calculs des revenus totaux des associés
      const revenusTotaux = associes.reduce((total, associe) => {
        if (associe.type === 'PERSONNE_PHYSIQUE' && associe.personnePhysique) {
          return total + (associe.personnePhysique.salaire * 12)
        } else if (associe.type === 'PERSONNE_MORALE' && associe.personneMorale) {
          return total + associe.personneMorale.chiffreAffaires
        }
        return total
      }, 0)

      // Taux d'endettement
      const chargesTotales = associes.reduce((total, associe) => {
        if (associe.type === 'PERSONNE_PHYSIQUE' && associe.personnePhysique) {
          return total + (associe.personnePhysique.charges.totalCharges * 12)
        }
        return total
      }, 0) + (mensualiteEstimee * 12)

      const tauxEndettement = revenusTotaux > 0 ? (chargesTotales / revenusTotaux) * 100 : 0

      // Reste à vivre
      const resteAVivre = revenusTotaux - chargesTotales

      // Capacité d'emprunt (33% des revenus)
      const capaciteEmprunt = revenusTotaux * 0.33 / 12

      // Apport minimum recommandé (20% du prix d'achat)
      const apportMinimum = prixAchat * 0.2

      // Rentabilité prévisionnelle (estimation basique)
      const loyerEstime = prixAchat * 0.05 / 12 // 5% de rendement brut
      const chargesLocatives = loyerEstime * 0.3 // 30% de charges
      const rentabilitePrevisionnelle = ((loyerEstime - chargesLocatives - mensualiteEstimee) / apportPersonnel) * 100

      setCalculs({
        montantEmprunt,
        mensualiteEstimee,
        coutTotalCredit,
        tauxEndettement,
        resteAVivre,
        rentabilitePrevisionnelle,
        apportMinimum,
        capaciteEmprunt
      })
    }
  }, [watchedValues, associes])

  const onSubmit = (data: FinancementFormData) => {
    const planFinancement: PlanFinancement = {
      ...data,
      montantEmprunt: calculs.montantEmprunt,
      mensualiteEstimee: calculs.mensualiteEstimee,
      rentabilitePrevisionnelle: calculs.rentabilitePrevisionnelle
    }
    onSave(planFinancement)
    onNext()
  }

  const getTauxEndettementColor = (taux: number) => {
    if (taux <= 33) return 'text-green-600'
    if (taux <= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTauxEndettementIcon = (taux: number) => {
    if (taux <= 33) return <CheckCircle className="h-4 w-4" />
    if (taux <= 40) return <AlertTriangle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Plan de financement
          </h2>
          <p className="text-gray-600">
            Définissez votre plan de financement et visualisez les calculs automatiques
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Coûts d'acquisition */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Coûts d'acquisition</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Prix d'achat (€)"
                type="number"
                {...register('prixAchat', { valueAsNumber: true })}
                error={errors.prixAchat?.message}
                icon={<Euro className="h-4 w-4" />}
              />

              <Input
                label="Frais de notaire (€)"
                type="number"
                {...register('fraisNotaire', { valueAsNumber: true })}
                error={errors.fraisNotaire?.message}
                icon={<Euro className="h-4 w-4" />}
                helperText="Environ 7-8% du prix d'achat"
              />

              <Input
                label="Montant des travaux (€)"
                type="number"
                {...register('montantTravaux', { valueAsNumber: true })}
                error={errors.montantTravaux?.message}
                icon={<Euro className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Financement */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financement</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Apport personnel (€)"
                type="number"
                {...register('apportPersonnel', { valueAsNumber: true })}
                error={errors.apportPersonnel?.message}
                icon={<Euro className="h-4 w-4" />}
              />

              <Input
                label="Durée du crédit (années)"
                type="number"
                {...register('dureeCredit', { valueAsNumber: true })}
                error={errors.dureeCredit?.message}
                min="1"
                max="30"
              />

              <Input
                label="Taux estimé (%)"
                type="number"
                step="0.1"
                {...register('tauxEstime', { valueAsNumber: true })}
                error={errors.tauxEstime?.message}
                helperText="Taux annuel effectif global"
              />
            </div>
          </div>

          {/* Résultats des calculs */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Résultats des calculs
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {calculs.montantEmprunt.toLocaleString('fr-FR')} €
                  </div>
                  <div className="text-sm text-blue-800">Montant à emprunter</div>
                </div>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {calculs.mensualiteEstimee.toFixed(0)} €
                  </div>
                  <div className="text-sm text-green-800">Mensualité estimée</div>
                </div>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {calculs.coutTotalCredit.toLocaleString('fr-FR')} €
                  </div>
                  <div className="text-sm text-purple-800">Coût total du crédit</div>
                </div>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {calculs.rentabilitePrevisionnelle.toFixed(1)}%
                  </div>
                  <div className="text-sm text-orange-800">Rentabilité prévisionnelle</div>
                </div>
              </Card>
            </div>
          </div>

          {/* Ratios bancaires */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Ratios bancaires
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Taux d'endettement</span>
                  <div className={`flex items-center ${getTauxEndettementColor(calculs.tauxEndettement)}`}>
                    {getTauxEndettementIcon(calculs.tauxEndettement)}
                    <span className="ml-1 font-bold">{calculs.tauxEndettement.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      calculs.tauxEndettement <= 33 ? 'bg-green-500' :
                      calculs.tauxEndettement <= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(calculs.tauxEndettement, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {calculs.tauxEndettement <= 33 ? '✅ Excellent' :
                   calculs.tauxEndettement <= 40 ? '⚠️ Acceptable' : '❌ Risqué'}
                </div>
              </Card>

              <Card>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reste à vivre</span>
                    <span className="font-medium">{calculs.resteAVivre.toLocaleString('fr-FR')} €/an</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Capacité d'emprunt</span>
                    <span className="font-medium">{calculs.capaciteEmprunt.toFixed(0)} €/mois</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Apport minimum recommandé</span>
                    <span className="font-medium">{calculs.apportMinimum.toLocaleString('fr-FR')} €</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Recommandations */}
          {calculs.tauxEndettement > 40 && (
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Attention : Taux d'endettement élevé</h4>
                  <p className="text-sm text-red-800 mt-1">
                    Votre taux d'endettement de {calculs.tauxEndettement.toFixed(1)}% dépasse le seuil recommandé de 33%. 
                    Considérez augmenter votre apport personnel ou réduire le montant emprunté.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="submit"
              disabled={!isValid}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default FinancementForm 