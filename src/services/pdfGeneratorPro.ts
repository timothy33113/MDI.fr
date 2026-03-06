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

  private async generateCoverPage(projet: Projet): Promise<void> {
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
    const villeLine = bien ? `${bien.adresse || ''}, ${bien.codePostal || ''} ${bien.ville || ''}` : ''
    if (villeLine.trim().length > 2) {
      this.doc.text(villeLine, this.pageWidth / 2, y, { align: 'center' })
      y += 8
    }

    // Reserve espace pour: separateur(20) + porteurs(~35) + financials(70 from bottom)
    const financialsY = this.pageHeight - 70
    const porteursNeeded = 20 + 10 + (projet.porteurs ? projet.porteurs.length * 7 + 10 : 0)

    // Photo de couverture
    if (projet.photoCouverture) {
      y += 8
      try {
        const base64 = projet.photoCouverture.startsWith('data:')
          ? projet.photoCouverture
          : await this.loadImageAsBase64(projet.photoCouverture)
        if (base64) {
          const dims = await this.getImageDimensions(base64)
          const maxW = this.contentWidth * 0.6
          // Hauteur max dynamique: espace restant moins porteurs et financials
          const maxH = Math.min(50, financialsY - y - porteursNeeded - 8)
          if (maxH > 15) {
            const ratio = dims.width / dims.height
            let drawW = maxW
            let drawH = maxW / ratio
            if (drawH > maxH) { drawH = maxH; drawW = maxH * ratio }
            const x = (this.pageWidth - drawW) / 2
            const format = base64.includes('image/png') ? 'PNG' : 'JPEG'
            this.doc.setFillColor(...this.colors.bgLight)
            this.doc.roundedRect(x - 1, y - 1, drawW + 2, drawH + 2, 2, 2, 'F')
            this.doc.addImage(base64, format, x, y, drawW, drawH)
            this.doc.setDrawColor(...this.colors.bgMedium)
            this.doc.setLineWidth(0.3)
            this.doc.roundedRect(x - 1, y - 1, drawW + 2, drawH + 2, 2, 2)
            y += drawH + 5
          }
        }
      } catch (e) {
        console.error('Cover photo error:', e)
      }
    }

    // Separateur + Porteurs du projet
    if (y + 30 < financialsY) {
      y += 10
      this.drawLine(y, this.colors.bgMedium)
      y += 10

      this.doc.setFontSize(11)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text('Porteurs du projet', this.margin + 10, y)
      y += 10

      if (projet.porteurs && projet.porteurs.length > 0) {
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)
        projet.porteurs.forEach(porteur => {
          if (y + 7 >= financialsY) return
          const nom = (porteur as any).structure?.nom || 'Porteur'
          const pct = Number(porteur.pourcentageProjet) || 0
          const pctStr = pct === Math.floor(pct) ? `${pct} %` : `${pct.toFixed(1)} %`
          this.doc.text(`${nom}  -  ${pctStr}`, this.margin + 15, y)
          y += 7
        })
      }
    }

    // Metriques financieres
    y = financialsY
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

  private async generatePorteurs(projet: Projet): Promise<void> {
    if (!projet.porteurs || projet.porteurs.length === 0) return

    this.addPage()
    this.sectionPages['I. Situation personnelle'] = this.getPageNumber()
    this.sectionPages['   1- Porteurs du projet'] = this.getPageNumber()

    this.drawSectionTitle('I. Situation personnelle')
    this.drawSubTitle('Porteurs du projet')

    for (let index = 0; index < projet.porteurs.length; index++) {
      const porteur = projet.porteurs[index]
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

      this.currentY += 15

      // Phrase descriptive du porteur (comme dans les vrais dossiers bancaires)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)

      if (isPersonnePhysique && pp) {
        const parts: string[] = []
        const prenomNom = [pp.prenom, struct?.nom?.split(' ').pop()].filter(Boolean).join(' ')
        const age = pp.dateNaissance ? Math.floor((Date.now() - new Date(pp.dateNaissance).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0
        let intro = prenomNom || nom
        if (age > 0) intro += `, ${age} ans`
        if (pp.situationFamiliale) intro += `, ${pp.situationFamiliale.replace(/_/g, ' ').toLowerCase()}`
        parts.push(intro + '.')
        if (pp.emploi) {
          let job = `${pp.statutProfessionnel === 'Salarie' ? 'Salarie(e)' : pp.statutProfessionnel?.replace(/_/g, ' ') || ''} en tant que ${pp.emploi}`
          if (pp.employeur) job += ` chez ${pp.employeur}`
          if (pp.typeContrat) job += ` (${pp.typeContrat.replace(/_/g, ' ')})`
          if (pp.anciennete) job += ` depuis ${pp.anciennete}`
          parts.push(job + '.')
        }
        const descText = parts.join(' ')
        const descLines = this.doc.splitTextToSize(descText, this.contentWidth - 10)
        this.doc.text(descLines, this.margin + 5, this.currentY)
        this.currentY += descLines.length * 4.5 + 4
      } else if (pm) {
        const parts: string[] = []
        const forme = pm.formeJuridique || struct?.type?.replace(/_/g, ' ') || ''
        let intro = `${pm.denominationSociale || nom}, ${forme}`
        if (pm.capitalSocial) intro += ` au capital de ${this.fmt(pm.capitalSocial)} EUR`
        parts.push(intro + '.')
        if (pm.representantLegal) {
          const rep = pm.representantLegal
          parts.push(`Representee par ${rep.prenom} ${rep.nom}, ${(rep.fonction || '').replace(/_/g, ' ')}.`)
        }
        const descText = parts.join(' ')
        const descLines = this.doc.splitTextToSize(descText, this.contentWidth - 10)
        this.doc.text(descLines, this.margin + 5, this.currentY)
        this.currentY += descLines.length * 4.5 + 4
      }

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

      // === Patrimoine existant - fiches detaillees par bien ===
      const data = pp || pm
      const patrimoine = data?.patrimoine
      const biens: any[] = patrimoine?.biensImmobiliers || data?.biens || []
      const credits: any[] = patrimoine?.creditsEnCours || data?.credits || []
      const epargne = patrimoine?.epargneDisponible ? Number(patrimoine.epargneDisponible) : 0

      if (biens.length > 0 || credits.length > 0 || epargne > 0) {
        this.checkPageBreak(20)
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('PATRIMOINE EXISTANT', colLeft, this.currentY)
        this.currentY += 8

        if (epargne > 0) {
          this.doc.setFont('helvetica', 'normal')
          this.doc.setTextColor(...this.colors.text)
          this.doc.setFontSize(9)
          this.doc.text(`Epargne disponible : ${this.fmt(epargne)} EUR`, colLeft, this.currentY)
          this.currentY += 6
        }

        // Fiche detaillee pour chaque bien
        await this.renderBiensDetailles(biens, credits, nom)

        // Credits non associes a un bien
        const biensIds = biens.map((b: any) => b.id)
        const creditsOrphelins = credits.filter((c: any) => !c.bienAssocie || !biensIds.includes(c.bienAssocie))
        if (creditsOrphelins.length > 0) {
          this.checkPageBreak(20)
          this.doc.setFontSize(9)
          this.doc.setFont('helvetica', 'bold')
          this.doc.setTextColor(...this.colors.primaryLight)
          this.doc.text('AUTRES CREDITS', colLeft, this.currentY)
          this.currentY += 6
          creditsOrphelins.forEach((c: any) => {
            this.checkPageBreak(6)
            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(...this.colors.text)
            this.doc.setFontSize(9)
            const org = c.organisme || c.banque || 'Credit'
            const mens = Number(c.mensualite || c.montantMensuel || 0)
            const capital = Number(c.capitalRestantDu || c.capitalRestant || 0)
            let line = `${org} - ${(c.type || '').replace(/_/g, ' ')}`
            if (mens > 0) line += ` - ${this.fmt(mens)} EUR/mois`
            if (capital > 0) line += ` - Restant du : ${this.fmt(capital)} EUR`
            this.doc.text(line, colLeft + 3, this.currentY)
            this.currentY += 5
          })
        }
      }

      this.currentY += 5

      // === Associes de la structure (pour les personnes morales / SCI) ===
      const associes = pm?.associes
      if (associes && Array.isArray(associes) && associes.length > 0) {
        this.checkPageBreak(30)

        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('ASSOCIES', colLeft, this.currentY)
        this.currentY += 8

        for (let aIdx = 0; aIdx < associes.length; aIdx++) {
          const associe = associes[aIdx]
          this.checkPageBreak(40)

          // En-tete associe
          this.doc.setFillColor(245, 247, 250)
          this.doc.roundedRect(this.margin + 5, this.currentY - 4, this.contentWidth - 10, 12, 1.5, 1.5, 'F')
          this.doc.setFontSize(10)
          this.doc.setFont('helvetica', 'bold')
          this.doc.setTextColor(...this.colors.primary)
          const associeNom = [associe.prenom, associe.nom].filter(Boolean).join(' ') || 'Associe'
          const fonctionStr = associe.fonction ? ` - ${associe.fonction}` : ''
          this.doc.text(`${aIdx + 1}. ${associeNom}${fonctionStr}`, this.margin + 10, this.currentY + 3)
          this.currentY += 14

          // Recuperer les details de la structure de l'associe
          const aStruct = associe.structure
          const aPP = aStruct?.personnePhysique

          if (aPP) {
            const aColLeft = this.margin + 10
            const aColRight = this.pageWidth / 2 + 5
            let aLeftY = this.currentY
            let aRightY = this.currentY

            // Colonne gauche: Profil
            this.doc.setFontSize(8)
            this.doc.setFont('helvetica', 'bold')
            this.doc.setTextColor(...this.colors.primaryLight)
            this.doc.text('PROFIL', aColLeft, aLeftY)
            aLeftY += 5

            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(...this.colors.text)
            this.doc.setFontSize(8)

            if (aPP.emploi || aPP.employeur) {
              this.doc.text(`Emploi : ${[aPP.emploi, aPP.employeur].filter(Boolean).join(' - ')}`, aColLeft, aLeftY)
              aLeftY += 4.5
            }
            if (aPP.typeContrat) {
              this.doc.text(`Contrat : ${aPP.typeContrat.replace(/_/g, ' ')}`, aColLeft, aLeftY)
              aLeftY += 4.5
            }
            if (aPP.situationFamiliale) {
              this.doc.text(`Situation : ${aPP.situationFamiliale.replace(/_/g, ' ')}`, aColLeft, aLeftY)
              aLeftY += 4.5
            }
            if (aPP.anciennete) {
              this.doc.text(`Anciennete : ${aPP.anciennete}`, aColLeft, aLeftY)
              aLeftY += 4.5
            }

            // Colonne droite: Revenus + Charges
            this.doc.setFontSize(8)
            this.doc.setFont('helvetica', 'bold')
            this.doc.setTextColor(...this.colors.primaryLight)
            this.doc.text('REVENUS', aColRight, aRightY)
            aRightY += 5

            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(...this.colors.text)
            this.doc.setFontSize(8)

            if (aPP.revenus) {
              const rev = aPP.revenus
              if (Number(rev.salaireMensuelNet) > 0) {
                this.doc.text(`Salaire net : ${this.fmt(rev.salaireMensuelNet)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
              }
              if (Number(rev.revenusLocatifs) > 0) {
                this.doc.text(`Revenus locatifs : ${this.fmt(rev.revenusLocatifs)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
              }
              if (Number(rev.totalMensuel) > 0) {
                this.doc.setFont('helvetica', 'bold')
                this.doc.text(`Total : ${this.fmt(rev.totalMensuel)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
                this.doc.setFont('helvetica', 'normal')
              }
            }

            aRightY += 2
            this.doc.setFont('helvetica', 'bold')
            this.doc.setTextColor(...this.colors.primaryLight)
            this.doc.text('CHARGES', aColRight, aRightY)
            aRightY += 5

            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(...this.colors.text)

            if (aPP.charges) {
              const ch = aPP.charges
              if (Number(ch.loyerMensuel) > 0) {
                this.doc.text(`Loyer : ${this.fmt(ch.loyerMensuel)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
              }
              if (Number(ch.mensualitesCredits) > 0) {
                this.doc.text(`Credits : ${this.fmt(ch.mensualitesCredits)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
              }
              if (Number(ch.totalMensuel) > 0) {
                this.doc.setFont('helvetica', 'bold')
                this.doc.text(`Total : ${this.fmt(ch.totalMensuel)} EUR/mois`, aColRight, aRightY)
                aRightY += 4.5
              }
            }

            this.currentY = Math.max(aLeftY, aRightY) + 3

            // Patrimoine de l'associe
            const aPatrimoine = aPP.patrimoine
            const aBiens: any[] = aPatrimoine?.biensImmobiliers || []
            const aCredits: any[] = aPatrimoine?.creditsEnCours || []
            if (aBiens.length > 0 || aCredits.length > 0) {
              this.currentY += 2
              await this.renderBiensDetailles(aBiens, aCredits, associeNom)
            }
          }

          // Separateur entre associes
          if (aIdx < associes.length - 1) {
            this.doc.setDrawColor(230, 230, 230)
            this.doc.setLineWidth(0.2)
            this.doc.line(this.margin + 10, this.currentY, this.pageWidth - this.margin - 10, this.currentY)
            this.currentY += 5
          }
        }

        this.currentY += 3
      }

      // Separateur entre porteurs
      if (index < projet.porteurs.length - 1) {
        this.drawLine(this.currentY - 3, this.colors.bgMedium)
        this.currentY += 5
      }
    }

    // === TABLEAU RECAPITULATIF FINANCIER DES PORTEURS ===
    this.addPage()
    this.sectionPages['   2- Synthese financiere'] = this.getPageNumber()
    this.drawSubTitle('2. Synthese financiere des porteurs')

    // Collecter les totaux
    let totalRevenus = 0
    let totalCharges = 0
    let totalPatrimoine = 0
    let totalCreditsPatrimoine = 0
    let totalLoyersPatrimoine = 0

    const porteurRows: { nom: string; revenus: number; charges: number; patrimoine: number; loyers: number }[] = []

    for (const porteur of projet.porteurs) {
      const struct = (porteur as any).structure
      const pp = struct?.personnePhysique
      const pm = struct?.personneMorale
      const nom = struct?.nom || 'Porteur'

      let revenus = 0
      let charges = 0
      let patrimoine = 0
      let loyers = 0

      if (pp?.revenus) {
        revenus = Number(pp.revenus.totalMensuel) || 0
      } else if (pm?.chiffreAffairesAnnuel) {
        revenus = (Number(pm.resultatNet) || Number(pm.chiffreAffairesAnnuel) || 0) / 12
      }
      if (pp?.charges) {
        charges = Number(pp.charges.totalMensuel) || 0
      }

      // Patrimoine
      const data = pp || pm
      const pat = data?.patrimoine
      const biens: any[] = pat?.biensImmobiliers || data?.biens || []
      for (const b of biens) {
        patrimoine += Number(b.valeurEstimee || b.valeur || 0)
        loyers += Number(b.loyerMensuel || b.loyer || 0)
      }
      const epargne = Number(pat?.epargneDisponible || 0)
      patrimoine += epargne

      // Associes (pour SCI)
      const associes = pm?.associes
      if (associes && Array.isArray(associes)) {
        for (const a of associes) {
          const aPP = a.structure?.personnePhysique
          if (aPP?.revenus) revenus += Number(aPP.revenus.totalMensuel) || 0
          if (aPP?.charges) charges += Number(aPP.charges.totalMensuel) || 0
          const aB: any[] = aPP?.patrimoine?.biensImmobiliers || []
          for (const b of aB) {
            patrimoine += Number(b.valeurEstimee || b.valeur || 0)
            loyers += Number(b.loyerMensuel || b.loyer || 0)
          }
        }
      }

      totalRevenus += revenus
      totalCharges += charges
      totalPatrimoine += patrimoine
      totalLoyersPatrimoine += loyers

      porteurRows.push({ nom, revenus, charges, patrimoine, loyers })
    }

    // Patrimoine total du credit
    for (const porteur of projet.porteurs) {
      const struct = (porteur as any).structure
      const pp = struct?.personnePhysique
      const pm = struct?.personneMorale
      const data = pp || pm
      const credits: any[] = data?.patrimoine?.creditsEnCours || data?.credits || []
      for (const c of credits) totalCreditsPatrimoine += Number(c.mensualite || c.montantMensuel || 0)
      const associes = pm?.associes
      if (associes && Array.isArray(associes)) {
        for (const a of associes) {
          const aC: any[] = a.structure?.personnePhysique?.patrimoine?.creditsEnCours || []
          for (const c of aC) totalCreditsPatrimoine += Number(c.mensualite || c.montantMensuel || 0)
        }
      }
    }

    // Tableau recap par porteur
    const recapCols = {
      nom: this.margin + 3,
      revenus: this.margin + 55,
      charges: this.margin + 90,
      patrimoine: this.margin + 125,
    }

    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.white)
    this.doc.text('Porteur', recapCols.nom, this.currentY)
    this.doc.text('Revenus mensuels', recapCols.revenus, this.currentY)
    this.doc.text('Charges mensuelles', recapCols.charges, this.currentY)
    this.doc.text('Patrimoine estime', recapCols.patrimoine, this.currentY)
    this.currentY += 8

    porteurRows.forEach((row, i) => {
      if (i % 2 === 0) {
        this.doc.setFillColor(...this.colors.bgLight)
        this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
      }
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text(row.nom.substring(0, 25), recapCols.nom, this.currentY)
      this.doc.text(`${this.fmt(row.revenus)} EUR`, recapCols.revenus, this.currentY)
      this.doc.text(`${this.fmt(row.charges)} EUR`, recapCols.charges, this.currentY)
      this.doc.text(`${this.fmt(row.patrimoine)} EUR`, recapCols.patrimoine, this.currentY)
      this.currentY += 8
    })

    // Ligne total
    this.doc.setFillColor(...this.colors.primary)
    this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 9, 'F')
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.white)
    this.doc.text('TOTAL', recapCols.nom, this.currentY + 1)
    this.doc.text(`${this.fmt(totalRevenus)} EUR`, recapCols.revenus, this.currentY + 1)
    this.doc.text(`${this.fmt(totalCharges)} EUR`, recapCols.charges, this.currentY + 1)
    this.doc.text(`${this.fmt(totalPatrimoine)} EUR`, recapCols.patrimoine, this.currentY + 1)
    this.currentY += 18

    // Indicateurs cles
    const tauxEndettementActuel = totalRevenus > 0 ? (totalCharges / totalRevenus * 100) : 0
    const capaciteRemboursement = totalRevenus - totalCharges

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Indicateurs cles', this.margin + 5, this.currentY)
    this.currentY += 8

    const indicators: [string, string][] = [
      ['Revenus mensuels totaux', `${this.fmt(totalRevenus)} EUR`],
      ['Charges mensuelles totales', `${this.fmt(totalCharges)} EUR`],
      ['Capacite de remboursement mensuelle', `${this.fmt(capaciteRemboursement)} EUR`],
      ['Taux d\'endettement actuel', `${tauxEndettementActuel.toFixed(1)} %`],
      ['Revenus locatifs patrimoine existant', `${this.fmt(totalLoyersPatrimoine)} EUR/mois`],
      ['Patrimoine total estime', `${this.fmt(totalPatrimoine)} EUR`],
    ]

    indicators.forEach(([label, value], i) => {
      this.drawTableRow(label, value, i)
    })

    // Stocker les totaux pour la section financement
    ;(this as any)._totalRevenusPorteurs = totalRevenus
    ;(this as any)._totalChargesPorteurs = totalCharges
  }

  // ==========================================
  // FICHES BIENS PATRIMOINE
  // ==========================================

  private async renderBiensDetailles(biens: any[], allCredits: any[], proprietaire: string): Promise<void> {
    for (let bIdx = 0; bIdx < biens.length; bIdx++) {
      const bien = biens[bIdx]
      // Chaque bien sur une nouvelle page
      this.addPage()

      const adresse = bien.adresse || 'Adresse non renseignee'
      const typeBien = (bien.type || 'Bien').replace(/_/g, ' ')
      const statut = (bien.statut || '').replace(/_/g, ' ')
      const loyerMensuel = Number(bien.loyerMensuel || bien.loyer || 0)
      const valeur = Number(bien.valeurEstimee || bien.valeur || 0)

      // Trouver le(s) credit(s) associe(s) a ce bien
      const creditsAssocies = allCredits.filter((c: any) => c.bienAssocie === bien.id)

      // Card container
      const cardX = this.margin
      const cardW = this.contentWidth

      // En-tete du bien
      this.doc.setFillColor(...this.colors.bgLight)
      this.doc.roundedRect(cardX, this.currentY - 4, cardW, 12, 2, 2, 'F')
      this.doc.setFillColor(...this.colors.primaryLight)
      this.doc.rect(cardX, this.currentY - 4, 3, 12, 'F')

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text(`Bien ${bIdx + 1} : ${adresse}`, cardX + 8, this.currentY + 3)

      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text(`Detenu par ${proprietaire}`, this.pageWidth - this.margin - 5, this.currentY + 3, { align: 'right' })

      this.currentY += 14

      // Tableau d'informations du bien
      const col1X = cardX + 8
      const col2X = this.pageWidth / 2 + 5

      // Colonne gauche: Description
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primaryLight)
      this.doc.text('DESCRIPTION', col1X, this.currentY)
      this.currentY += 5

      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.setFontSize(9)

      let descY = this.currentY

      this.doc.text(`Type : ${typeBien}`, col1X, descY)
      descY += 5
      this.doc.text(`Adresse : ${adresse}`, col1X, descY)
      descY += 5
      if (statut) {
        this.doc.text(`Statut : ${statut}`, col1X, descY)
        descY += 5
      }

      // Colonne droite: Chiffres
      let chifY = this.currentY
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primaryLight)
      this.doc.text('VALORISATION', col2X, chifY - 5)

      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.setFontSize(9)

      if (valeur > 0) {
        this.doc.text(`Valeur estimee : ${this.fmt(valeur)} EUR`, col2X, chifY)
        chifY += 5
      } else {
        this.doc.setTextColor(...this.colors.textLight)
        this.doc.text('Valeur estimee : non renseignee', col2X, chifY)
        this.doc.setTextColor(...this.colors.text)
        chifY += 5
      }

      if (loyerMensuel > 0) {
        this.doc.text(`Loyer mensuel : ${this.fmt(loyerMensuel)} EUR`, col2X, chifY)
        chifY += 5
        this.doc.text(`Loyer annuel : ${this.fmt(loyerMensuel * 12)} EUR`, col2X, chifY)
        chifY += 5
        if (valeur > 0) {
          const renta = ((loyerMensuel * 12) / valeur * 100).toFixed(1)
          this.doc.text(`Rentabilite brute : ${renta} %`, col2X, chifY)
          chifY += 5
        }
      }

      this.currentY = Math.max(descY, chifY) + 3

      // Lots / composition du bien (immeubles)
      const lots: any[] = bien.lots || []
      if (lots.length > 0) {
        this.checkPageBreak(20 + lots.length * 6)

        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('COMPOSITION DU BIEN', col1X, this.currentY)
        this.currentY += 5

        // En-tete tableau
        const tX = cardX + 5
        const tW = cardW - 10
        const cols = [
          { label: 'Type', x: tX + 2, w: tW * 0.22 },
          { label: 'Designation', x: tX + tW * 0.22, w: tW * 0.28 },
          { label: 'Surface', x: tX + tW * 0.50, w: tW * 0.15, align: 'right' as const },
          { label: 'Loyer', x: tX + tW * 0.65, w: tW * 0.18, align: 'right' as const },
          { label: 'Statut', x: tX + tW * 0.83, w: tW * 0.17, align: 'center' as const },
        ]

        this.doc.setFillColor(240, 242, 245)
        this.doc.rect(tX, this.currentY - 3, tW, 7, 'F')
        this.doc.setFontSize(7)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.text)
        cols.forEach(c => {
          const align = c.align || 'left'
          const xPos = align === 'right' ? c.x + c.w - 2 : align === 'center' ? c.x + c.w / 2 : c.x
          this.doc.text(c.label, xPos, this.currentY, { align })
        })
        this.currentY += 6

        // Lignes
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(8)
        let totalSurf = 0
        let totalLoyer = 0
        let nbLoues = 0

        lots.forEach((lot: any) => {
          this.checkPageBreak(7)
          const lotType = (lot.type || 'Autre').replace(/_/g, ' ')
          const desig = lot.designation || ''
          const surf = Number(lot.superficie || 0)
          const loyer = Number(lot.loyerMensuel || 0)
          const statut = lot.statut === 'Loue' ? 'Loue' : 'Vacant'

          totalSurf += surf
          totalLoyer += loyer
          if (lot.statut === 'Loue') nbLoues++

          this.doc.setTextColor(...this.colors.text)
          this.doc.text(lotType, cols[0].x, this.currentY)
          this.doc.text(desig, cols[1].x, this.currentY)
          this.doc.text(surf > 0 ? `${surf} m2` : '-', cols[2].x + cols[2].w - 2, this.currentY, { align: 'right' })
          this.doc.text(loyer > 0 ? `${this.fmt(loyer)} EUR` : '-', cols[3].x + cols[3].w - 2, this.currentY, { align: 'right' })

          const statutColor: [number, number, number] = statut === 'Loue' ? [46, 125, 50] : [220, 120, 50]
          this.doc.setTextColor(...statutColor)
          this.doc.text(statut, cols[4].x + cols[4].w / 2, this.currentY, { align: 'center' })
          this.currentY += 5.5
        })

        // Ligne total
        this.doc.setDrawColor(...this.colors.bgMedium)
        this.doc.setLineWidth(0.5)
        this.doc.line(tX, this.currentY - 1, tX + tW, this.currentY - 1)
        this.currentY += 2

        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primary)
        this.doc.setFontSize(8)
        this.doc.text(`Total (${lots.length} lots)`, cols[0].x, this.currentY)
        this.doc.text(totalSurf > 0 ? `${totalSurf} m2` : '', cols[2].x + cols[2].w - 2, this.currentY, { align: 'right' })
        this.doc.text(`${this.fmt(totalLoyer)} EUR`, cols[3].x + cols[3].w - 2, this.currentY, { align: 'right' })
        this.doc.text(`${nbLoues}/${lots.length}`, cols[4].x + cols[4].w / 2, this.currentY, { align: 'center' })
        this.currentY += 8
      }

      // Credit(s) associe(s)
      if (creditsAssocies.length > 0) {
        this.checkPageBreak(20)

        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('CREDIT ASSOCIE', col1X, this.currentY)
        this.currentY += 5

        creditsAssocies.forEach((credit: any) => {
          this.checkPageBreak(25)

          // Fond subtil pour le credit
          this.doc.setFillColor(252, 252, 255)
          this.doc.roundedRect(cardX + 5, this.currentY - 3, cardW - 10, this.getCreditCardHeight(credit), 1.5, 1.5, 'F')

          this.doc.setFont('helvetica', 'normal')
          this.doc.setTextColor(...this.colors.text)
          this.doc.setFontSize(9)

          const org = credit.organisme || credit.banque || 'Organisme non renseigne'
          const typeCredit = (credit.type || '').replace(/_/g, ' ')
          this.doc.text(`${org}${typeCredit ? ' - ' + typeCredit : ''}`, col1X, this.currentY)
          this.currentY += 5

          const montantInitial = Number(credit.montantInitial || 0)
          const capitalRestant = Number(credit.capitalRestantDu || credit.capitalRestant || 0)
          const mensualite = Number(credit.mensualite || credit.montantMensuel || 0)
          const taux = Number(credit.tauxInteret || 0)
          const duree = Number(credit.nombreMois || credit.duree || 0)

          let cLeftY = this.currentY
          let cRightY = this.currentY

          if (montantInitial > 0) {
            this.doc.text(`Montant initial : ${this.fmt(montantInitial)} EUR`, col1X, cLeftY)
            cLeftY += 5
          }
          if (capitalRestant > 0) {
            this.doc.text(`Capital restant du : ${this.fmt(capitalRestant)} EUR`, col1X, cLeftY)
            cLeftY += 5
          }

          if (mensualite > 0) {
            this.doc.text(`Mensualite : ${this.fmt(mensualite)} EUR`, col2X, cRightY)
            cRightY += 5
          }
          if (taux > 0) {
            this.doc.text(`Taux : ${taux.toFixed(2)} %`, col2X, cRightY)
            cRightY += 5
          }
          if (duree > 0) {
            const annees = Math.floor(duree / 12)
            const mois = duree % 12
            const dureeStr = annees > 0 ? `${annees} ans${mois > 0 ? ` ${mois} mois` : ''}` : `${mois} mois`
            this.doc.text(`Duree : ${dureeStr}`, col2X, cRightY)
            cRightY += 5
          }
          if (credit.dateDebut) {
            const d = new Date(credit.dateDebut)
            if (!isNaN(d.getTime())) {
              this.doc.text(`Debut : ${d.toLocaleDateString('fr-FR')}`, col2X, cRightY)
              cRightY += 5
            }
          }

          this.currentY = Math.max(cLeftY, cRightY) + 3
        })
      }

      // Photos du bien
      const photos: string[] = bien.photos || []
      if (photos.length > 0) {
        this.checkPageBreak(30)
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(...this.colors.primaryLight)
        this.doc.text('PHOTOS', col1X, this.currentY)
        this.currentY += 5

        // Photos grandes si pas de lots (maison/appart), petites si immeuble avec lots
        const hasLots = lots.length > 0
        const photoW = hasLots ? 35 : 55
        const photoH = hasLots ? 25 : 40
        const maxPhotos = hasLots ? 6 : 3
        const gap = 4
        const maxPerRow = Math.floor((cardW - 16) / (photoW + gap))
        let pX = cardX + 8
        let pCount = 0

        for (const photoSrc of photos.slice(0, maxPhotos)) {
          try {
            const base64 = photoSrc.startsWith('data:')
              ? photoSrc
              : await this.loadImageAsBase64(photoSrc)
            if (base64) {
              if (pCount > 0 && pCount % maxPerRow === 0) {
                pX = cardX + 8
                this.currentY += photoH + gap
                this.checkPageBreak(photoH + 5)
              }
              const format = base64.includes('image/png') ? 'PNG' : 'JPEG'
              this.doc.addImage(base64, format, pX, this.currentY, photoW, photoH)
              this.doc.setDrawColor(200, 200, 200)
              this.doc.setLineWidth(0.2)
              this.doc.rect(pX, this.currentY, photoW, photoH)
              pX += photoW + gap
              pCount++
            }
          } catch (e) {
            // Skip failed photos
          }
        }
        if (pCount > 0) {
          this.currentY += photoH + 5
        }
      }

      // Cash-flow net du bien (si loye et credit)
      if (loyerMensuel > 0 && creditsAssocies.length > 0) {
        const totalMens = creditsAssocies.reduce((s: number, c: any) => s + Number(c.mensualite || c.montantMensuel || 0), 0)
        const cashflow = loyerMensuel - totalMens
        this.checkPageBreak(10)

        this.doc.setFillColor(...this.colors.bgLight)
        this.doc.roundedRect(cardX + 5, this.currentY - 3, cardW - 10, 10, 1.5, 1.5, 'F')
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setTextColor(cashflow >= 0 ? 46 : 220, cashflow >= 0 ? 125 : 53, cashflow >= 0 ? 50 : 69)
        this.doc.text(`Cash-flow mensuel net : ${cashflow >= 0 ? '+' : ''}${this.fmt(cashflow)} EUR`, col1X, this.currentY + 3)
        this.currentY += 12
      }

      this.currentY += 5
    }
  }

  private getCreditCardHeight(credit: any): number {
    let h = 8
    if (Number(credit.montantInitial || 0) > 0) h += 5
    if (Number(credit.capitalRestantDu || credit.capitalRestant || 0) > 0) h += 5
    return Math.max(h, 15)
  }

  // ==========================================
  // LE PROJET - LOCALISATION
  // ==========================================

  private generateLocalisation(projet: Projet): void {
    this.addPage()
    this.sectionPages['II. Le projet'] = this.getPageNumber()
    this.sectionPages['   1- Situation geographique'] = this.getPageNumber()

    this.drawSectionTitle('II. Le projet')

    // Texte d'introduction du projet (comme dans les vrais dossiers)
    const bien = projet.bienImmobilier
    const fin = projet.financement
    if (bien) {
      const typeBienIntro = (bien.type || '').replace(/_/g, ' ').toLowerCase()
      const destBien = (bien.destinationBien || '').replace(/_/g, ' ').toLowerCase()
      const supIntro = bien.superficie ? `${Math.round(Number(bien.superficie))} m2` : ''
      const prixAchat = fin ? Number(fin.prixAchat) || 0 : 0
      const montantTravaux = fin ? Number(fin.montantTravaux) || 0 : 0

      let introText = `Le projet porte sur l'acquisition d'un ${typeBienIntro || 'bien immobilier'}`
      if (supIntro) introText += ` de ${supIntro}`
      introText += ` situe a ${bien.ville || ''} (${bien.codePostal || ''})`
      if (destBien) introText += `, a destination de ${destBien}`
      introText += '.'
      if (prixAchat > 0) {
        introText += ` Le prix d'acquisition s'eleve a ${this.fmt(prixAchat)} EUR`
        if (montantTravaux > 0) introText += `, auquel s'ajoutent ${this.fmt(montantTravaux)} EUR de travaux`
        introText += '.'
      }

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      const introLines = this.doc.splitTextToSize(introText, this.contentWidth)
      this.doc.text(introLines, this.margin, this.currentY)
      this.currentY += introLines.length * 5 + 8
    }

    this.drawSubTitle('1. Situation geographique')

    if (!bien) {
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text('Aucune information sur le bien.', this.margin, this.currentY)
      return
    }

    // Phrase de presentation
    const typePresentation = (bien.type || '').replace(/_/g, ' ').toLowerCase()
    const etatPresentation = (bien.etatActuel || '').replace(/_/g, ' ').toLowerCase()
    const supPresentation = bien.superficie ? `${Math.round(Number(bien.superficie))} m2` : ''
    let presentationText = `Le bien est situe au ${bien.adresse || ''}, dans la commune de ${bien.ville || ''} (${bien.codePostal || ''}).`
    if (typePresentation && supPresentation) {
      presentationText += ` Il s'agit d'un ${typePresentation} de ${supPresentation}`
      if (etatPresentation) presentationText += ` en etat ${etatPresentation}`
      presentationText += '.'
    }

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    const presLines = this.doc.splitTextToSize(presentationText, this.contentWidth)
    this.doc.text(presLines, this.margin, this.currentY)
    this.currentY += presLines.length * 5 + 5

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
      this.sectionPages['   2- Composition du bien'] = this.getPageNumber()
      this.drawSubTitle('2. Composition du bien')

      // Colonnes du tableau composition
      const colX = {
        type: this.margin + 3,
        etage: this.margin + 42,
        superficie: this.margin + 58,
        loyerActuel: this.margin + 85,
        loyerEstime: this.margin + 115,
        etat: this.margin + 145,
      }

      this.doc.setFillColor(...this.colors.primary)
      this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.white)
      this.doc.text('Type', colX.type, this.currentY)
      this.doc.text('Etage', colX.etage, this.currentY)
      this.doc.text('Superficie', colX.superficie, this.currentY)
      this.doc.text('Loyer actuel', colX.loyerActuel, this.currentY)
      this.doc.text('Loyer estime', colX.loyerEstime, this.currentY)
      this.doc.text('Etat', colX.etat, this.currentY)
      this.currentY += 8

      let totalSuperficie = 0
      let totalLoyerActuel = 0
      let totalLoyerEstime = 0

      elements.forEach((elem: any, i: number) => {
        this.checkPageBreak(10)
        if (i % 2 === 0) {
          this.doc.setFillColor(...this.colors.bgLight)
          this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 8, 'F')
        }
        this.doc.setFontSize(8)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)

        // Type: "Appartement - T3"
        const type = (elem.type || '').replace(/_/g, ' ')
        const pieces = Number(elem.nombrePieces) || 0
        const typeLabel = pieces > 0 ? `${type} - T${pieces}` : type
        this.doc.text(typeLabel, colX.type, this.currentY)

        // Etage
        const etage = elem.etage != null && elem.etage !== '' ? `${elem.etage}` : '-'
        this.doc.text(etage, colX.etage, this.currentY)

        // Superficie
        const superficie = Number(elem.superficie) || 0
        totalSuperficie += superficie
        this.doc.text(superficie > 0 ? `${Math.round(superficie)} m2` : '-', colX.superficie, this.currentY)

        // Loyer actuel (seulement si en location)
        const isRented = elem.enLocation === true
        const loyerActuel = isRented ? (Number(elem.loyerMensuel) || 0) : 0
        totalLoyerActuel += loyerActuel
        this.doc.text(isRented && loyerActuel > 0 ? `${this.fmt(loyerActuel)} EUR` : '-', colX.loyerActuel, this.currentY)

        // Loyer estime = loyer actuel si loue, sinon loyer mensuel (projete)
        const loyerEstime = isRented ? loyerActuel : (Number(elem.loyerMensuel) || 0)
        totalLoyerEstime += loyerEstime
        this.doc.text(loyerEstime > 0 ? `${this.fmt(loyerEstime)} EUR` : '-', colX.loyerEstime, this.currentY)

        // Etat
        const etat = (elem.etat || '').replace(/_/g, ' ')
        this.doc.text(etat, colX.etat, this.currentY)

        this.currentY += 8
      })

      // Ligne totaux
      this.doc.setFillColor(...this.colors.primary)
      this.doc.rect(this.margin, this.currentY - 4, this.contentWidth, 9, 'F')
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.white)
      this.doc.text('TOTAL', colX.type, this.currentY + 1)
      this.doc.text(`${Math.round(totalSuperficie)} m2`, colX.superficie, this.currentY + 1)
      this.doc.text(totalLoyerActuel > 0 ? `${this.fmt(totalLoyerActuel)} EUR` : '-', colX.loyerActuel, this.currentY + 1)
      this.doc.text(totalLoyerEstime > 0 ? `${this.fmt(totalLoyerEstime)} EUR` : '-', colX.loyerEstime, this.currentY + 1)
      this.currentY += 12
    }
  }

  // ==========================================
  // LE BIEN ET SON PROJET (TRAVAUX)
  // ==========================================

  private generateBienProjet(projet: Projet): void {
    const bien = projet.bienImmobilier
    if (!bien) return

    const hasTravaux = bien.travauxPrevus && bien.travauxPrevus.length > 0

    if (!hasTravaux) return

    this.addPage()
    this.sectionPages['   3- Le bien et son projet'] = this.getPageNumber()

    this.drawSubTitle('3. Le bien et son projet')

    // Travaux prevus
    if (hasTravaux) {
      const categories = [...new Set(bien.travauxPrevus.map(t => (t.categorie || '').replace(/_/g, ' ').toLowerCase()))]
      const totalMontantTravaux = bien.travauxPrevus.reduce((sum, t) => sum + (Number(t.montant) || 0), 0)
      const travauxDesc = `Le projet prevoit des travaux de renovation portant principalement sur ${categories.join(', ')} pour un budget total de ${this.fmt(totalMontantTravaux)} EUR.`

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      const travauxLines = this.doc.splitTextToSize(travauxDesc, this.contentWidth)
      this.doc.text(travauxLines, this.margin, this.currentY)
      this.currentY += travauxLines.length * 5 + 5

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
    this.sectionPages['   4- Plan de financement'] = this.getPageNumber()

    this.drawSubTitle('4. Plan de financement')

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

    // === PREVISIONNEL LOCATIF ===
    const loyerEstime = Number(projet.bienImmobilier?.loyerMensuelEstime) || 0
    const chargesMens = Number(projet.bienImmobilier?.chargesMensuelles) || 0
    const taxeFonciere = Number(projet.bienImmobilier?.taxeFonciere) || 0

    if (loyerEstime > 0) {
      this.checkPageBreak(80)

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text('Previsionnel locatif', this.margin + 5, this.currentY)
      this.currentY += 4

      // Texte explicatif 70%
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      const texte70 = 'Conformement aux pratiques bancaires, les revenus locatifs sont pris en compte a hauteur de 70 % du loyer brut, afin d\'integrer les risques de vacance locative, d\'impayes et de charges non recuperables.'
      const lines70 = this.doc.splitTextToSize(texte70, this.contentWidth)
      this.doc.text(lines70, this.margin, this.currentY)
      this.currentY += lines70.length * 4.5 + 6

      // Tableau previsionnel annuel
      const loyerNet70 = loyerEstime * 0.7
      const loyerBrutAnnuel = loyerEstime * 12
      const chargesAnnuelles = chargesMens * 12
      const mensualiteAnnuelle = mensTotal * 12
      const revenuNetAnnuel = loyerBrutAnnuel - chargesAnnuelles - taxeFonciere
      const cashflowAnnuel = revenuNetAnnuel - mensualiteAnnuelle

      const prevItems: [string, string][] = [
        ['Loyer brut mensuel', `${this.fmt(loyerEstime)} EUR`],
        ['Loyer brut annuel', `${this.fmt(loyerBrutAnnuel)} EUR`],
        ['Revenus locatifs a 70 %', `${this.fmt(loyerNet70)} EUR/mois`],
      ]
      if (chargesAnnuelles > 0) prevItems.push(['Charges copropriete (annuel)', `- ${this.fmt(chargesAnnuelles)} EUR`])
      if (taxeFonciere > 0) prevItems.push(['Taxe fonciere (annuel)', `- ${this.fmt(taxeFonciere)} EUR`])
      prevItems.push(['Revenu net annuel avant credit', `${this.fmt(revenuNetAnnuel)} EUR`])
      prevItems.push(['Mensualite credit (annuel)', `- ${this.fmt(mensualiteAnnuelle)} EUR`])
      prevItems.push(['Cash-flow net annuel', `${cashflowAnnuel >= 0 ? '+' : ''}${this.fmt(cashflowAnnuel)} EUR`])

      prevItems.forEach(([label, value], i) => {
        const isBold = label.startsWith('Cash-flow') || label.startsWith('Revenu net')
        this.checkPageBreak(10)
        if (i % 2 === 0) {
          this.doc.setFillColor(...this.colors.bgLight)
          this.doc.rect(this.margin, this.currentY - 5, this.contentWidth, 9, 'F')
        }
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        if (label.startsWith('Cash-flow')) {
          this.doc.setTextColor(cashflowAnnuel >= 0 ? 46 : 220, cashflowAnnuel >= 0 ? 125 : 53, cashflowAnnuel >= 0 ? 50 : 69)
        } else {
          this.doc.setTextColor(...this.colors.text)
        }
        this.doc.text(label, this.margin + 5, this.currentY)
        this.doc.text(value, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })
        this.currentY += 9
      })

      this.currentY += 5

      // Cash-flow mensuel net resume
      const cashflowMensuel = loyerNet70 - mensTotal
      this.doc.setFillColor(cashflowMensuel >= 0 ? 240 : 255, cashflowMensuel >= 0 ? 253 : 243, cashflowMensuel >= 0 ? 244 : 243)
      this.doc.roundedRect(this.margin, this.currentY - 4, this.contentWidth, 14, 2, 2, 'F')
      this.doc.setFillColor(cashflowMensuel >= 0 ? 46 : 220, cashflowMensuel >= 0 ? 125 : 53, cashflowMensuel >= 0 ? 50 : 69)
      this.doc.rect(this.margin, this.currentY - 4, 3, 14, 'F')
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(cashflowMensuel >= 0 ? 46 : 220, cashflowMensuel >= 0 ? 125 : 53, cashflowMensuel >= 0 ? 50 : 69)
      this.doc.text(
        `Cash-flow mensuel net (a 70 %) : ${cashflowMensuel >= 0 ? '+' : ''}${this.fmt(cashflowMensuel)} EUR/mois`,
        this.margin + 8, this.currentY + 3
      )
      this.currentY += 20
    }

    // === TAUX D'ENDETTEMENT AVANT / APRES PROJET ===
    const totalRevenusPorteurs = Number((this as any)._totalRevenusPorteurs) || 0
    const totalChargesPorteurs = Number((this as any)._totalChargesPorteurs) || 0

    if (totalRevenusPorteurs > 0 && mensTotal > 0) {
      this.checkPageBreak(55)

      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text('Taux d\'endettement', this.margin + 5, this.currentY)
      this.currentY += 8

      const endettementAvant = (totalChargesPorteurs / totalRevenusPorteurs * 100)
      const loyerNet70Mensuel = loyerEstime * 0.7
      const chargesApres = totalChargesPorteurs + mensTotal
      const revenusApres = totalRevenusPorteurs + loyerNet70Mensuel
      const endettementApres = revenusApres > 0 ? (chargesApres / revenusApres * 100) : 0

      const endItems: [string, string][] = [
        ['Revenus mensuels actuels', `${this.fmt(totalRevenusPorteurs)} EUR`],
        ['Charges mensuelles actuelles', `${this.fmt(totalChargesPorteurs)} EUR`],
        ['Taux d\'endettement actuel', `${endettementAvant.toFixed(1)} %`],
        ['+ Revenus locatifs a 70 %', `+ ${this.fmt(loyerNet70Mensuel)} EUR`],
        ['+ Mensualite du pret', `+ ${this.fmt(mensTotal)} EUR`],
        ['Revenus mensuels apres projet', `${this.fmt(revenusApres)} EUR`],
        ['Charges mensuelles apres projet', `${this.fmt(chargesApres)} EUR`],
        ['Taux d\'endettement apres projet', `${endettementApres.toFixed(1)} %`],
      ]

      endItems.forEach(([label, value], i) => {
        const isBold = label.startsWith('Taux')
        this.checkPageBreak(10)
        if (i % 2 === 0) {
          this.doc.setFillColor(...this.colors.bgLight)
          this.doc.rect(this.margin, this.currentY - 5, this.contentWidth, 9, 'F')
        }
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        if (isBold) {
          const val = label.includes('apres') ? endettementApres : endettementAvant
          this.doc.setTextColor(val <= 33 ? 46 : val <= 40 ? 217 : 220, val <= 33 ? 125 : val <= 40 ? 119 : 38, val <= 33 ? 50 : val <= 40 ? 6 : 38)
        } else {
          this.doc.setTextColor(...this.colors.text)
        }
        this.doc.text(label, this.margin + 5, this.currentY)
        this.doc.text(value, this.pageWidth - this.margin - 5, this.currentY, { align: 'right' })
        this.currentY += 9
      })

      // Note regle 33%
      this.currentY += 3
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'italic')
      this.doc.setTextColor(...this.colors.textLight)
      this.doc.text('Le taux d\'endettement est generalement accepte jusqu\'a 33-35 % des revenus.', this.margin, this.currentY)
    }
  }


  // ==========================================
  // PHOTOS
  // ==========================================

  private async generatePhotos(projet: Projet): Promise<void> {
    const photos = projet.bienImmobilier?.photos
    if (!photos || photos.length === 0) return

    this.addPage()
    this.sectionPages['III. Photos du bien'] = this.getPageNumber()

    this.drawSectionTitle('III. Photos du bien')

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
  // COMPARABLES DE MARCHE
  // ==========================================

  private async generateComparables(projet: Projet): Promise<void> {
    const comparables = projet.comparables
    if (!comparables || comparables.length === 0) return

    this.addPage()
    this.sectionPages['IV. Comparables de marche'] = this.getPageNumber()

    this.drawSectionTitle('IV. Comparables de marche')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(
      'Etude comparative des biens similaires actuellement sur le marche.',
      this.margin, this.currentY
    )
    this.currentY += 10

    for (const comp of comparables) {
      this.checkPageBreak(55)

      // Card
      this.doc.setFillColor(...this.colors.bgLight)
      this.doc.roundedRect(this.margin, this.currentY - 2, this.contentWidth, 45, 2, 2, 'F')
      this.doc.setFillColor(...this.colors.primaryLight)
      this.doc.rect(this.margin, this.currentY - 2, 3, 45, 'F')

      const imageX = this.margin + 8
      const textX = this.margin + 55

      // Photo (premiere image)
      if (comp.images && comp.images.length > 0) {
        try {
          const imgBase64 = await this.loadImageAsBase64(comp.images[0])
          if (imgBase64) {
            const format = imgBase64.includes('image/png') ? 'PNG' : 'JPEG'
            this.doc.addImage(imgBase64, format, imageX, this.currentY, 40, 30)
          }
        } catch {
          this.doc.setFillColor(...this.colors.bgMedium)
          this.doc.rect(imageX, this.currentY, 40, 30, 'F')
        }
      }

      // Titre
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      const titre = (comp.titre || 'Annonce').substring(0, 50)
      this.doc.text(titre, textX, this.currentY + 5)

      // Details
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)

      let detailY = this.currentY + 12
      if (comp.prix) {
        this.doc.text(`Prix : ${this.fmt(comp.prix)} EUR`, textX, detailY)
        detailY += 5
      }
      if (comp.surface) {
        this.doc.text(`Surface : ${Math.round(Number(comp.surface))} m2`, textX, detailY)
        detailY += 5
      }
      if (comp.pieces) {
        this.doc.text(`Pieces : ${comp.pieces}`, textX, detailY)
        detailY += 5
      }
      if (comp.loyer) {
        this.doc.text(`Loyer : ${this.fmt(comp.loyer)} EUR/mois`, textX, detailY)
        detailY += 5
      }
      if (comp.ville) {
        this.doc.text(`Localisation : ${comp.ville} ${comp.codePostal || ''}`, textX, detailY)
      }

      this.currentY += 50
    }
  }

  // ==========================================
  // ANNEXES - LISTE DES DOCUMENTS REQUIS
  // ==========================================

  private generateAnnexes(projet: Projet): void {
    const docs = projet.checklistDocuments
    if (!docs || docs.length === 0) return

    this.addPage()
    this.sectionPages['V. Annexes'] = this.getPageNumber()

    this.drawSectionTitle('V. Annexes')

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...this.colors.text)
    this.doc.text(
      'Liste des pieces justificatives a fournir pour la constitution du dossier bancaire.',
      this.margin, this.currentY
    )
    this.currentY += 10

    // Grouper par categorie
    const categorieLabels: Record<string, string> = {
      'Identite': 'Identite',
      'Revenus': 'Revenus',
      'Patrimoine': 'Patrimoine',
      'Fiscalite': 'Fiscalite',
      'Societe': 'Societe',
      'Bien_Immobilier': 'Bien immobilier',
      'Travaux': 'Travaux',
      'Autre': 'Autres documents',
    }

    const grouped: Record<string, typeof docs> = {}
    for (const doc of docs) {
      const cat = doc.categorie || 'Autre'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(doc)
    }

    // Ordre des categories
    const ordreCategories = ['Identite', 'Revenus', 'Patrimoine', 'Fiscalite', 'Societe', 'Bien_Immobilier', 'Travaux', 'Autre']

    let annexeNum = 1
    for (const cat of ordreCategories) {
      const catDocs = grouped[cat]
      if (!catDocs || catDocs.length === 0) continue

      this.checkPageBreak(20 + catDocs.length * 8)

      // Sous-titre categorie
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...this.colors.primary)
      this.doc.text(`${categorieLabels[cat] || cat}`, this.margin + 5, this.currentY)
      this.currentY += 6

      for (const docItem of catDocs) {
        this.checkPageBreak(10)

        // Numero annexe
        this.doc.setFontSize(9)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setTextColor(...this.colors.text)

        const nomDoc = docItem.nomDocument || 'Document'
        const quantite = docItem.quantiteRequise ? ` (${docItem.quantiteRequise})` : ''
        const obligStr = docItem.obligatoire ? '' : ' [facultatif]'
        const label = `Annexe ${annexeNum} - ${nomDoc}${quantite}${obligStr}`

        // Checkbox statut
        const statut = docItem.statut || 'Non_Fourni'
        const statutSymbol = statut === 'Fourni' || statut === 'Valide' ? '[x]' : '[ ]'
        const statutColor: [number, number, number] =
          statut === 'Fourni' || statut === 'Valide' ? this.colors.green :
          statut === 'En_Attente' ? this.colors.orange : this.colors.textLight

        this.doc.setTextColor(...statutColor)
        this.doc.setFont('helvetica', 'bold')
        this.doc.text(statutSymbol, this.margin + 5, this.currentY)

        this.doc.setTextColor(...this.colors.text)
        this.doc.setFont('helvetica', 'normal')
        const truncLabel = label.length > 80 ? label.substring(0, 77) + '...' : label
        this.doc.text(truncLabel, this.margin + 15, this.currentY)

        this.currentY += 7
        annexeNum++
      }

      this.currentY += 4
    }

    // Resume
    this.currentY += 5
    this.drawLine(this.currentY, this.colors.bgMedium)
    this.currentY += 8

    const totalDocs = docs.length
    const fournis = docs.filter(d => d.statut === 'Fourni' || d.statut === 'Valide').length
    const enAttente = docs.filter(d => d.statut === 'En_Attente').length
    const nonFournis = totalDocs - fournis - enAttente

    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...this.colors.primary)
    this.doc.text('Recapitulatif', this.margin + 5, this.currentY)
    this.currentY += 7

    const recapItems: [string, string, [number, number, number]][] = [
      [`Documents fournis`, `${fournis} / ${totalDocs}`, this.colors.green],
      [`Documents en attente`, `${enAttente}`, this.colors.orange],
      [`Documents manquants`, `${nonFournis}`, nonFournis > 0 ? this.colors.red : this.colors.textLight],
    ]

    recapItems.forEach(([label, value, color]) => {
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(...this.colors.text)
      this.doc.text(label, this.margin + 10, this.currentY)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...color)
      this.doc.text(value, this.margin + 80, this.currentY)
      this.currentY += 6
    })
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

    // Phase 1: Page de garde (async pour photo de couverture)
    await safeAsync('Page de garde', () => this.generateCoverPage(projet))

    // Phase 2: Sections de contenu
    await safeAsync('Porteurs', () => this.generatePorteurs(projet))
    safe('Localisation', () => this.generateLocalisation(projet))
    safe('Bien et projet', () => this.generateBienProjet(projet))
    safe('Financement', () => this.generateFinancement(projet))
    // Section photos (async: chargement des images)
    await safeAsync('Photos', () => this.generatePhotos(projet))

    // Section comparables (async: chargement des images)
    await safeAsync('Comparables', () => this.generateComparables(projet))

    // Section annexes
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
