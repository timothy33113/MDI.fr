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

    const nPorteurs = projet.porteurs?.length || 1
    const baseProjet = 3 + nPorteurs
    const hasPatrimoine = projet.porteurs?.some(p => {
      const d = p.structure?.personnePhysique || p.structure?.personneMorale
      return d?.biens?.length || d?.credits?.length || d?.comptes?.length
    })
    const hasRentabilite = projet.analysesRentabilite && (projet.analysesRentabilite.rentabiliteBrute > 0 || projet.analysesRentabilite.cashFlowMensuel !== 0)
    const hasChecklist = projet.checklistDocuments && projet.checklistDocuments.length > 0

    const sections: { title: string; page: string }[] = [
      { title: 'I Situation personnelle', page: '3' },
      { title: '  1) Porteurs du projet', page: '3' },
      { title: 'II Le projet', page: `${baseProjet}` },
      { title: '  1) Situation geographique', page: `${baseProjet}` },
      { title: '  2) Le bien et son projet', page: `${baseProjet + 1}` },
      { title: '  3) Financement', page: `${baseProjet + 2}` },
    ]

    let nextPage = baseProjet + 3
    if (hasPatrimoine) {
      sections.push({ title: '  4) Patrimoine existant', page: `${nextPage}` })
      nextPage++
    }
    if (hasRentabilite) {
      sections.push({ title: '  5) Analyse de rentabilite', page: `${nextPage}` })
      nextPage++
    }
    if (hasChecklist) {
      sections.push({ title: 'III Documents requis', page: `${nextPage}` })
      nextPage++
    }
    sections.push({ title: 'Annexes', page: `${nextPage}` })

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'normal')

    sections.forEach(section => {
      const isMainSection = !section.title.startsWith('  ')
      if (isMainSection) {
        this.doc.setFont('helvetica', 'bold')
      } else {
        this.doc.setFont('helvetica', 'normal')
      }
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

      // Informations patrimoniales a droite
      const rightX = boxX + boxWidth + 10
      let rightY = this.currentY + 15
      const pp = porteur.structure?.personnePhysique
      const pm = porteur.structure?.personneMorale
      const data = pp || pm

      // Revenus
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text('REVENUS', rightX, rightY)
      rightY += 8

      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      if (data?.revenus && Array.isArray(data.revenus) && data.revenus.length > 0) {
        data.revenus.forEach((rev: any) => {
          const montant = parseFloat(rev.montantMensuel || rev.montant || 0)
          this.doc.text(`${rev.type || 'Revenu'}: ${montant.toLocaleString('fr-FR')} EUR/mois`, rightX, rightY)
          rightY += 5
        })
      } else {
        this.doc.text('Non renseigne', rightX, rightY)
        rightY += 5
      }

      rightY += 5
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('PATRIMOINE', rightX, rightY)
      rightY += 8

      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      if (data?.biens && Array.isArray(data.biens) && data.biens.length > 0) {
        this.doc.text(`${data.biens.length} bien(s) existant(s)`, rightX, rightY)
        rightY += 5
      }
      if (data?.credits && Array.isArray(data.credits) && data.credits.length > 0) {
        this.doc.text(`${data.credits.length} credit(s) en cours`, rightX, rightY)
        rightY += 5
      }
      if (data?.comptes && Array.isArray(data.comptes) && data.comptes.length > 0) {
        this.doc.text(`${data.comptes.length} compte(s) bancaire(s)`, rightX, rightY)
        rightY += 5
      }
      if (!data?.biens?.length && !data?.credits?.length && !data?.comptes?.length) {
        this.doc.text('Non renseigne', rightX, rightY)
      }

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
   * Helper: dessiner un rectangle arrondi avec titre
   */
  private drawSectionBox(title: string, y: number, height: number): number {
    this.doc.setFillColor(248, 245, 240)
    this.doc.roundedRect(this.margin, y, this.pageWidth - 2 * this.margin, height, 2, 2, 'F')
    this.doc.setDrawColor(...this.colors.primary)
    this.doc.setLineWidth(0.3)
    this.doc.roundedRect(this.margin, y, this.pageWidth - 2 * this.margin, height, 2, 2)

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.accent)
    this.doc.text(title, this.margin + 5, y + 7)
    return y + 14
  }

  /**
   * Helper: verifier et ajouter une nouvelle page si necessaire
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 25) {
      this.addPageBreak()
      this.currentY = 30
    }
  }

  /**
   * Genere la section patrimoine des porteurs
   */
  private generatePatrimoine(projet: Projet): void {
    if (!projet.porteurs || projet.porteurs.length === 0) return

    let hasPatrimoineData = false
    for (const porteur of projet.porteurs) {
      const data = porteur.structure?.personnePhysique || porteur.structure?.personneMorale
      if (data?.biens?.length || data?.credits?.length || data?.comptes?.length) {
        hasPatrimoineData = true
        break
      }
    }
    if (!hasPatrimoineData) return

    this.addPageBreak()
    this.currentY = 40

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('4) Patrimoine existant', this.margin, this.currentY)
    this.currentY += 15

    projet.porteurs.forEach(porteur => {
      const data = porteur.structure?.personnePhysique || porteur.structure?.personneMorale
      if (!data) return

      this.checkPageBreak(40)

      // Nom du porteur
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.accent)
      this.doc.text(porteur.structure?.nom || 'Porteur', this.margin, this.currentY)
      this.currentY += 10

      // Biens existants
      if (data.biens && Array.isArray(data.biens) && data.biens.length > 0) {
        this.checkPageBreak(10 + data.biens.length * 8)
        const boxStart = this.currentY
        const boxHeight = 14 + data.biens.length * 7
        const innerY = this.drawSectionBox('Biens immobiliers', boxStart, boxHeight)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        let lineY = innerY
        data.biens.forEach((bien: any) => {
          const adresse = bien.adresse || bien.type || 'Bien'
          const valeur = parseFloat(bien.valeurEstimee || bien.valeur || 0)
          const loyer = parseFloat(bien.loyerMensuel || bien.loyer || 0)
          let line = `${adresse}`
          if (valeur > 0) line += ` - Valeur: ${valeur.toLocaleString('fr-FR')} EUR`
          if (loyer > 0) line += ` - Loyer: ${loyer.toLocaleString('fr-FR')} EUR/mois`
          this.doc.text(line, this.margin + 5, lineY)
          lineY += 7
        })
        this.currentY = boxStart + boxHeight + 8
      }

      // Credits en cours
      if (data.credits && Array.isArray(data.credits) && data.credits.length > 0) {
        this.checkPageBreak(10 + data.credits.length * 8)
        const boxStart = this.currentY
        const boxHeight = 14 + data.credits.length * 7
        const innerY = this.drawSectionBox('Credits en cours', boxStart, boxHeight)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        let lineY = innerY
        data.credits.forEach((credit: any) => {
          const org = credit.organisme || credit.banque || 'Credit'
          const mensualite = parseFloat(credit.mensualite || credit.montantMensuel || 0)
          const capital = parseFloat(credit.capitalRestant || credit.restant || 0)
          let line = `${org}`
          if (mensualite > 0) line += ` - ${mensualite.toLocaleString('fr-FR')} EUR/mois`
          if (capital > 0) line += ` - Capital restant: ${capital.toLocaleString('fr-FR')} EUR`
          this.doc.text(line, this.margin + 5, lineY)
          lineY += 7
        })
        this.currentY = boxStart + boxHeight + 8
      }

      // Comptes bancaires
      if (data.comptes && Array.isArray(data.comptes) && data.comptes.length > 0) {
        this.checkPageBreak(10 + data.comptes.length * 8)
        const boxStart = this.currentY
        const boxHeight = 14 + data.comptes.length * 7
        const innerY = this.drawSectionBox('Comptes bancaires', boxStart, boxHeight)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        let lineY = innerY
        data.comptes.forEach((compte: any) => {
          const banque = compte.banque || compte.nom || 'Compte'
          const solde = parseFloat(compte.solde || 0)
          let line = `${banque}`
          if (compte.type || compte.typeCompte) line += ` (${compte.type || compte.typeCompte})`
          if (solde > 0) line += ` - Solde: ${solde.toLocaleString('fr-FR')} EUR`
          this.doc.text(line, this.margin + 5, lineY)
          lineY += 7
        })
        this.currentY = boxStart + boxHeight + 8
      }

      this.currentY += 5
    })
  }

  /**
   * Genere la section analyse de rentabilite
   */
  private generateRentabilite(projet: Projet): void {
    const a = projet.analysesRentabilite
    if (!a || (a.rentabiliteBrute === 0 && a.cashFlowMensuel === 0)) return

    this.addPageBreak()
    this.currentY = 40

    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('5) Analyse de rentabilite', this.margin, this.currentY)
    this.currentY += 20

    // Indicateurs cles dans des encadres
    const colWidth = (this.pageWidth - 2 * this.margin - 10) / 3
    const boxH = 35
    const indicators = [
      { label: 'Rentabilite brute', value: `${a.rentabiliteBrute.toFixed(2)}%`, color: [76, 175, 80] },
      { label: 'Rentabilite nette', value: `${a.rentabiliteNette.toFixed(2)}%`, color: [33, 150, 243] },
      { label: 'Cash-flow mensuel', value: `${a.cashFlowMensuel >= 0 ? '+' : ''}${a.cashFlowMensuel.toFixed(0)} EUR`, color: a.cashFlowMensuel >= 0 ? [76, 175, 80] : [244, 67, 54] },
    ]

    indicators.forEach((ind, i) => {
      const x = this.margin + i * (colWidth + 5)
      // Fond
      this.doc.setFillColor(248, 248, 248)
      this.doc.roundedRect(x, this.currentY, colWidth, boxH, 2, 2, 'F')
      // Bordure coloree en haut
      this.doc.setFillColor(ind.color[0], ind.color[1], ind.color[2])
      this.doc.rect(x, this.currentY, colWidth, 3, 'F')

      // Label
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(120, 120, 120)
      this.doc.text(ind.label, x + colWidth / 2, this.currentY + 13, { align: 'center' })

      // Valeur
      this.doc.setFontSize(16)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(ind.color[0], ind.color[1], ind.color[2])
      this.doc.text(ind.value, x + colWidth / 2, this.currentY + 27, { align: 'center' })
    })

    this.currentY += boxH + 20

    // Tableau detaille
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('Detail de l\'analyse', this.margin, this.currentY)
    this.currentY += 10

    const rows = [
      { label: 'Cash-flow annuel', value: `${a.cashFlowAnnuel >= 0 ? '+' : ''}${a.cashFlowAnnuel.toFixed(0)} EUR` },
      { label: 'ROI sur apport', value: `${a.roi.toFixed(2)}%` },
      { label: 'Charges annuelles', value: `${a.chargesAnnuelles.toFixed(0)} EUR` },
      { label: 'Taux d\'endettement projet', value: `${a.tauxEndettementProjet.toFixed(1)}%` },
      { label: 'Revenus porteurs (mensuel)', value: `${a.revenusPorteurs.toFixed(0)} EUR` },
    ]

    if (a.anneesRecuperationApport > 0) {
      rows.push({ label: 'Recuperation de l\'apport', value: `${a.anneesRecuperationApport.toFixed(1)} ans` })
    }

    const tableWidth = this.pageWidth - 2 * this.margin
    const rowH = 9

    rows.forEach((row, i) => {
      // Fond alterne
      if (i % 2 === 0) {
        this.doc.setFillColor(248, 245, 240)
        this.doc.rect(this.margin, this.currentY - 5, tableWidth, rowH, 'F')
      }

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text(row.label, this.margin + 5, this.currentY)

      this.doc.setFont('helvetica', 'bold')
      this.doc.text(row.value, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })

      this.currentY += rowH
    })

    // Barre visuelle de rentabilite
    this.currentY += 15
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('Indicateur de rentabilite brute', this.margin, this.currentY)
    this.currentY += 8

    const barWidth = this.pageWidth - 2 * this.margin
    const barH = 10
    // Fond gris
    this.doc.setFillColor(230, 230, 230)
    this.doc.roundedRect(this.margin, this.currentY, barWidth, barH, 2, 2, 'F')
    // Barre coloree (max 15% pour l'echelle)
    const pct = Math.min(a.rentabiliteBrute / 15, 1)
    const fillColor = a.rentabiliteBrute >= 7 ? [76, 175, 80] : a.rentabiliteBrute >= 4 ? [255, 152, 0] : [244, 67, 54]
    this.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    this.doc.roundedRect(this.margin, this.currentY, barWidth * pct, barH, 2, 2, 'F')
    // Label sur la barre
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(255, 255, 255)
    if (pct > 0.15) {
      this.doc.text(`${a.rentabiliteBrute.toFixed(1)}%`, this.margin + barWidth * pct - 15, this.currentY + 7)
    }
  }

  /**
   * Genere la section checklist documents
   */
  private generateChecklist(projet: Projet): void {
    if (!projet.checklistDocuments || projet.checklistDocuments.length === 0) return

    this.addPageBreak()
    this.currentY = 40

    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text('III Documents requis', this.margin, this.currentY)
    this.currentY += 20

    // Grouper par categorie
    const grouped: Record<string, any[]> = {}
    projet.checklistDocuments.forEach(doc => {
      const cat = doc.categorie || 'Autre'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(doc)
    })

    // Compteurs de progression
    const total = projet.checklistDocuments.length
    const fournis = projet.checklistDocuments.filter(d => d.statut === 'Fourni' || d.statut === 'Valide').length
    const enAttente = projet.checklistDocuments.filter(d => d.statut === 'En_Attente').length

    // Barre de progression globale
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(`Progression: ${fournis}/${total} documents fournis`, this.margin, this.currentY)
    this.currentY += 7

    const barWidth = this.pageWidth - 2 * this.margin
    const barH = 6
    this.doc.setFillColor(230, 230, 230)
    this.doc.roundedRect(this.margin, this.currentY, barWidth, barH, 2, 2, 'F')
    if (fournis > 0) {
      this.doc.setFillColor(76, 175, 80)
      this.doc.roundedRect(this.margin, this.currentY, barWidth * (fournis / total), barH, 2, 2, 'F')
    }
    if (enAttente > 0) {
      this.doc.setFillColor(255, 152, 0)
      this.doc.roundedRect(this.margin + barWidth * (fournis / total), this.currentY, barWidth * (enAttente / total), barH, 0, 0, 'F')
    }
    this.currentY += barH + 15

    // Categories
    const catLabels: Record<string, string> = {
      'Identite': 'Identite',
      'Revenus': 'Justificatifs de revenus',
      'Patrimoine': 'Patrimoine',
      'Fiscalite': 'Fiscalite',
      'Societe': 'Documents societe',
      'Bien_Immobilier': 'Bien immobilier',
      'Travaux': 'Travaux',
      'Autre': 'Autres documents'
    }

    Object.entries(grouped).forEach(([cat, docs]) => {
      this.checkPageBreak(15 + docs.length * 8)

      // Titre de categorie
      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.accent)
      this.doc.text(catLabels[cat] || cat, this.margin, this.currentY)
      this.currentY += 7

      // Documents
      docs.forEach(d => {
        // Pastille de statut
        const statusColors: Record<string, number[]> = {
          'Non_Fourni': [244, 67, 54],
          'En_Attente': [255, 152, 0],
          'Fourni': [76, 175, 80],
          'Valide': [33, 150, 243]
        }
        const statusLabels: Record<string, string> = {
          'Non_Fourni': 'Manquant',
          'En_Attente': 'En attente',
          'Fourni': 'Fourni',
          'Valide': 'Valide'
        }
        const color = statusColors[d.statut] || [150, 150, 150]

        // Cercle de statut
        this.doc.setFillColor(color[0], color[1], color[2])
        this.doc.circle(this.margin + 5, this.currentY - 1.5, 2, 'F')

        // Nom du document
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        const oblig = d.obligatoire ? ' *' : ''
        this.doc.text(`${d.nomDocument}${oblig}`, this.margin + 10, this.currentY)

        // Statut a droite
        this.doc.setTextColor(color[0], color[1], color[2])
        this.doc.text(statusLabels[d.statut] || d.statut, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })

        this.currentY += 7
      })

      this.currentY += 5
    })

    // Legende
    this.checkPageBreak(20)
    this.currentY += 5
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(120, 120, 120)
    this.doc.text('* Document obligatoire', this.margin, this.currentY)
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

    // 7. Patrimoine existant
    this.generatePatrimoine(projet)

    // 8. Analyse de rentabilite
    this.generateRentabilite(projet)

    // 9. Checklist documents
    this.generateChecklist(projet)

    // 10. Annexes
    this.generateAnnexes()

    // 11. Pieds de page
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
