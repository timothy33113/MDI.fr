import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { CreditCard, Check, ArrowLeft, Shield, Zap, FileText } from 'lucide-react'

const Payment: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { user: _user } = useAuth()
  const navigate = useNavigate()

  const handlePayment = async () => {
    setLoading(true)
    
    // Simulation du paiement
    setTimeout(() => {
      setSuccess(true)
      setLoading(false)
      
      // Redirection après 3 secondes
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }, 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Paiement réussi !
          </h2>
          <p className="text-gray-600 mb-6">
            Votre compte a été activé. Vous pouvez maintenant créer des dossiers bancaires illimités.
          </p>
          <div className="animate-pulse">
            <p className="text-sm text-gray-500">Redirection en cours...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au tableau de bord
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Accès Premium MDI.fr
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Débloquez l'accès complet à tous les outils
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan de paiement */}
          <Card>
            <div className="text-center mb-6">
              <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Accès à vie</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-primary-600">99€</span>
                <span className="text-gray-600 ml-2">(paiement unique)</span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Dossiers bancaires illimités</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Génération PDF professionnelle</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Calculs automatiques de rentabilité</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Sauvegarde cloud sécurisée</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-500 mr-3" />
                <span>Support prioritaire</span>
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payer 99€ maintenant
                </>
              )}
            </Button>

            <div className="mt-4 text-center">
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Shield className="h-4 w-4 mr-1" />
                Paiement sécurisé par Stripe
              </div>
            </div>
          </Card>

          {/* Avantages */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                Pourquoi choisir MDI.fr ?
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong>Gain de temps :</strong> Créez des dossiers bancaires professionnels en quelques heures au lieu de plusieurs jours.
                </p>
                <p>
                  <strong>Présentation optimale :</strong> Des documents structurés et visuellement attractifs pour maximiser vos chances d'obtenir un financement.
                </p>
                <p>
                  <strong>Calculs précis :</strong> Tous les ratios bancaires et calculs de rentabilité sont automatiques et conformes aux standards bancaires.
                </p>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 text-blue-500 mr-2" />
                Ce qui est inclus
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Templates professionnels pour SCI</li>
                <li>• Calculs automatiques de rentabilité</li>
                <li>• Gestion des associés (1 à 5 personnes)</li>
                <li>• Upload et gestion des photos</li>
                <li>• Export PDF haute qualité</li>
                <li>• Sauvegarde automatique</li>
                <li>• Modifications illimitées</li>
                <li>• Support par email</li>
              </ul>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                💡 Conseil d'expert
              </h3>
              <p className="text-sm text-blue-800">
                Un dossier bancaire bien présenté peut faire la différence entre un refus et une acceptation. 
                Investissez dans la qualité de votre présentation pour maximiser vos chances de succès.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment 