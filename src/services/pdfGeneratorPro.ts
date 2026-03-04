import jsPDF from 'jspdf'
import { Projet } from '@/types'

/**
 * Generateur de PDF professionnel pour dossiers bancaires
 * Design epure, moderne et professionnel
 */
class PDFGeneratorPro {
  private doc: jsPDF
  private currentY: number = 20
  private pageWidth: number
  private pageHeight: number
  private margin: number = 20
  private contentWidth: number

  // Couleurs du theme (bleu professionnel)
  private colors = {
    primary: [30, 58, 95] as [number, number, number],
    primaryLight: [37, 99, 235] as [number, number, number],
    bgLight: [245, 247, 250] as [number, number, number],
    bgMedium: [229, 231, 235] as [number, number, number],
    text: [31, 41, 55] as [number, number, number],
    textLight: [107, 114, 128] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    green: [5, 150, 105] as [number, number, number],
    orange: [217, 119, 6] as [number, number, number],
    red: [220, 38, 38] as [number, number, number],
  }

  private sectionPages: Record<string, number> = {}

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.contentWidth = this.pageWidth - 2 * this.margin
    this.currentY = 20
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private fmt(value: number | string | null | undefined): string {
    const num = Number(value) || 0
    const rounded = Math.round(num)
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  private fmtPct(value: number | string | null | undefined): string {
    const num = Number(value) || 0
    if (num === Math.floor(num)) return `${num} %`
    if (Math.abs(num * 10 - Math.round(num * 10)) < 0.01) return `${num.toFixed(1)} %`
    return `${num.toFixed(2)} %`
  }

  private getPageNumber(): number {
    return this.doc.getNumberOfPages()
  }

  private addPage(): void {
    this.doc.addPage()
    this.currentY = 25
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.addPage()
    }
  }

  private drawLine(y: number, color?: [number, number, number]): void {
    this.doc.setDrawColor(...(color || this.colors.bgMedium))
    this.doc.setLineWidth(0.3)
    this.doc.line(this.margin, y, this.pageWidth - this.margin, y)
  }

  private drawSectionTitle(title: string, fontSize: number = 16): void {
    this.checkPageBreak(20)
    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 3
    this.drawLine(this.currentY, this.colors.primaryLight)
    this.currentY += 8
  }

  private drawSubTitle(title: string): void {
    this.checkPageBreak(15)
    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 8
  }

  private drawTableRow(label: string, value: string, index: number, bold: boolean = false): void {
    this.checkPageBreak(10)
    if (index % 2 === 0) {
      this.doc.setFillColor(...this.colors.bgLight)
      this.doc.rect(this.margin, this.currentY - 5, this.contentWidth, 9, 'F')
    }
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(label, this.margin + 5, this.currentY)

    this.doc.setFont('helvetica', bold ? 'bold' : 'normal')
    this.doc.text(value, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })
    this.currentY += 9
  }

  /** Charger une image depuis une URL et la convertir en base64 */
  private async loadImageAsBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, { mode: 'cors' })
      if (!response.ok) return null
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  /** Obtenir les dimensions d'une image base64 */
  private getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.width, height: img.height })
      img.onerror = () => resolve({ width: 1, height: 1 })
      img.src = base64
    })
  }

  // ==========================================
  // PAGE DE GARDE
  // ==========================================

  private generateCoverPage(projet: Projet): void {
    // Bande bleue en haut
    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(0, 0, this.pageWidth, 80, 'F')

    this.doc.setFontSize(28)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.white)
    this.doc.text('DOSSIER DE FINANCEMENT', this.pageWidth / 2, 35, { align: 'center' })

    this.doc.setFontSize(13)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Projet d\'investissement immobilier', this.pageWidth / 2, 50, { align: 'center' })

    this.doc.setFillColor(...this.colors.primaryLight)
    this.doc.rect(this.pageWidth / 2 - 30, 60, 60, 1.5, 'F')

    this.doc.setFontSize(10)
    this.doc.text('MDI.fr', this.pageWidth / 2, 72, { align: 'center' })

    // Nom du projet
    let y = 110
    this.doc.setFontSize(22)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    const nomProjet = projet.nom || 'Projet immobilier'
    const lines = this.doc.splitTextToSize(nomProjet, this.contentWidth - 20)
    this.doc.text(lines, this.pageWidth / 2, y, { align: 'center' })
    y += lines.length * 10

    // Type de bien + ville
    y += 10
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.textLight)

    const bien = projet.bienImmobilier
    const typeBien = bien?.type ? bien.type.replace(/_/g, ' ') : ''
    const superficie = bien?.superficie ? ` - ${Math.round(Number(bien.superficie))} m2` : ''
    const adresseLine = bien ? `${typeBien}${superficie}` : ''
    if (adresseLine) {
      this.doc.text(adresseLine, this.pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    const villeLine = bien ? `${bien.adresse || ''}, ${bien.codePostal || ''} ${bien.ville || ''}` : ''
    if (villeLine.trim().length > 2) {
      this.doc.text(villeLine, this.pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    // Separateur
    y += 15
    this.drawLine(y, this.colors.bgMedium)
    y += 15

    // Porteurs du projet
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Porteurs du projet', this.margin + 10, y)
    y += 10

    if (projet.porteurs && projet.porteurs.length > 0) {
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      projet.porteurs.forEach(porteur => {
        const nom = (porteur as any).structure?.nom || 'Porteur'
        const pct = Number(porteur.pourcentageProjet) || 0
        const pctStr = pct === Math.floor(pct) ? `${pct} %` : `${pct.toFixed(1)} %`
        this.doc.text(`${nom}  -  ${pctStr}`, this.margin + 15, y)
        y += 7
      })
    }

    // Metriques financieres en bas
    y = this.pageHeight - 70
    this.drawLine(y, this.colors.bgMedium)
    y += 10

    const fin = projet.financement
    if (fin) {
      const colW = this.contentWidth / 3
      const metrics = [
        { label: 'Prix d\'achat', value: `${this.fmt(fin.prixAchat)} EUR` },
        { label: 'Montant travaux', value: `${this.fmt(fin.montantTravaux)} EUR` },
        { label: 'Cout total', value: `${this.fmt(fin.coutTotalProjet || (Number(fin.prixAchat) + Number(fin.fraisNotaire) + Number(fin.montantTravaux)))} EUR` },
      ]

      metrics.forEach((m, i) => {
        const x = this.margin + i * colW + colW / 2
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text(m.label, x, y, { align: 'center' })
        this.doc.setFontSize(13)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primary)
        this.doc.text(m.value, x, y + 8, { align: 'center' })
      })
    }

    // Date
    const now = new Date()
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.textLight)
    this.doc.text(dateStr, this.pageWidth / 2, this.pageHeight - 15, { align: 'center' })
  }

  // ==========================================
  // SOMMAIRE
  // ==========================================

  private generateSommaire(): void {
    this.addPage()
    this.currentY = 35

    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Sommaire', this.margin, this.currentY)
    this.currentY += 5
    this.drawLine(this.currentY, this.colors.primaryLight)
    this.currentY += 15

    const entries = Object.entries(this.sectionPages)
    this.doc.setFontSize(11)

    entries.forEach(([title, page]) => {
      const isMain = !title.startsWith('   ')
      const indent = isMain ? 0 : 10

      this.doc.setFont('helvetica', isMain ? 'bold' : 'normal')
      this.doc.setTextColor(...(isMain ? this.colors.primary : this.colors.text))
      this.doc.text(title.trim(), this.margin + indent, this.currentY)

      const textWidth = this.doc.getTextWidth(title.trim())
      const startX = this.margin + indent + textWidth + 3
      const endX = this.pageWidth - this.margin - 15
      if (endX > startX) {
        this.doc.setTextColor(...this.colors.bgMedium)
        const dots = '.'.repeat(Math.max(1, Math.floor((endX - startX) / 1.5)))
        this.doc.setFontSize(9)
        this.doc.text(dots, startX, this.currentY)
      }

      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', isMain ? 'bold' : 'normal')
      this.doc.setTextColor(...(isMain ? this.colors.primary : this.colors.text))
      this.doc.text(`${page}`, this.pageWidth - this.margin, this.currentY, { align: 'right' })

      this.currentY += isMain ? 12 : 9
    })
  }

  // ==========================================
  // PORTEURS + PATRIMOINE
  // ==========================================

  private generatePorteurs(projet: Projet): void {
    if (!projet.porteurs || projet.porteurs.length === 0) return

    this.addPage()
    this.sectionPages['I. Situation personnelle'] = this.getPageNumber()
    this.sectionPages['   Porteurs du projet'] = this.getPageNumber()

    this.drawSectionTitle('I. Situation personnelle')
    this.drawSubTitle('Porteurs du projet')

    projet.porteurs.forEach((porteur, index) => {
      const struct = (porteur as any).structure
      const nom = struct?.nom || 'Porteur'
      const isPersonnePhysique = struct?.type !== 'PERSONNE_MORALE'
      const pp = struct?.personnePhysique
      const pm = struct?.personneMorale

      this.checkPageBreak(60)

      // En-tete du porteur
      this.doc.setFillColor(...this.colors.bgLight)
      this.doc.roundedRect(this.margin, this.currentY - 4, this.contentWidth, 14, 2, 2, 'F')
      this.doc.setFillColor(...this.colors.primaryLight)
      this.doc.rect(this.margin, this.currentY - 4, 3, 14, 'F')

      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      const pct = Number(porteur.pourcentageProjet) || 0
      const pctStr = pct === Math.floor(pct) ? `${pct} %` : `${pct.toFixed(1)} %`
      this.doc.text(`${index + 1}. ${nom}`, this.margin + 8, this.currentY + 3)

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text(pctStr + ' du projet', this.pageWidth - this.margin - 5, this.currentY + 3, { align: 'right' })

      this.currentY += 18

      // Deux colonnes
      const colLeft = this.margin + 5
      const colRight = this.pageWidth / 2 + 5
      let leftY = this.currentY
      let rightY = this.currentY

      // === Colonne gauche: Profil ===
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primaryLight)
      this.doc.text('PROFIL', colLeft, leftY)
      leftY += 6

      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.setFontSize(9)

      const typeLabel = isPersonnePhysique ? 'Personne physique' : 'Personne morale'
      this.doc.text(`Type : ${typeLabel}`, colLeft, leftY)
      leftY += 5

      if (struct?.email) {
        this.doc.text(`Email : ${struct.email}`, colLeft, leftY)
        leftY += 5
      }
      if (struct?.telephone) {
        this.doc.text(`Tel : ${struct.telephone}`, colLeft, leftY)
        leftY += 5
      }
      if (struct?.adresse) {
        this.doc.text(`Adresse : ${struct.adresse}`, colLeft, leftY)
        leftY += 5
      }

      if (pp) {
        if (pp.emploi || pp.employeur) {
          const emploi = [pp.emploi, pp.employeur].filter(Boolean).join(' - ')
          this.doc.text(`Emploi : ${emploi}`, colLeft, leftY)
          leftY += 5
        }
        if (pp.typeContrat) {
          this.doc.text(`Contrat : ${pp.typeContrat.replace(/_/g, ' ')}`, colLeft, leftY)
          leftY += 5
        }
        if (pp.situationFamiliale) {
          this.doc.text(`Situation : ${pp.situationFamiliale.replace(/_/g, ' ')}`, colLeft, leftY)
          leftY += 5
        }
        if (pp.anciennete) {
          this.doc.text(`Anciennete : ${pp.anciennete}`, colLeft, leftY)
          leftY += 5
        }
      }

      if (pm) {
        if (pm.formeJuridique) {
          this.doc.text(`Forme : ${pm.formeJuridique}`, colLeft, leftY)
          leftY += 5
        }
        if (pm.siret) {
          this.doc.text(`SIRET : ${pm.siret}`, colLeft, leftY)
          leftY += 5
        }
        if (pm.capitalSocial) {
          this.doc.text(`Capital : ${this.fmt(pm.capitalSocial)} EUR`, colLeft, leftY)
          leftY += 5
        }
        if (pm.representantLegal) {
          const rep = pm.representantLegal
          this.doc.text(`Representant : ${rep.prenom} ${rep.nom} (${(rep.fonction || '').replace(/_/g, ' ')})`, colLeft, leftY)
          leftY += 5
        }
        if (pm.banquePrincipale) {
          this.doc.text(`Banque : ${pm.banquePrincipale}`, colLeft, leftY)
          leftY += 5
        }
      }

      // === Colonne droite: Revenus et charges ===
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primaryLight)
      this.doc.text('REVENUS', colRight, rightY)
      rightY += 6

      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.setFontSize(9)

      if (pp?.revenus) {
        const rev = pp.revenus
        if (Number(rev.salaireMensuelNet) > 0) {
          this.doc.text(`Salaire net mensuel : ${this.fmt(rev.salaireMensuelNet)} EUR`, colRight, rightY)
          rightY += 5
        }
        if (Number(rev.revenusLocatifs) > 0) {
          this.doc.text(`Revenus locatifs : ${this.fmt(rev.revenusLocatifs)} EUR/mois`, colRight, rightY)
          rightY += 5
        }
        if (Number(rev.primesAnnuelles) > 0) {
          this.doc.text(`Primes annuelles : ${this.fmt(rev.primesAnnuelles)} EUR`, colRight, rightY)
          rightY += 5
        }
        if (Number(rev.totalMensuel) > 0) {
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(`Total mensuel : ${this.fmt(rev.totalMensuel)} EUR`, colRight, rightY)
          rightY += 5
          this.doc.setFont('helvetica', 'normal')
        }
      } else if (pm?.chiffreAffairesAnnuel) {
        this.doc.text(`CA annuel : ${this.fmt(pm.chiffreAffairesAnnuel)} EUR`, colRight, rightY)
        rightY += 5
        if (pm.resultatNet) {
          this.doc.text(`Resultat net : ${this.fmt(pm.resultatNet)} EUR`, colRight, rightY)
          rightY += 5
        }
      } else {
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text('Non renseigne', colRight, rightY)
        rightY += 5
      }

      rightY += 3
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primaryLight)
      this.doc.text('CHARGES', colRight, rightY)
      rightY += 6

      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)

      if (pp?.charges) {
        const ch = pp.charges
        if (Number(ch.loyerMensuel) > 0) {
          this.doc.text(`Loyer : ${this.fmt(ch.loyerMensuel)} EUR/mois`, colRight, rightY)
          rightY += 5
        }
        if (Number(ch.mensualitesCredits) > 0) {
          this.doc.text(`Credits : ${this.fmt(ch.mensualitesCredits)} EUR/mois`, colRight, rightY)
          rightY += 5
        }
        if (Number(ch.totalMensuel) > 0) {
          this.doc.setFont('helvetica', 'bold')
          this.doc.text(`Total charges : ${this.fmt(ch.totalMensuel)} EUR/mois`, colRight, rightY)
          rightY += 5
          this.doc.setFont('helvetica', 'normal')
        }
      } else {
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text('Non renseigne', colRight, rightY)
        rightY += 5
      }

      this.currentY = Math.max(leftY, rightY) + 5

      // === Patrimoine existant (inline sous le porteur) ===
      const data = pp || pm
      const patrimoine = data?.patrimoine
      const biens = patrimoine?.biensImmobiliers || data?.biens
      const credits = patrimoine?.creditsEnCours || data?.credits
      const hasPatrimoine = (biens && Array.isArray(biens) && biens.length > 0) ||
        (credits && Array.isArray(credits) && credits.length > 0) ||
        (patrimoine?.epargneDisponible && Number(patrimoine.epargneDisponible) > 0)

      if (hasPatrimoine) {
        this.checkPageBreak(20)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('PATRIMOINE EXISTANT', colLeft, this.currentY)
        this.currentY += 6

        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        this.doc.setFontSize(9)

        if (biens && Array.isArray(biens) && biens.length > 0) {
          biens.forEach((b: any) => {
            this.checkPageBreak(6)
            const adr = b.adresse || b.type || 'Bien'
            const val = Number(b.valeurEstimee || b.valeur || 0)
            let line = `  Bien : ${adr}`
            if (val > 0) line += ` - Valeur : ${this.fmt(val)} EUR`
            this.doc.text(line, colLeft, this.currentY)
            this.currentY += 5
          })
        }

        if (credits && Array.isArray(credits) && credits.length > 0) {
          credits.forEach((c: any) => {
            this.checkPageBreak(6)
            const org = c.organisme || c.banque || 'Credit'
            const mens = Number(c.mensualite || c.montantMensuel || 0)
            const capital = Number(c.capitalRestantDu || c.capitalRestant || 0)
            let line = `  Credit : ${org}`
            if (mens > 0) line += ` - ${this.fmt(mens)} EUR/mois`
            if (capital > 0) line += ` - Restant : ${this.fmt(capital)} EUR`
            this.doc.text(line, colLeft, this.currentY)
            this.currentY += 5
          })
        }

        if (patrimoine?.epargneDisponible && Number(patrimoine.epargneDisponible) > 0) {
          this.doc.text(`  Epargne disponible : ${this.fmt(patrimoine.epargneDisponible)} EUR`, colLeft, this.currentY)
          this.currentY += 5
        }
      }

      this.currentY += 5

      // Separateur entre porteurs
      if (index < projet.porteurs.length - 1) {
        this.drawLine(this.currentY - 3, this.colors.bgMedium)
        this.currentY += 5
      }
    })
  }

  // ==========================================
  // LE PROJET - LOCALISATION
  // ==========================================

  private generateLocalisation(projet: Projet): void {
    this.addPage()
    this.sectionPages['II. Le projet'] = this.getPageNumber()
    this.sectionPages['   Situation geographique'] = this.getPageNumber()

    this.drawSectionTitle('II. Le projet')
    this.drawSubTitle('1. Situation geographique')

    const bien = projet.bienImmobilier
    if (!bien) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text('Aucune information sur le bien.', this.margin, this.currentY)
      return
    }

    // Adresse encadree
    this.doc.setFillColor(...this.colors.bgLight)
    this.doc.roundedRect(this.margin, this.currentY - 4, this.contentWidth, 28, 2, 2, 'F')
    this.doc.setFillColor(...this.colors.primaryLight)
    this.doc.rect(this.margin, this.currentY - 4, 3, 28, 'F')

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text(bien.adresse || '', this.margin + 10, this.currentY + 4)

    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(`${bien.codePostal || ''} ${bien.ville || ''}`, this.margin + 10, this.currentY + 12)

    this.doc.setTextColor(...this.colors.textLight)
    this.doc.setFontSize(10)
    const typeStr = bien.type ? bien.type.replace(/_/g, ' ') : ''
    const supStr = bien.superficie ? `${Math.round(Number(bien.superficie))} m2` : ''
    this.doc.text([typeStr, supStr].filter(Boolean).join(' - '), this.margin + 10, this.currentY + 19)

    this.currentY += 38

    // Caracteristiques
    this.drawSubTitle('Caracteristiques')

    const caracItems: [string, string][] = []
    if (bien.type) caracItems.push(['Type de bien', bien.type.replace(/_/g, ' ')])
    if (bien.superficie) caracItems.push(['Superficie', `${Math.round(Number(bien.superficie))} m2`])
    if (bien.nombrePieces) caracItems.push(['Nombre de pieces', `${bien.nombrePieces}`])
    if (bien.nombreChambres) caracItems.push(['Chambres', `${bien.nombreChambres}`])
    if (bien.nombreSDB) caracItems.push(['Salles de bain', `${bien.nombreSDB}`])
    if (bien.anneeConstruction) caracItems.push(['Annee de construction', `${bien.anneeConstruction}`])
    if (bien.etatActuel) caracItems.push(['Etat actuel', bien.etatActuel.replace(/_/g, ' ')])
    if (bien.dpe) caracItems.push(['DPE', bien.dpe])
    if (bien.ges) caracItems.push(['GES', bien.ges])
    if (bien.destinationBien) caracItems.push(['Destination', bien.destinationBien.replace(/_/g, ' ')])

    caracItems.forEach(([label, value], i) => {
      this.drawTableRow(label, value, i)
    })

    // Elements / lots
    const elements = (bien as any).elements || (bien as any).elementsBien
    if (elements && Array.isArray(elements) && elements.length > 0) {
      this.currentY += 8
      this.drawSubTitle('Composition du bien')

      this.doc.setFillColor(...this.colors.primary)
      this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.white)
      this.doc.text('Type', this.margin + 5, this.currentY)
      this.doc.text('Superficie', this.margin + 60, this.currentY)
      this.doc.text('Loyer estime', this.margin + 100, this.currentY)
      this.doc.text('Description', this.margin + 135, this.currentY)
      this.currentY += 8

      elements.forEach((elem: any, i: number) => {
        this.checkPageBreak(10)
        if (i % 2 === 0) {
          this.doc.setFillColor(...this.colors.bgLight)
          this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
        }
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        this.doc.text((elem.type || '').replace(/_/g, ' '), this.margin + 5, this.currentY)
        this.doc.text(elem.superficie ? `${Math.round(Number(elem.superficie))} m2` : '-', this.margin + 60, this.currentY)
        this.doc.text(elem.loyerMensuel ? `${this.fmt(elem.loyerMensuel)} EUR` : '-', this.margin + 100, this.currentY)
        const desc = elem.description || ''
        this.doc.text(desc.substring(0, 25), this.margin + 135, this.currentY)
        this.currentY += 8
      })
    }
  }

  // ==========================================
  // LE BIEN ET SON PROJET (TRAVAUX)
  // ==========================================

  private generateBienProjet(projet: Projet): void {
    const bien = projet.bienImmobilier
    if (!bien) return

    const hasTravaux = bien.travauxPrevus && bien.travauxPrevus.length > 0
    const hasRentabiliteInfo = bien.loyerMensuelEstime || bien.chargesMensuelles || bien.taxeFonciere

    if (!hasTravaux && !hasRentabiliteInfo) return

    this.addPage()
    this.sectionPages['   Le bien et son projet'] = this.getPageNumber()

    this.drawSubTitle('2. Le bien et son projet')

    // Revenus locatifs estimes
    if (hasRentabiliteInfo) {
      this.doc.setFillColor(...this.colors.bgLight)
      this.doc.roundedRect(this.margin, this.currentY - 4, this.contentWidth, 22, 2, 2, 'F')

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)

      if (bien.loyerMensuelEstime) {
        this.doc.text(`Loyer mensuel estime : ${this.fmt(bien.loyerMensuelEstime)} EUR/mois`, this.margin + 5, this.currentY + 3)
      }
      if (bien.chargesMensuelles) {
        this.doc.text(`Charges mensuelles : ${this.fmt(bien.chargesMensuelles)} EUR/mois`, this.margin + 5, this.currentY + 11)
      }
      if (bien.taxeFonciere) {
        this.doc.text(`Taxe fonciere : ${this.fmt(bien.taxeFonciere)} EUR/an`, this.pageWidth / 2, this.currentY + 3)
      }
      this.currentY += 28
    }

    // Travaux prevus
    if (hasTravaux) {
      this.drawSubTitle('Travaux prevus')

      this.doc.setFillColor(...this.colors.primary)
      this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.white)
      this.doc.text('Description', this.margin + 5, this.currentY)
      this.doc.text('Categorie', this.margin + 90, this.currentY)
      this.doc.text('Montant', this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })
      this.currentY += 8

      let totalTravaux = 0

      bien.travauxPrevus.forEach((travail, i) => {
        this.checkPageBreak(10)
        if (i % 2 === 0) {
          this.doc.setFillColor(...this.colors.bgLight)
          this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
        }
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)

        const desc = (travail.description || '').substring(0, 45)
        this.doc.text(desc, this.margin + 5, this.currentY)
        this.doc.text((travail.categorie || '').replace(/_/g, ' '), this.margin + 90, this.currentY)

        const montant = Number(travail.montant) || 0
        totalTravaux += montant
        this.doc.text(`${this.fmt(montant)} EUR`, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })
        this.currentY += 8
      })

      // Total travaux
      this.doc.setFillColor(...this.colors.primary)
      this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 9, 'F')
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.white)
      this.doc.text('TOTAL TRAVAUX', this.margin + 5, this.currentY + 1)
      this.doc.text(`${this.fmt(totalTravaux)} EUR`, this.pageWidth - this.margin - 5, this.currentY + 1, { align: 'right' })
      this.currentY += 12
    }
  }

  // ==========================================
  // FINANCEMENT
  // ==========================================

  private generateFinancement(projet: Projet): void {
    const fin = projet.financement
    if (!fin) return

    this.addPage()
    this.sectionPages['   Plan de financement'] = this.getPageNumber()

    this.drawSubTitle('3. Plan de financement')

    // Cout du projet
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Cout du projet', this.margin + 5, this.currentY)
    this.currentY += 8

    const coutItems: [string, number][] = [
      ['Prix d\'achat (FAI)', Number(fin.prixAchat) || 0],
      ['Frais de notaire', Number(fin.fraisNotaire) || 0],
      ['Frais d\'agence', Number(fin.fraisAgence) || 0],
      ['Montant des travaux', Number(fin.montantTravaux) || 0],
      ['Frais de dossier bancaire', Number(fin.fraisDossierBancaire) || 0],
      ['Frais de garantie', Number(fin.fraisGarantie) || 0],
      ['Autres frais', Number(fin.autresFrais) || 0],
    ]

    let rowIdx = 0
    coutItems.forEach(([label, value]) => {
      if (value > 0) {
        this.drawTableRow(label, `${this.fmt(value)} EUR`, rowIdx++)
      }
    })

    // Total
    const totalProjet = Number(fin.coutTotalProjet) || coutItems.reduce((sum, [, v]) => sum + v, 0)
    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 9, 'F')
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.white)
    this.doc.text('COUT TOTAL DU PROJET', this.margin + 5, this.currentY + 1)
    this.doc.text(`${this.fmt(totalProjet)} EUR`, this.pageWidth - this.margin - 5, this.currentY + 1, { align: 'right' })
    this.currentY += 18

    // Structure de financement
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Structure de financement', this.margin + 5, this.currentY)
    this.currentY += 8

    const finItems: [string, string][] = [
      ['Apport personnel', `${this.fmt(fin.apportPersonnel)} EUR`],
      ['Montant a emprunter', `${this.fmt(fin.montantEmprunt || (totalProjet - (Number(fin.apportPersonnel) || 0)))} EUR`],
      ['Duree du credit', `${Number(fin.dureeCredit) || 0} ans`],
      ['Taux d\'interet estime', this.fmtPct(fin.tauxInteretEstime)],
    ]
    if (Number(fin.tauxAssuranceEstime) > 0) {
      finItems.push(['Taux d\'assurance', this.fmtPct(fin.tauxAssuranceEstime)])
    }
    if (fin.typePret) {
      finItems.push(['Type de pret', fin.typePret.replace(/_/g, ' ')])
    }

    finItems.forEach(([label, value], i) => {
      this.drawTableRow(label, value, i)
    })

    this.currentY += 8

    // Mensualites
    this.doc.setFillColor(...this.colors.bgLight)
    this.doc.roundedRect(this.margin, this.currentY - 5, this.contentWidth, 30, 2, 2, 'F')
    this.doc.setFillColor(...this.colors.primaryLight)
    this.doc.rect(this.margin, this.currentY - 5, 3, 30, 'F')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Mensualites estimees', this.margin + 10, this.currentY + 2)

    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)

    if (Number(fin.mensualiteCapitalInterets) > 0) {
      this.doc.text(`Capital + interets : ${this.fmt(fin.mensualiteCapitalInterets)} EUR/mois`, this.margin + 10, this.currentY + 10)
    }
    if (Number(fin.mensualiteAssurance) > 0) {
      this.doc.text(`Assurance : ${this.fmt(fin.mensualiteAssurance)} EUR/mois`, this.margin + 10, this.currentY + 16)
    }

    this.doc.setFontSize(12)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    const mensTotal = Number(fin.mensualiteTotale) || 0
    this.doc.text(`${this.fmt(mensTotal)} EUR/mois`, this.pageWidth - this.margin - 10, this.currentY + 12, { align: 'right' })

    this.currentY += 38

    // Calcul loyer 70% vs mensualites
    if (projet.bienImmobilier?.loyerMensuelEstime && mensTotal > 0) {
      const loyer = Number(projet.bienImmobilier.loyerMensuelEstime)
      const loyerNet = loyer * 0.7
      const cashflow = loyerNet - mensTotal

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text(
        `Les revenus locatifs pris a 70 % representent ${this.fmt(loyerNet)} EUR/mois.`,
        this.margin, this.currentY
      )
      this.currentY += 6

      const cfColor = cashflow >= 0 ? this.colors.green : this.colors.red
      this.doc.setTextColor(...cfColor)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text(
        `Soit un ${cashflow >= 0 ? 'excedent' : 'deficit'} de ${this.fmt(Math.abs(cashflow))} EUR/mois.`,
        this.margin, this.currentY
      )
    }
  }

  // ==========================================
  // CHECKLIST DOCUMENTS
  // ==========================================

  private generateChecklist(projet: Projet): void {
    if (!projet.checklistDocuments || projet.checklistDocuments.length === 0) return

    this.addPage()
    this.sectionPages['III. Documents requis'] = this.getPageNumber()

    this.drawSectionTitle('III. Documents requis')

    const total = projet.checklistDocuments.length
    const fournis = projet.checklistDocuments.filter(d => d.statut === 'Fourni' || d.statut === 'Valide').length
    const enAttente = projet.checklistDocuments.filter(d => d.statut === 'En_Attente').length

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(`Progression : ${fournis}/${total} documents fournis`, this.margin, this.currentY)
    this.currentY += 6

    // Barre de progression
    const barW = this.contentWidth
    const barH = 6
    this.doc.setFillColor(...this.colors.bgMedium)
    this.doc.roundedRect(this.margin, this.currentY, barW, barH, 2, 2, 'F')
    if (fournis > 0) {
      this.doc.setFillColor(...this.colors.green)
      this.doc.roundedRect(this.margin, this.currentY, barW * (fournis / total), barH, 2, 2, 'F')
    }
    if (enAttente > 0) {
      const startX = this.margin + barW * (fournis / total)
      this.doc.setFillColor(...this.colors.orange)
      this.doc.rect(startX, this.currentY, barW * (enAttente / total), barH, 'F')
    }
    this.currentY += barH + 12

    // Par categorie
    const grouped: Record<string, any[]> = {}
    projet.checklistDocuments.forEach(doc => {
      const cat = doc.categorie || 'Autre'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(doc)
    })

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

    const statusColors: Record<string, [number, number, number]> = {
      'Non_Fourni': this.colors.red,
      'En_Attente': this.colors.orange,
      'Fourni': this.colors.green,
      'Valide': this.colors.primaryLight
    }
    const statusLabels: Record<string, string> = {
      'Non_Fourni': 'Manquant',
      'En_Attente': 'En attente',
      'Fourni': 'Fourni',
      'Valide': 'Valide'
    }

    Object.entries(grouped).forEach(([cat, docs]) => {
      this.checkPageBreak(15 + docs.length * 7)

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text(catLabels[cat] || cat, this.margin, this.currentY)
      this.currentY += 6

      docs.forEach(d => {
        this.checkPageBreak(7)
        const color = statusColors[d.statut] || this.colors.textLight

        this.doc.setFillColor(...color)
        this.doc.circle(this.margin + 5, this.currentY - 1.5, 1.5, 'F')

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        const oblig = d.obligatoire ? ' *' : ''
        this.doc.text(`${d.nomDocument}${oblig}`, this.margin + 10, this.currentY)

        this.doc.setTextColor(...color)
        this.doc.text(statusLabels[d.statut] || d.statut, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })

        this.currentY += 6
      })

      this.currentY += 4
    })

    this.checkPageBreak(10)
    this.currentY += 3
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.textLight)
    this.doc.text('* Document obligatoire', this.margin, this.currentY)
  }

  // ==========================================
  // PHOTOS
  // ==========================================

  private async generatePhotos(projet: Projet): Promise<void> {
    const photos = projet.bienImmobilier?.photos
    if (!photos || photos.length === 0) return

    this.addPage()
    this.sectionPages['IV. Photos du bien'] = this.getPageNumber()

    this.drawSectionTitle('IV. Photos du bien')

    // Charger les images en parallele
    const loadPromises = photos.map(async (photo) => {
      const base64 = await this.loadImageAsBase64(photo.url)
      return { photo, base64 }
    })

    const loadedPhotos = await Promise.all(loadPromises)
    const validPhotos = loadedPhotos.filter(p => p.base64 !== null)

    if (validPhotos.length === 0) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text('Les photos ne sont pas disponibles pour le moment.', this.margin, this.currentY)
      return
    }

    // Grille : 2 photos par ligne
    const cols = 2
    const gap = 8
    const imgW = (this.contentWidth - gap) / cols
    const imgH = imgW * 0.65 // Ratio 3:2 environ
    const labelH = 8

    for (let i = 0; i < validPhotos.length; i++) {
      const col = i % cols
      const isNewRow = col === 0

      if (isNewRow && i > 0) {
        this.currentY += imgH + labelH + 8
      }

      if (isNewRow) {
        this.checkPageBreak(imgH + labelH + 10)
      }

      const x = this.margin + col * (imgW + gap)
      const y = this.currentY

      const { photo, base64 } = validPhotos[i]

      try {
        // Detecter le format
        const format = base64!.includes('image/png') ? 'PNG' : 'JPEG'

        // Obtenir les dimensions pour garder le ratio
        const dims = await this.getImageDimensions(base64!)
        const ratio = dims.width / dims.height
        let drawW = imgW
        let drawH = imgW / ratio
        if (drawH > imgH) {
          drawH = imgH
          drawW = imgH * ratio
        }

        // Centrer l'image dans la cellule
        const offsetX = (imgW - drawW) / 2
        const offsetY = (imgH - drawH) / 2

        // Fond gris clair pour la cellule
        this.doc.setFillColor(...this.colors.bgLight)
        this.doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F')

        // Image
        this.doc.addImage(base64!, format, x + offsetX, y + offsetY, drawW, drawH)

        // Bordure
        this.doc.setDrawColor(...this.colors.bgMedium)
        this.doc.setLineWidth(0.3)
        this.doc.roundedRect(x, y, imgW, imgH, 2, 2)

        // Legende sous la photo
        const typeLabel = (photo.type || '').replace(/_/g, ' ')
        const desc = photo.description || typeLabel || 'Photo'
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text(desc.substring(0, 35), x + imgW / 2, y + imgH + 5, { align: 'center' })
      } catch (e) {
        // Si l'image echoue, afficher un placeholder
        this.doc.setFillColor(...this.colors.bgLight)
        this.doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F')
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text('Image non disponible', x + imgW / 2, y + imgH / 2, { align: 'center' })
      }
    }

    // Avancer apres la derniere ligne
    this.currentY += imgH + labelH + 5
  }

  // ==========================================
  // ANNEXES
  // ==========================================

  private generateAnnexes(projet: Projet): void {
    this.addPage()
    this.sectionPages['Annexes'] = this.getPageNumber()

    this.drawSectionTitle('Annexes')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)

    if (projet.checklistDocuments && projet.checklistDocuments.length > 0) {
      this.doc.text('Documents a joindre au dossier :', this.margin, this.currentY)
      this.currentY += 8

      const grouped: Record<string, string[]> = {}
      projet.checklistDocuments.forEach(doc => {
        const cat = doc.categorie || 'Autre'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(doc.nomDocument)
      })

      Object.entries(grouped).forEach(([cat, docs]) => {
        this.checkPageBreak(10 + docs.length * 6)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primary)
        this.doc.text(cat.replace(/_/g, ' '), this.margin + 3, this.currentY)
        this.currentY += 5

        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        docs.forEach(d => {
          this.doc.text(`-  ${d}`, this.margin + 8, this.currentY)
          this.currentY += 5
        })
        this.currentY += 3
      })
    } else {
      const documents = [
        'Cartes d\'identite',
        'Justificatifs de revenus (3 derniers bulletins de salaire)',
        'Avis d\'imposition (2 derniers)',
        'Releves de comptes bancaires (3 derniers mois)',
        'Compromis de vente ou promesse',
        'Devis travaux detailles',
        'Photos du bien',
        'Statuts de la societe (si applicable)',
        'Attestation d\'assurance emprunteur',
      ]

      documents.forEach(d => {
        this.checkPageBreak(7)
        this.doc.setFillColor(...this.colors.primaryLight)
        this.doc.circle(this.margin + 4, this.currentY - 1.5, 1.2, 'F')
        this.doc.setFontSize(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        this.doc.text(d, this.margin + 10, this.currentY)
        this.currentY += 7
      })
    }
  }

  // ==========================================
  // PIEDS DE PAGE
  // ==========================================

  private addFooters(): void {
    const pageCount = this.doc.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setDrawColor(...this.colors.bgMedium)
      this.doc.setLineWidth(0.3)
      this.doc.line(this.margin, this.pageHeight - 14, this.pageWidth - this.margin, this.pageHeight - 14)

      this.doc.setFontSize(7)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text(`Page ${i} / ${pageCount}`, this.margin, this.pageHeight - 8)
      this.doc.text('MDI.fr - Dossier de financement', this.pageWidth / 2, this.pageHeight - 8, { align: 'center' })
      this.doc.text('Document confidentiel', this.pageWidth - this.margin, this.pageHeight - 8, { align: 'right' })
    }
  }

  // ==========================================
  // GENERATION PRINCIPALE (ASYNC pour les photos)
  // ==========================================

  public async generatePDF(projet: Projet): Promise<jsPDF> {
    const safe = (label: string, fn: () => void) => {
      try { fn() } catch (e) { console.error(`PDF section "${label}" error:`, e) }
    }

    const safeAsync = async (label: string, fn: () => Promise<void>) => {
      try { await fn() } catch (e) { console.error(`PDF section "${label}" error:`, e) }
    }

    // Phase 1: Page de garde
    safe('Page de garde', () => this.generateCoverPage(projet))

    // Phase 2: Sections de contenu
    safe('Porteurs', () => this.generatePorteurs(projet))
    safe('Localisation', () => this.generateLocalisation(projet))
    safe('Bien et projet', () => this.generateBienProjet(projet))
    safe('Financement', () => this.generateFinancement(projet))
    safe('Checklist', () => this.generateChecklist(projet))

    // Section photos (async: chargement des images)
    await safeAsync('Photos', () => this.generatePhotos(projet))

    safe('Annexes', () => this.generateAnnexes(projet))

    // Phase 3: Sommaire (insere en page 2)
    try {
      const adjustedPages: Record<string, number> = {}
      for (const [key, val] of Object.entries(this.sectionPages)) {
        adjustedPages[key] = val + 1
      }
      this.sectionPages = adjustedPages

      this.generateSommaire()
      const sommairePage = this.getPageNumber()
      this.doc.movePage(sommairePage, 2)
    } catch (e) {
      console.error('Sommaire generation error:', e)
    }

    // Phase 4: Footers
    safe('Footers', () => this.addFooters())

    return this.doc
  }

  public async downloadPDF(projet: Projet, filename?: string): Promise<void> {
    const doc = await this.generatePDF(projet)
    const nom = projet.nom || 'projet'
    const date = new Date().toISOString().split('T')[0]
    const defaultFilename = `dossier-bancaire-${nom}-${date}.pdf`
    doc.save(filename || defaultFilename)
  }

  public async getPDFBlob(projet: Projet): Promise<Blob> {
    const doc = await this.generatePDF(projet)
    return doc.output('blob')
  }
}

export default PDFGeneratorPro
