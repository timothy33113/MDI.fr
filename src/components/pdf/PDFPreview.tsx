import React, { useState, useEffect } from 'react'

import Button from '@/components/ui/Button'
import { Download, Eye, FileText, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { DossierSCI } from '@/types'
import PDFGenerator from '@/services/pdfGenerator'

interface PDFPreviewProps {
  dossier: DossierSCI
  onClose: () => void
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ dossier, onClose }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generatePDF()
  }, [dossier])

  const generatePDF = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const pdfGenerator = new PDFGenerator()
      const blob = pdfGenerator.getPDFBlob(dossier)
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
    } catch (err) {
      setError('Erreur lors de la génération du PDF')
      console.error('Erreur PDF:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (pdfUrl) {
      const pdfGenerator = new PDFGenerator()
      const filename = `dossier-${dossier.nomSCI || 'sci'}-${new Date().toISOString().split('T')[0]}.pdf`
      pdfGenerator.downloadPDF(dossier, filename)
    }
  }

  const handleRegenerate = () => {
    generatePDF()
  }

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Prévisualisation PDF
              </h2>
              <p className="text-sm text-gray-600">
                {dossier.nomSCI || 'Dossier SCI'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {error && (
              <div className="flex items-center text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-sm">Erreur</span>
              </div>
            )}
            
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Régénérer
            </Button>
            
            <Button
              onClick={handleDownload}
              disabled={!pdfUrl || isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-primary-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Génération du PDF en cours...
                </h3>
                <p className="text-gray-600">
                  Veuillez patienter pendant que nous préparons votre document.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Erreur de génération
                </h3>
                <p className="text-gray-600 mb-4">
                  {error}
                </p>
                <Button onClick={handleRegenerate}>
                  Réessayer
                </Button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border border-gray-200 rounded-lg"
                title="Prévisualisation PDF"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun PDF disponible
                </h3>
                <p className="text-gray-600">
                  Cliquez sur "Régénérer" pour créer le PDF.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {pdfUrl && (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span>PDF généré avec succès</span>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PDFPreview 