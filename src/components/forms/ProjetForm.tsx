import React, { useState, useEffect } from 'react';
import { CreateProjetForm, Structure } from '@/types';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';

interface ProjetFormProps {
  structures: Structure[];
  onSubmit: (data: CreateProjetForm) => void;
  onCancel?: () => void;
}

const ProjetForm: React.FC<ProjetFormProps> = ({ structures, onSubmit, onCancel }) => {
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [porteurs, setPorteurs] = useState<{ structureId: string; pourcentageProjet: number }[]>([
    { structureId: '', pourcentageProjet: 0 }
  ]);

  const [bienImmobilier, setBienImmobilier] = useState({
    adresse: '',
    codePostal: '',
    ville: '',
    type: 'Appartement' as const,
    superficie: 0,
    nombrePieces: 0,
    etatActuel: 'Bon' as const,
    destinationBien: 'Location' as const,
    loyerMensuelEstime: 0,
    chargesMensuelles: 0
  });

  const [financement, setFinancement] = useState({
    prixAchat: 0,
    fraisNotaire: 0,
    montantTravaux: 0,
    apportPersonnel: 0,
    dureeCredit: 20,
    tauxInteretEstime: 3.5
  });

  const [totalPourcentage, setTotalPourcentage] = useState(0);

  useEffect(() => {
    const total = porteurs.reduce((sum, p) => sum + p.pourcentageProjet, 0);
    setTotalPourcentage(total);
  }, [porteurs]);

  const addPorteur = () => {
    setPorteurs([...porteurs, { structureId: '', pourcentageProjet: 0 }]);
  };

  const removePorteur = (index: number) => {
    if (porteurs.length > 1) {
      setPorteurs(porteurs.filter((_, i) => i !== index));
    }
  };

  const updatePorteur = (index: number, field: 'structureId' | 'pourcentageProjet', value: string | number) => {
    const newPorteurs = [...porteurs];
    newPorteurs[index] = { ...newPorteurs[index], [field]: value };
    setPorteurs(newPorteurs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (totalPourcentage !== 100) {
      alert('Le total des porteurs doit être exactement 100%');
      return;
    }

    if (porteurs.some(p => !p.structureId)) {
      alert('Veuillez sélectionner une structure pour chaque porteur');
      return;
    }

    const data: CreateProjetForm = {
      nom,
      description,
      porteurs,
      bienImmobilier,
      financement
    };

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Créer un nouveau projet
        </h2>

        <div className="space-y-4">
          <Input
            label="Nom du projet"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            placeholder="Ex: Immeuble Lyon 3, Villa Marseille..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Décrivez brièvement le projet..."
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Porteurs du projet
          </h3>
          <div className={`text-sm font-medium ${totalPourcentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
            Total: {totalPourcentage}%
          </div>
        </div>

        <div className="space-y-4">
          {porteurs.map((porteur, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Structure
                </label>
                <select
                  value={porteur.structureId}
                  onChange={(e) => updatePorteur(index, 'structureId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionnez une structure</option>
                  {structures.map((structure) => (
                    <option key={structure.id} value={structure.id}>
                      {structure.nom} ({structure.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  % Projet
                </label>
                <Input
                  type="number"
                  value={porteur.pourcentageProjet}
                  onChange={(e) => updatePorteur(index, 'pourcentageProjet', Number(e.target.value))}
                  min={0}
                  max={100}
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => removePorteur(index)}
                className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                disabled={porteurs.length === 1}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={addPorteur}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un porteur
          </Button>

          {totalPourcentage !== 100 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ⚠️ Le total des porteurs doit être exactement 100%
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Bien immobilier
        </h3>

        <div className="space-y-4">
          <Input
            label="Adresse complète"
            value={bienImmobilier.adresse}
            onChange={(e) => setBienImmobilier({ ...bienImmobilier, adresse: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Code postal"
              value={bienImmobilier.codePostal}
              onChange={(e) => setBienImmobilier({ ...bienImmobilier, codePostal: e.target.value })}
              required
            />

            <Input
              label="Ville"
              value={bienImmobilier.ville}
              onChange={(e) => setBienImmobilier({ ...bienImmobilier, ville: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de bien
              </label>
              <select
                value={bienImmobilier.type}
                onChange={(e) => setBienImmobilier({ ...bienImmobilier, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Appartement">Appartement</option>
                <option value="Maison">Maison</option>
                <option value="Immeuble">Immeuble</option>
                <option value="Local_Commercial">Local Commercial</option>
                <option value="Terrain">Terrain</option>
              </select>
            </div>

            <Input
              label="Superficie (m²)"
              type="number"
              value={bienImmobilier.superficie}
              onChange={(e) => setBienImmobilier({ ...bienImmobilier, superficie: Number(e.target.value) })}
              required
            />

            <Input
              label="Nombre de pièces"
              type="number"
              value={bienImmobilier.nombrePieces}
              onChange={(e) => setBienImmobilier({ ...bienImmobilier, nombrePieces: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                État du bien
              </label>
              <select
                value={bienImmobilier.etatActuel}
                onChange={(e) => setBienImmobilier({ ...bienImmobilier, etatActuel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Neuf">Neuf</option>
                <option value="Bon">Bon état</option>
                <option value="A_Renover">À rénover</option>
                <option value="A_Renover_Entierement">À rénover entièrement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <select
                value={bienImmobilier.destinationBien}
                onChange={(e) => setBienImmobilier({ ...bienImmobilier, destinationBien: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Location">Location</option>
                <option value="Residence_Principale">Résidence principale</option>
                <option value="Revente">Revente</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {bienImmobilier.destinationBien === 'Location' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Loyer mensuel estimé (€)"
                type="number"
                value={bienImmobilier.loyerMensuelEstime}
                onChange={(e) => setBienImmobilier({ ...bienImmobilier, loyerMensuelEstime: Number(e.target.value) })}
              />

              <Input
                label="Charges mensuelles (€)"
                type="number"
                value={bienImmobilier.chargesMensuelles}
                onChange={(e) => setBienImmobilier({ ...bienImmobilier, chargesMensuelles: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Financement
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prix d'achat (€)"
              type="number"
              value={financement.prixAchat}
              onChange={(e) => setFinancement({ ...financement, prixAchat: Number(e.target.value) })}
              required
            />

            <Input
              label="Frais de notaire (€)"
              type="number"
              value={financement.fraisNotaire}
              onChange={(e) => setFinancement({ ...financement, fraisNotaire: Number(e.target.value) })}
              placeholder="Calculé automatiquement si vide"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Montant travaux (€)"
              type="number"
              value={financement.montantTravaux}
              onChange={(e) => setFinancement({ ...financement, montantTravaux: Number(e.target.value) })}
            />

            <Input
              label="Apport personnel (€)"
              type="number"
              value={financement.apportPersonnel}
              onChange={(e) => setFinancement({ ...financement, apportPersonnel: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Durée du crédit (années)"
              type="number"
              value={financement.dureeCredit}
              onChange={(e) => setFinancement({ ...financement, dureeCredit: Number(e.target.value) })}
              required
            />

            <Input
              label="Taux d'intérêt estimé (%)"
              type="number"
              step="0.01"
              value={financement.tauxInteretEstime}
              onChange={(e) => setFinancement({ ...financement, tauxInteretEstime: Number(e.target.value) })}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Les calculs de rentabilité (cash-flow, ROI, etc.) seront effectués automatiquement après création du projet.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} type="button">
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={totalPourcentage !== 100}>
          Créer le projet
        </Button>
      </div>
    </form>
  );
};

export default ProjetForm;
