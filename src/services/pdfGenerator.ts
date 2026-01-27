import jsPDF from 'jspdf'
import { DossierSCI, Associe, PlanFinancement, BienImmobilier, TravauxDetail } from '@/types'

interface PDFOptions {
  title?: string
  includePhotos?: boolean
  includeCharts?: boolean
}

class PDFGenerator {
  private doc: jsPDF
  private currentY: number = 20
  private pageWidth: number
  private margin: number = 20
  private lineHeight: number = 7

  constructor(_options: PDFOptions = {}) {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.currentY = 20
  }

  private addPageBreak() {
    this.doc.addPage()
    this.currentY = 20
  }

  private addTitle(text: string, size: number = 16) {
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += size + 5
  }

  private addSubtitle(text: string, size: number = 12) {
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += size + 3
  }

  private addText(text: string, size: number = 10) {
    this.doc.setFontSize(size)
    this.doc.setFont('helvetica', 'normal')
    
    // Gestion du retour à la ligne automatique
    const maxWidth = this.pageWidth - (2 * this.margin)
    const lines = this.doc.splitTextToSize(text, maxWidth)
    
    if (this.currentY + (lines.length * this.lineHeight) > this.doc.internal.pageSize.getHeight() - 20) {
      this.addPageBreak()
    }
    
    this.doc.text(lines, this.margin, this.currentY)
    this.currentY += lines.length * this.lineHeight + 2
  }

  private addKeyValue(key: string, value: string | number, indent: number = 0) {
    const x = this.margin + indent
    const maxWidth = this.pageWidth - (2 * this.margin) - indent
    
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(key + ' :', x, this.currentY)
    
    this.doc.setFont('helvetica', 'normal')
    const valueText = typeof value === 'number' ? value.toLocaleString('fr-FR') : value
    const lines = this.doc.splitTextToSize(valueText, maxWidth - 30)
    
    if (this.currentY + (lines.length * this.lineHeight) > this.doc.internal.pageSize.getHeight() - 20) {
      this.addPageBreak()
    }
    
    this.doc.text(lines, x + 30, this.currentY)
    this.currentY += Math.max(lines.length * this.lineHeight, this.lineHeight) + 1
  }

  private addTable(headers: string[], data: string[][], indent: number = 0) {
    const x = this.margin + indent
    const colWidth = (this.pageWidth - (2 * this.margin) - indent) / headers.length
    
    // Vérifier si on a assez d'espace pour le tableau
    const tableHeight = (data.length + 1) * 8
    if (this.currentY + tableHeight > this.doc.internal.pageSize.getHeight() - 20) {
      this.addPageBreak()
    }
    
    // En-têtes
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    headers.forEach((header, index) => {
      this.doc.text(header, x + (index * colWidth), this.currentY)
    })
    this.currentY += 8
    
    // Données
    this.doc.setFont('helvetica', 'normal')
    data.forEach(row => {
      row.forEach((cell, index) => {
        this.doc.text(cell, x + (index * colWidth), this.currentY)
      })
      this.currentY += 6
    })
    
    this.currentY += 5
  }

  private addFinancialSummary(financement: PlanFinancement) {
    this.addSubtitle('Résumé financier')
    
    const data = [
      ['Prix d\'achat', `${financement.prixAchat?.toLocaleString('fr-FR')} €`],
      ['Frais de notaire', `${financement.fraisNotaire?.toLocaleString('fr-FR')} €`],
      ['Montant travaux', `${financement.montantTravaux?.toLocaleString('fr-FR')} €`],
      ['Apport personnel', `${financement.apportPersonnel?.toLocaleString('fr-FR')} €`],
      ['Montant à emprunter', `${financement.montantEmprunt?.toLocaleString('fr-FR')} €`],
      ['Mensualité estimée', `${financement.mensualiteEstimee?.toFixed(0)} €`],
      ['Durée du crédit', `${financement.dureeCredit} ans`],
      ['Taux estimé', `${financement.tauxEstime}%`],
    ]
    
    this.addTable(['Détail', 'Montant'], data)
  }

  private addAssociatesList(associes: Associe[]) {
    this.addSubtitle('Associés')
    
    const data = associes.map(associe => [
      associe.nom,
      associe.type === 'PERSONNE_PHYSIQUE' ? 'Personne physique' : 'Personne morale',
      `${associe.pourcentageParts}%`,
      associe.email || '-'
    ])
    
    this.addTable(['Nom', 'Type', 'Parts', 'Email'], data)
  }

  private addPropertyDetails(bien: BienImmobilier) {
    this.addSubtitle('Détails du bien immobilier')
    
    this.addKeyValue('Adresse', bien.adresse || 'Non renseigné')
    this.addKeyValue('Superficie', `${bien.superficie || 0} m²`)
    this.addKeyValue('Nombre de pièces', bien.nombrePieces || 0)
    this.addKeyValue('État actuel', bien.etatActuel || 'Non renseigné')
    this.addKeyValue('DPE', bien.dpe || 'Non renseigné')
    this.addKeyValue('Estimation de valeur', `${bien.estimationValeur?.toLocaleString('fr-FR') || 0} €`)
  }

  private addWorkDetails(travaux: TravauxDetail[]) {
    if (travaux.length === 0) return
    
    this.addSubtitle('Travaux prévus')
    
    const totalTravaux = travaux.reduce((sum, t) => sum + t.montant, 0)
    this.addKeyValue('Budget total', `${totalTravaux.toLocaleString('fr-FR')} €`)
    
    const data = travaux.map(travail => [
      travail.description,
      travail.priorite,
      `${travail.montant.toLocaleString('fr-FR')} €`,
      `${travail.dureeEstimee} semaines`,
      travail.artisan || '-'
    ])
    
    this.addTable(['Description', 'Priorité', 'Montant', 'Durée', 'Artisan'], data)
  }

  private addHeader(dossier: DossierSCI) {
    // Logo ou titre de l'entreprise
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('MDI.fr', this.margin, this.currentY)
    this.currentY += 25
    
    // Titre du document
    this.addTitle(`Dossier bancaire - ${dossier.nomSCI || 'SCI'}`, 18)
    
    // Informations de base
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, this.margin, this.currentY)
    this.currentY += 15
  }

  private addFooter() {
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(
        `Page ${i} sur ${pageCount} - MDI.fr - Générateur de dossiers bancaires`,
        this.margin,
        this.doc.internal.pageSize.getHeight() - 10
      )
    }
  }

  public generatePDF(dossier: DossierSCI): jsPDF {
    this.currentY = 20
    
    // En-tête
    this.addHeader(dossier)
    
    // Informations générales
    this.addSubtitle('Informations générales')
    this.addKeyValue('Nom de la SCI', dossier.nomSCI || 'Non renseigné')
    this.addKeyValue('Localisation', dossier.localisation || 'Non renseigné')
    this.addKeyValue('Prix d\'acquisition', `${dossier.prixAcquisition?.toLocaleString('fr-FR') || 0} €`)
    this.addKeyValue('Montant travaux', `${dossier.montantTravaux?.toLocaleString('fr-FR') || 0} €`)
    
    // Financement
    if (dossier.financement) {
      this.addPageBreak()
      this.addFinancialSummary(dossier.financement)
    }
    
    // Associés
    if (dossier.associes && dossier.associes.length > 0) {
      this.addPageBreak()
      this.addAssociatesList(dossier.associes)
    }
    
    // Bien immobilier
    if (dossier.bienImmobilier) {
      this.addPageBreak()
      this.addPropertyDetails(dossier.bienImmobilier)
    }
    
    // Travaux
    if (dossier.bienImmobilier?.travauxPrevus && dossier.bienImmobilier.travauxPrevus.length > 0) {
      this.addPageBreak()
      this.addWorkDetails(dossier.bienImmobilier.travauxPrevus)
    }
    
    // Recommandations
    this.addPageBreak()
    this.addSubtitle('Recommandations')
    this.addText('Ce dossier a été généré automatiquement par MDI.fr. Il est recommandé de le faire valider par un professionnel avant soumission à votre banque.')
    
    // Pied de page
    this.addFooter()
    
    return this.doc
  }

  public downloadPDF(dossier: DossierSCI, filename?: string): void {
    const doc = this.generatePDF(dossier)
    const defaultFilename = `dossier-${dossier.nomSCI || 'sci'}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename || defaultFilename)
  }

  public getPDFBlob(dossier: DossierSCI): Blob {
    const doc = this.generatePDF(dossier)
    return doc.output('blob')
  }
}

export default PDFGenerator 