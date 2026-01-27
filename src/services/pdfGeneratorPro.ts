import jsPDF from 'jspdf'
import { Projet } from '@/types'

/**
 * Générateur de PDF professionnel pour dossiers bancaires
 * Basé sur le template élégant avec page de garde, sommaire, et sections détaillées
 */
class PDFGeneratorPro {
  private doc: jsPDF
  private currentY: number = 20
  private pageWidth: number
  private pageHeight: number
  private margin: number = 20
  private lineHeight: number = 7

  // Couleurs du thème (beige/marron élégant)
  private colors = {
    primary: [139, 119, 101],      // Marron principal
    secondary: [218, 205, 188],    // Beige clair
    accent: [101, 85, 71],         // Marron foncé
    text: [60, 60, 60],            // Gris foncé pour le texte
    white: [255, 255, 255]
  }

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.currentY = 20
  }

  /**
   * Génère la page de garde professionnelle
   */
  private generateCoverPage(projet: Projet): void {
    // Fond beige pour toute la page
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F')

    // Titre principal centré en haut
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.accent)
    const title = 'DOSSIER BANCAIRE'
    const titleWidth = this.doc.getTextWidth(title)
    this.doc.text(title, (this.pageWidth - titleWidth) / 2, 40)

    // Encadré blanc pour la photo et les infos
    const boxY = 60
    const boxHeight = 120
    this.doc.setFillColor(...this.colors.white)
    this.doc.roundedRect(30, boxY, this.pageWidth - 60, boxHeight, 3, 3, 'F')

    // TODO: Ajouter la photo du bien ici (si disponible)
    // Pour l'instant, on met un placeholder
    if (projet.bienImmobilier?.photos && projet.bienImmobilier.photos.length > 0) {
      try {
        // La première photo
        const photoData = projet.bienImmobilier.photos[0]
        this.doc.addImage(photoData, 'JPEG', 40, boxY + 10, this.pageWidth - 80, 80)
      } catch (error) {
        console.error('Erreur chargement photo:', error)
      }
    }

    // Cercle avec logo SCI (à gauche)
    const circleX = 50
    const circleY = boxY + boxHeight + 30
    const circleRadius = 30
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.circle(circleX, circleY, circleRadius, 'F')

    // Texte "SCI" dans le cercle
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.accent)
    const sciText = projet.porteurs && projet.porteurs.length > 0 ?
      projet.porteurs[0].structure?.nom || 'SCI' : 'SCI'
    this.doc.text(sciText, circleX, circleY, { align: 'center', baseline: 'middle' })

    // Nom du bien et ville (à droite du cercle)
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.accent)
    this.doc.text('Immeuble', 100, circleY - 10)

    this.doc.setFontSize(22)
    this.doc.setFont('helvetica', 'normal')
    const ville = projet.bienImmobilier?.ville || 'Non renseigné'
    this.doc.text(ville, 100, circleY + 10)

    // Ligne de séparation
    this.doc.setDrawColor(...this.colors.accent)
    this.doc.setLineWidth(0.5)
    this.doc.line(this.margin, this.pageHeight - 60, this.pageWidth - this.margin, this.pageHeight - 60)

    // Noms des porteurs en bas
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.accent)
    let nameY = this.pageHeight - 45

    if (projet.porteurs && projet.porteurs.length > 0) {
      projet.porteurs.forEach(porteur => {
        const nomPorteur = porteur.structure?.nom || 'Porteur'
        this.doc.text(nomPorteur, this.margin, nameY)
        nameY += 8
      })
    }
  }

  /**
   * Génère le sommaire
   */
  private generateSommaire(projet: Projet): void {
    this.addPageBreak()
    this.currentY = 40

    // Titre "Sommaire"
    this.doc.setFontSize(22)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('Sommaire', this.pageWidth / 2, this.currentY, { align: 'center' })
    this.currentY += 30

    const sections = [
      { title: 'I Situation personnelle', page: 3 },
      { title: '  1) Porteurs du projet', page: 3 },
      { title: 'II Le projet', page: projet.porteurs?.length ? 4 + projet.porteurs.length : 5 },
      { title: '  1) Situation géographique', page: projet.porteurs?.length ? 4 + projet.porteurs.length : 5 },
      { title: '  2) Le bien et son projet', page: projet.porteurs?.length ? 5 + projet.porteurs.length : 6 },
      { title: '  3) Financement', page: projet.porteurs?.length ? 6 + projet.porteurs.length : 7 },
    ]

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')

    sections.forEach(section => {
      this.doc.text(section.title, this.margin + 10, this.currentY)
      const dots = '...........................................................................'
      const dotsWidth = this.doc.getTextWidth(dots)
      this.doc.text(dots, this.pageWidth - 50 - dotsWidth, this.currentY)
      this.doc.text(`p${section.page}`, this.pageWidth - 40, this.currentY)
      this.currentY += 10
    })
  }

  /**
   * Génère les profils des porteurs
   */
  private generatePorteursProfils(projet: Projet): void {
    if (!projet.porteurs || projet.porteurs.length === 0) return

    projet.porteurs.forEach((porteur, index) => {
      this.addPageBreak()
      this.currentY = 40

      // En-tête de section
      if (index === 0) {
        this.doc.setFontSize(18)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.text)
        this.doc.text('I Situation personnelle', this.margin, this.currentY)
        this.currentY += 20
      }

      // Encadré avec les informations du porteur
      const boxX = 30
      const boxWidth = 80
      const boxHeight = 120

      this.doc.setFillColor(240, 240, 240)
      this.doc.rect(boxX, this.currentY, boxWidth, boxHeight, 'F')
      this.doc.setDrawColor(...this.colors.accent)
      this.doc.setLineWidth(0.5)
      this.doc.rect(boxX, this.currentY, boxWidth, boxHeight)

      // Nom du porteur
      this.doc.setFontSize(14)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text(`${index + 1}) ${porteur.structure?.nom || 'Porteur'}`, boxX + 5, this.currentY + 15)

      // TODO: Photo du porteur (si disponible)

      // Section PROFIL
      let infoY = this.currentY + 40
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('PROFIL', boxX + 5, infoY)
      infoY += 10

      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')

      // Informations du porteur
      const typeStructure = porteur.structure?.type === 'PERSONNE_MORALE' ? 'Société' : 'Personne physique'
      this.doc.text(`Type: ${typeStructure}`, boxX + 5, infoY)
      infoY += 6
      this.doc.text(`Parts: ${porteur.pourcentageProjet}%`, boxX + 5, infoY)
      infoY += 15

      // Section CONTACT
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('CONTACT', boxX + 5, infoY)
      infoY += 10

      this.doc.setFont('helvetica', 'normal')
      if (porteur.structure?.email) {
        this.doc.text(`Email: ${porteur.structure.email}`, boxX + 5, infoY)
      }

      // Informations financières à droite
      const rightX = boxX + boxWidth + 10
      let rightY = this.currentY + 15

      this.doc.setFontSize(13)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text('ÉCONOMIES', rightX, rightY)

      rightY += 10
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      // TODO: Ajouter les informations d'épargne si disponibles
      this.doc.text('Voir annexes financières', rightX, rightY)

      this.currentY += boxHeight + 20
    })
  }

  /**
   * Génère la section localisation
   */
  private generateLocalisation(projet: Projet): void {
    this.addPageBreak()
    this.currentY = 40

    // Titre de section
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('II Le projet', this.margin, this.currentY)
    this.currentY += 20

    // Sous-titre
    this.doc.setFontSize(14)
    this.doc.text('1) Situation géographique', this.margin, this.currentY)
    this.currentY += 15

    // Adresse du bien
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    const adresse = `Le bâtiment est situé au ${projet.bienImmobilier?.adresse || ''}`
    const codePostalVille = `${projet.bienImmobilier?.codePostal || ''} ${projet.bienImmobilier?.ville || ''}`

    this.doc.text(adresse, this.margin, this.currentY)
    this.currentY += 7
    this.doc.text(codePostalVille, this.margin, this.currentY)
    this.currentY += 20

    // TODO: Ajouter la carte Google Maps ici

    // Photo du bien
    if (projet.bienImmobilier?.photos && projet.bienImmobilier.photos.length > 0) {
      try {
        const photoData = projet.bienImmobilier.photos[0]
        const photoWidth = 120
        const photoHeight = 80
        const photoX = (this.pageWidth - photoWidth) / 2
        this.doc.addImage(photoData, 'JPEG', photoX, this.currentY, photoWidth, photoHeight)
        this.currentY += photoHeight + 10
      } catch (error) {
        console.error('Erreur chargement photo:', error)
      }
    }

    // Légende
    this.currentY += 10
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('□ Immeuble', this.margin + 20, this.currentY)
    this.currentY += 7
    this.doc.text('📷 Lieu de prise de vue de la photographie', this.margin + 20, this.currentY)
  }

  /**
   * Génère la description du bien
   */
  private generateBienDescription(projet: Projet): void {
    this.addPageBreak()
    this.currentY = 40

    // Titre
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('2) Le bien et son projet', this.margin, this.currentY)
    this.currentY += 15

    // Icône maison + superficie
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    const superficie = `Immeuble de ${projet.bienImmobilier?.superficie || 0} m²`
    this.doc.text('🏠 ' + superficie, this.margin, this.currentY)
    this.currentY += 15

    // Description du bien
    this.doc.setFontSize(10)
    this.doc.text('Le bien dispose actuellement:', this.margin, this.currentY)
    this.currentY += 7

    // Liste des éléments
    if (projet.bienImmobilier?.elements && projet.bienImmobilier.elements.length > 0) {
      const typeCounts = projet.bienImmobilier.elements.reduce((acc, elem) => {
        acc[elem.type] = (acc[elem.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      Object.entries(typeCounts).forEach(([type, count]) => {
        this.doc.text(`- de ${count} ${type.replace('_', ' ').toLowerCase()}`, this.margin + 5, this.currentY)
        this.currentY += 6
      })
    }

    // Photos du bien
    this.currentY += 10
    if (projet.bienImmobilier?.photos && projet.bienImmobilier.photos.length > 1) {
      const photosPerRow = 3
      const photoWidth = 50
      const photoHeight = 40
      const spacing = 5

      let photoX = this.margin
      let photoY = this.currentY

      projet.bienImmobilier.photos.slice(1, 7).forEach((photo, index) => {
        if (index > 0 && index % photosPerRow === 0) {
          photoX = this.margin
          photoY += photoHeight + spacing
        }

        try {
          this.doc.addImage(photo, 'JPEG', photoX, photoY, photoWidth, photoHeight)
          photoX += photoWidth + spacing
        } catch (error) {
          console.error('Erreur chargement photo:', error)
        }
      })

      this.currentY = photoY + photoHeight + 10
    }

    // Objectifs
    this.currentY += 10
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Objectifs:', this.margin, this.currentY)
    this.currentY += 7

    this.doc.setFont('helvetica', 'normal')
    if (projet.bienImmobilier?.travauxPrevus && projet.bienImmobilier.travauxPrevus.length > 0) {
      projet.bienImmobilier.travauxPrevus.forEach(travail => {
        const desc = `- ${travail.categorie}: ${travail.description}`
        this.doc.text(desc, this.margin + 5, this.currentY)
        this.currentY += 6
      })
    }
  }

  /**
   * Génère le plan de financement
   */
  private generateFinancement(projet: Projet): void {
    this.addPageBreak()
    this.currentY = 40

    // Titre
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('3) Financement', this.margin, this.currentY)
    this.currentY += 20

    // Sous-titre
    this.doc.setFontSize(12)
    this.doc.text('Financement:', this.margin, this.currentY)
    this.currentY += 10

    // Détails du financement
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')

    const fin = projet.financement
    if (fin) {
      const details = [
        { label: 'Prix d\'achat', value: `${(fin.prixAchat || 0).toLocaleString('fr-FR')} € FAI` },
        { label: 'Notaire', value: `${(fin.fraisNotaire || 0).toLocaleString('fr-FR')} €` },
        { label: 'Travaux', value: `${(fin.montantTravaux || 0).toLocaleString('fr-FR')} €` },
        { label: 'Apport', value: `${(fin.apportPersonnel || 0).toLocaleString('fr-FR')} €` },
      ]

      details.forEach(item => {
        this.doc.text(`${item.label}: ${item.value}`, this.margin, this.currentY)
        this.currentY += 7
      })

      // Total projet
      this.currentY += 5
      this.doc.setFont('helvetica', 'bold')
      const total = (fin.prixAchat || 0) + (fin.fraisNotaire || 0) + (fin.montantTravaux || 0)
      this.doc.text(`Total projet: ${total.toLocaleString('fr-FR')} €`, this.margin, this.currentY)
      this.currentY += 15

      // Mensualités
      this.doc.setFont('helvetica', 'normal')
      const duree = fin.dureeCredit || 20
      this.doc.text(`Un emprunt sur ${duree} ans représente une mensualité de ${(fin.mensualiteTotale || 0).toLocaleString('fr-FR')} € par mois.`, this.margin, this.currentY)
      this.currentY += 10

      // Rentabilité
      if (projet.bienImmobilier?.loyerMensuelEstime) {
        const loyer = projet.bienImmobilier.loyerMensuelEstime
        const loyerNet = loyer * 0.7
        const cashflow = loyerNet - (fin.mensualiteTotale || 0)

        this.doc.text(`Les revenus locatifs pris à 70% représenteraient une rentrée de ${loyerNet.toLocaleString('fr-FR')}€ par mois`, this.margin, this.currentY)
        this.currentY += 7
        this.doc.text(`soit une différence de ${Math.abs(cashflow).toLocaleString('fr-FR')}€ ${cashflow >= 0 ? 'de gain' : 'de déficit'}.`, this.margin, this.currentY)
      }
    }
  }

  /**
   * Génère la page des annexes
   */
  private generateAnnexes(): void {
    this.addPageBreak()

    // Page de garde des annexes (similaire à la première page)
    this.doc.setFillColor(...this.colors.secondary)
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, 'F')

    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.accent)
    const title = 'ANNEXES'
    const titleWidth = this.doc.getTextWidth(title)
    this.doc.text(title, (this.pageWidth - titleWidth) / 2, this.pageHeight / 2 - 50)

    // Liste des documents
    this.addPageBreak()
    this.currentY = 40

    this.doc.setFillColor(255, 255, 255)
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('ANNEXES', this.margin, this.currentY)
    this.currentY += 20

    const documents = [
      'Cartes d\'identité',
      'Justificatifs de revenus',
      'Relevés de comptes',
      'Compromis de vente',
      'Devis travaux',
      'Photos du bien',
      'Statuts de la société (si applicable)'
    ]

    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    documents.forEach(doc => {
      this.doc.text(`• ${doc}`, this.margin + 5, this.currentY)
      this.currentY += 8
    })
  }

  /**
   * Ajoute un pied de page à toutes les pages
   */
  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(150, 150, 150)

      const footerText = `Page ${i} sur ${pageCount} - MDI.fr - Générateur de dossiers bancaires`
      this.doc.text(footerText, this.pageWidth / 2, this.pageHeight - 10, { align: 'center' })
    }
  }

  /**
   * Ajoute une nouvelle page
   */
  private addPageBreak(): void {
    this.doc.addPage()
    this.currentY = 20
  }

  /**
   * Génère le PDF complet
   */
  public generatePDF(projet: Projet): jsPDF {
    // 1. Page de garde
    this.generateCoverPage(projet)

    // 2. Sommaire
    this.generateSommaire(projet)

    // 3. Profils des porteurs
    this.generatePorteursProfils(projet)

    // 4. Localisation
    this.generateLocalisation(projet)

    // 5. Description du bien
    this.generateBienDescription(projet)

    // 6. Financement
    this.generateFinancement(projet)

    // 7. Annexes
    this.generateAnnexes()

    // 8. Pieds de page
    this.addFooters()

    return this.doc
  }

  /**
   * Télécharge le PDF
   */
  public downloadPDF(projet: Projet, filename?: string): void {
    const doc = this.generatePDF(projet)
    const nom = projet.nom || 'projet'
    const date = new Date().toISOString().split('T')[0]
    const defaultFilename = `dossier-bancaire-${nom}-${date}.pdf`
    doc.save(filename || defaultFilename)
  }

  /**
   * Retourne le PDF en Blob
   */
  public getPDFBlob(projet: Projet): Blob {
    const doc = this.generatePDF(projet)
    return doc.output('blob')
  }
}

export default PDFGeneratorPro
