import React from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Download, Eye, CheckCircle, AlertTriangle } from 'lucide-react'
import { DossierSCI, Associe, PlanFinancement, BienImmobilier, TravauxDetail } from '@/types'
import PDFGenerator from '@/services/pdfGenerator'

interface RecapitulatifFormProps {
  project: Partial<DossierSCI>
  associes: Associe[]
  financement: Partial<PlanFinancement>
  bienImmobilier: Partial<BienImmobilier>
  travaux: TravauxDetail[]
  onGeneratePDF: () => void
}

const RecapitulatifForm: React.FC<RecapitulatifFormProps> = ({
  project,
  associes,
  financement,
  bienImmobilier,
  travaux,
  onGeneratePDF
}) => {
  const totalParts = associes.reduce((sum, a) => sum + a.pourcentageParts, 0)
  const totalTravaux = travaux.reduce((sum, t) => sum + t.montant, 0)


  const getValidationStatus = () => {
    const issues: string[] = []
    
    if (!project.nomSCI) issues.push('Nom de la SCI manquant')
    if (!project.localisation) issues.push('Localisation manquante')
    if (associes.length === 0) issues.push('Aucun associé défini')
    if (totalParts !== 100) issues.push(`Total des parts: ${totalParts}% (doit être 100%)`)
    if (!financement.prixAchat) issues.push('Prix d\'achat manquant')
    if (!bienImmobilier.adresse) issues.push('Adresse du bien manquante')
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }

  const validation = getValidationStatus()

  const completeDossier: DossierSCI = {
    id: project.id || '',
    userId: project.userId || '',
    nomSCI: project.nomSCI || '',
    localisation: project.localisation || '',
    prixAcquisition: project.prixAcquisition || 0,
    montantTravaux: project.montantTravaux || 0,
    status: 'PDF_Genere',
    dateCreation: project.dateCreation || new Date(),
    dateModification: new Date(),
    associes,
    totalParts: associes.reduce((sum, a) => sum + a.pourcentageParts, 0),
    financement: financement as PlanFinancement,
    bienImmobilier: {
      ...bienImmobilier,
      travauxPrevus: travaux
    } as BienImmobilier
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Récapitulatif du dossier
          </h2>
          <p className="text-gray-600">
            Vérifiez toutes les informations avant de générer le PDF
          </p>
        </div>

        {/* Statut de validation */}
        <div className="mb-6">
          {validation.isValid ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <h3 className="font-medium text-green-900">Dossier complet</h3>
                  <p className="text-sm text-green-800">Toutes les informations sont renseignées et valides.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Dossier incomplet</h3>
                  <ul className="text-sm text-red-800 mt-1 space-y-1">
                    {validation.issues.map((issue, index) => (
                      <li key={index}>• {issue}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations SCI</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nom de la SCI</span>
                <span className="font-medium">{project.nomSCI || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Localisation</span>
                <span className="font-medium">{project.localisation || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prix d'acquisition</span>
                <span className="font-medium">
                  {project.prixAcquisition ? `${project.prixAcquisition.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Montant travaux</span>
                <span className="font-medium">
                  {project.montantTravaux ? `${project.montantTravaux.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Associés</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre d'associés</span>
                <span className="font-medium">{associes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total des parts</span>
                <span className={`font-medium ${totalParts === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalParts}%
                </span>
              </div>
              <div className="space-y-2">
                {associes.map((associe) => (
                  <div key={associe.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{associe.nom}</span>
                    <span className="font-medium">{associe.pourcentageParts}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix d'achat</span>
                <span className="font-medium">
                  {financement.prixAchat ? `${financement.prixAchat.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Apport personnel</span>
                <span className="font-medium">
                  {financement.apportPersonnel ? `${financement.apportPersonnel.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Montant à emprunter</span>
                <span className="font-medium">
                  {financement.montantEmprunt ? `${financement.montantEmprunt.toLocaleString('fr-FR')} €` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mensualité estimée</span>
                <span className="font-medium">
                  {financement.mensualiteEstimee ? `${financement.mensualiteEstimee.toFixed(0)} €` : 'Non renseigné'}
                </span>
              </div>
                              <div className="flex justify-between">
                  <span className="text-gray-600">Taux d'endettement</span>
                  <span className="font-medium">
                    {(financement as any).tauxEndettement ? `${(financement as any).tauxEndettement.toFixed(1)}%` : 'Non calculé'}
                  </span>
                </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Bien immobilier</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Adresse</span>
                <span className="font-medium">{bienImmobilier.adresse || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Superficie</span>
                <span className="font-medium">
                  {bienImmobilier.superficie ? `${bienImmobilier.superficie} m²` : 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre de pièces</span>
                <span className="font-medium">{bienImmobilier.nombrePieces || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DPE</span>
                <span className="font-medium">{bienImmobilier.dpe || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Photos</span>
                <span className="font-medium">{bienImmobilier.photos?.length || 0} photo(s)</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Travaux prévus */}
        {travaux.length > 0 && (
          <Card>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Travaux prévus</h3>
            <div className="space-y-3">
              <div className="flex justify-between mb-3">
                <span className="text-gray-600">Budget total</span>
                <span className="font-medium text-lg">{totalTravaux.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="space-y-2">
                {travaux.map((travail) => (
                  <div key={travail.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{travail.description}</span>
                    <span className="font-medium">{travail.montant.toLocaleString('fr-FR')} €</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {validation.isValid ? (
              <span className="text-green-600">✅ Dossier prêt pour la génération PDF</span>
            ) : (
              <span className="text-red-600">❌ Veuillez compléter le dossier</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                const pdfGen = new PDFGenerator()
                const blob = pdfGen.getPDFBlob(completeDossier)
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank')
              }}
              disabled={!validation.isValid}
            >
              <Eye className="h-4 w-4 mr-2" />
              Prévisualiser PDF
            </Button>

            <Button
              onClick={onGeneratePDF}
              disabled={!validation.isValid}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default RecapitulatifForm 