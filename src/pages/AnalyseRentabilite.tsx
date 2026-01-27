import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Percent, AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AnalysesRentabilite } from '@/types';
import { useProjets } from '@/hooks/useProjets';

const AnalyseRentabilite: React.FC = () => {
  const { projetId } = useParams<{ projetId: string }>();
  const { getProjetById, calculateRentabilite } = useProjets();
  const [projet, setProjet] = useState<any>(null);
  const [analyses, setAnalyses] = useState<AnalysesRentabilite | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    const loadProjetAndAnalyses = async () => {
      if (!projetId) return;

      try {
        setLoading(true);
        const projetData = await getProjetById(projetId);
        if (projetData) {
          setProjet(projetData);
          // Get the latest analysis if available
          if (projetData.analysesRentabilite && projetData.analysesRentabilite.length > 0) {
            setAnalyses(projetData.analysesRentabilite[0]);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du projet:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjetAndAnalyses();
  }, [projetId]);

  const handleRecalculate = async () => {
    if (!projetId) return;

    try {
      setRecalculating(true);
      const newAnalyses = await calculateRentabilite(projetId);
      setAnalyses(newAnalyses);
    } catch (error) {
      console.error('Erreur lors du recalcul:', error);
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement des analysesAffichees...</p>
      </div>
    );
  }

  if (!projet) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Projet non trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              Le projet demandé n'existe pas.
            </p>
            <Link to="/projets">
              <Button>
                Retour aux projets
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Créer des analyses par défaut si elles n'existent pas
  const analysesAffichees = analyses || {
    rentabiliteBrute: 0,
    rentabiliteNette: 0,
    cashFlowMensuel: 0,
    cashFlowAnnuel: 0,
    roi: 0,
    tauxEndettementProjet: 0,
    chargesAnnuelles: 0,
    revenusPorteurs: 0,
    anneesRecuperationApport: 0,
    dateCalcul: new Date().toISOString()
  };

  const getIndicatorColor = (value: number, type: 'rentabilite' | 'cashflow' | 'roi' | 'endettement') => {
    switch (type) {
      case 'rentabilite':
        if (value >= 7) return 'text-green-600';
        if (value >= 4) return 'text-yellow-600';
        return 'text-red-600';
      case 'cashflow':
        if (value > 0) return 'text-green-600';
        if (value === 0) return 'text-yellow-600';
        return 'text-red-600';
      case 'roi':
        if (value >= 10) return 'text-green-600';
        if (value >= 5) return 'text-yellow-600';
        return 'text-red-600';
      case 'endettement':
        if (value <= 33) return 'text-green-600';
        if (value <= 40) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="mb-8">
          <Link to="/projets" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{projet.nom}</h1>
              <p className="text-gray-600 mt-1">Analyses de rentabilité détaillées</p>
              {analyses && (
                <p className="text-sm text-gray-500 mt-2">
                  Dernière mise à jour : {new Date(analysesAffichees.dateCalcul).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!analyses && (
                <Link to={`/projets/${projetId}/edit`}>
                  <Button variant="outline">
                    Compléter le projet
                  </Button>
                </Link>
              )}
              <Button onClick={handleRecalculate} disabled={recalculating}>
                {recalculating ? 'Recalcul en cours...' : analyses ? 'Recalculer' : 'Calculer'}
              </Button>
            </div>
          </div>
        </div>

        {/* Indicateurs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Rentabilité brute</p>
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <p className={`text-3xl font-bold ${getIndicatorColor(analysesAffichees.rentabiliteBrute, 'rentabilite')}`}>
              {analysesAffichees.rentabiliteBrute.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analysesAffichees.rentabiliteBrute >= 7 ? 'Excellente' : analysesAffichees.rentabiliteBrute >= 4 ? 'Correcte' : 'Faible'}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Rentabilité nette</p>
              <Percent className="h-5 w-5 text-gray-400" />
            </div>
            <p className={`text-3xl font-bold ${getIndicatorColor(analysesAffichees.rentabiliteNette, 'rentabilite')}`}>
              {analysesAffichees.rentabiliteNette.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Après déduction des charges
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Cash-flow mensuel</p>
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <p className={`text-3xl font-bold ${getIndicatorColor(analysesAffichees.cashFlowMensuel, 'cashflow')}`}>
              {analysesAffichees.cashFlowMensuel > 0 ? '+' : ''}{analysesAffichees.cashFlowMensuel.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {analysesAffichees.cashFlowMensuel > 0 ? 'Auto-financé' : 'Effort mensuel requis'}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">ROI</p>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className={`text-3xl font-bold ${getIndicatorColor(analysesAffichees.roi, 'roi')}`}>
              {analysesAffichees.roi.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Retour sur investissement
            </p>
          </Card>
        </div>

        {/* Détails des analyses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Flux financiers
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Cash-flow mensuel</span>
                <span className={`font-semibold ${getIndicatorColor(analysesAffichees.cashFlowMensuel, 'cashflow')}`}>
                  {analysesAffichees.cashFlowMensuel > 0 ? '+' : ''}{analysesAffichees.cashFlowMensuel.toLocaleString('fr-FR')} €
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Cash-flow annuel</span>
                <span className={`font-semibold ${getIndicatorColor(analysesAffichees.cashFlowAnnuel, 'cashflow')}`}>
                  {analysesAffichees.cashFlowAnnuel > 0 ? '+' : ''}{analysesAffichees.cashFlowAnnuel.toLocaleString('fr-FR')} €
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Charges annuelles</span>
                <span className="font-semibold text-gray-900">
                  {analysesAffichees.chargesAnnuelles.toLocaleString('fr-FR')} €
                </span>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  💡 Interprétation
                </p>
                <p className="text-sm text-blue-800">
                  {analysesAffichees.cashFlowMensuel > 0
                    ? "Votre bien génère un cash-flow positif : les loyers couvrent les mensualités et charges."
                    : "Vous devrez compléter chaque mois pour couvrir la différence entre loyers et charges."
                  }
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Endettement & capacité
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Revenus des porteurs</span>
                <span className="font-semibold text-gray-900">
                  {analysesAffichees.revenusPorteurs.toLocaleString('fr-FR')} €
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Taux d'endettement</span>
                <span className={`font-semibold ${getIndicatorColor(analysesAffichees.tauxEndettementProjet, 'endettement')}`}>
                  {analysesAffichees.tauxEndettementProjet.toFixed(2)}%
                </span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <span className="text-gray-600">Années pour récupérer l'apport</span>
                <span className="font-semibold text-gray-900">
                  {analysesAffichees.anneesRecuperationApport === 0 || !isFinite(analysesAffichees.anneesRecuperationApport)
                    ? 'N/A'
                    : `${analysesAffichees.anneesRecuperationApport.toFixed(1)} ans`
                  }
                </span>
              </div>

              <div className={`p-4 rounded-lg mt-4 ${
                analysesAffichees.tauxEndettementProjet <= 33
                  ? 'bg-green-50'
                  : analysesAffichees.tauxEndettementProjet <= 40
                  ? 'bg-yellow-50'
                  : 'bg-red-50'
              }`}>
                <p className={`text-sm font-medium mb-1 ${
                  analysesAffichees.tauxEndettementProjet <= 33
                    ? 'text-green-900'
                    : analysesAffichees.tauxEndettementProjet <= 40
                    ? 'text-yellow-900'
                    : 'text-red-900'
                }`}>
                  {analysesAffichees.tauxEndettementProjet <= 33
                    ? '✅ Excellent taux d\'endettement'
                    : analysesAffichees.tauxEndettementProjet <= 40
                    ? '⚠️ Taux d\'endettement limite'
                    : '❌ Taux d\'endettement trop élevé'
                  }
                </p>
                <p className={`text-sm ${
                  analysesAffichees.tauxEndettementProjet <= 33
                    ? 'text-green-800'
                    : analysesAffichees.tauxEndettementProjet <= 40
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}>
                  {analysesAffichees.tauxEndettementProjet <= 33
                    ? 'Votre taux d\'endettement est confortable pour les banques (< 33%).'
                    : analysesAffichees.tauxEndettementProjet <= 40
                    ? 'Vous êtes proche de la limite acceptée par les banques (33%).'
                    : 'Votre taux dépasse la limite de 33%, l\'accord bancaire sera difficile.'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Graphique de projection (optionnel - à implémenter) */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Résumé de performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Rentabilité</p>
              <p className="text-2xl font-bold text-blue-600">
                {analysesAffichees.rentabiliteBrute >= 7 ? 'Excellente' : analysesAffichees.rentabiliteBrute >= 4 ? 'Bonne' : 'Faible'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analysesAffichees.rentabiliteBrute.toFixed(2)}% brut / {analysesAffichees.rentabiliteNette.toFixed(2)}% net
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Cash-flow</p>
              <p className={`text-2xl font-bold ${analysesAffichees.cashFlowMensuel > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysesAffichees.cashFlowMensuel > 0 ? 'Positif' : 'Négatif'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {analysesAffichees.cashFlowMensuel.toLocaleString('fr-FR')} € / mois
              </p>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Point mort</p>
              <p className="text-2xl font-bold text-purple-600">
                {analysesAffichees.anneesRecuperationApport === 0 || !isFinite(analysesAffichees.anneesRecuperationApport)
                  ? 'N/A'
                  : `${Math.round(analysesAffichees.anneesRecuperationApport)} ans`
                }
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Pour récupérer l'apport
              </p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-8">
          <Link to={`/projets/${projet.id}`}>
            <Button variant="secondary">
              Voir le projet complet
            </Button>
          </Link>

          <Link to={`/projets/${projet.id}/checklist`}>
            <Button>
              Générer la checklist documents
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AnalyseRentabilite;
