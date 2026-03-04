import PDFGenerator from './pdfGenerator'
import PDFGeneratorPro from './pdfGeneratorPro'
import { DossierSCI, Projet } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

interface ProjectDataResponse {
  success: boolean
  data?: {
    projet: any
    bienImmobilier: any
    financement: any
    porteurs: any[]
    analysesRentabilite: any
    checklistDocuments: any[]
    legacy: DossierSCI
  }
  error?: string
}

/**
 * Service pour la generation de PDF
 * Gere la recuperation des donnees et la generation du PDF
 */
class PDFService {
  private getAuthToken(): string | null {
    const token = localStorage.getItem('token')
    return token
  }

  /**
   * Recupere les donnees completes d'un projet depuis l'API
   */
  async fetchProjectData(projectId: string): Promise<ProjectDataResponse> {
    const token = this.getAuthToken()

    if (!token) {
      return { success: false, error: 'Non authentifie' }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/projets/data?id=${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error || `Erreur ${response.status}`
        }
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error fetching project data:', error)
      return {
        success: false,
        error: error.message || 'Erreur de connexion'
      }
    }
  }

  /**
   * Genere et telecharge le PDF basique (format DossierSCI)
   */
  async downloadPDFBasic(projectId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.fetchProjectData(projectId)

    if (!response.success || !response.data) {
      return { success: false, error: response.error }
    }

    try {
      const dossier = response.data.legacy
      const pdfGenerator = new PDFGenerator()
      const filename = `dossier-${dossier.nomSCI || 'projet'}-${new Date().toISOString().split('T')[0]}.pdf`
      pdfGenerator.downloadPDF(dossier, filename)
      return { success: true }
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Genere et telecharge le PDF professionnel (format Projet)
   */
  async downloadPDFPro(projectId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.fetchProjectData(projectId)

    if (!response.success || !response.data) {
      return { success: false, error: response.error }
    }

    try {
      // Helper pour convertir les valeurs DB (strings) en nombres
      const n = (v: any) => Number(v) || 0

      const fin = response.data.financement
      const a = response.data.analysesRentabilite

      // Convertir les donnees au format Projet
      const projet: Projet = {
        id: response.data.projet.id,
        userId: response.data.projet.userId,
        nom: response.data.projet.nom,
        description: response.data.projet.description,
        status: response.data.projet.status,
        porteurs: response.data.porteurs,
        bienImmobilier: response.data.bienImmobilier,
        financement: fin ? {
          ...fin,
          prixAchat: n(fin.prixAchat),
          fraisNotaire: n(fin.fraisNotaire),
          fraisAgence: n(fin.fraisAgence),
          montantTravaux: n(fin.montantTravaux),
          fraisDossierBancaire: n(fin.fraisDossierBancaire),
          fraisGarantie: n(fin.fraisGarantie),
          autresFrais: n(fin.autresFrais),
          coutTotalProjet: n(fin.coutTotalProjet),
          apportPersonnel: n(fin.apportPersonnel),
          montantEmprunt: n(fin.montantEmprunt),
          dureeCredit: n(fin.dureeCredit),
          tauxInteretEstime: n(fin.tauxInteretEstime),
          tauxAssuranceEstime: n(fin.tauxAssuranceEstime),
          mensualiteCapitalInterets: n(fin.mensualiteCapitalInterets),
          mensualiteAssurance: n(fin.mensualiteAssurance),
          mensualiteTotale: n(fin.mensualiteTotale),
        } : null,
        analysesRentabilite: a ? {
          id: a.id,
          projetId: response.data.projet.id,
          rentabiliteBrute: n(a.rentabiliteBrute),
          chargesAnnuelles: n(a.chargesAnnuelles),
          rentabiliteNette: n(a.rentabiliteNette),
          cashFlowMensuel: n(a.cashFlowMensuel),
          cashFlowAnnuel: n(a.cashFlowAnnuel),
          roi: n(a.roi),
          revenusPorteurs: n(a.revenusPorteurs),
          tauxEndettementProjet: n(a.tauxEndettementProjet),
          anneesRecuperationApport: n(a.anneesRecuperationApport),
          dateCalcul: new Date()
        } : {
          id: '',
          projetId: response.data.projet.id,
          rentabiliteBrute: 0,
          chargesAnnuelles: 0,
          rentabiliteNette: 0,
          cashFlowMensuel: 0,
          cashFlowAnnuel: 0,
          roi: 0,
          revenusPorteurs: 0,
          tauxEndettementProjet: 0,
          anneesRecuperationApport: 0,
          dateCalcul: new Date()
        },
        checklistDocuments: response.data.checklistDocuments || [],
        dateCreation: new Date(response.data.projet.dateCreation),
        dateModification: new Date(response.data.projet.dateModification)
      }

      const pdfGenerator = new PDFGeneratorPro()
      const filename = `dossier-bancaire-${projet.nom || 'projet'}-${new Date().toISOString().split('T')[0]}.pdf`
      pdfGenerator.downloadPDF(projet, filename)
      return { success: true }
    } catch (error: any) {
      console.error('Error generating PDF Pro:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Genere le PDF a partir de donnees locales (sans appel API)
   * Utile pour les projets non encore sauvegardes
   */
  downloadPDFFromLocal(dossier: DossierSCI): void {
    const pdfGenerator = new PDFGenerator()
    const filename = `dossier-${dossier.nomSCI || 'projet'}-${new Date().toISOString().split('T')[0]}.pdf`
    pdfGenerator.downloadPDF(dossier, filename)
  }

  /**
   * Retourne le PDF en Blob (pour preview ou envoi)
   */
  async getPDFBlob(projectId: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    const response = await this.fetchProjectData(projectId)

    if (!response.success || !response.data) {
      return { success: false, error: response.error }
    }

    try {
      const n = (v: any) => Number(v) || 0
      const fin = response.data.financement
      const a = response.data.analysesRentabilite

      const projet: Projet = {
        id: response.data.projet.id,
        userId: response.data.projet.userId,
        nom: response.data.projet.nom,
        description: response.data.projet.description,
        status: response.data.projet.status,
        porteurs: response.data.porteurs,
        bienImmobilier: response.data.bienImmobilier,
        financement: fin ? {
          ...fin,
          prixAchat: n(fin.prixAchat),
          fraisNotaire: n(fin.fraisNotaire),
          fraisAgence: n(fin.fraisAgence),
          montantTravaux: n(fin.montantTravaux),
          apportPersonnel: n(fin.apportPersonnel),
          montantEmprunt: n(fin.montantEmprunt),
          coutTotalProjet: n(fin.coutTotalProjet),
          dureeCredit: n(fin.dureeCredit),
          tauxInteretEstime: n(fin.tauxInteretEstime),
          mensualiteTotale: n(fin.mensualiteTotale),
        } : null,
        analysesRentabilite: a ? {
          id: a.id, projetId: response.data.projet.id,
          rentabiliteBrute: n(a.rentabiliteBrute), chargesAnnuelles: n(a.chargesAnnuelles),
          rentabiliteNette: n(a.rentabiliteNette), cashFlowMensuel: n(a.cashFlowMensuel),
          cashFlowAnnuel: n(a.cashFlowAnnuel), roi: n(a.roi),
          revenusPorteurs: n(a.revenusPorteurs), tauxEndettementProjet: n(a.tauxEndettementProjet),
          anneesRecuperationApport: n(a.anneesRecuperationApport),
          dateCalcul: new Date()
        } : {
          id: '', projetId: response.data.projet.id,
          rentabiliteBrute: 0, chargesAnnuelles: 0, rentabiliteNette: 0,
          cashFlowMensuel: 0, cashFlowAnnuel: 0, roi: 0,
          revenusPorteurs: 0, tauxEndettementProjet: 0, anneesRecuperationApport: 0,
          dateCalcul: new Date()
        },
        checklistDocuments: response.data.checklistDocuments || [],
        dateCreation: new Date(response.data.projet.dateCreation),
        dateModification: new Date(response.data.projet.dateModification)
      }

      const pdfGenerator = new PDFGeneratorPro()
      const blob = pdfGenerator.getPDFBlob(projet)
      return { success: true, blob }
    } catch (error: any) {
      console.error('Error generating PDF blob:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton
export const pdfService = new PDFService()
export default PDFService
